/*
 * Shopping List page entry + page-content logic (T7)
 * ------------------------------------------------------------------
 * The one NEW view in the frontend modernization. It generates the week's
 * shopping list from the existing /utilities/shopping-list endpoint (which
 * aggregates the ingredients of every planned recipe and drops the ones
 * already in the user's pantry — no backend work), then enriches each line
 * with a "which day/meal uses this" hint derived client-side from the weekly
 * plan + recipes (the endpoint doesn't carry that).
 *
 * Built on the T3 component catalog, the same way the planner / recipe-hub /
 * ingredients pages are:
 *   • Token-driven .mp-* components; loading / empty / error states instead
 *     of blank-or-silent failures; feedback via toast.js (no alert/console).
 *   • Check-off is a client-only affordance (there is no persisted-purchase
 *     endpoint) stored in localStorage, keyed by ingredient name, so it
 *     survives a regenerated list until the ingredient is no longer needed.
 *   • The pure helpers (merge, usage index, filter, progress, formatting)
 *     live in shopping-list-logic.js and are unit-tested in isolation; this
 *     module is the DOM/fetch glue.
 */
import { mountLayout } from '../bootstrap.js'
import { toast } from '../components/toast.js'
import {
  MEAL_LABELS,
  formatQuantity,
  formatUsageHint,
  buildUsageIndex,
  mergeItems,
  filterItems,
  progress,
  planHasEntries,
} from './shopping-list-logic.js'

/* ----------------------------- Constants ----------------------------- */

const API_BASE = '/api'

const PURCHASED_KEY = 'mp-shopping-purchased'

/* ------------------------------- State ------------------------------- */

const state = {
  shoppingList: {},    // raw /utilities/shopping-list response
  items: [],           // merged render items (mergeItems output)
  usageIndex: {},      // ingredientName -> usage entries (buildUsageIndex)
  hasPlan: false,      // whether the week has any assigned slot at all
  status: 'loading',   // 'loading' | 'ready' | 'error'
  error: null,
}

let purchased = loadPurchased()       // Set<string> of purchased ingredient keys
let searchTerm = ''
let hidePurchased = false

const listEl = document.getElementById('shopping-list')
const progressEl = document.getElementById('shopping-progress')
const searchInput = document.getElementById('shopping-search')
const hidePurchasedInput = document.getElementById('hide-purchased')
const resetBtn = document.getElementById('uncheck-all')

/* ----------------------- localStorage persistence ----------------------- */
// Check-off has no backend, so purchased state lives in localStorage as a
// small JSON array of ingredient keys. The shopping list is regenerated from
// the plan on every load, so stale keys (an ingredient no longer needed) are
// harmless: progress() and the render both ignore purchased keys that aren't
// in the current list.

function loadPurchased() {
  try {
    const raw = localStorage.getItem(PURCHASED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set()
  } catch (_) {
    return new Set()
  }
}

function savePurchased() {
  try { localStorage.setItem(PURCHASED_KEY, JSON.stringify([...purchased])) } catch (_) {}
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

async function fetchShoppingList() {
  const resp = await fetch(`${API_BASE}/utilities/shopping-list`, { headers: authHeaders() })
  if (handleAuthError(resp)) throw new Error('auth')
  if (!resp.ok) throw new Error(`Shopping list failed (${resp.status})`)
  return resp.json()
}

async function fetchPlan() {
  const resp = await fetch(`${API_BASE}/weekly-plan`, { headers: authHeaders() })
  if (handleAuthError(resp)) throw new Error('auth')
  if (!resp.ok) throw new Error(`Plan failed (${resp.status})`)
  return resp.json()
}

async function fetchRecipes() {
  const resp = await fetch(`${API_BASE}/recipes`, { headers: authHeaders() })
  if (handleAuthError(resp)) throw new Error('auth')
  if (!resp.ok) throw new Error(`Recipes failed (${resp.status})`)
  return resp.json()
}

// Escape reflected content (ingredient names, units) before innerHTML.
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/* ------------------------------- Render ------------------------------ */

function filteredItems() {
  return filterItems(state.items, { search: searchTerm, hidePurchased, purchased })
}

function render() {
  renderProgress()
  if (state.status === 'loading') { renderSkeleton(); syncResetBtn(); return }
  if (state.status === 'error') { renderError(); syncResetBtn(); return }
  if (state.items.length === 0) { renderEmpty(); syncResetBtn(); return }
  renderList()
  syncResetBtn()
}

// Enable Reset only when there's something checked off to clear.
function syncResetBtn() {
  resetBtn.disabled = purchased.size === 0
}

// Progress bar + summary over the WHOLE list (independent of the search /
// hide-purchased filters), so checking items off always moves the bar.
function renderProgress() {
  if (state.status !== 'ready') { progressEl.innerHTML = ''; return }
  const { total, done, remaining } = progress(state.items, purchased)
  if (total === 0) { progressEl.innerHTML = ''; return }
  const pct = total ? Math.round((done / total) * 100) : 0
  const label = remaining === 0
    ? `All ${total} items checked off`
    : `${done} of ${total} checked`
  progressEl.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="flex-1 h-2 rounded-full bg-subtle overflow-hidden" role="progressbar" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${total}" aria-label="${label}">
        <div class="h-full bg-accent transition-all" style="width:${pct}%"></div>
      </div>
      <span class="text-sm text-secondary tnum flex-none">${label}</span>
    </div>`
}

function renderSkeleton() {
  listEl.innerHTML = Array.from({ length: 6 }).map(() => `
    <div class="py-3 border-b border-line-subtle last:border-0">
      <div class="flex items-center gap-3">
        <span class="mp-skeleton" style="width:1.125rem;height:1.125rem;border-radius:0.25rem"></span>
        <div class="flex-1">
          <div class="mp-skeleton mp-skeleton-line" style="width:40%;margin:0 0 0.25rem"></div>
          <div class="mp-skeleton mp-skeleton-line" style="width:60%;margin:0"></div>
        </div>
      </div>
    </div>`).join('')
}

function renderError() {
  listEl.innerHTML = `
    <div class="mp-state mp-state-error">
      <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 6v5M10 14v.01" stroke-linecap="round"/></svg>
      <p class="mp-state-title">Couldn't load your shopping list</p>
      <p class="mp-state-desc">${esc(state.error || 'Something went wrong. Please try again.')}</p>
      <button type="button" class="mp-btn mp-btn-secondary focus-ring mp-state-action" data-action="retry">Retry</button>
    </div>`
}

function renderEmpty() {
  // Two empty shapes: no plan yet, or the pantry already covers the week.
  const body = state.hasPlan
    ? { title: 'Nothing to buy',
        desc: 'Your pantry already covers every ingredient in this week\'s plan.',
        action: null }
    : { title: 'No recipes planned yet',
        desc: 'Plan some meals for the week first, then come back for your shopping list.',
        action: { label: 'Go to Weekly Planner', href: 'index.html' } }

  listEl.innerHTML = `
    <div class="mp-state">
      <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h12l-1 9a1 1 0 01-1 1H6a1 1 0 01-1-1L4 7z"/><path d="M7 7V5a3 3 0 016 0v2" stroke-linecap="round"/></svg>
      <p class="mp-state-title">${esc(body.title)}</p>
      <p class="mp-state-desc">${esc(body.desc)}</p>
      ${body.action ? `<a class="mp-btn mp-btn-primary focus-ring mp-state-action" href="${body.action.href}">${esc(body.action.label)}</a>` : ''}
    </div>`
}

function renderList() {
  const items = filteredItems()
  if (items.length === 0) {
    // The list isn't empty but the filter cleared it — distinct from the true
    // empty state above so the user understands it's their filter, not the plan.
    const desc = hidePurchased && searchTerm
      ? 'No items match your search, and the rest are already checked off.'
      : hidePurchased
        ? 'Everything is checked off. Toggle "Hide checked" to review them.'
        : 'No items match your search.'
    listEl.innerHTML = `
      <div class="mp-state">
        <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="M14 14l3 3" stroke-linecap="round"/></svg>
        <p class="mp-state-title">No items to show</p>
        <p class="mp-state-desc">${esc(desc)}</p>
      </div>`
    return
  }

  listEl.innerHTML = items.map(itemRow).join('')
}

function itemRow(item) {
  const checked = purchased.has(item.key)
  const usage = formatUsageHint(item.usage)
  // Title attribute lists the full recipe breakdown for the hint, for when
  // the compact "Mon · Breakfast" line is truncated.
  const usageTitle = item.usage.length
    ? `Used in: ${item.usage.map((u) => `${u.day} ${MEAL_LABELS[u.meal] || u.meal} — ${u.recipeName}`).join(', ')}`
    : ''
  const qty = `${formatQuantity(item.quantity)} ${esc(item.servingUnit || '')}`.trim()
  const nameCls = checked ? 'line-through text-muted' : 'text-primary font-medium'
  return `
    <label class="mp-check w-full shopping-row py-3 border-b border-line-subtle last:border-0" data-key="${esc(item.key)}">
      <input type="checkbox" data-action="toggle" data-key="${esc(item.key)}"${checked ? ' checked' : ''}>
      <span class="flex-1 min-w-0">
        <span class="flex items-center justify-between gap-2">
          <span class="${nameCls} truncate">${esc(item.name)}</span>
          <span class="text-secondary tnum text-sm flex-none">${qty}</span>
        </span>
        ${usage ? `<span class="block text-muted text-xs truncate mt-0.5"${usageTitle ? ` title="${esc(usageTitle)}"` : ''}>${esc(usage)}</span>` : ''}
      </span>
    </label>`
}

/* ------------------------- Event delegation -------------------------- */

// Checkbox toggle: update purchased state, persist, re-render, and restore
// focus to the toggled checkbox so screen-reader / keyboard users keep their
// place in the list (a full re-render would otherwise drop focus to <body>).
listEl.addEventListener('change', (e) => {
  const cb = e.target.closest('input[type="checkbox"][data-action="toggle"]')
  if (!cb || !listEl.contains(cb)) return
  const key = cb.dataset.key
  if (cb.checked) purchased.add(key)
  else purchased.delete(key)
  savePurchased()
  render()
  restoreFocus(key)
})

// Retry from the error state.
listEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="retry"]')
  if (btn) load()
})

function restoreFocus(key) {
  // Defer until after the re-render's innerHTML swap lands in the DOM.
  requestAnimationFrame(() => {
    const cb = listEl.querySelector(`input[data-action="toggle"][data-key="${cssEsc(key)}"]`)
    if (cb) cb.focus()
  })
}

// Attribute selectors don't tolerate every character; escape for the
// querySelector (keys are lowercased ingredient names, so this is belt-and-
// braces, but a name with a "." or "[" would otherwise break the selector).
function cssEsc(s) {
  return String(s).replace(/["\\]/g, '\\$&')
}

// Live search — re-renders the list but keeps the input focused (it's in the
// stable toolbar, outside #shopping-list).
searchInput.addEventListener('input', () => {
  searchTerm = searchInput.value
  render()
})

hidePurchasedInput.addEventListener('change', () => {
  hidePurchased = hidePurchasedInput.checked
  render()
})

resetBtn.addEventListener('click', () => {
  if (purchased.size === 0) return
  purchased = new Set()
  savePurchased()
  toast.info('Shopping list reset.')
  render()
})

/* ------------------------------- Boot -------------------------------- */

async function load() {
  state.status = 'loading'
  state.error = null
  render()
  try {
    // The shopping list is the spec's primary deliverable. Fetch it first and
    // alone — a failure here is the only thing that sends the whole view to the
    // error state. The "which day/meal" hints are enrichment built from the
    // plan + recipes, so those are fetched best-effort below and must never
    // take the primary list down with them.
    const shoppingList = await fetchShoppingList()
    state.shoppingList = shoppingList || {}

    // Enrichment: rebuild the ingredient → (day, meal, recipe) index from the
    // plan + recipes so each line can show a "Mon · Breakfast" hint. If either
    // enrichment fetch fails, the list still renders — just without hints
    // (and a toast explains why), rather than blanking the whole view.
    try {
      const [plan, recipes] = await Promise.all([fetchPlan(), fetchRecipes()])
      state.usageIndex = buildUsageIndex(plan || {}, Array.isArray(recipes) ? recipes : [])
      state.hasPlan = planHasEntries(plan)
    } catch (enrichErr) {
      if (enrichErr && enrichErr.message === 'auth') throw enrichErr // auth is still fatal
      state.usageIndex = {}
      state.hasPlan = false
      toast.warning('Day/meal hints are unavailable — showing the list without them.', { title: 'Hints offline', duration: 6000 })
    }

    state.items = mergeItems(state.shoppingList, state.usageIndex)
    state.status = 'ready'
    render()
  } catch (err) {
    if (err && err.message === 'auth') return // redirected by handleAuthError
    state.status = 'error'
    state.error = err && err.message ? err.message : 'Unknown error'
    render()
  }
}

mountLayout({ activeNav: 'shopping' })
load()