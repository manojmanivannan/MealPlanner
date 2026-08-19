/*
 * Ingredients page entry + page-content logic (T6 redesign)
 * ------------------------------------------------------------------
 * The restyled Ingredients page. Replaces the legacy single-source import of
 * frontend/html/ingredients.js (clay-input toolbar + an insertAdjacentHTML
 * edit modal with 10+ flat nutrition fields + a native confirm() +
 * onclick="window...." globals + alert()/console.error feedback) with a
 * token-driven module built on the T3 component catalog:
 *
 *   • Ingredient list — neutral .mp-card surface per ingredient, with a
 *     serving-unit badge, a pantry "In pantry" .mp-switch toggle, and (in
 *     shelf-life sort) a remaining-shelf-life badge. Grouped by first letter
 *     in A–Z sort; flat in shelf-life sort.
 *   • Add ingredient — accessible modal (name, shelf-life, serving unit
 *     pulled from /utilities/list-serving-units) with inline validation.
 *   • Edit ingredient — large modal with the nutrition form grouped /
 *     progressive-disclosure: macros (energy/protein/carbs/fat/fiber) always
 *     visible, minerals (iron/magnesium/calcium/potassium/sodium/vitamin-c)
 *     behind a native <details> disclosure. Per-unit label suffixes update
 *     when the serving unit changes.
 *   • Delete with an explicit confirm modal (no native confirm()).
 *   • Loading / empty / no-match / error states instead of blank-or-silent
 *     failures.
 *   • Feedback via toast.js instead of alert()/console.error.
 *
 * The DOM-free nutrition/ordering/validation logic lives in
 * ingredients-logic.js (unit-tested with `node --test`). This module owns the
 * render + DOM.
 *
 * The legacy frontend/html/{ingredients.html,ingredients.js} stay in place so
 * the current nginx/Docker deployment keeps serving until the rollout
 * switches to frontend/dist/ (see ADR-0002); this module is what the build
 * ships for the ingredients page.
 */
import { mountLayout } from '../bootstrap.js'
import { openModal } from '../components/modal.js'
import { toast } from '../components/toast.js'
import {
  DEFAULT_UNITS,
  MACRO_FIELDS,
  MINERAL_FIELDS,
  NUTRITION_FIELDS,
  nutritionLabel,
  groupByLetter,
  sortByShelfLife,
  sortByName,
  shelfLifeBadge,
  filterIngredients,
  validateIngredient,
} from './ingredients-logic.js'

/* ----------------------------- Constants ----------------------------- */

const API_BASE = '/api'

// Badge class for each shelfLifeBadge tone (components.css defines these).
const BADGE_TONE = { danger: 'mp-badge-danger', warning: 'mp-badge-warning', neutral: 'mp-badge-outline' }

// Escape reflected user content (ingredient names) before injecting into an
// innerHTML string. The modal.js body is trusted app-authored markup;
// ingredient names are the exception.
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
  ingredients: [],        // Ingredient[] from /api/ingredients
  units: [],              // string[] from /api/utilities/list-serving-units
  status: 'loading',     // 'loading' | 'ready' | 'error'
  error: null,            // last fetch error message
  sort: 'name',          // 'name' (A–Z) | 'shelf' (shelf life)
  searchTerm: '',
}

let unitsCache = null   // serving units, fetched once and reused

const grid = document.getElementById('ingredient-grid')
const searchInput = document.getElementById('ingredient-search')
const sortSelect = document.getElementById('sort-select')
const addBtn = document.getElementById('add-ingredient-btn')

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

async function fetchIngredients() {
  return fetchJson(`${API_BASE}/ingredients?sort=name`)
}

async function fetchServingUnits() {
  return fetchJson(`${API_BASE}/utilities/list-serving-units`)
}

// Add ingredient — the endpoint takes query params (see
// ingredient_router.add_ingredient).
async function createIngredientRequest({ name, shelf_life, serving_unit }) {
  const params = new URLSearchParams({ name, shelf_life, serving_unit })
  return fetchJson(`${API_BASE}/ingredients?${params.toString()}`, { method: 'POST' })
}

// Update ingredient — every field is an optional query param (see
// ingredient_router.update_ingredient). We send the editable fields
// (identity + nutrition); `available` is deliberately omitted here so the
// pantry state is only changed by its own toggle.
async function updateIngredientRequest(id, params) {
  return fetchJson(`${API_BASE}/ingredients/${id}?${new URLSearchParams(params).toString()}`, {
    method: 'PUT',
  })
}

async function setAvailableRequest(id, available) {
  return fetchJson(`${API_BASE}/ingredients/${id}?available=${available}`, { method: 'PUT' })
}

async function deleteIngredientRequest(id) {
  const resp = await fetch(`${API_BASE}/ingredients/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (handleAuthError(resp)) throw new Error('auth')
  if (resp.status === 204) return null
  let detail = ''
  try { detail = (await resp.json()).detail } catch (_) {}
  throw new Error(detail || `Delete failed (${resp.status})`)
}

/* ------------------------------- Render ------------------------------ */

function render() {
  if (state.status === 'loading') { renderSkeleton(); return }
  if (state.status === 'error') { renderError(); return }
  const filtered = filterIngredients(state.ingredients, state.searchTerm)
  if (state.ingredients.length === 0) { renderEmpty(); return }
  if (filtered.length === 0) { renderNoMatches(); return }
  renderList(filtered)
}

function renderSkeleton() {
  grid.innerHTML = Array.from({ length: 8 }).map(() => `
    <div class="mp-card">
      <div class="flex items-center justify-between mb-3">
        <span class="mp-skeleton mp-skeleton-line" style="width:55%;margin:0"></span>
        <span class="mp-skeleton" style="width:3rem;height:1.25rem;border-radius:var(--radius-pill)"></span>
      </div>
      <span class="mp-skeleton mp-skeleton-line" style="width:40%"></span>
      <div class="mp-card-footer mt-4">
        <span class="mp-skeleton" style="width:4.5rem;height:1.75rem;border-radius:var(--radius-md)"></span>
        <span class="mp-skeleton" style="width:4.5rem;height:1.75rem;border-radius:var(--radius-md)"></span>
      </div>
    </div>`).join('')
}

function renderError() {
  grid.innerHTML = `
    <div class="col-span-full">
      <div class="mp-state mp-state-error">
        <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 6v5M10 14v.01" stroke-linecap="round"/></svg>
        <p class="mp-state-title">Couldn't load ingredients</p>
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
        <p class="mp-state-title">No ingredients yet</p>
        <p class="mp-state-desc">Add your first ingredient so you can build recipes from it.</p>
        <button type="button" class="mp-btn mp-btn-primary focus-ring mp-state-action" data-action="add">Add Ingredient</button>
      </div>
    </div>`
}

function renderNoMatches() {
  grid.innerHTML = `
    <div class="col-span-full">
      <div class="mp-state">
        <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="M14 14l3 3" stroke-linecap="round"/></svg>
        <p class="mp-state-title">No ingredients match</p>
        <p class="mp-state-desc">Nothing matches your search. Try a different name or clear the search.</p>
        <button type="button" class="mp-btn mp-btn-secondary focus-ring mp-state-action" data-action="clear-filters">Clear search</button>
      </div>
    </div>`
}

function renderList(ingredients) {
  if (state.sort === 'shelf') {
    grid.innerHTML = sortByShelfLife(ingredients).map(ingredientCard).join('')
  } else {
    const groups = groupByLetter(ingredients)
    grid.innerHTML = Object.keys(groups).map((letter) =>
      `<h3 class="col-span-full text-lg font-semibold text-secondary mt-2 first:mt-0">${esc(letter)}</h3>` +
      groups[letter].map(ingredientCard).join('')
    ).join('')
  }
}

// One ingredient card. The serving-unit badge, an "In pantry" switch, an
// optional remaining-shelf-life badge (shelf sort only), and Edit / Delete.
function ingredientCard(ing) {
  const unit = ing.serving_unit || 'g'
  const badge = shelfLifeBadge(ing)
  const showShelfBadge = state.sort === 'shelf' && badge.shown
  const badgeClass = BADGE_TONE[badge.tone] || BADGE_TONE.neutral

  return `
    <article class="mp-card flex flex-col" data-id="${ing.id}">
      <div class="flex items-start justify-between gap-2 mb-1">
        <h3 class="mp-card-title min-w-0 truncate" title="${esc(ing.name)}">${esc(ing.name)}</h3>
        <span class="mp-badge mp-badge-outline">${esc(unit)}</span>
      </div>
      ${showShelfBadge ? `<span class="mp-badge ${badgeClass} self-start mb-2">${esc(badge.text)}</span>` : ''}
      <div class="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-line-subtle">
        <label class="mp-switch" title="Mark ${esc(ing.name)} as in the pantry">
          <input type="checkbox" data-action="toggle-available" data-id="${ing.id}" ${ing.available ? 'checked' : ''}>
          <span class="mp-switch-track"></span>
          <span class="text-sm text-secondary">In pantry</span>
        </label>
        <div class="flex items-center gap-2">
          <button type="button" class="mp-btn mp-btn-ghost mp-btn-sm focus-ring" data-action="edit" data-id="${ing.id}">Edit</button>
          <button type="button" class="mp-btn mp-btn-danger-outline mp-btn-sm focus-ring" data-action="delete" data-id="${ing.id}" aria-label="Delete ${esc(ing.name)}">Delete</button>
        </div>
      </div>
    </article>`
}

/* ------------------------- Event delegation -------------------------- */

// One click handler on the grid dispatches by data-action — no inline
// onclick globals (the legacy `onclick="window...."` pattern is gone).
grid.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]')
  if (!btn || !grid.contains(btn)) return
  const action = btn.dataset.action
  const id = btn.dataset.id ? parseInt(btn.dataset.id, 10) : null

  if (action === 'edit') openEditModal(id, btn)
  else if (action === 'delete') openDeleteModal(id, btn)
  else if (action === 'add') openAddModal(btn)
  else if (action === 'retry') load()
  else if (action === 'clear-filters') clearFilters()
})

// The pantry "In pantry" switch — PUT ?available=, optimistically reflected.
grid.addEventListener('change', async (e) => {
  const cb = e.target
  if (!(cb instanceof HTMLInputElement) || cb.dataset.action !== 'toggle-available') return
  const id = parseInt(cb.dataset.id, 10)
  const available = cb.checked
  cb.disabled = true
  try {
    await setAvailableRequest(id, available)
    const ing = state.ingredients.find((i) => i.id === id)
    if (ing) {
      ing.available = available
      // Backend: remaining = shelf_life when (un)marked fresh; reflect that.
      ing.remaining_shelf_life = ing.shelf_life
    }
    cb.disabled = false
    // Shelf sort re-orders on availability; A–Z sort keeps the checkbox as-is.
    if (state.sort === 'shelf') render()
  } catch (err) {
    if (err && err.message === 'auth') return // redirected by handleAuthError
    cb.checked = !available // revert
    cb.disabled = false
    toast.error(err && err.message ? err.message : 'Could not update pantry status. Please try again.', { title: 'Update failed' })
  }
})

addBtn.addEventListener('click', () => openAddModal(addBtn))

// Live search — only the grid re-renders, so the search input keeps focus.
searchInput.addEventListener('input', () => {
  state.searchTerm = searchInput.value
  render()
})

sortSelect.addEventListener('change', () => {
  state.sort = sortSelect.value === 'shelf' ? 'shelf' : 'name'
  render()
})

function clearFilters() {
  state.searchTerm = ''
  searchInput.value = ''
  render()
}

/* ----------------------------- Field helpers ------------------------ */

// Ensure serving units are loaded once (cached so re-opens are instant).
async function ensureUnits() {
  if (unitsCache == null) {
    try { unitsCache = await fetchServingUnits() } catch (err) {
      if (err && err.message === 'auth') throw err
      unitsCache = null
    }
  }
  return unitsCache && unitsCache.length ? unitsCache : DEFAULT_UNITS
}

function unitOptions(units, selected) {
  const opts = units.map((u) => `<option value="${u}" ${u === selected ? 'selected' : ''}>${u}</option>`).join('')
  return opts || DEFAULT_UNITS.map((u) => `<option value="${u}" ${u === selected ? 'selected' : ''}>${u}</option>`).join('')
}

// Set/clear an inline field error: toggle aria-invalid + the .mp-error-text
// message. Keys match validateIngredient's error keys.
function setFieldError(panel, key, msg) {
  const input = panel.querySelector(`[data-field="${key}"]`)
  const err = panel.querySelector(`[data-err="${key}"]`)
  if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false')
  if (err) {
    err.textContent = msg || ''
    err.style.display = msg ? '' : 'none'
  }
}

function clearFieldErrors(panel) {
  panel.querySelectorAll('[data-field]').forEach((i) => i.setAttribute('aria-invalid', 'false'))
  panel.querySelectorAll('[data-err]').forEach((e) => { e.textContent = ''; e.style.display = 'none' })
}

// Read the editable fields shared by add + edit.
function readCoreFields(panel) {
  return {
    name: panel.querySelector('[data-field="name"]').value,
    shelf_life: panel.querySelector('[data-field="shelf-life"]').value,
    serving_unit: panel.querySelector('[data-field="serving-unit"]').value,
  }
}

// Apply validateIngredient results to the modal fields. Returns the
// validate result. `extraErrors` lets the caller merge a server-side error
// (e.g. a 409 duplicate-name detail onto the name field).
function applyValidation(panel, extraErrors = {}) {
  const values = { ...readCoreFields(panel) }
  const sizeInput = panel.querySelector('[data-field="serving-size"]')
  if (sizeInput) values.serving_size = sizeInput.value
  const { errors } = validateIngredient(values)
  const all = { ...errors, ...extraErrors }
  // Clear every field first, then set the ones with a message.
  clearFieldErrors(panel)
  for (const key of Object.keys(all)) setFieldError(panel, key, all[key])
  return { valid: Object.keys(all).length === 0, errors: all }
}

/* ------------------------------- Add -------------------------------- */

async function openAddModal(returnFocus) {
  const units = await ensureUnits()

  const body = `
    <form id="add-ingredient-form" class="flex flex-col gap-4" novalidate>
      <div class="mp-field">
        <label class="mp-label" for="add-name">Name<span class="mp-req">*</span></label>
        <input id="add-name" type="text" class="mp-input focus-ring" data-field="name" autocomplete="off" required>
        <p class="mp-error-text" data-err="name" style="display:none"></p>
      </div>
      <div class="mp-field">
        <label class="mp-label" for="add-shelf-life">Shelf life (days)<span class="mp-req">*</span></label>
        <input id="add-shelf-life" type="number" min="1" step="1" class="mp-input focus-ring" data-field="shelf-life" placeholder="e.g. 7" required>
        <p class="mp-error-text" data-err="shelf-life" style="display:none"></p>
      </div>
      <div class="mp-field">
        <label class="mp-label" for="add-serving-unit">Serving unit<span class="mp-req">*</span></label>
        <select id="add-serving-unit" class="mp-select focus-ring" data-field="serving-unit" required>
          ${unitOptions(units, 'g')}
        </select>
        <p class="mp-error-text" data-err="serving-unit" style="display:none"></p>
      </div>
    </form>`

  const footer = `
    <button type="button" class="mp-btn mp-btn-ghost focus-ring" data-close>Cancel</button>
    <button type="button" class="mp-btn mp-btn-primary focus-ring" data-save>Add ingredient</button>`

  const ctrl = openModal({ title: 'Add ingredient', body, footer, size: 'sm', returnFocus })
  wireAddModal(ctrl)
  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

function wireAddModal(ctrl) {
  const panel = ctrl.panel
  const saveBtn = panel.querySelector('[data-save]')
  const nameInput = panel.querySelector('[data-field="name"]')

  // Clear a field's error as the user retypes it.
  panel.querySelectorAll('[data-field]').forEach((input) => {
    input.addEventListener('input', () => setFieldError(panel, input.dataset.field, ''))
  })

  saveBtn.addEventListener('click', async () => {
    const { valid, errors } = applyValidation(panel)
    if (!valid) {
      // Focus the first field in error.
      const firstKey = Object.keys(errors)[0]
      const first = panel.querySelector(`[data-field="${firstKey}"]`)
      if (first) first.focus()
      return
    }

    const { name, shelf_life, serving_unit } = readCoreFields(panel)
    saveBtn.dataset.loading = 'true'
    saveBtn.disabled = true
    try {
      const ing = await createIngredientRequest({
        name: name.trim(), shelf_life: shelf_life.trim(), serving_unit,
      })
      state.ingredients.push(ing)
      state.ingredients = sortByName(state.ingredients)
      ctrl.close()
      render()
      toast.success('Ingredient added.')
    } catch (err) {
      if (err && err.message === 'auth') return // redirected by handleAuthError
      saveBtn.dataset.loading = 'false'
      saveBtn.disabled = false
      // 409 duplicate name → inline name error; anything else → toast.
      if (err && err.message && /already exists/i.test(err.message)) {
        setFieldError(panel, 'name', err.message)
        nameInput.focus()
      } else {
        toast.error(err && err.message ? err.message : 'Could not add that ingredient. Please try again.', { title: 'Add failed' })
      }
    }
  })
}

/* ------------------------------- Edit ------------------------------- */

async function openEditModal(id, returnFocus) {
  const ing = state.ingredients.find((i) => i.id === id)
  if (!ing) return
  const units = await ensureUnits()
  const unit = ing.serving_unit || 'g'

  const body = `
    <form id="edit-ingredient-form" class="flex flex-col gap-4" novalidate>
      <input type="hidden" id="edit-id" value="${ing.id}">
      <div class="mp-field">
        <label class="mp-label" for="edit-name">Name<span class="mp-req">*</span></label>
        <input id="edit-name" type="text" class="mp-input focus-ring" data-field="name" value="${esc(ing.name)}" required>
        <p class="mp-error-text" data-err="name" style="display:none"></p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="mp-field">
          <label class="mp-label" for="edit-shelf-life">Shelf life (days)<span class="mp-req">*</span></label>
          <input id="edit-shelf-life" type="number" min="1" step="1" class="mp-input focus-ring" data-field="shelf-life" value="${ing.shelf_life == null ? '' : esc(ing.shelf_life)}" required>
          <p class="mp-error-text" data-err="shelf-life" style="display:none"></p>
        </div>
        <div class="mp-field">
          <label class="mp-label" for="edit-serving-size">Serving size</label>
          <input id="edit-serving-size" type="number" min="0" step="any" class="mp-input focus-ring" data-field="serving-size" value="${ing.serving_size == null ? '' : esc(ing.serving_size)}">
          <p class="mp-error-text" data-err="serving-size" style="display:none"></p>
        </div>
      </div>
      <div class="mp-field">
        <label class="mp-label" for="edit-serving-unit">Serving unit<span class="mp-req">*</span></label>
        <select id="edit-serving-unit" class="mp-select focus-ring" data-field="serving-unit" required>
          ${unitOptions(units, unit)}
        </select>
        <p class="mp-error-text" data-err="serving-unit" style="display:none"></p>
      </div>

      <div class="pt-2 border-t border-line-subtle">
        <p class="mp-label mb-3">Nutrition per serving</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          ${MACRO_FIELDS.map((f) => nutritionField(f, unit, ing)).join('')}
        </div>

        <details class="mp-disclosure mt-4">
          <summary class="mp-disclosure-summary">
            <svg class="mp-disclosure-chevron" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 7l4 4 4-4"/></svg>
            Minerals (iron, magnesium, calcium, potassium, sodium, vitamin C)
          </summary>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 mt-3">
            ${MINERAL_FIELDS.map((f) => nutritionField(f, unit, ing)).join('')}
          </div>
        </details>
      </div>
    </form>`

  const footer = `
    <button type="button" class="mp-btn mp-btn-ghost focus-ring" data-close>Cancel</button>
    <button type="button" class="mp-btn mp-btn-primary focus-ring" data-save>Save changes</button>`

  const ctrl = openModal({ title: 'Edit ingredient', body, footer, size: 'lg', returnFocus })
  wireEditModal(ctrl, ing)
  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

// One nutrition field (macro or mineral). Every nutrition label carries
// the per-serving-unit suffix and a stable `id` so the serving-unit change
// handler can re-label them all in place.
function nutritionField(field, unit, ing) {
  return `
    <div class="mp-field">
      <label class="mp-label" for="edit-${field.key}" id="edit-${field.key}-label">${nutritionLabel(field, unit)}</label>
      <input id="edit-${field.key}" type="number" min="0" step="any" class="mp-input focus-ring" data-nutrition="${field.key}" value="${ing[field.key] == null ? 0 : esc(ing[field.key])}">
    </div>`
}

function wireEditModal(ctrl, ing) {
  const panel = ctrl.panel
  const saveBtn = panel.querySelector('[data-save]')
  const unitSelect = panel.querySelector('[data-field="serving-unit"]')

  // Clear a field's error as the user retypes it.
  panel.querySelectorAll('[data-field]').forEach((input) => {
    input.addEventListener('input', () => setFieldError(panel, input.dataset.field, ''))
  })

  // Recompute every nutrition label's per-unit suffix when the serving unit
  // changes (macros + minerals — both are per serving unit).
  unitSelect.addEventListener('change', () => {
    const u = unitSelect.value
    for (const f of NUTRITION_FIELDS) {
      const label = panel.querySelector(`#edit-${f.key}-label`)
      if (label) label.textContent = nutritionLabel(f, u)
    }
  })

  saveBtn.addEventListener('click', async () => {
    const { valid, errors } = applyValidation(panel)
    if (!valid) {
      const firstKey = Object.keys(errors)[0]
      const first = panel.querySelector(`[data-field="${firstKey}"]`)
      if (first) first.focus()
      return
    }

    const params = {
      name: panel.querySelector('[data-field="name"]').value.trim(),
      shelf_life: panel.querySelector('[data-field="shelf-life"]').value.trim(),
      serving_unit: panel.querySelector('[data-field="serving-unit"]').value,
    }
    const sizeVal = panel.querySelector('[data-field="serving-size"]').value.trim()
    if (sizeVal) params.serving_size = sizeVal
    // Nutrition: blanks → 0 (the backend columns are non-null with default 0).
    for (const f of NUTRITION_FIELDS) {
      const input = panel.querySelector(`[data-nutrition="${f.key}"]`)
      const v = (input.value || '').trim()
      params[f.key] = v === '' ? 0 : v
    }

    saveBtn.dataset.loading = 'true'
    saveBtn.disabled = true
    try {
      await updateIngredientRequest(ing.id, params)
      ctrl.close()
      toast.success('Ingredient updated.')
      // Refetch the list rather than merge the PUT response: update_ingredient
      // returns remaining_shelf_life=None, so a shelf_life change would leave
      // the list badge / shelf-life sort stale until a full reload. The GET
      // recomputes it server-side.
      try {
        const ingredients = await fetchIngredients()
        state.ingredients = Array.isArray(ingredients) ? ingredients : []
        state.ingredients = sortByName(state.ingredients)
      } catch (_) { /* save already succeeded; keep the current list */ }
      render()
    } catch (err) {
      if (err && err.message === 'auth') return // redirected by handleAuthError
      saveBtn.dataset.loading = 'false'
      saveBtn.disabled = false
      if (err && err.message && /already exists/i.test(err.message)) {
        setFieldError(panel, 'name', err.message)
        panel.querySelector('[data-field="name"]').focus()
      } else {
        toast.error(err && err.message ? err.message : 'Could not save that ingredient. Please try again.', { title: 'Save failed' })
      }
    }
  })
}

/* ------------------------------ Delete ------------------------------- */

function openDeleteModal(id, returnFocus) {
  const ing = state.ingredients.find((i) => i.id === id)
  if (!ing) return

  const body = `<p>This removes <strong class="text-primary">${esc(ing.name)}</strong> from your pantry. This cannot be undone.</p>`

  const ctrl = openModal({
    title: 'Delete ingredient?',
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
      await deleteIngredientRequest(id)
      state.ingredients = state.ingredients.filter((i) => i.id !== id)
      ctrl.close()
      render()
      toast.success('Ingredient deleted.')
    } catch (err) {
      if (err && err.message === 'auth') return // redirected by handleAuthError
      confirmBtn.dataset.loading = 'false'
      confirmBtn.disabled = false
      // 405: the backend reports the recipes still using it in `detail`.
      ctrl.close()
      toast.error(err && err.message ? err.message : 'Could not delete that ingredient. Please try again.', { title: 'Delete failed' })
    }
  })
  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

/* ------------------------------- Boot -------------------------------- */

async function load() {
  state.status = 'loading'
  state.error = null
  render()
  try {
    const ingredients = await fetchIngredients()
    state.ingredients = Array.isArray(ingredients) ? ingredients : []
    // The GET already sorts by name, but re-sort so a re-render after a
    // toggle/edit lands in the right place.
    state.ingredients = sortByName(state.ingredients)
    state.status = 'ready'
    render()
  } catch (err) {
    if (err && err.message === 'auth') return // redirected by handleAuthError
    state.status = 'error'
    state.error = err && err.message ? err.message : 'Unknown error'
    render()
  }
}

mountLayout({ activeNav: 'ingredients' })
load()