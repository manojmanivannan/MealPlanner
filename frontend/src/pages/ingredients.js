/*
 * Ingredients Page — Material Flat Minimalist Architecture
 * ------------------------------------------------------------------
 * Master pantry & ingredient library, instant In-Pantry toggles,
 * freshness shelf-life monitoring, and comprehensive macro/mineral nutrition forms.
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
  resolveServingSizeOnUnitChange,
  countRecipesUsingIngredient,
  servingSizeWillRescale,
  formatRescaleFactor,
} from './ingredients-logic.js'

/* ----------------------------- Constants ----------------------------- */

const API_BASE = '/api'

const BADGE_TONE = {
  danger: 'mp-badge-danger',
  warning: 'mp-badge-warning',
  neutral: 'mp-badge-outline',
}

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
  ingredients: [],
  units: [],
  status: 'loading',
  error: null,
  sort: 'name',
  searchTerm: '',
}

let unitsCache = null

const grid = document.getElementById('ingredient-grid')
const searchInput = document.getElementById('ingredient-search')
const sortSelect = document.getElementById('sort-select')
const addBtn = document.getElementById('add-ingredient-btn')
const countBadge = document.getElementById('ingredient-count-badge')
const metricsStrip = document.getElementById('pantry-metrics-strip')

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
    try { detail = (await resp.json()).detail } catch (_) {}
    throw new Error(detail || `Request failed (${resp.status})`)
  }
  if (resp.status === 204) return null
  return resp.json()
}

async function fetchIngredients() {
  return fetchJson(`${API_BASE}/ingredients?sort=name`)
}

async function fetchRecipes() {
  return fetchJson(`${API_BASE}/recipes`)
}

async function fetchServingUnits() {
  return fetchJson(`${API_BASE}/utilities/list-serving-units`)
}

async function createIngredientRequest({ name, shelf_life, serving_unit }) {
  const params = new URLSearchParams({ name, shelf_life, serving_unit })
  return fetchJson(`${API_BASE}/ingredients?${params.toString()}`, { method: 'POST' })
}

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
  if (!resp.ok) throw new Error(detail || `Delete failed (${resp.status})`)
  return null
}

/* ------------------------------- Render ------------------------------ */

function render() {
  if (countBadge) {
    countBadge.textContent = state.status === 'ready'
      ? `${state.ingredients.length} items`
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

  renderMetrics()

  const filtered = filterIngredients(state.ingredients, state.searchTerm)
  if (state.ingredients.length === 0) {
    renderEmpty()
    return
  }
  if (filtered.length === 0) {
    renderNoMatches()
    return
  }
  renderList(filtered)
}

function renderMetrics() {
  if (!metricsStrip) return

  const total = state.ingredients.length
  const available = state.ingredients.filter((i) => i.available).length
  const expiring = state.ingredients.filter((i) => i.available && i.remaining_shelf_life != null && i.remaining_shelf_life <= 2).length
  const inStockPct = total > 0 ? Math.round((available / total) * 100) : 0

  metricsStrip.innerHTML = `
    <!-- Total Library -->
    <div class="mp-card p-4 flex flex-col justify-between flex-none w-[170px] sm:w-auto snap-start">
      <div class="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">Master Library</div>
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-bold text-primary tnum">${total}</span>
        <span class="text-xs text-muted">items</span>
      </div>
      <span class="text-xs text-muted mt-2 truncate">Nutrient library</span>
    </div>

    <!-- In Pantry -->
    <div class="mp-card p-4 flex flex-col justify-between flex-none w-[170px] sm:w-auto snap-start">
      <div class="flex items-center justify-between text-xs text-muted mb-1">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-muted">In Pantry</span>
        <span class="font-bold text-emerald-600 dark:text-emerald-400 tnum">${available}/${total}</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tnum">${inStockPct}%</span>
        <span class="text-xs text-muted">available</span>
      </div>
      <div class="mp-progress mt-2 h-1.5 bg-subtle">
        <div class="mp-progress-bar bg-emerald-500" style="width: ${inStockPct}%"></div>
      </div>
    </div>

    <!-- Freshness Watch -->
    <div class="mp-card p-4 flex flex-col justify-between flex-none w-[170px] sm:w-auto snap-start">
      <div class="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">Freshness Status</div>
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-bold ${expiring > 0 ? 'text-amber-500' : 'text-primary'} tnum">${expiring}</span>
        <span class="text-xs text-muted">expiring soon</span>
      </div>
      <span class="text-xs text-muted mt-2 truncate">${expiring > 0 ? 'Use in 48h' : 'Pantry fresh'}</span>
    </div>
  `
}

function renderSkeleton() {
  if (metricsStrip) {
    metricsStrip.innerHTML = Array.from({ length: 3 }).map(() => `
      <div class="mp-card p-4 flex-none w-[170px] sm:w-auto">
        <div class="mp-skeleton mp-skeleton-line w-1/3 mb-2"></div>
        <div class="mp-skeleton mp-skeleton-line w-1/2 h-8 rounded-lg"></div>
      </div>
    `).join('')
  }

  grid.innerHTML = Array.from({ length: 8 }).map(() => `
    <div class="mp-card p-4 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="mp-skeleton mp-skeleton-line w-1/2 mb-0"></span>
          <span class="mp-skeleton w-10 h-5 rounded-pill"></span>
        </div>
        <span class="mp-skeleton mp-skeleton-line w-3/4 mb-3"></span>
      </div>
      <div class="pt-3 border-t border-line-subtle flex justify-between items-center">
        <span class="mp-skeleton w-20 h-5 rounded-md"></span>
        <span class="mp-skeleton w-12 h-6 rounded-md"></span>
      </div>
    </div>`).join('')
}

function renderError() {
  if (metricsStrip) metricsStrip.innerHTML = ''
  grid.innerHTML = `
    <div class="col-span-full">
      <div class="mp-card mp-state mp-state-error p-8">
        <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 6v5M10 14v.01" stroke-linecap="round"/></svg>
        <p class="mp-state-title">Couldn't load ingredients</p>
        <p class="mp-state-desc">${esc(state.error || 'Something went wrong. Please check your connection.')}</p>
        <button type="button" class="mp-btn mp-btn-secondary focus-ring mp-state-action" data-action="retry">Retry</button>
      </div>
    </div>`
}

function renderEmpty() {
  if (metricsStrip) metricsStrip.innerHTML = ''
  grid.innerHTML = `
    <div class="col-span-full">
      <div class="mp-card mp-state p-12">
        <div class="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-3">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2a6 6 0 0 0-6 6c0 4 6 10 6 10s6-6 6-10a6 6 0 0 0-6-6z"/><circle cx="10" cy="8" r="2.5"/></svg>
        </div>
        <p class="mp-state-title text-xl font-bold">No ingredients added yet</p>
        <p class="mp-state-desc mt-1">Add pantry items and ingredients with complete nutrient profiles to calculate recipe macros.</p>
        <button type="button" class="mp-btn mp-btn-primary focus-ring mp-state-action mt-4" data-action="add">Add Ingredient</button>
      </div>
    </div>`
}

function renderNoMatches() {
  grid.innerHTML = `
    <div class="col-span-full">
      <div class="mp-card mp-state p-10">
        <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="M14 14l3 3" stroke-linecap="round"/></svg>
        <p class="mp-state-title">No ingredients match “${esc(state.searchTerm)}”</p>
        <p class="mp-state-desc mt-1">Try a different search term or add a new ingredient.</p>
        <button type="button" class="mp-btn mp-btn-secondary focus-ring mp-state-action mt-3" data-action="clear-filters">Clear Search</button>
      </div>
    </div>`
}

function renderList(ingredients) {
  if (state.sort === 'shelf') {
    grid.innerHTML = sortByShelfLife(ingredients).map(ingredientCard).join('')
  } else {
    const groups = groupByLetter(ingredients)
    grid.innerHTML = Object.keys(groups).map((letter) =>
      `<div class="col-span-full pt-4 first:pt-0 pb-1 border-b border-line">
         <h3 class="text-sm font-bold text-accent uppercase tracking-wider">${esc(letter)}</h3>
       </div>` +
      groups[letter].map(ingredientCard).join('')
    ).join('')
  }
}

function ingredientCard(ing) {
  const unit = ing.serving_unit || 'g'
  const badge = shelfLifeBadge(ing)
  const showShelfBadge = badge.shown
  const badgeClass = BADGE_TONE[badge.tone] || BADGE_TONE.neutral

  const cal = ing.energy != null ? `${ing.energy} kcal` : '—'
  const prot = ing.protein != null ? `${ing.protein}g` : '—'
  const carb = ing.carbs != null ? `${ing.carbs}g` : '—'
  const fat = ing.fat != null ? `${ing.fat}g` : '—'

  return `
    <article class="mp-card flex flex-col justify-between shadow-xs hover:shadow-md transition-all group" data-id="${ing.id}">
      <div>
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <h3 class="font-bold text-sm text-primary truncate" title="${esc(ing.name)}">${esc(ing.name)}</h3>
          <span class="mp-badge mp-badge-outline text-[11px]">${esc(unit)}</span>
        </div>

        <div class="flex items-center gap-1.5 mb-3">
          ${showShelfBadge ? `<span class="mp-badge ${badgeClass} text-[10px]">${esc(badge.text)}</span>` : ''}
          ${ing.serving_size ? `<span class="text-[11px] text-muted">${ing.serving_size} ${unit}/serv</span>` : ''}
        </div>

        <!-- Mini Macro Metric Chips -->
        <div class="grid grid-cols-4 gap-1 p-2 bg-subtle rounded-lg text-[10px] text-center tnum mb-3">
          <div><span class="block text-muted">Cal</span><span class="font-semibold text-primary">${cal}</span></div>
          <div><span class="block text-muted">Prot</span><span class="font-semibold text-emerald-600 dark:text-emerald-400">${prot}</span></div>
          <div><span class="block text-muted">Carb</span><span class="font-semibold text-blue-600 dark:text-blue-400">${carb}</span></div>
          <div><span class="block text-muted">Fat</span><span class="font-semibold text-rose-600 dark:text-rose-400">${fat}</span></div>
        </div>
      </div>

      <div class="flex items-center justify-between gap-2 pt-3 border-t border-line-subtle mt-auto">
        <label class="mp-switch" title="Toggle pantry availability">
          <input type="checkbox" data-action="toggle-available" data-id="${ing.id}" ${ing.available ? 'checked' : ''}>
          <span class="mp-switch-track"></span>
          <span class="text-xs font-medium text-secondary">In Pantry</span>
        </label>
        <div class="flex items-center gap-1">
          <button type="button" class="mp-btn mp-btn-ghost mp-btn-xs focus-ring text-secondary" data-action="edit" data-id="${ing.id}">Edit</button>
          <button type="button" class="mp-btn mp-btn-ghost mp-btn-icon mp-btn-xs focus-ring text-red-500 hover:bg-red-500/10" data-action="delete" data-id="${ing.id}" aria-label="Delete ${esc(ing.name)}" title="Delete ingredient">
            <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </article>`
}

/* ------------------------- Event Delegation -------------------------- */

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
      ing.remaining_shelf_life = ing.shelf_life
    }
    cb.disabled = false
    renderMetrics()
    if (state.sort === 'shelf') render()
    toast.success(available ? 'Marked as in pantry.' : 'Removed from pantry.')
  } catch (err) {
    if (err && err.message === 'auth') return
    cb.checked = !available
    cb.disabled = false
    toast.error(err && err.message ? err.message : 'Could not update pantry status.', { title: 'Update Failed' })
  }
})

if (addBtn) addBtn.addEventListener('click', () => openAddModal(addBtn))

if (searchInput) {
  searchInput.addEventListener('input', () => {
    state.searchTerm = searchInput.value
    render()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      e.preventDefault()
      searchInput.focus()
    }
  })
}

if (sortSelect) {
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value === 'shelf' ? 'shelf' : 'name'
    render()
  })
}

function clearFilters() {
  state.searchTerm = ''
  if (searchInput) searchInput.value = ''
  render()
}

/* ----------------------------- Field Helpers ------------------------ */

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

function readCoreFields(panel) {
  return {
    name: panel.querySelector('[data-field="name"]').value,
    shelf_life: panel.querySelector('[data-field="shelf-life"]').value,
    serving_unit: panel.querySelector('[data-field="serving-unit"]').value,
  }
}

function applyValidation(panel, extraErrors = {}, validationOptions = {}) {
  const values = { ...readCoreFields(panel) }
  const sizeInput = panel.querySelector('[data-field="serving-size"]')
  if (sizeInput) values.serving_size = sizeInput.value
  const { errors } = validateIngredient(values, validationOptions)
  const all = { ...errors, ...extraErrors }
  clearFieldErrors(panel)
  for (const key of Object.keys(all)) setFieldError(panel, key, all[key])
  return { valid: Object.keys(all).length === 0, errors: all }
}

/* ------------------------------- Add Modal -------------------------- */

async function openAddModal(returnFocus) {
  const units = await ensureUnits()

  const body = `
    <form id="add-ingredient-form" class="flex flex-col gap-4" novalidate>
      <div class="mp-field">
        <label class="mp-label" for="add-name">Ingredient Name<span class="mp-req">*</span></label>
        <input id="add-name" type="text" class="mp-input focus-ring" data-field="name" placeholder="e.g. Fresh Spinach" autocomplete="off" required>
        <p class="mp-error-text" data-err="name" style="display:none"></p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="mp-field">
          <label class="mp-label" for="add-shelf-life">Shelf Life (days)<span class="mp-req">*</span></label>
          <input id="add-shelf-life" type="number" min="1" step="1" class="mp-input focus-ring" data-field="shelf-life" placeholder="e.g. 7" required>
          <p class="mp-error-text" data-err="shelf-life" style="display:none"></p>
        </div>
        <div class="mp-field">
          <label class="mp-label" for="add-serving-unit">Serving Unit<span class="mp-req">*</span></label>
          <select id="add-serving-unit" class="mp-select focus-ring" data-field="serving-unit" required>
            ${unitOptions(units, 'g')}
          </select>
          <p class="mp-error-text" data-err="serving-unit" style="display:none"></p>
        </div>
      </div>
    </form>`

  const footer = `
    <button type="button" class="mp-btn mp-btn-ghost focus-ring" data-close>Cancel</button>
    <button type="button" class="mp-btn mp-btn-primary focus-ring" data-submit>Add to Library</button>`

  const ctrl = openModal({
    title: 'Add New Ingredient',
    body,
    footer,
    size: 'sm',
    returnFocus,
  })

  const submitBtn = ctrl.panel.querySelector('[data-submit]')
  submitBtn.addEventListener('click', async () => {
    const { valid } = applyValidation(ctrl.panel)
    if (!valid) return
    const values = readCoreFields(ctrl.panel)
    submitBtn.dataset.loading = 'true'
    submitBtn.disabled = true
    try {
      const created = await createIngredientRequest(values)
      state.ingredients.push(created)
      state.ingredients.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      ctrl.close()
      render()
      toast.success('Ingredient added to library.')
    } catch (err) {
      if (err && err.message === 'auth') return
      submitBtn.dataset.loading = 'false'
      submitBtn.disabled = false
      const msg = err && err.message ? err.message : 'Could not add ingredient.'
      if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('duplicate')) {
        applyValidation(ctrl.panel, { name: 'An ingredient with this name already exists.' })
      } else {
        toast.error(msg, { title: 'Add failed' })
      }
    }
  })
  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

/* ------------------------------- Edit Modal ------------------------- */

async function openEditModal(id, returnFocus) {
  const ing = state.ingredients.find((i) => i.id === id)
  if (!ing) return
  const units = await ensureUnits()

  function fieldInput(field, currentUnit) {
    const val = ing[field.key] == null ? '' : ing[field.key]
    const label = nutritionLabel(field, currentUnit)
    return `
      <div class="mp-field">
        <label class="mp-label" for="edit-${field.key}" data-label-for="${field.key}">${esc(label)}</label>
        <input id="edit-${field.key}" type="number" min="0" step="any" class="mp-input focus-ring" data-nut-field="${field.key}" value="${val}">
      </div>`
  }

  const initialUnit = ing.serving_unit || 'g'

  const body = `
    <form id="edit-ingredient-form" class="flex flex-col gap-4" novalidate>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="mp-field sm:col-span-2">
          <label class="mp-label" for="edit-name">Name<span class="mp-req">*</span></label>
          <input id="edit-name" type="text" class="mp-input focus-ring" data-field="name" value="${esc(ing.name)}" autocomplete="off" required>
          <p class="mp-error-text" data-err="name" style="display:none"></p>
        </div>
        <div class="mp-field">
          <label class="mp-label" for="edit-shelf-life">Shelf life (days)<span class="mp-req">*</span></label>
          <input id="edit-shelf-life" type="number" min="1" step="1" class="mp-input focus-ring" data-field="shelf-life" value="${ing.shelf_life ?? ''}" required>
          <p class="mp-error-text" data-err="shelf-life" style="display:none"></p>
        </div>
        <div class="mp-field">
          <label class="mp-label" for="edit-serving-unit">Serving unit<span class="mp-req">*</span></label>
          <select id="edit-serving-unit" class="mp-select focus-ring" data-field="serving-unit" required>
            ${unitOptions(units, initialUnit)}
          </select>
          <p class="mp-error-text" data-err="serving-unit" style="display:none"></p>
        </div>
        <div class="mp-field sm:col-span-2">
          <div data-elem="unit-change-banner" hidden class="mb-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs leading-relaxed"></div>
          <label class="mp-label" for="edit-serving-size" id="edit-serving-size-label">Serving size (${esc(initialUnit)} per serving)<span class="mp-req">*</span></label>
          <input id="edit-serving-size" type="number" min="0" step="any" class="mp-input focus-ring" data-field="serving-size" value="${ing.serving_size ?? ''}">
          <p class="mp-error-text" data-err="serving-size" style="display:none"></p>
        </div>
      </div>

      <!-- Macros Section -->
      <div class="pt-3 border-t border-line-subtle">
        <p class="text-xs font-bold text-muted uppercase tracking-wider mb-2.5">Macronutrients</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          ${MACRO_FIELDS.map((f) => fieldInput(f, initialUnit)).join('')}
        </div>
      </div>

      <!-- Minerals Progressive Disclosure -->
      <details class="mp-disclosure pt-2">
        <summary class="mp-disclosure-summary font-semibold text-xs text-muted uppercase tracking-wider">
          <svg class="mp-disclosure-chevron" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 8l4 4 4-4"/></svg>
          Minerals &amp; Vitamins (Optional)
        </summary>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          ${MINERAL_FIELDS.map((f) => fieldInput(f, initialUnit)).join('')}
        </div>
      </details>
    </form>`

  const footer = `
    <button type="button" class="mp-btn mp-btn-ghost focus-ring" data-close>Cancel</button>
    <button type="button" class="mp-btn mp-btn-primary focus-ring" data-save>Save Changes</button>`

  const ctrl = openModal({
    title: `Edit ${ing.name}`,
    body,
    footer,
    size: 'lg',
    returnFocus,
  })

  const unitSelect = ctrl.panel.querySelector('[data-field="serving-unit"]')
  const sizeInput = ctrl.panel.querySelector('[data-field="serving-size"]')
  const sizeLabel = ctrl.panel.querySelector('#edit-serving-size-label')
  const banner = ctrl.panel.querySelector('[data-elem="unit-change-banner"]')
  const originalSize = ing.serving_size ?? ''

  // The ingredients page does not load recipes; the affected-recipe count in
  // the unit-change banner lazily fetches them once per modal session.
  let recipesPromise = null
  function ensureRecipes() {
    if (!recipesPromise) recipesPromise = fetchRecipes().catch(() => null)
    return recipesPromise
  }

  // Tracks the value the modal last wrote into the size field, so a later
  // unit change knows whether the user has typed their own value. Any input
  // event hands ownership to the user, until the modal writes again.
  let lastAutoFill = String(originalSize)

  // Resolved banner count markup, null while the recipe fetch is pending.
  // Cached because the count depends only on the ingredient, not the unit.
  let bannerCountText = null

  function renderBanner() {
    if (banner.hidden) return
    // The factor text is recomputed from the LIVE field value here, so it
    // tracks the serving size the user edits while the banner is showing
    // (#42) — never a value captured when the banner first appeared.
    const factor = formatRescaleFactor(originalSize, sizeInput.value)
    const sizePart = factor
      ? `their quantities will be rescaled by <strong>${esc(factor)}</strong>`
      : 'their quantities will be rescaled by the new serving size'
    const countPart = bannerCountText == null ? '…' : esc(bannerCountText)
    const countClass = bannerCountText == null ? '' : ' font-semibold'
    // The banner tracks a coming rescale, which a serving-size change alone
    // can trigger (no unit change involved) — only claim a unit change when
    // the unit actually differs from the initial one.
    const unitPart = unitSelect.value === initialUnit
      ? ''
      : `Serving unit changed to <strong>${esc(unitSelect.value)}</strong>. `
    banner.innerHTML = `${unitPart}<span data-elem="banner-count"${countClass}>${countPart}</span> ${sizePart}. Confirm the new serving size.`
  }

  // Show the banner exactly when SAVING will rescale recipe quantities: any
  // serving size that differs from the stored one rescales, unit change or
  // not. Previously the banner was tied to the unit select, so switching the
  // unit back to the initial one hid the warning while a user-typed size
  // still rescaled recipes on save.
  function refreshBanner() {
    const rescales = servingSizeWillRescale(sizeInput.value, originalSize)
    banner.hidden = !rescales
    if (!rescales) return
    renderBanner()
    ensureRecipes().then((recipes) => {
      if (recipes) {
        const uses = countRecipesUsingIngredient(recipes, ing.name)
        bannerCountText = `${uses} ${uses === 1 ? 'recipe' : 'recipes'} use${uses === 1 ? 's' : ''} ${ing.name} and`
      } else {
        // Count unavailable: keep the message name-only.
        bannerCountText = `the recipes using ${ing.name}`
      }
      renderBanner()
    })
  }

  sizeInput.addEventListener('input', () => {
    lastAutoFill = null
    // Keep the promised rescale factor in step with the value being saved.
    refreshBanner()
  })

  function updateSizeLabel(unit) {
    if (sizeLabel) sizeLabel.innerHTML = `Serving size (${esc(unit)} per serving)<span class="mp-req">*</span>`
  }

  unitSelect.addEventListener('change', () => {
    const u = unitSelect.value
    NUTRITION_FIELDS.forEach((f) => {
      const label = ctrl.panel.querySelector(`[data-label-for="${f.key}"]`)
      if (label) label.textContent = nutritionLabel(f, u)
    })
    updateSizeLabel(u)

    // Unit changed: decide the field's next value and who owns it. A
    // user-typed size is never replaced; only a modal-written one gets
    // restored to the original size (back on the initial unit) or pre-filled
    // with the new unit's default.
    const next = resolveServingSizeOnUnitChange({
      current: sizeInput.value,
      lastAutoFill,
      originalSize: String(originalSize),
      newUnit: u,
      initialUnit,
    })
    sizeInput.value = next.value
    lastAutoFill = next.lastAutoFill

    refreshBanner()
  })

  const saveBtn = ctrl.panel.querySelector('[data-save]')
  saveBtn.addEventListener('click', async () => {
    const { valid } = applyValidation(ctrl.panel, {}, { requireServingSize: true })
    if (!valid) return
    // A number input mid-typing (e.g. "5e") reports value '' with badInput:
    // sending that would silently CLEAR the stored nutrition value instead
    // of saving what the user sees. Nutrition fields have no inline
    // validation, so guard here.
    const badInput = NUTRITION_FIELDS.some((f) => {
      const inp = ctrl.panel.querySelector(`[data-nut-field="${f.key}"]`)
      return inp && inp.validity && inp.validity.badInput
    })
    if (badInput) {
      toast.error('A nutrition field contains an incomplete number. Finish typing it or clear the field completely before saving.', { title: 'Check nutrition values' })
      return
    }
    const core = readCoreFields(ctrl.panel)
    const sizeVal = ctrl.panel.querySelector('[data-field="serving-size"]').value
    const params = {
      name: core.name.trim(),
      shelf_life: core.shelf_life,
      serving_unit: core.serving_unit,
      // Required by validation now, so always sent as a number.
      serving_size: sizeVal,
    }
    // Every nutrition field is re-sent on each save; a cleared field is
    // sent as an empty string, which the backend PUT treats as "unset to
    // NULL" (#41) — not as a parse error or a no-op.
    NUTRITION_FIELDS.forEach((f) => {
      const inp = ctrl.panel.querySelector(`[data-nut-field="${f.key}"]`)
      if (inp) params[f.key] = inp.value
    })

    saveBtn.dataset.loading = 'true'
    saveBtn.disabled = true
    try {
      const updated = await updateIngredientRequest(id, params)
      const idx = state.ingredients.findIndex((i) => i.id === id)
      if (idx !== -1) state.ingredients[idx] = updated
      state.ingredients.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      ctrl.close()
      render()
      toast.success('Ingredient updated.')
    } catch (err) {
      if (err && err.message === 'auth') return
      saveBtn.dataset.loading = 'false'
      saveBtn.disabled = false
      const msg = err && err.message ? err.message : 'Could not save ingredient.'
      if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('duplicate')) {
        applyValidation(ctrl.panel, { name: 'An ingredient with this name already exists.' })
      } else {
        toast.error(msg, { title: 'Save Failed' })
      }
    }
  })

  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

/* ------------------------------- Delete Modal ----------------------- */

function openDeleteModal(id, returnFocus) {
  const ing = state.ingredients.find((i) => i.id === id)
  if (!ing) return

  const body = `<p class="text-secondary text-sm">Are you sure you want to delete <strong class="text-primary">${esc(ing.name)}</strong>? Recipes using this ingredient will no longer reference it.</p>`

  const ctrl = openModal({
    title: 'Delete Ingredient?',
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
      toast.success('Ingredient removed.')
    } catch (err) {
      if (err && err.message === 'auth') return
      confirmBtn.dataset.loading = 'false'
      confirmBtn.disabled = false
      toast.error(err && err.message ? err.message : 'Could not delete that ingredient.', { title: 'Delete Failed' })
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
    const list = await fetchIngredients()
    state.ingredients = Array.isArray(list) ? list : []
    state.status = 'ready'
    render()
  } catch (err) {
    if (err && err.message === 'auth') return
    state.status = 'error'
    state.error = err && err.message ? err.message : 'Unknown error'
    render()
  }
}

mountLayout({ activeNav: 'ingredients' })
load()