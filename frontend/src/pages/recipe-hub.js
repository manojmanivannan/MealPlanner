/*
 * Recipe Hub page entry + page-content logic (T5 redesign)
 * ------------------------------------------------------------------
 * The restyled Recipe Hub. Replaces the legacy single-source import of
 * frontend/html/recipe-hub.js (clay cards + insertAdjacentHTML modals +
 * inline `onclick="window...."` globals + alert()/confirm()/console.error)
 * with a token-driven module built on the T3 component catalog:
 *
 *   • Category tabs — the unified vocabulary (Pre-Breakfast, Breakfast,
 *     Lunch & Dinner, Snacks as slot-aligned; Sides & Weekend Prep as
 *     hub-only with no planner slot), wired as an accessible tablist
 *     (arrow-key + roving-tabindex, the same pattern the catalog uses).
 *   • Recipe cards — neutral .mp-card surface with a veg dot, meal-type +
 *     serves badges, truncated ingredients, and per-serving macros.
 *   • Search (live, no input re-render so focus is kept) + veg/non-veg diet
 *     filter.
 *   • Add / edit recipe flow — accessible modal with a searchable
 *     ingredient multi-select, inline ingredient creation, and serving
 *     units pulled from /utilities/list-serving-units.
 *   • Assign-to-plan flow — modal with assign-day + assign-meal selects;
 *     hidden for hub-only categories (no planner slot to assign into).
 *   • Delete with an explicit confirm modal (no native confirm()).
 *   • Loading / empty / no-match / error states instead of blank-or-silent
 *     failures.
 *   • Feedback via toast.js instead of alert()/console.error.
 *
 * The DOM-free category / filter / slot logic lives in recipe-hub-logic.js
 * (unit-tested with `node --test`). This module owns the render + DOM.
 *
 * The legacy frontend/html/{recipe-hub.html,recipe-hub.js} stay in place so
 * the current nginx/Docker deployment keeps serving until the rollout
 * switches to frontend/dist/ (see ADR-0002); this module is what the build
 * ships for the hub page.
 */
import { mountLayout } from '../bootstrap.js'
import { openModal } from '../components/modal.js'
import { toast } from '../components/toast.js'
import {
  CATEGORIES, PLANNABLE_SLOTS, SLOT_LABELS, MEAL_TYPE_LABELS,
  filterRecipes, suggestSlot, isHubOnlyMealType, defaultMealTypeForCategory,
} from './recipe-hub-logic.js'

/* ----------------------------- Constants ----------------------------- */

const API_BASE = '/api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Macro columns shown on each card / in the detail modal.
const MACRO_COLS = [
  { key: 'energy', short: 'E', unit: 'kcal', digits: 0 },
  { key: 'protein', short: 'Pr', unit: 'g', digits: 1 },
  { key: 'carbs', short: 'Ca', unit: 'g', digits: 1 },
  { key: 'fat', short: 'Fa', unit: 'g', digits: 1 },
  { key: 'fiber', short: 'Fb', unit: 'g', digits: 0 },
]

// All 7 backend RecipeMealType values, offered by the add/edit meal-type
// select (the unified vocabulary — no deprecated values exist, per the T5
// fog item; the seed data uses only these). Derived from MEAL_TYPE_LABELS so
// the option list can't drift from the label map.
const MEAL_TYPE_OPTIONS = Object.keys(MEAL_TYPE_LABELS)

// Escape reflected user content (recipe names, instructions, ingredient
// names) before injecting into an innerHTML string. The modal.js body is
// trusted app-authored markup; recipe fields are the exception.
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/* ------------------------------- State ------------------------------- */

const state = {
  recipes: [],            // Recipe[] from /api/recipes
  plan: {},              // { [day]: { [meal]: number[] } } for assign-append
  status: 'loading',     // 'loading' | 'ready' | 'error'
  error: null,           // last fetch error message
  activeCategory: 'breakfast',
  vegFilter: 'both',
  searchTerm: '',
}

// Ingredients + serving units are only needed inside the add/edit modal, so
// they're fetched lazily on first open and then cached for re-opens.
let ingredientsCache = null
let servingUnitsCache = null

const grid = document.getElementById('recipe-grid')
const tablist = document.getElementById('hub-tabs')
const searchInput = document.getElementById('recipe-search')
const vegSelect = document.getElementById('veg-filter')
const addBtn = document.getElementById('add-recipe-btn')

/* ------------------------------ API layer ---------------------------- */

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: 'Bearer ' + token } : {}
}

function handleAuthError(resp) {
  if (resp && resp.status === 401) {
    localStorage.removeItem('token')
    window.location.replace('welcome.html')
    return true
  }
  return false
}

async function fetchJson(url, opts = {}) {
  const resp = await fetch(url, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } })
  if (handleAuthError(resp)) throw new Error('auth')
  if (!resp.ok) {
    let detail = ''
    try { detail = (await resp.json()).detail } catch (_) {}
    throw new Error(detail || `Request failed (${resp.status})`)
  }
  if (resp.status === 204) return null
  return resp.json()
}

async function fetchRecipes() {
  return fetchJson(`${API_BASE}/recipes`)
}

async function fetchPlan() {
  return fetchJson(`${API_BASE}/weekly-plan`)
}

async function fetchIngredients() {
  return fetchJson(`${API_BASE}/ingredients?sort=name`)
}

async function fetchServingUnits() {
  return fetchJson(`${API_BASE}/utilities/list-serving-units`)
}

async function saveRecipeRequest(recipe, id) {
  const url = id ? `${API_BASE}/recipes/${id}` : `${API_BASE}/recipes`
  const method = id ? 'PUT' : 'POST'
  return fetchJson(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipe),
  })
}

async function deleteRecipeRequest(id) {
  const resp = await fetch(`${API_BASE}/recipes/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (handleAuthError(resp)) throw new Error('auth')
  if (!resp.ok && resp.status !== 404) throw new Error(`Delete failed (${resp.status})`)
  return null
}

async function putSlot(day, meal, recipeIds) {
  return fetchJson(`${API_BASE}/weekly-plan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ day, meal_type: meal, recipe_ids: recipeIds }),
  })
}

// Inline ingredient creation inside the add/edit modal. The endpoint takes
// query params (see ingredient_router.add_ingredient).
async function createIngredientRequest({ name, shelf_life, serving_unit }) {
  const params = new URLSearchParams({ name, shelf_life, serving_unit })
  return fetchJson(`${API_BASE}/ingredients?${params.toString()}`, { method: 'POST' })
}

/* --------------------------- Nutrition helpers ------------------------ */

// Per-serving nutrition (recipe totals are for `serves`). Guard serves<=0
// (the backend accepts serves=0; dividing by it would yield Infinity/NaN)
// — treat an invalid serves as 1.
function perRecipe(recipe) {
  const s = recipe.serves > 0 ? recipe.serves : 1
  return {
    energy: (recipe.energy || 0) / s,
    protein: (recipe.protein || 0) / s,
    carbs: (recipe.carbs || 0) / s,
    fat: (recipe.fat || 0) / s,
    fiber: (recipe.fiber || 0) / s,
  }
}

function fmt(value, digits) {
  return (value || 0).toFixed(digits)
}

// Compact macro row — E/Pr/Ca/Fa/Fb in tabular numerals on the neutral
// surface (text-muted clears AA, unlike the old text-stone-500 on pastel).
function macroRow(nutrition) {
  return MACRO_COLS.map((c) =>
    `<span class="text-muted">${c.short}</span><span class="text-secondary tnum">${fmt(nutrition[c.key], c.digits)}${c.unit}</span>`
  ).join('<span class="text-muted px-0.5">·</span>')
}

/* ------------------------------- Render ------------------------------ */

function render() {
  if (state.status === 'loading') { renderSkeleton(); return }
  if (state.status === 'error') { renderError(); return }
  const filtered = filterRecipes(state.recipes, state.activeCategory, state.vegFilter, state.searchTerm)
  if (state.recipes.length === 0) { renderEmpty(); return }
  if (filtered.length === 0) { renderNoMatches(); return }
  renderCards(filtered)
}

function renderSkeleton() {
  grid.innerHTML = Array.from({ length: 8 }).map(() => `
    <div class="mp-card">
      <div class="flex items-center justify-between mb-3">
        <span class="mp-skeleton mp-skeleton-line" style="width:60%;margin:0"></span>
        <span class="mp-skeleton" style="width:14px;height:14px;border-radius:9999px"></span>
      </div>
      <span class="mp-skeleton mp-skeleton-line"></span>
      <span class="mp-skeleton mp-skeleton-line" style="width:85%"></span>
      <span class="mp-skeleton mp-skeleton-line" style="width:70%"></span>
      <div class="mp-card-footer mt-4">
        <span class="mp-skeleton" style="width:4rem;height:1.75rem;border-radius:var(--radius-md)"></span>
        <span class="mp-skeleton" style="width:4rem;height:1.75rem;border-radius:var(--radius-md)"></span>
      </div>
    </div>`).join('')
}

function renderError() {
  grid.innerHTML = `
    <div class="col-span-full">
      <div class="mp-state mp-state-error">
        <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 6v5M10 14v.01" stroke-linecap="round"/></svg>
        <p class="mp-state-title">Couldn't load recipes</p>
        <p class="mp-state-desc">${esc(state.error || 'Something went wrong. Please try again.')}</p>
        <button type="button" class="mp-btn mp-btn-secondary focus-ring mp-state-action" data-action="retry">Retry</button>
      </div>
    </div>`
}

function renderEmpty() {
  grid.innerHTML = `
    <div class="col-span-full">
      <div class="mp-state">
        <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 6h12M4 10h12M4 14h8" stroke-linecap="round"/></svg>
        <p class="mp-state-title">No recipes yet</p>
        <p class="mp-state-desc">Add your first recipe to start planning your week.</p>
        <button type="button" class="mp-btn mp-btn-primary focus-ring mp-state-action" data-action="add">Add Recipe</button>
      </div>
    </div>`
}

function renderNoMatches() {
  grid.innerHTML = `
    <div class="col-span-full">
      <div class="mp-state">
        <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="M14 14l3 3" stroke-linecap="round"/></svg>
        <p class="mp-state-title">No recipes match</p>
        <p class="mp-state-desc">Nothing in this category matches your search and diet filter. Try a different tab or clear the filters.</p>
        <button type="button" class="mp-btn mp-btn-secondary focus-ring mp-state-action" data-action="clear-filters">Clear filters</button>
      </div>
    </div>`
}

function renderCards(recipes) {
  grid.innerHTML = recipes.map(recipeCard).join('')
}

// One recipe card. The veg dot, meal-type + serves badges, a truncated
// ingredient line, per-serving macros, and the action row. Assign is shown
// only for slot-aligned recipes (hub-only meal types have no plan slot).
function recipeCard(r) {
  const n = perRecipe(r)
  const ingr = (Array.isArray(r.ingredients) ? r.ingredients : [])
    .map((i) => esc(i.name))
    .slice(0, 6)
    .join(', ')
  const showAssign = !isHubOnlyMealType(r.meal_type)

  return `
    <article class="mp-card flex flex-col" data-recipe-id="${r.id}">
      <div class="flex items-start justify-between gap-2 mb-1">
        <h3 class="mp-card-title min-w-0 truncate" title="${esc(r.name)}">${esc(r.name)}</h3>
        <span style="display:inline-block;flex:none;width:14px;height:14px;border-radius:9999px;background:var(--color-${r.is_vegetarian ? 'success' : 'danger'});border:2px solid var(--bg-surface);box-shadow:0 0 0 1px var(--border-default)" title="${r.is_vegetarian ? 'Vegetarian' : 'Non-Vegetarian'}" aria-label="${r.is_vegetarian ? 'Vegetarian' : 'Non-Vegetarian'}"></span>
      </div>
      <div class="flex flex-wrap items-center gap-1.5 mb-3">
        <span class="mp-badge mp-badge-accent">${esc(MEAL_TYPE_LABELS[r.meal_type] || r.meal_type)}</span>
        <span class="mp-badge mp-badge-outline">Serves ${r.serves || 1}</span>
      </div>
      <p class="text-sm text-secondary mb-2 line-clamp-2 min-h-[2.5rem]" title="${esc(ingr)}">
        <span class="text-muted">Ingredients:</span> ${ingr || '<span class="text-muted">—</span>'}
      </p>
      <div class="flex flex-wrap items-center gap-y-0.5 text-xs tnum mb-4">${macroRow(n)} <span class="text-muted ml-1">per serving</span></div>
      <div class="mt-auto flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-line-subtle">
        <button type="button" class="mp-btn mp-btn-ghost mp-btn-sm focus-ring" data-action="show" data-recipe-id="${r.id}">Show</button>
        ${showAssign ? `<button type="button" class="mp-btn mp-btn-secondary mp-btn-sm focus-ring" data-action="assign" data-recipe-id="${r.id}">Assign</button>` : '<span class="mp-badge mp-badge-outline" title="Hub-only — not assigned to the plan">Hub only</span>'}
        <button type="button" class="mp-btn mp-btn-ghost mp-btn-sm focus-ring" data-action="edit" data-recipe-id="${r.id}">Edit</button>
        <button type="button" class="mp-btn mp-btn-danger-outline mp-btn-sm focus-ring" data-action="delete" data-recipe-id="${r.id}" aria-label="Delete ${esc(r.name)}">Delete</button>
      </div>
    </article>`
}

/* ----------------------------- Tab list ------------------------------ */

// Render the six category tabs once and wire the accessible tablist
// (arrow-key + roving-tabindex, the catalog's pattern). Subsequent category
// changes only toggle aria-selected + re-render the grid — the tablist
// itself is never re-rendered, so keyboard focus/roving stays consistent.
function renderTabs() {
  tablist.innerHTML = CATEGORIES.map((c, i) => `
    <button type="button" role="tab" id="hub-tab-${c.key}" class="mp-tab focus-ring"
      data-cat="${c.key}" aria-selected="${c.key === state.activeCategory}"
      aria-controls="recipe-grid" tabindex="${c.key === state.activeCategory ? 0 : -1}">
      ${c.icon} ${c.label}
    </button>`).join('')
  wireTablist(tablist)
}

function wireTablist(list) {
  const tabs = Array.from(list.querySelectorAll('[role="tab"]'))
  function select(tab) {
    tabs.forEach((t) => {
      const active = t === tab
      t.setAttribute('aria-selected', String(active))
      t.tabIndex = active ? 0 : -1
    })
    grid.setAttribute('aria-labelledby', tab.id)
    state.activeCategory = tab.dataset.cat
    render()
    tab.focus()
  }
  const index = () => tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')
  list.addEventListener('click', (e) => { const t = e.target.closest('[role="tab"]'); if (t) select(t) })
  list.addEventListener('keydown', (e) => {
    const i = index()
    if (e.key === 'ArrowRight') { e.preventDefault(); select(tabs[(i + 1) % tabs.length]) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[(i - 1 + tabs.length) % tabs.length]) }
    else if (e.key === 'Home') { e.preventDefault(); select(tabs[0]) }
    else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1]) }
  })
}

/* ------------------------- Event delegation -------------------------- */
// One click handler on the grid dispatches by data-action — no inline
// onclick globals (the legacy `onclick="window...."` pattern is gone).
grid.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]')
  if (!btn || !grid.contains(btn)) return
  const action = btn.dataset.action
  const recipeId = btn.dataset.recipeId ? parseInt(btn.dataset.recipeId, 10) : null

  if (action === 'show') showRecipeDetails(recipeId, btn)
  else if (action === 'assign') openAssignModal(recipeId, btn)
  else if (action === 'edit') openRecipeModal(recipeId, btn)
  else if (action === 'delete') openDeleteModal(recipeId, btn)
  else if (action === 'add') openRecipeModal(null, btn)
  else if (action === 'retry') load()
  else if (action === 'clear-filters') clearFilters()
})

addBtn.addEventListener('click', () => openRecipeModal(null, addBtn))

// Live search — only the grid re-renders, so the search input keeps focus.
searchInput.addEventListener('input', () => {
  state.searchTerm = searchInput.value
  render()
})

vegSelect.addEventListener('change', () => {
  state.vegFilter = vegSelect.value
  render()
})

function clearFilters() {
  state.searchTerm = ''
  state.vegFilter = 'both'
  searchInput.value = ''
  vegSelect.value = 'both'
  render()
}

/* ------------------------------- Modals ------------------------------ */

// Recipe detail modal (replaces the legacy insertAdjacentHTML detail modal).
function showRecipeDetails(id, returnFocus) {
  const recipe = state.recipes.find((r) => r.id === id)
  if (!recipe) return
  const n = perRecipe(recipe)

  const ingr = (Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
    .map((i) => esc(`${i.quantity} ${i.serving_unit} ${i.name}`))
    .join('; ') || '<span class="text-muted">—</span>'
  const instr = esc((recipe.instructions || '').trim()) || '<span class="text-muted">—</span>'

  const body = `
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <span class="mp-badge mp-badge-accent">${esc(MEAL_TYPE_LABELS[recipe.meal_type] || recipe.meal_type)}</span>
        <span class="mp-badge mp-badge-outline">Serves ${recipe.serves || 1}</span>
        ${recipe.is_vegetarian ? '<span class="mp-badge mp-badge-success">Vegetarian</span>' : '<span class="mp-badge mp-badge-danger">Non-Veg</span>'}
      </div>
      <div>
        <p class="mp-label mb-1">Ingredients</p>
        <p class="text-primary">${ingr}</p>
      </div>
      <div>
        <p class="mp-label mb-1">Instructions</p>
        <p class="text-primary whitespace-pre-line">${instr}</p>
      </div>
      <div class="pt-3 border-t border-line-subtle">
        <p class="mp-label mb-2">Nutrition per serving</p>
        <div class="flex flex-wrap items-center gap-y-0.5 text-sm tnum">${macroRow(n)}</div>
      </div>
    </div>`

  const ctrl = openModal({
    title: recipe.name,
    body,
    footer: '<button type="button" class="mp-btn mp-btn-secondary focus-ring" data-close>Close</button>',
    size: 'lg',
    returnFocus,
  })
  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

// Delete confirm modal (replaces the native confirm()).
function openDeleteModal(id, returnFocus) {
  const recipe = state.recipes.find((r) => r.id === id)
  if (!recipe) return

  const body = `<p>This removes <strong class="text-primary">${esc(recipe.name)}</strong> from your library. Any meal slots that reference it will keep a stale id until you clear them. This cannot be undone.</p>`

  const ctrl = openModal({
    title: 'Delete recipe?',
    body,
    footer: '<button type="button" class="mp-btn mp-btn-ghost focus-ring" data-close>Cancel</button><button type="button" class="mp-btn mp-btn-danger focus-ring" data-confirm>Delete</button>',
    size: 'sm',
    returnFocus,
  })

  const confirmBtn = ctrl.panel.querySelector('[data-confirm]')
  confirmBtn.addEventListener('click', async () => {
    confirmBtn.dataset.loading = 'true'
    confirmBtn.disabled = true
    try {
      await deleteRecipeRequest(id)
      state.recipes = state.recipes.filter((r) => r.id !== id)
      ctrl.close()
      render()
      toast.success('Recipe deleted.')
    } catch (err) {
      if (err && err.message === 'auth') return // redirected by handleAuthError
      confirmBtn.dataset.loading = 'false'
      confirmBtn.disabled = false
      toast.error(err && err.message ? err.message : 'Could not delete that recipe. Please try again.', { title: 'Delete failed' })
    }
  })
  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

// Assign-to-plan modal — choose a day + a plannable meal slot, then append
// the recipe to that slot's recipe_ids. Only offered for slot-aligned
// recipes (the card hides Assign for hub-only meal types).
function openAssignModal(id, returnFocus) {
  const recipe = state.recipes.find((r) => r.id === id)
  if (!recipe) return
  const suggested = suggestSlot(recipe.meal_type) || PLANNABLE_SLOTS[0]

  const body = `
    <p class="text-secondary mb-4">Assign <strong class="text-primary">${esc(recipe.name)}</strong> to a day and meal slot. This appends to anything already in that slot.</p>
    <div class="flex flex-col gap-4">
      <div class="mp-field">
        <label class="mp-label" for="assign-day">Day</label>
        <select id="assign-day" class="mp-select focus-ring">
          ${DAYS.map((d) => `<option value="${d}">${d}</option>`).join('')}
        </select>
      </div>
      <div class="mp-field">
        <label class="mp-label" for="assign-meal">Meal slot</label>
        <select id="assign-meal" class="mp-select focus-ring">
          ${PLANNABLE_SLOTS.map((s) => `<option value="${s}" ${s === suggested ? 'selected' : ''}>${esc(SLOT_LABELS[s] || s)}</option>`).join('')}
        </select>
      </div>
    </div>`

  const ctrl = openModal({
    title: 'Assign to plan',
    body,
    footer: '<button type="button" class="mp-btn mp-btn-ghost focus-ring" data-close>Cancel</button><button type="button" class="mp-btn mp-btn-primary focus-ring" data-save>Save to plan</button>',
    size: 'sm',
    returnFocus,
  })

  const saveBtn = ctrl.panel.querySelector('[data-save]')
  saveBtn.addEventListener('click', async () => {
    const day = ctrl.panel.querySelector('#assign-day').value
    const meal = ctrl.panel.querySelector('#assign-meal').value
    let existing = slotIds(day, meal)
    if (existing.includes(id)) {
      ctrl.close()
      toast.info(`${recipe.name} is already assigned to ${day} ${SLOT_LABELS[meal] || meal}.`)
      return
    }
    saveBtn.dataset.loading = 'true'
    saveBtn.disabled = true
    try {
      const newIds = [...existing, id]
      await putSlot(day, meal, newIds)
      if (!state.plan[day]) state.plan[day] = {}
      state.plan[day][meal] = newIds
      ctrl.close()
      toast.success(`Assigned ${recipe.name} to ${day} ${SLOT_LABELS[meal] || meal}.`)
    } catch (err) {
      if (err && err.message === 'auth') return // redirected by handleAuthError
      saveBtn.dataset.loading = 'false'
      saveBtn.disabled = false
      toast.error('Could not assign that recipe. Please try again.', { title: 'Assign failed' })
    }
  })
  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

function slotIds(day, meal) {
  let ids = state.plan[day]?.[meal] || []
  if (!Array.isArray(ids)) ids = ids ? [ids] : []
  return ids
}

/* ------------------------- Add / edit recipe ------------------------- */

// Ensure the ingredients + serving units the modal needs are loaded (cached
// after the first fetch so re-opens are instant).
async function ensureModalData() {
  const tasks = []
  if (ingredientsCache == null) tasks.push(fetchIngredients().then((l) => { ingredientsCache = l || [] }))
  if (servingUnitsCache == null) tasks.push(fetchServingUnits().then((u) => { servingUnitsCache = u || [] }))
  if (tasks.length) await Promise.all(tasks)
}

function defaultQtyFor(unit) {
  return (unit === 'g' || unit === 'ml') ? 100 : 1
}

// The add/edit recipe modal. Ported from the legacy flow but built on
// modal.js with token-driven fields: name, serves, a searchable ingredient
// multi-select (with inline ingredient creation), instructions, meal type,
// and vegetarian toggle.
async function openRecipeModal(id, returnFocus) {
  const editing = !!id
  const recipe = editing ? state.recipes.find((r) => r.id === id) : null
  const selected = (recipe && Array.isArray(recipe.ingredients)) ? recipe.ingredients : []

  let ingredients = []
  let units = []
  try {
    await ensureModalData()
    ingredients = ingredientsCache || []
    units = servingUnitsCache && servingUnitsCache.length ? servingUnitsCache : ['g', 'ml', 'cup', 'tbsp', 'tsp', 'nos']
  } catch (err) {
    if (err && err.message === 'auth') return // redirected by handleAuthError
    // Fallbacks so the modal still opens if the supporting endpoints fail.
    ingredients = []
    units = ['g', 'ml', 'cup', 'tbsp', 'tsp', 'nos']
  }

  const defaultMeal = editing
    ? recipe.meal_type
    : defaultMealTypeForCategory(state.activeCategory)

  const body = `
    <form id="recipe-form" class="flex flex-col gap-4" novalidate>
      <input type="hidden" id="recipe-id" value="${editing ? recipe.id : ''}">
      <div class="mp-field">
        <label class="mp-label" for="recipe-name">Name<span class="mp-req">*</span></label>
        <input id="recipe-name" type="text" class="mp-input focus-ring" value="${editing ? esc(recipe.name) : ''}" required>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="mp-field">
          <label class="mp-label" for="recipe-serves">Serves<span class="mp-req">*</span></label>
          <input id="recipe-serves" type="number" min="1" step="1" class="mp-input focus-ring" value="${editing ? (recipe.serves || 2) : 2}" required>
        </div>
        <div class="mp-field">
          <label class="mp-label" for="recipe-meal-type">Meal type<span class="mp-req">*</span></label>
          <select id="recipe-meal-type" class="mp-select focus-ring">
            ${MEAL_TYPE_OPTIONS.map((t) => `<option value="${t}" ${t === defaultMeal ? 'selected' : ''}>${esc(MEAL_TYPE_LABELS[t] || t)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="mp-field">
        <label class="mp-label" for="ingredient-search">Ingredients</label>
        <input id="ingredient-search" type="search" class="mp-input focus-ring" placeholder="Search ingredients…" autocomplete="off">
        <div id="ingredient-list" class="flex flex-col gap-1 max-h-64 overflow-y-auto border border-line rounded-md p-2 mt-1 bg-subtle">
          ${ingredientRows(ingredients, selected)}
        </div>
        <div id="add-ingredient-panel" class="mt-2 p-3 border border-line rounded-md bg-subtle hidden">
          <p class="text-xs text-secondary mb-2">No matches. Add “<span id="add-ing-preview" class="font-medium text-primary"></span>” as a new ingredient?</p>
          <div class="flex flex-wrap items-center gap-2">
            <input id="new-ing-name" type="text" class="mp-input focus-ring flex-1 min-w-[8rem]" placeholder="Name">
            <input id="new-ing-shelf" type="number" min="0" step="1" class="mp-input focus-ring w-32" placeholder="Shelf life (days)">
            <select id="new-ing-unit" class="mp-select focus-ring w-auto">
              ${units.map((u) => `<option value="${u}">${u}</option>`).join('')}
            </select>
            <button type="button" id="create-ingredient-btn" class="mp-btn mp-btn-secondary focus-ring">Create</button>
          </div>
          <p id="add-ing-error" class="text-xs text-[var(--color-danger)] mt-2 hidden"></p>
        </div>
      </div>
      <div class="mp-field">
        <label class="mp-label" for="recipe-instructions">Instructions<span class="mp-req">*</span></label>
        <textarea id="recipe-instructions" class="mp-textarea focus-ring" required>${editing ? esc(recipe.instructions || '') : ''}</textarea>
      </div>
      <label class="mp-switch">
        <input id="recipe-veg" type="checkbox" ${(!editing || recipe.is_vegetarian) ? 'checked' : ''}>
        <span class="mp-switch-track"></span>
        <span class="text-primary">Vegetarian</span>
      </label>
    </form>`

  const footer = `
    <button type="button" class="mp-btn mp-btn-ghost focus-ring" data-close>Cancel</button>
    <button type="button" class="mp-btn mp-btn-primary focus-ring" data-save>${editing ? 'Save changes' : 'Add recipe'}</button>`

  const ctrl = openModal({
    title: editing ? 'Edit recipe' : 'Add recipe',
    body,
    footer,
    size: 'lg',
    returnFocus,
  })

  wireRecipeForm(ctrl, ingredients, units)
  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

function ingredientRows(ingredients, selected) {
  if (!ingredients.length) return '<p class="text-muted text-sm p-2">No ingredients available. Use the search box to create one.</p>'
  return ingredients.map((ing) => {
    const sel = selected.find((s) => s.name === ing.name)
    const unit = sel ? sel.serving_unit : (ing.serving_unit || 'g')
    const checked = !!sel
    return `
      <label class="mp-check items-center gap-2 py-1">
        <input type="checkbox" class="ing-check" data-name="${esc(ing.name)}" data-unit="${esc(unit)}" ${checked ? 'checked' : ''}>
        <span class="flex-1 min-w-0 truncate text-primary">${esc(ing.name)}</span>
        <input type="number" min="0" step="any" class="ing-qty mp-input focus-ring w-20" placeholder="Qty" value="${sel ? sel.quantity : ''}" ${checked ? '' : 'disabled'}>
        <span class="ing-unit text-muted text-sm w-12 text-center">${esc(unit)}</span>
      </label>`
  }).join('')
}

// Wire the searchable ingredient list + inline-create panel + the
// checkbox/qty behavior, then the submit. Kept inside a closure so each
// modal open gets its own listeners scoped to that panel.
function wireRecipeForm(ctrl, initialIngredients, units) {
  const panel = ctrl.panel
  const form = panel.querySelector('#recipe-form')
  const list = panel.querySelector('#ingredient-list')
  const search = panel.querySelector('#ingredient-search')
  const addPanel = panel.querySelector('#add-ingredient-panel')
  const preview = panel.querySelector('#add-ing-preview')
  const newName = panel.querySelector('#new-ing-name')
  const newShelf = panel.querySelector('#new-ing-shelf')
  const newUnit = panel.querySelector('#new-ing-unit')
  const addErr = panel.querySelector('#add-ing-error')
  const saveBtn = panel.querySelector('[data-save]')

  // Keep a live reference to the ingredients shown (rows are re-rendered on
  // inline create, so we can't just query once).
  let ingredients = initialIngredients

  function refreshList() {
    list.innerHTML = ingredientRows(ingredients, collectSelected())
    attachRowHandlers()
  }

  function collectSelected() {
    // Preserve qty edits across a list refresh (inline create) by reading
    // the current DOM before re-rendering.
    const out = []
    list.querySelectorAll('.mp-check').forEach((label) => {
      const cb = label.querySelector('.ing-check')
      if (cb && cb.checked) {
        const qty = parseFloat(label.querySelector('.ing-qty').value)
        out.push({ name: cb.dataset.name, quantity: isNaN(qty) ? 0 : qty, serving_unit: cb.dataset.unit })
      }
    })
    return out
  }

  function attachRowHandlers() {
    list.querySelectorAll('.mp-check').forEach((label) => {
      const cb = label.querySelector('.ing-check')
      const qty = label.querySelector('.ing-qty')
      cb.addEventListener('change', () => {
        qty.disabled = !cb.checked
        if (cb.checked && qty.value === '') qty.value = String(defaultQtyFor(cb.dataset.unit))
      })
    })
  }
  attachRowHandlers()

  function refreshAddPanel() {
    const term = search.value.trim().toLowerCase()
    let visible = 0
    list.querySelectorAll('.mp-check').forEach((label) => {
      const name = label.querySelector('.text-primary').textContent.toLowerCase()
      const show = !term || name.includes(term)
      label.classList.toggle('hidden', !show)
      if (show) visible++
    })
    if (term && visible === 0) {
      addPanel.classList.remove('hidden')
      preview.textContent = search.value.trim()
      newName.value = search.value.trim()
    } else {
      addPanel.classList.add('hidden')
    }
  }
  search.addEventListener('input', refreshAddPanel)

  async function createIngredient() {
    const name = newName.value.trim()
    const shelfLife = newShelf.value.trim() || '0'
    const unit = newUnit.value
    if (!name) { addErr.textContent = 'Name is required.'; addErr.classList.remove('hidden'); return }
    addErr.classList.add('hidden')
    try {
      const ing = await createIngredientRequest({ name, shelf_life: shelfLife, serving_unit: unit })
      // Insert at the top of the local list and pre-check it, and keep the
      // module cache in sync so the new ingredient survives a modal re-open.
      ingredients = [ing, ...ingredients.filter((i) => i.name !== ing.name)]
      if (ingredientsCache) ingredientsCache = [ing, ...ingredientsCache.filter((i) => i.name !== ing.name)]
      // Mark as selected for this recipe.
      const selected = collectSelected()
      selected.push({ name: ing.name, quantity: defaultQtyFor(ing.serving_unit), serving_unit: ing.serving_unit })
      list.innerHTML = ingredientRows(ingredients, selected)
      attachRowHandlers()
      search.value = ''
      refreshAddPanel()
    } catch (err) {
      if (err && err.message === 'auth') return
      addErr.textContent = (err && err.message) ? err.message : 'Could not create ingredient.'
      addErr.classList.remove('hidden')
    }
  }
  panel.querySelector('#create-ingredient-btn').addEventListener('click', createIngredient)

  saveBtn.addEventListener('click', async () => {
    if (!form.reportValidity()) return
    const id = panel.querySelector('#recipe-id').value
    const name = panel.querySelector('#recipe-name').value.trim()
    const serves = parseInt(panel.querySelector('#recipe-serves').value, 10)
    const instructions = panel.querySelector('#recipe-instructions').value.trim()
    const meal_type = panel.querySelector('#recipe-meal-type').value
    const is_vegetarian = panel.querySelector('#recipe-veg').checked
    const ingredientsOut = collectSelected()

    const payload = { name, serves: isNaN(serves) ? 1 : serves, ingredients: ingredientsOut, instructions, meal_type, is_vegetarian }

    saveBtn.dataset.loading = 'true'
    saveBtn.disabled = true
    try {
      const saved = await saveRecipeRequest(payload, id ? parseInt(id, 10) : null)
      if (id) {
        const idx = state.recipes.findIndex((r) => r.id === saved.id)
        if (idx !== -1) state.recipes[idx] = saved
        else state.recipes.push(saved)
        toast.success('Recipe updated.')
      } else {
        state.recipes.push(saved)
        toast.success('Recipe added.')
      }
      // Keep the list ordered (the backend GET sorts by name); re-sort so a
      // newly added/renamed recipe lands in the right place in its category.
      state.recipes.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      ctrl.close()
      render()
    } catch (err) {
      if (err && err.message === 'auth') return // redirected by handleAuthError
      saveBtn.dataset.loading = 'false'
      saveBtn.disabled = false
      toast.error((err && err.message) ? err.message : 'Could not save that recipe. Please try again.', { title: 'Save failed' })
    }
  })
}

/* ------------------------------- Boot -------------------------------- */

// Load recipes + plan in parallel, then render. The plan is fetched so the
// assign modal can append to an existing slot without overwriting it.
async function load() {
  state.status = 'loading'
  state.error = null
  render()
  try {
    const [recipes, plan] = await Promise.all([fetchRecipes(), fetchPlan()])
    state.recipes = Array.isArray(recipes) ? recipes : []
    state.recipes.sort((a, b) => String(a.name).localeCompare(String(b.name)))
    state.plan = plan || {}
    state.status = 'ready'
    render()
  } catch (err) {
    if (err && err.message === 'auth') return // redirected by handleAuthError
    state.status = 'error'
    state.error = err && err.message ? err.message : 'Unknown error'
    render()
  }
}

// Render the static tablist once + wire it, set the toolbar to its initial
// state, then fetch.
renderTabs()
mountLayout({ activeNav: 'recipes' })
load()