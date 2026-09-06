/*
 * Recipe Hub Page — Material Flat Minimalist Architecture
 * ------------------------------------------------------------------
 * Categorized recipe browsing, live search, diet filters,
 * interactive ingredient builder with live nutrition recalculation,
 * weekly plan assignment, and accessible dialogs.
 */
import { mountLayout } from '../bootstrap.js'
import { openModal } from '../components/modal.js'
import { toast } from '../components/toast.js'
import { formatQuantity } from './shopping-list-logic.js'
import { availablePantryNames, pantryChipClass } from './ingredients-logic.js'
import {
  CATEGORIES, PLANNABLE_SLOTS, SLOT_LABELS, MEAL_TYPE_LABELS,
  filterRecipes, suggestSlot, isHubOnlyMealType, defaultMealTypeForCategory,
} from './recipe-hub-logic.js'

/* ----------------------------- Constants ----------------------------- */

const API_BASE = '/api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const MACRO_COLS = [
  { key: 'energy', short: 'Cal', unit: 'kcal', digits: 0 },
  { key: 'protein', short: 'Prot', unit: 'g', digits: 1 },
  { key: 'carbs', short: 'Carb', unit: 'g', digits: 1 },
  { key: 'fat', short: 'Fat', unit: 'g', digits: 1 },
  { key: 'fiber', short: 'Fiber', unit: 'g', digits: 0 },
]

const MEAL_TYPE_OPTIONS = Object.keys(MEAL_TYPE_LABELS)

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
  recipes: [],
  plan: {},
  status: 'loading',
  error: null,
  activeCategory: 'breakfast',
  vegFilter: 'both',
  searchTerm: '',
}

let ingredientsCache = null
let servingUnitsCache = null

const grid = document.getElementById('recipe-grid')
const tablist = document.getElementById('hub-tabs')
const searchInput = document.getElementById('recipe-search')
const addBtn = document.getElementById('add-recipe-btn')
const countBadge = document.getElementById('recipe-count-badge')
const dietPills = document.getElementById('diet-filter-pills')

/* ------------------------------ API Layer ---------------------------- */

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
    try {
      const raw = (await resp.json()).detail
      // FastAPI validation errors (422) return an array of objects; flatten
      // them to a readable message instead of "[object Object], ...".
      if (Array.isArray(raw)) {
        detail = raw.map((e) => [e.loc && e.loc.slice(1).join('.'), e.msg].filter(Boolean).join(': ')).join('; ')
      } else if (raw) {
        detail = String(raw)
      }
    } catch (_) {}
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
  return fetchJson(`${API_BASE}/recipes/${id}`, { method: 'DELETE' })
}

async function putSlot(day, meal, recipeIds) {
  return fetchJson(`${API_BASE}/weekly-plan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ day, meal_type: meal, recipe_ids: recipeIds }),
  })
}

async function createIngredientRequest({ name, shelf_life, serving_unit }) {
  // The backend POST /ingredients takes query params (not a JSON body);
  // sending a body 422s with an array detail ([object Object], ...).
  const params = new URLSearchParams({ name, shelf_life, serving_unit })
  return fetchJson(`${API_BASE}/ingredients?${params.toString()}`, { method: 'POST' })
}

/* --------------------------- Nutrition Helpers ------------------------ */

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

function macroRow(n) {
  return MACRO_COLS.map(
    (c) => `<span class="text-muted">${c.short}:</span><span class="font-medium text-secondary tnum mr-1">${(n[c.key] || 0).toFixed(c.digits)}${c.unit}</span>`
  ).join('')
}

/* ------------------------------- Render ------------------------------ */

function render() {
  if (countBadge) {
    countBadge.textContent = state.status === 'ready'
      ? `${state.recipes.length} recipes`
      : 'Loading...'
  }

  if (state.status === 'loading') {
    renderSkeleton()
    return
  }
  if (state.status === 'error') {
    renderError()
    return
  }
  const filtered = filterRecipes(state.recipes, state.activeCategory, state.vegFilter, state.searchTerm)
  if (state.recipes.length === 0) {
    renderEmpty()
    return
  }
  if (filtered.length === 0) {
    renderNoMatches()
    return
  }
  renderCards(filtered)
}

function renderSkeleton() {
  grid.innerHTML = Array.from({ length: 8 }).map(() => `
    <div class="mp-card p-4 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="mp-skeleton mp-skeleton-line w-3/4 mb-0"></span>
          <span class="mp-skeleton w-3 h-3 rounded-full"></span>
        </div>
        <div class="flex gap-2 mb-3">
          <span class="mp-skeleton w-16 h-5 rounded-pill"></span>
          <span class="mp-skeleton w-16 h-5 rounded-pill"></span>
        </div>
        <span class="mp-skeleton mp-skeleton-line w-full mb-1"></span>
        <span class="mp-skeleton mp-skeleton-line w-2/3 mb-4"></span>
      </div>
      <div class="pt-3 border-t border-line-subtle flex justify-end gap-2">
        <span class="mp-skeleton w-14 h-7 rounded-md"></span>
        <span class="mp-skeleton w-14 h-7 rounded-md"></span>
      </div>
    </div>`).join('')
}

function renderError() {
  grid.innerHTML = `
    <div class="col-span-full">
      <div class="mp-card mp-state mp-state-error p-8">
        <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 6v5M10 14v.01" stroke-linecap="round"/></svg>
        <p class="mp-state-title">Couldn't load recipes</p>
        <p class="mp-state-desc">${esc(state.error || 'Something went wrong. Please check your connection and try again.')}</p>
        <button type="button" class="mp-btn mp-btn-secondary focus-ring mp-state-action" data-action="retry">Retry</button>
      </div>
    </div>`
}

function renderEmpty() {
  grid.innerHTML = `
    <div class="col-span-full">
      <div class="mp-card mp-state p-12">
        <div class="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-3">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H16"/><path d="M6.5 2H16v18H6.5A2.5 2.5 0 0 1 4 17.5V4.5A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
        <p class="mp-state-title text-xl font-bold">No recipes found</p>
        <p class="mp-state-desc mt-1">Create your first recipe with custom ingredients to start planning your week.</p>
        <button type="button" class="mp-btn mp-btn-primary focus-ring mp-state-action mt-4" data-action="add">Add Recipe</button>
      </div>
    </div>`
}

function renderNoMatches() {
  grid.innerHTML = `
    <div class="col-span-full">
      <div class="mp-card mp-state p-10">
        <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="M14 14l3 3" stroke-linecap="round"/></svg>
        <p class="mp-state-title">No recipes match current filters</p>
        <p class="mp-state-desc mt-1">No recipes found matching “${esc(state.searchTerm || state.vegFilter)}” in this category.</p>
        <button type="button" class="mp-btn mp-btn-secondary focus-ring mp-state-action mt-3" data-action="clear-filters">Reset Filters</button>
      </div>
    </div>`
}

function renderCards(recipes) {
  grid.innerHTML = recipes.map(recipeCard).join('')
}

function recipeCard(r) {
  const n = perRecipe(r)
  const ingr = (Array.isArray(r.ingredients) ? r.ingredients : [])
    .map((i) => esc(i.name))
    .slice(0, 5)
    .join(', ')
  const remainingCount = (r.ingredients?.length || 0) > 5 ? ` +${r.ingredients.length - 5} more` : ''
  const showAssign = !isHubOnlyMealType(r.meal_type)

  const dietTag = r.is_vegetarian
    ? `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-none" title="Vegetarian"></span>`
    : `<span class="w-2.5 h-2.5 rounded-full bg-amber-500 flex-none" title="Non-Vegetarian"></span>`

  return `
    <article class="mp-card flex flex-col justify-between shadow-xs hover:shadow-md transition-all group" data-recipe-id="${r.id}">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <button type="button" class="font-bold text-base text-primary hover:text-accent text-left truncate transition-colors focus-ring" data-action="show" data-recipe-id="${r.id}" title="View ${esc(r.name)}">
            ${esc(r.name)}
          </button>
          <div class="flex items-center gap-1.5 flex-none mt-1">
            ${dietTag}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 mb-3">
          <span class="mp-badge mp-badge-accent text-xs">${esc(MEAL_TYPE_LABELS[r.meal_type] || r.meal_type)}</span>
          <span class="mp-badge mp-badge-outline text-xs">Serves ${r.serves || 1}</span>
          ${r.is_vegetarian ? '<span class="mp-badge mp-badge-success text-[10px]">Veg</span>' : ''}
        </div>

        <p class="text-xs text-secondary mb-3 line-clamp-2 min-h-[2rem]" title="${esc(ingr)}">
          <span class="text-muted font-medium">Ingredients:</span> ${ingr ? ingr + remainingCount : '<span class="text-muted">—</span>'}
        </p>

        <div class="p-2 bg-subtle rounded-lg text-[11px] tnum flex flex-wrap gap-x-2 gap-y-0.5 mb-3">
          ${macroRow(n)}
        </div>
      </div>

      <div class="flex items-center justify-between gap-1.5 pt-3 border-t border-line-subtle mt-auto">
        <button type="button" class="mp-btn mp-btn-ghost mp-btn-xs focus-ring text-secondary" data-action="show" data-recipe-id="${r.id}">
          Details
        </button>
        <div class="flex items-center gap-1">
          ${showAssign ? `<button type="button" class="mp-btn mp-btn-secondary mp-btn-xs focus-ring" data-action="assign" data-recipe-id="${r.id}">+ Plan</button>` : '<span class="text-[10px] text-muted uppercase font-semibold px-2 py-0.5 bg-subtle rounded">Hub only</span>'}
          <button type="button" class="mp-btn mp-btn-ghost mp-btn-icon mp-btn-xs focus-ring text-secondary" data-action="edit" data-recipe-id="${r.id}" title="Edit recipe" aria-label="Edit recipe">
            <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button type="button" class="mp-btn mp-btn-ghost mp-btn-icon mp-btn-xs focus-ring text-red-500 hover:bg-red-500/10" data-action="delete" data-recipe-id="${r.id}" title="Delete recipe" aria-label="Delete recipe">
            <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </article>`
}

/* ----------------------------- Tab List ------------------------------ */

function renderTabs() {
  tablist.innerHTML = CATEGORIES.map((c) => `
    <button type="button" role="tab" id="hub-tab-${c.key}" class="mp-tab focus-ring"
      data-cat="${c.key}" aria-selected="${c.key === state.activeCategory}"
      aria-controls="recipe-grid" tabindex="${c.key === state.activeCategory ? 0 : -1}">
      ${c.icon} <span>${c.label}</span>
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
  list.addEventListener('click', (e) => {
    const t = e.target.closest('[role="tab"]')
    if (t) select(t)
  })
  list.addEventListener('keydown', (e) => {
    const i = index()
    if (e.key === 'ArrowRight') { e.preventDefault(); select(tabs[(i + 1) % tabs.length]) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[(i - 1 + tabs.length) % tabs.length]) }
    else if (e.key === 'Home') { e.preventDefault(); select(tabs[0]) }
    else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1]) }
  })
}

/* ------------------------- Event Delegation -------------------------- */

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

if (addBtn) {
  addBtn.addEventListener('click', () => openRecipeModal(null, addBtn))
}

// Live search
if (searchInput) {
  searchInput.addEventListener('input', () => {
    state.searchTerm = searchInput.value
    render()
  })

  // Keyboard shortcut '/'
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      e.preventDefault()
      searchInput.focus()
    }
  })
}

// Diet filter pill buttons
if (dietPills) {
  dietPills.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-diet]')
    if (!btn) return
    dietPills.querySelectorAll('[data-diet]').forEach((b) => b.classList.remove('active'))
    btn.classList.add('active')
    state.vegFilter = btn.dataset.diet
    render()
  })
}

function clearFilters() {
  state.searchTerm = ''
  state.vegFilter = 'both'
  if (searchInput) searchInput.value = ''
  if (dietPills) {
    dietPills.querySelectorAll('[data-diet]').forEach((b) => {
      b.classList.toggle('active', b.dataset.diet === 'both')
    })
  }
  render()
}

/* ------------------------------- Modals ------------------------------ */

async function showRecipeDetails(id, returnFocus) {
  const recipe = state.recipes.find((r) => r.id === id)
  if (!recipe) return
  const n = perRecipe(recipe)
  const pantrySet = await pantryNames()

  const ingr = (Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
    .map((i) => {
      const tone = pantryChipClass(i.name, pantrySet)
      const toneCls = tone || 'bg-subtle border border-line text-primary'
      const hint = tone === 'mp-ing-available' ? 'In pantry' : tone === 'mp-ing-missing' ? 'Not in pantry' : ''
      return `<span${hint ? ` title="${hint}"` : ''} class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${toneCls}">${formatQuantity(i.quantity)} ${i.serving_unit} ${esc(i.name)}</span>`
    })
    .join(' ') || '<span class="text-muted">—</span>'
  const instr = esc((recipe.instructions || '').trim()) || '<span class="text-muted">No instructions provided.</span>'

  const body = `
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="mp-badge mp-badge-accent font-semibold">${esc(MEAL_TYPE_LABELS[recipe.meal_type] || recipe.meal_type)}</span>
        <span class="mp-badge mp-badge-outline">Serves ${recipe.serves || 1}</span>
        ${recipe.is_vegetarian ? '<span class="mp-badge mp-badge-success">Vegetarian</span>' : '<span class="mp-badge mp-badge-warning">Non-Vegetarian</span>'}
      </div>

      <!-- Macro Summary Box -->
      <div class="p-3.5 bg-subtle rounded-xl border border-line">
        <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Nutrition Per Serving</p>
        <div class="grid grid-cols-5 gap-2 text-center">
          <div><span class="block text-xs text-muted">Calories</span><span class="font-bold text-primary text-sm tnum">${(n.energy || 0).toFixed(0)} kcal</span></div>
          <div><span class="block text-xs text-muted">Protein</span><span class="font-bold text-emerald-600 dark:text-emerald-400 text-sm tnum">${(n.protein || 0).toFixed(1)}g</span></div>
          <div><span class="block text-xs text-muted">Carbs</span><span class="font-bold text-blue-600 dark:text-blue-400 text-sm tnum">${(n.carbs || 0).toFixed(1)}g</span></div>
          <div><span class="block text-xs text-muted">Fat</span><span class="font-bold text-rose-600 dark:text-rose-400 text-sm tnum">${(n.fat || 0).toFixed(1)}g</span></div>
          <div><span class="block text-xs text-muted">Fiber</span><span class="font-bold text-purple-600 dark:text-purple-400 text-sm tnum">${(n.fiber || 0).toFixed(0)}g</span></div>
        </div>
      </div>

      <div>
        <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Ingredients</p>
        <div class="flex flex-wrap gap-1.5">${ingr}</div>
      </div>

      <div>
        <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Instructions</p>
        <p class="text-primary text-sm whitespace-pre-line leading-relaxed bg-surface border border-line rounded-xl p-3.5">${instr}</p>
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

function openDeleteModal(id, returnFocus) {
  const recipe = state.recipes.find((r) => r.id === id)
  if (!recipe) return

  const body = `<p class="text-secondary text-sm">Are you sure you want to delete <strong class="text-primary">${esc(recipe.name)}</strong>? This action cannot be undone.</p>`

  const ctrl = openModal({
    title: 'Delete Recipe?',
    body,
    footer: '<button type="button" class="mp-btn mp-btn-ghost focus-ring" data-close>Cancel</button><button type="button" class="mp-btn mp-btn-danger focus-ring" data-confirm>Delete Recipe</button>',
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
      if (err && err.message === 'auth') return
      confirmBtn.dataset.loading = 'false'
      confirmBtn.disabled = false
      toast.error(err && err.message ? err.message : 'Could not delete that recipe.', { title: 'Delete failed' })
    }
  })
  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

function openAssignModal(id, returnFocus) {
  const recipe = state.recipes.find((r) => r.id === id)
  if (!recipe) return
  const suggested = suggestSlot(recipe.meal_type) || PLANNABLE_SLOTS[0]

  const body = `
    <p class="text-secondary text-sm mb-4">Assign <strong class="text-primary">${esc(recipe.name)}</strong> to your weekly meal plan:</p>
    <div class="grid grid-cols-2 gap-3">
      <div class="mp-field">
        <label class="mp-label" for="assign-day">Day</label>
        <select id="assign-day" class="mp-select focus-ring">
          ${DAYS.map((d) => `<option value="${d}">${d}</option>`).join('')}
        </select>
      </div>
      <div class="mp-field">
        <label class="mp-label" for="assign-meal">Meal Slot</label>
        <select id="assign-meal" class="mp-select focus-ring">
          ${PLANNABLE_SLOTS.map((s) => `<option value="${s}" ${s === suggested ? 'selected' : ''}>${esc(SLOT_LABELS[s] || s)}</option>`).join('')}
        </select>
      </div>
    </div>`

  const ctrl = openModal({
    title: 'Assign Recipe to Plan',
    body,
    footer: '<button type="button" class="mp-btn mp-btn-ghost focus-ring" data-close>Cancel</button><button type="button" class="mp-btn mp-btn-primary focus-ring" data-save>Assign to Plan</button>',
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
      if (err && err.message === 'auth') return
      saveBtn.dataset.loading = 'false'
      saveBtn.disabled = false
      toast.error('Could not assign recipe. Please try again.', { title: 'Assign failed' })
    }
  })
  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

function slotIds(day, meal) {
  let ids = state.plan[day]?.[meal] || []
  if (!Array.isArray(ids)) ids = ids ? [ids] : []
  return ids
}

/* ------------------------- Add / Edit Recipe ------------------------- */

async function ensureModalData() {
  const tasks = []
  if (ingredientsCache == null) tasks.push(fetchIngredients().then((l) => { ingredientsCache = l || [] }))
  if (servingUnitsCache == null) tasks.push(fetchServingUnits().then((u) => { servingUnitsCache = u || [] }))
  if (tasks.length) await Promise.all(tasks)
}

function defaultQtyFor(unit) {
  return (unit === 'g' || unit === 'ml') ? 100 : 1
}

/* Pantry availability for the recipe-detail chips. Loaded once on demand;
 * a failed fetch caches null so the chips stay neutral instead of falsely
 * flagging everything missing. */
let pantryNamesCache
async function pantryNames() {
  if (pantryNamesCache === undefined) {
    try {
      pantryNamesCache = availablePantryNames(await fetchIngredients())
    } catch (err) {
      if (err && err.message === 'auth') throw err
      pantryNamesCache = null
    }
  }
  return pantryNamesCache
}

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
    if (err && err.message === 'auth') return
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
        <label class="mp-label" for="recipe-name">Recipe Name<span class="mp-req">*</span></label>
        <input id="recipe-name" type="text" class="mp-input focus-ring" placeholder="e.g. Avocado Toast" value="${editing ? esc(recipe.name) : ''}" required>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="mp-field">
          <label class="mp-label" for="recipe-serves">Servings<span class="mp-req">*</span></label>
          <input id="recipe-serves" type="number" min="1" step="1" class="mp-input focus-ring" value="${editing ? (recipe.serves || 2) : 2}" required>
        </div>
        <div class="mp-field">
          <label class="mp-label" for="recipe-meal-type">Meal Category<span class="mp-req">*</span></label>
          <select id="recipe-meal-type" class="mp-select focus-ring">
            ${MEAL_TYPE_OPTIONS.map((t) => `<option value="${t}" ${t === defaultMeal ? 'selected' : ''}>${esc(MEAL_TYPE_LABELS[t] || t)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="mp-field">
        <label class="mp-label" for="ingredient-search">Recipe Ingredients</label>
        <div class="relative">
          <input id="ingredient-search" type="search" class="mp-input pl-9 focus-ring" placeholder="Search ingredient library..." autocomplete="off">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="9" r="6"/><path d="M14 14l3 3"/></svg>
        </div>

        <div id="ingredient-list" class="flex flex-col gap-1.5 max-h-56 overflow-y-auto border border-line rounded-xl p-2.5 mt-1.5 bg-subtle">
          ${ingredientRows(ingredients, selected)}
        </div>

        <div id="add-ingredient-panel" class="mt-2 p-3 border border-line rounded-xl bg-subtle hidden">
          <p class="text-xs text-secondary mb-2">No match. Quick-create “<span id="add-ing-preview" class="font-semibold text-primary"></span>” in pantry?</p>
          <div class="flex flex-wrap items-center gap-2">
            <input id="new-ing-name" type="text" class="mp-input focus-ring flex-1 min-w-[8rem] text-xs" placeholder="Name">
            <input id="new-ing-shelf" type="number" min="0" step="1" class="mp-input focus-ring w-28 text-xs" placeholder="Shelf life">
            <select id="new-ing-unit" class="mp-select focus-ring w-auto text-xs">
              ${units.map((u) => `<option value="${u}">${u}</option>`).join('')}
            </select>
            <button type="button" id="create-ingredient-btn" class="mp-btn mp-btn-secondary mp-btn-sm focus-ring">Create</button>
          </div>
          <p id="add-ing-error" class="text-xs text-[var(--color-danger)] mt-1.5 hidden"></p>
        </div>
      </div>

      <div class="mp-field">
        <label class="mp-label" for="recipe-instructions">Cooking Instructions<span class="mp-req">*</span></label>
        <textarea id="recipe-instructions" class="mp-textarea focus-ring" placeholder="Step 1: Prep ingredients..." required>${editing ? esc(recipe.instructions || '') : ''}</textarea>
      </div>

      <label class="mp-switch">
        <input id="recipe-veg" type="checkbox" ${(!editing || recipe.is_vegetarian) ? 'checked' : ''}>
        <span class="mp-switch-track"></span>
        <span class="text-primary text-sm font-medium">Vegetarian Recipe</span>
      </label>
    </form>`

  const footer = `
    <button type="button" class="mp-btn mp-btn-ghost focus-ring" data-close>Cancel</button>
    <button type="button" class="mp-btn mp-btn-primary focus-ring" data-save>${editing ? 'Save Changes' : 'Create Recipe'}</button>`

  const ctrl = openModal({
    title: editing ? 'Edit Recipe' : 'Create New Recipe',
    body,
    footer,
    size: 'lg',
    returnFocus,
  })

  wireRecipeForm(ctrl, ingredients, units)
  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

function ingredientRows(ingredients, selected) {
  if (!ingredients.length) return '<p class="text-muted text-xs p-2 text-center">No ingredients available. Type above to create one.</p>'
  return ingredients.map((ing) => {
    const sel = selected.find((s) => s.name === ing.name)
    const unit = sel ? sel.serving_unit : (ing.serving_unit || 'g')
    const checked = !!sel
    return `
      <label class="mp-check items-center gap-2 p-1.5 rounded-lg hover:bg-surface transition-colors cursor-pointer">
        <input type="checkbox" class="ing-check" data-name="${esc(ing.name)}" data-unit="${esc(unit)}" ${checked ? 'checked' : ''}>
        <span class="flex-1 min-w-0 truncate text-primary text-xs font-medium">${esc(ing.name)}</span>
        <input type="number" min="0" step="any" class="ing-qty mp-input focus-ring w-20 py-1 text-xs" placeholder="Qty" value="${sel ? sel.quantity : ''}" ${checked ? '' : 'disabled'}>
        <span class="ing-unit text-muted text-xs w-12 text-center font-medium">${esc(unit)}</span>
      </label>`
  }).join('')
}

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

  let ingredients = initialIngredients

  function collectSelected() {
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
      ingredients = [ing, ...ingredients.filter((i) => i.name !== ing.name)]
      if (ingredientsCache) ingredientsCache = [ing, ...ingredientsCache.filter((i) => i.name !== ing.name)]
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
        toast.success('Recipe created.')
      }
      state.recipes.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      ctrl.close()
      render()
    } catch (err) {
      if (err && err.message === 'auth') return
      saveBtn.dataset.loading = 'false'
      saveBtn.disabled = false
      toast.error((err && err.message) ? err.message : 'Could not save recipe.', { title: 'Save failed' })
    }
  })
}

/* ------------------------------- Boot -------------------------------- */

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
    if (err && err.message === 'auth') return
    state.status = 'error'
    state.error = err && err.message ? err.message : 'Unknown error'
    render()
  }
}

renderTabs()
mountLayout({ activeNav: 'recipes' })
load()