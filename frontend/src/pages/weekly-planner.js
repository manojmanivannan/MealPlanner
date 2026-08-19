/*
 * Weekly Planner page entry + page-content logic (T4 redesign)
 * ------------------------------------------------------------------
 * The restyled weekly planner. Replaces the legacy single-source import of
 * frontend/html/weekly-plan.js (clay cards + insertAdjacentHTML modals +
 * inline `onclick="window...."` globals + silent console.error) with a
 * token-driven module built on the T3 component catalog:
 *
 *   • Day cards — neutral surface + a day accent (top border + dot + soft
 *     badge); the day color is never the background (locked T1 contract).
 *   • 5 meal slots per day — pre_breakfast / breakfast / lunch / snack /
 *     dinner — each with per-meal macros at AA contrast on the neutral
 *     surface (fixes the old text-stone-500-on-pastel failure).
 *   • Assign modal — accessible (modal.js: focus trap, ESC, aria, scroll
 *     lock) with search + multi-select + recently-used pinned.
 *   • Inline quick-remove (× on a recipe chip), clear-slot, and copy-day
 *     ("copy Monday's plan to…"), all driven by event delegation.
 *   • Loading / empty / error states instead of blank-or-silent failures.
 *   • Feedback via toast.js instead of alert()/console.error.
 *
 * The legacy frontend/html/{index.html,weekly-plan.js} stay in place so the
 * current nginx/Docker deployment keeps serving the app until the rollout
 * switches to frontend/dist/ (see ADR-0002); this module is what the build
 * ships for the planner page.
 */
import { mountLayout } from '../bootstrap.js'
import { openModal } from '../components/modal.js'
import { toast } from '../components/toast.js'

/* ----------------------------- Constants ----------------------------- */

const API_BASE = '/api'

// Plannable meal slots, in chronological order. (Sides/Weekend Prep are
// hub-only per the grilling brief, so they are excluded here.)
const MEAL_SLOTS = ['pre_breakfast', 'breakfast', 'lunch', 'snack', 'dinner']

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// T1 day-token suffix per day (Monday → --day-mon …).
const DAY_TOKEN = {
  Monday: 'mon', Tuesday: 'tue', Wednesday: 'wed', Thursday: 'thu',
  Friday: 'fri', Saturday: 'sat', Sunday: 'sun',
}

// Friendly slot labels (the raw keys use snake_case).
const MEAL_LABELS = {
  pre_breakfast: 'Pre-breakfast',
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
}

// Macro columns shown in the per-meal and per-day rows.
const MACRO_COLS = [
  { key: 'energy', short: 'E', unit: 'kcal', digits: 0 },
  { key: 'protein', short: 'Pr', unit: 'g', digits: 1 },
  { key: 'carbs', short: 'Ca', unit: 'g', digits: 1 },
  { key: 'fat', short: 'Fa', unit: 'g', digits: 1 },
  { key: 'fiber', short: 'Fb', unit: 'g', digits: 0 },
]

const RECENT_KEY = 'mp-planner-recent'
const RECENT_MAX = 6

// Escape reflected user content (recipe names, instructions) before
// injecting into an innerHTML string. The modal.js comment notes its body is
// trusted app-authored markup — recipe fields are the exception, so they
// pass through here.
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
  recipes: [],          // Recipe[] from /api/recipes
  plan: {},             // { [day]: { [meal]: number[] } } from /api/weekly-plan
  status: 'loading',    // 'loading' | 'ready' | 'error'
  error: null,           // last fetch error message
}

let recentIds = loadRecent()

const grid = document.getElementById('meal-plan-grid')

/* --------------------------- Recent recipes -------------------------- */
// Track the recipes a user assigns so the assign modal can pin them at the
// top. Stored in localStorage as a small MRU list.

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((n) => Number.isInteger(n)) : []
  } catch (_) {
    return []
  }
}

function saveRecent(ids) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(ids)) } catch (_) {}
}

function pushRecent(id) {
  recentIds = [id, ...recentIds.filter((n) => n !== id)].slice(0, RECENT_MAX)
  saveRecent(recentIds)
}

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

async function fetchRecipes() {
  const resp = await fetch(`${API_BASE}/recipes`, { headers: authHeaders() })
  if (handleAuthError(resp)) throw new Error('auth')
  if (!resp.ok) throw new Error(`Recipes failed (${resp.status})`)
  return resp.json()
}

async function fetchPlan() {
  const resp = await fetch(`${API_BASE}/weekly-plan`, { headers: authHeaders() })
  if (handleAuthError(resp)) throw new Error('auth')
  if (!resp.ok) throw new Error(`Plan failed (${resp.status})`)
  return resp.json()
}

// PUT a slot's recipe_ids; returns the ids on success.
async function putSlot(day, meal, recipeIds) {
  const resp = await fetch(`${API_BASE}/weekly-plan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ day, meal_type: meal, recipe_ids: recipeIds }),
  })
  if (handleAuthError(resp)) throw new Error('auth')
  if (!resp.ok) throw new Error(`Save failed (${resp.status})`)
  return recipeIds
}

/* --------------------------- Nutrition helpers ------------------------ */

function emptyNutrition() {
  return { energy: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
}

// Per-serving nutrition for one recipe (the recipe totals are for `serves`).
// Guard serves<=0 (the backend accepts serves=0; dividing by it would yield
// Infinity/NaN and poison the day totals) — treat an invalid serves as 1.
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

function sumNutrition(recipeIds) {
  const totals = emptyNutrition()
  for (const rid of recipeIds) {
    const recipe = state.recipes.find((r) => r.id === rid)
    if (!recipe) continue
    const n = perRecipe(recipe)
    for (const k of Object.keys(totals)) totals[k] += n[k]
  }
  return totals
}

function addInto(dst, src) {
  for (const k of Object.keys(dst)) dst[k] += src[k] || 0
}

function fmt(value, digits) {
  return (value || 0).toFixed(digits)
}

/* ------------------------------- Render ------------------------------ */

function render() {
  if (state.status === 'loading') { renderSkeleton(); return }
  if (state.status === 'error') { renderError(); return }
  // Empty state only when there are no recipes AND nothing saved. A user who
  // deleted their recipes but still has a plan keeps their week visible (slots
  // show "Unknown recipe" chips they can clear) rather than losing it behind
  // the empty card — matching the legacy grid-with-placeholders behavior.
  if (state.recipes.length === 0 && !hasPlan()) { renderEmpty(); return }
  renderGrid()
}

// Loading — seven shimmering day-card skeletons so the layout doesn't jump.
function renderSkeleton() {
  grid.innerHTML = DAYS.map(() => `
    <div class="mp-card">
      <div class="mp-card-header">
        <div class="flex items-center gap-2">
          <span class="mp-skeleton" style="width:10px;height:10px;border-radius:9999px"></span>
          <span class="mp-skeleton mp-skeleton-line" style="width:5rem;margin:0"></span>
        </div>
        <span class="mp-skeleton" style="width:3rem;height:1.25rem;border-radius:9999px"></span>
      </div>
      ${Array.from({ length: MEAL_SLOTS.length }).map(() => `
        <div class="mp-skeleton mp-skeleton-line" style="margin-bottom:0.75rem"></div>
        <div class="mp-skeleton mp-skeleton-line" style="width:80%;margin-bottom:1rem"></div>
      `).join('')}
      <div class="mp-skeleton mp-skeleton-line" style="width:60%;margin-top:0.5rem"></div>
    </div>`).join('')
}

function renderError() {
  grid.innerHTML = `
    <div class="col-span-full">
      <div class="mp-state mp-state-error">
        <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 6v5M10 14v.01" stroke-linecap="round"/></svg>
        <p class="mp-state-title">Couldn't load your plan</p>
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
        <p class="mp-state-desc">Add recipes in the Recipe Hub, then come back to plan your week.</p>
        <a class="mp-btn mp-btn-primary focus-ring mp-state-action" href="recipe-hub.html">Go to Recipe Hub</a>
      </div>
    </div>`
}

function renderGrid() {
  grid.innerHTML = DAYS.map((day) => dayCard(day)).join('')
}

// One day card: neutral surface + day accent (top border), day dot + soft
// badge with the planned-meal count, five meal slots, and a day-total row.
function dayCard(day) {
  const tok = DAY_TOKEN[day]
  const dayTotals = emptyNutrition()
  let plannedCount = 0

  const slots = MEAL_SLOTS.map((meal) => {
    const ids = slotIds(day, meal)
    // Count a slot as planned only if at least one of its ids resolves to a
    // known recipe (a slot holding only stale/unknown ids isn't really planned).
    if (ids.length && ids.some((id) => state.recipes.find((r) => r.id === id))) plannedCount++
    const n = sumNutrition(ids)
    addInto(dayTotals, n)
    return mealSlot(day, meal, ids, n)
  }).join('')

  return `
    <article class="mp-card mp-card-day flex flex-col" style="--day-color:var(--day-${tok});--day-fg:var(--day-${tok}-fg);--day-soft:var(--day-${tok}-soft)">
      <header class="mp-card-header">
        <div class="flex items-center gap-2 min-w-0">
          <span class="day-dot" aria-hidden="true"></span>
          <h2 class="mp-card-title truncate">${day}</h2>
        </div>
        <div class="flex items-center gap-2 flex-none">
          <span class="mp-badge mp-badge-day-soft" title="${plannedCount} of ${MEAL_SLOTS.length} meals planned">${plannedCount}/${MEAL_SLOTS.length}</span>
          <button type="button" class="mp-btn mp-btn-ghost mp-btn-sm focus-ring" data-action="copy-day" data-day="${day}" aria-label="Copy ${day}'s plan to another day" title="Copy ${day}'s plan to…">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="7" width="9" height="9" rx="1.5"/><path d="M4 13V4a1 1 0 011-1h9"/></svg>
            Copy
          </button>
        </div>
      </header>
      <div class="flex-grow flex flex-col divide-y divide-line-subtle">${slots}</div>
      <footer class="mt-3 pt-3 border-t border-line-subtle">
        ${macroRow(dayTotals, { dayTotal: true })}
      </footer>
    </article>`
}

// One meal slot: label + actions row, the assigned recipes as removable
// chips, and the per-meal macro row.
function mealSlot(day, meal, ids, nutrition) {
  const label = MEAL_LABELS[meal] || meal.replace('_', '-')
  const occupied = ids.length > 0

  const chips = ids.map((rid) => {
    const recipe = state.recipes.find((r) => r.id === rid)
    // A stale id (recipe deleted but weekly_plan.recipe_ids still holds it)
    // renders as a muted "Unknown recipe" chip that can still be removed
    // individually, rather than vanishing and leaving an occupied-but-empty
    // slot with no per-id remove affordance.
    if (!recipe) {
      return `
        <span class="mp-badge mp-badge-outline" style="gap:0.25rem;padding-right:0.25rem">
          <span class="text-muted italic">Unknown recipe #${rid}</span>
          <button type="button" class="mp-toast-close" data-action="remove" data-day="${day}" data-meal="${meal}" data-recipe-id="${rid}" aria-label="Remove unknown recipe from ${label}" title="Remove">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>
          </button>
        </span>`
    }
    // mp-toast-close is reused as the compact dismiss affordance for a chip
    // (zero-pad, muted, focus ring) — T3 is locked, so we reuse an existing
    // small-dismiss class rather than mint a new one.
    return `
      <span class="mp-badge mp-badge-outline" style="gap:0.25rem;padding-right:0.25rem">
        <button type="button" class="recipe-link text-primary font-medium focus-ring" data-action="recipe" data-recipe-id="${rid}" title="View recipe">${esc(recipe.name)}</button>
        <button type="button" class="mp-toast-close" data-action="remove" data-day="${day}" data-meal="${meal}" data-recipe-id="${rid}" aria-label="Remove ${esc(recipe.name)} from ${label}" title="Remove">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>
        </button>
      </span>`
  }).join('')

  return `
    <div class="py-2.5 first:pt-0 last:pb-0">
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="text-xs font-medium text-secondary">${label}</span>
        <div class="flex items-center gap-1">
          ${occupied ? `<button type="button" class="mp-btn mp-btn-ghost mp-btn-sm focus-ring" data-action="clear" data-day="${day}" data-meal="${meal}" aria-label="Clear ${label}">Clear</button>` : ''}
          <button type="button" class="mp-btn ${occupied ? 'mp-btn-ghost' : 'mp-btn-secondary'} mp-btn-sm focus-ring" data-action="assign" data-day="${day}" data-meal="${meal}">${occupied ? 'Change' : 'Add'}</button>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-1.5 min-h-[1.5rem]">
        ${chips || '<span class="text-muted text-sm">No recipe</span>'}
      </div>
      ${occupied ? `<div class="mt-1.5">${macroRow(nutrition)}</div>` : ''}
    </div>`
}

// Compact macro row — energy/protein/carbs/fat/fiber in tabular numerals on
// the neutral surface. text-muted clears AA on the surface (unlike the old
// text-stone-500 on a pastel card fill).
function macroRow(nutrition, { dayTotal = false, label = null } = {}) {
  const cells = MACRO_COLS.map((c) => {
    const labelCls = dayTotal ? 'text-secondary font-medium' : 'text-muted'
    return `<span class="${labelCls}">${c.short}</span><span class="text-secondary tnum">${fmt(nutrition[c.key], c.digits)}${c.unit}</span>`
  }).join('<span class="text-muted px-0.5">·</span>')
  const lead = label != null
    ? `<span class="text-secondary font-semibold mr-2">${esc(label)}</span>`
    : dayTotal ? '<span class="text-secondary font-semibold mr-2">Day total</span>' : ''
  return `<div class="flex flex-wrap items-center gap-y-0.5 text-xs tnum ${dayTotal ? 'text-secondary' : ''}">${lead}${cells}</div>`
}

/* --------------------------- Slot accessors ------------------------- */

function slotIds(day, meal) {
  let ids = state.plan[day]?.[meal] || []
  if (!Array.isArray(ids)) ids = ids ? [ids] : []
  return ids
}

// Whether the saved plan has any assigned slot at all (used to decide between
// the empty state and rendering the grid with placeholders).
function hasPlan() {
  return Object.values(state.plan).some((day) =>
    Object.values(day || {}).some((arr) => Array.isArray(arr) && arr.length > 0)
  )
}

// Recipes eligible for a given meal slot (mirrors the legacy filter logic:
// pre_breakfast and snack are meal-type-scoped; the other three accept any
// non pre_breakfast/snack recipe).
function recipesForMeal(meal) {
  if (meal === 'pre_breakfast') return state.recipes.filter((r) => r.meal_type === 'pre_breakfast')
  if (meal === 'snack') return state.recipes.filter((r) => r.meal_type === 'snack')
  return state.recipes.filter((r) => !['pre_breakfast', 'snack'].includes(r.meal_type))
}

/* ------------------------- Event delegation -------------------------- */
// One click handler on the grid dispatches by data-action — no inline
// onclick globals (the legacy `onclick="window...."` pattern is gone).

grid.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]')
  if (!btn || !grid.contains(btn)) return
  const action = btn.dataset.action
  const { day, meal } = btn.dataset
  const recipeId = btn.dataset.recipeId ? parseInt(btn.dataset.recipeId, 10) : null

  if (action === 'assign') openAssignModal(day, meal, btn)
  else if (action === 'remove') removeFromSlot(day, meal, recipeId, btn)
  else if (action === 'clear') clearSlot(day, meal, btn)
  else if (action === 'copy-day') openCopyDayModal(day, btn)
  else if (action === 'recipe') showRecipeDetails(recipeId, btn)
  else if (action === 'retry') load()
})

/* ------------------------------- Modals ------------------------------ */

// Assign modal: search + multi-select + recently-used pinned at the top.
// Built on modal.js (focus trap / ESC / aria / scroll lock / focus restore).
function openAssignModal(day, meal, returnFocus) {
  const eligible = recipesForMeal(meal)
  const selected = new Set(slotIds(day, meal))
  const recentForMeal = recentIds
    .map((id) => eligible.find((r) => r.id === id))
    .filter(Boolean)
  const rest = eligible.filter((r) => !recentIds.includes(r.id))

  const item = (r) => `
    <label class="mp-check w-full">
      <input type="checkbox" name="recipeId" value="${r.id}" ${selected.has(r.id) ? 'checked' : ''}>
      <span class="min-w-0">
        <span class="block truncate text-primary">${esc(r.name)}</span>
        <span class="block text-muted text-xs tnum">Serves ${r.serves || 1} · ${fmt(perRecipe(r).energy, 0)} kcal · Pr ${fmt(perRecipe(r).protein, 1)}g</span>
      </span>
    </label>`

  const recentSection = recentForMeal.length
    ? `<div class="mb-3" data-group="recent">
         <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Recently used</p>
         <div class="flex flex-col gap-2">${recentForMeal.map(item).join('')}</div>
       </div>`
    : ''

  const allSection = rest.length
    ? `<div data-group="all">
         ${recentForMeal.length ? '<p class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">All recipes</p>' : ''}
         <div class="flex flex-col gap-2">${rest.map(item).join('')}</div>
       </div>`
    : ''

  const body = `
    <div class="mp-field mb-4">
      <label class="mp-label" for="assign-search-${day}-${meal}">Search recipes</label>
      <input id="assign-search-${day}-${meal}" type="search" class="mp-input focus-ring" placeholder="Search by name…" autocomplete="off">
    </div>
    <div id="assign-list" class="max-h-72 overflow-y-auto pr-1">
      ${eligible.length ? recentSection + allSection : '<p class="text-muted">No recipes available for this meal type.</p>'}
    </div>`

  const footer = `
    <button type="button" class="mp-btn mp-btn-ghost focus-ring" data-close>Cancel</button>
    <button type="button" class="mp-btn mp-btn-primary focus-ring" data-save>Save</button>`

  const ctrl = openModal({
    title: `Assign ${MEAL_LABELS[meal] || meal} · ${day}`,
    body,
    footer,
    size: 'md',
    returnFocus,
  })

  const list = ctrl.panel.querySelector('#assign-list')
  const search = ctrl.panel.querySelector('input[type="search"]')

  // Live search: hide non-matching items and any group that empties out.
  search.addEventListener('input', () => {
    const term = search.value.trim().toLowerCase()
    list.querySelectorAll('.mp-check').forEach((label) => {
      const name = label.querySelector('.text-primary').textContent.toLowerCase()
      label.classList.toggle('hidden', !name.includes(term))
    })
    list.querySelectorAll('[data-group]').forEach((group) => {
      const visible = group.querySelectorAll('.mp-check:not(.hidden)').length
      group.classList.toggle('hidden', visible === 0)
    })
  })

  ctrl.panel.querySelector('[data-save]').addEventListener('click', () => {
    const ids = Array.from(ctrl.panel.querySelectorAll('input[name="recipeId"]:checked'))
      .map((cb) => parseInt(cb.value, 10))
    ctrl.close()
    saveSlotAndRender(day, meal, ids)
  })

  // Cancel + dismiss X already close via modal.js; wire the footer Cancel.
  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

// Copy-day modal: choose target day(s) to copy the source day's plan into.
function openCopyDayModal(sourceDay, returnFocus) {
  const targets = DAYS.filter((d) => d !== sourceDay)
  const body = `
    <p class="text-secondary mb-4">Copy <strong class="text-primary">${sourceDay}</strong>'s five meal slots into the selected day(s), overwriting those slots. (Weekend Prep and Sides are managed in the Recipe Hub and aren't copied.)</p>
    <div id="copy-targets" class="flex flex-col gap-2">
      ${targets.map((d) => `
        <label class="mp-check">
          <input type="checkbox" name="target" value="${d}">
          <span class="text-primary flex items-center gap-2">
            <span class="day-dot" style="--day-color:var(--day-${DAY_TOKEN[d]})" aria-hidden="true"></span>${d}
          </span>
        </label>`).join('')}
    </div>`

  const footer = `
    <button type="button" class="mp-btn mp-btn-ghost focus-ring" data-close>Cancel</button>
    <button type="button" class="mp-btn mp-btn-primary focus-ring" data-copy disabled>Copy</button>`

  const ctrl = openModal({
    title: `Copy ${sourceDay}'s plan`,
    body,
    footer,
    size: 'sm',
    returnFocus,
  })

  const copyBtn = ctrl.panel.querySelector('[data-copy]')
  ctrl.panel.querySelectorAll('input[name="target"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const any = Array.from(ctrl.panel.querySelectorAll('input[name="target"]:checked')).length > 0
      copyBtn.disabled = !any
    })
  })

  copyBtn.addEventListener('click', () => {
    const targets = Array.from(ctrl.panel.querySelectorAll('input[name="target"]:checked')).map((cb) => cb.value)
    if (!targets.length) return
    ctrl.close()
    doCopyDay(sourceDay, targets)
  })
  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

// Recipe detail modal (replaces the legacy insertAdjacentHTML detail modal).
function showRecipeDetails(id, returnFocus) {
  const recipe = state.recipes.find((r) => r.id === id)
  if (!recipe) return

  const ingr = (Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
    .map((i) => esc(`${i.quantity} ${i.serving_unit} ${i.name}`))
    .join('; ') || '<span class="text-muted">—</span>'
  const instr = esc((recipe.instructions || '').trim()) || '<span class="text-muted">—</span>'
  const n = perRecipe(recipe)

  const body = `
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <span class="mp-badge mp-badge-accent">${esc((recipe.meal_type || '').replace('_', '-'))}</span>
        <span class="mp-badge mp-badge-outline">Serves ${recipe.serves || 1}</span>
        ${recipe.is_vegetarian ? '<span class="mp-badge mp-badge-success">Vegetarian</span>' : ''}
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
        ${macroRow(n, { dayTotal: true, label: 'Per serving' })}
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

/* ----------------------------- Actions ------------------------------- */

// Slots with an in-flight PUT, keyed `day|meal`. Guards against a second
// rapid mutation of the same slot racing the first (concurrent PUTs with
// nondeterministic last-writer-wins); the second click is ignored while the
// first is still saving.
const saving = new Set()
function slotKey(day, meal) { return `${day}|${meal}` }

// Save a slot, update local state on success, re-render, and toast. Recently
// used is only updated once the PUT commits, so a failed save can't pin a
// recipe the user never actually assigned. On failure the local state is
// untouched — the grid still shows the last-known-good state — so we only
// toast; we do NOT call load() (a refetch on the same flaky network would
// flash a skeleton / wipe the visible week for one failed slot save).
async function saveSlotAndRender(day, meal, recipeIds) {
  const key = slotKey(day, meal)
  if (saving.has(key)) return
  saving.add(key)
  try {
    await putSlot(day, meal, recipeIds)
    if (!state.plan[day]) state.plan[day] = {}
    state.plan[day][meal] = recipeIds
    recipeIds.forEach(pushRecent)
    renderGrid()
    toast.success(`${MEAL_LABELS[meal] || meal} updated for ${day}.`)
  } catch (err) {
    if (err && err.message === 'auth') return // redirected by handleAuthError
    toast.error('Could not save that slot. Please try again.', { title: 'Save failed' })
  } finally {
    saving.delete(key)
  }
}

// Remove a single recipe from a slot (quick-remove on the chip).
function removeFromSlot(day, meal, recipeId) {
  if (saving.has(slotKey(day, meal))) return
  const remaining = slotIds(day, meal).filter((id) => id !== recipeId)
  saveSlotAndRender(day, meal, remaining)
}

// Clear every recipe from a slot.
function clearSlot(day, meal) {
  if (saving.has(slotKey(day, meal))) return
  if (!slotIds(day, meal).length) return
  saveSlotAndRender(day, meal, [])
}

// Copy each of the 5 plannable meal slots from sourceDay into every target
// day (overwrite semantics for those slots). The backend commits each PUT
// independently, so a copy is NOT atomic — a rejected PUT (e.g. a stale recipe
// id that the constraint trigger rejects at commit) leaves the target
// half-copied. We track per-slot failures and report honestly ("Copy partial"
// with the skipped slots) instead of claiming a clean "Copy failed" while
// some slots already committed.
async function doCopyDay(sourceDay, targetDays) {
  const source = state.plan[sourceDay] || {}
  const puts = []
  targetDays.forEach((day) => {
    MEAL_SLOTS.forEach((meal) => {
      const ids = Array.isArray(source[meal]) ? source[meal] : []
      puts.push(
        putSlot(day, meal, ids).then(
          () => ({ day, meal, ok: true }),
          (err) => ({ day, meal, ok: false, err })
        )
      )
    })
  })

  const results = await Promise.all(puts)
  const failed = results.filter((r) => !r.ok)

  // If any PUT 401'd, handleAuthError has already redirected — don't toast.
  if (failed.some((r) => r.err && r.err.message === 'auth')) return

  // Re-fetch to reflect whatever actually committed (the copy may be partial).
  // This refetch is OUTSIDE the copy-failure path so a transient refetch blip
  // after a fully-committed copy can't masquerade as a copy failure.
  await load({ silent: true })

  if (failed.length === 0) {
    const noun = targetDays.length === 1 ? targetDays[0] : `${targetDays.length} days`
    toast.success(`Copied ${sourceDay}'s plan to ${noun}.`)
  } else {
    const skipped = [...new Set(failed.map((r) => `${r.day} ${MEAL_LABELS[r.meal] || r.meal}`))].join(', ')
    toast.warning(`Copied with ${failed.length} slot(s) skipped: ${skipped}.`, { title: 'Copy partial' })
  }
}

/* ---------------------------- PDF export ----------------------------- */

document.getElementById('export-pdf-btn').addEventListener('click', exportPdf)

async function exportPdf() {
  const token = localStorage.getItem('token')
  if (!token) {
    toast.warning('You must be logged in to export the plan.')
    return
  }
  const btn = document.getElementById('export-pdf-btn')
  btn.dataset.loading = 'true'
  btn.setAttribute('aria-busy', 'true')
  btn.disabled = true
  try {
    const resp = await fetch(`${API_BASE}/weekly-plan/pdf`, { headers: { Authorization: 'Bearer ' + token } })
    if (handleAuthError(resp)) throw new Error('auth')
    if (!resp.ok) throw new Error(`PDF failed (${resp.status})`)
    const blob = await resp.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'weekly_meal_plan.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
    toast.success('Weekly plan exported.')
  } catch (err) {
    if (err && err.message === 'auth') return // redirected by handleAuthError
    toast.error('Could not export the PDF. Please try again.', { title: 'Export failed' })
  } finally {
    btn.dataset.loading = 'false'
    btn.removeAttribute('aria-busy')
    btn.disabled = false
  }
}

/* ------------------------------- Boot -------------------------------- */

// Load recipes + plan in parallel, then render. Pass { silent } to skip the
// loading-state flicker when re-fetching after an in-place mutation.
async function load({ silent = false } = {}) {
  if (!silent) {
    state.status = 'loading'
    state.error = null
    render()
  }
  try {
    const [recipes, plan] = await Promise.all([fetchRecipes(), fetchPlan()])
    state.recipes = Array.isArray(recipes) ? recipes : []
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

// Shared nav header + auth bootstrap (replaces the per-page header/auth IIFE).
mountLayout({ activeNav: 'planner' })

load()