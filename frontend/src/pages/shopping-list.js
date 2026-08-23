/*
 * Shopping List Page — Material Flat Minimalist Architecture
 * ------------------------------------------------------------------
 * Aggregated grocery list generated from active meal plan minus pantry items,
 * interactive check-off, usage hints, progress tracking, and clipboard export.
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
  shoppingList: {},
  items: [],
  usageIndex: {},
  hasPlan: false,
  status: 'loading',
  error: null,
}

let purchased = loadPurchased()
let searchTerm = ''
let hidePurchased = false

const listEl = document.getElementById('shopping-list')
const progressEl = document.getElementById('shopping-progress')
const searchInput = document.getElementById('shopping-search')
const hidePurchasedInput = document.getElementById('hide-purchased')
const resetBtn = document.getElementById('uncheck-all')
const copyBtn = document.getElementById('copy-list-btn')
const countBadge = document.getElementById('shopping-count-badge')

/* ----------------------- LocalStorage Persistence -------------------- */

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
  if (countBadge) {
    countBadge.textContent = state.status === 'ready'
      ? `${state.items.length} items needed`
      : 'Calculating...'
  }

  renderProgress()
  if (state.status === 'loading') {
    renderSkeleton()
    syncResetBtn()
    return
  }
  if (state.status === 'error') {
    renderError()
    syncResetBtn()
    return
  }
  if (state.items.length === 0) {
    renderEmpty()
    syncResetBtn()
    return
  }
  renderList()
  syncResetBtn()
}

function syncResetBtn() {
  if (resetBtn) resetBtn.disabled = purchased.size === 0
}

function renderProgress() {
  if (!progressEl) return
  if (state.status !== 'ready') {
    progressEl.innerHTML = ''
    return
  }
  const { total, done, remaining } = progress(state.items, purchased)
  if (total === 0) {
    progressEl.innerHTML = ''
    return
  }
  const pct = total ? Math.round((done / total) * 100) : 0
  const isComplete = remaining === 0

  progressEl.innerHTML = `
    <div class="mp-card p-4 flex flex-col gap-2">
      <div class="flex items-center justify-between text-xs">
        <span class="font-semibold text-muted uppercase tracking-wider text-[10px]">Grocery Progress</span>
        <span class="font-bold text-primary tnum">${done} of ${total} checked (${pct}%)</span>
      </div>
      <div class="mp-progress h-2 bg-subtle">
        <div class="mp-progress-bar ${isComplete ? 'bg-emerald-500' : 'bg-accent'}" style="width: ${pct}%"></div>
      </div>
      <div class="flex items-center justify-between text-xs text-muted mt-0.5">
        <span>${isComplete ? '🎉 All grocery items acquired!' : `${remaining} items remaining to purchase`}</span>
        <span class="tnum font-medium">${remaining} left</span>
      </div>
    </div>`
}

function renderSkeleton() {
  listEl.innerHTML = Array.from({ length: 6 }).map(() => `
    <div class="p-3.5 border-b border-line-subtle last:border-0 flex items-center gap-3">
      <span class="mp-skeleton w-4 h-4 rounded"></span>
      <div class="flex-1">
        <div class="mp-skeleton mp-skeleton-line w-1/3 mb-1.5"></div>
        <div class="mp-skeleton mp-skeleton-line w-1/2 mb-0"></div>
      </div>
    </div>`).join('')
}

function renderError() {
  listEl.innerHTML = `
    <div class="mp-state mp-state-error p-8">
      <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 6v5M10 14v.01" stroke-linecap="round"/></svg>
      <p class="mp-state-title">Couldn't load shopping list</p>
      <p class="mp-state-desc">${esc(state.error || 'Something went wrong. Please check your network.')}</p>
      <button type="button" class="mp-btn mp-btn-secondary focus-ring mp-state-action" data-action="retry">Retry</button>
    </div>`
}

function renderEmpty() {
  const body = state.hasPlan
    ? {
        title: 'Everything in Stock!',
        desc: 'Your pantry already contains every ingredient needed for this week\'s planned meals.',
        action: null,
      }
    : {
        title: 'No Weekly Meals Planned',
        desc: 'Add recipes to your weekly schedule first, and your grocery shopping list will generate automatically.',
        action: { label: 'Go to Weekly Planner', href: 'index.html' },
      }

  listEl.innerHTML = `
    <div class="mp-state p-12">
      <div class="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-3">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
      </div>
      <p class="mp-state-title text-xl font-bold">${esc(body.title)}</p>
      <p class="mp-state-desc mt-1">${esc(body.desc)}</p>
      ${body.action ? `<a class="mp-btn mp-btn-primary focus-ring mp-state-action mt-4" href="${body.action.href}">${esc(body.action.label)}</a>` : ''}
    </div>`
}

function renderList() {
  const items = filteredItems()
  if (items.length === 0) {
    const desc = hidePurchased && searchTerm
      ? 'No items match your search, and the rest are checked off.'
      : hidePurchased
        ? 'All items are checked off! Turn off "Hide Checked" to view completed items.'
        : 'No ingredients match your filter.'
    listEl.innerHTML = `
      <div class="mp-state p-10">
        <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="M14 14l3 3" stroke-linecap="round"/></svg>
        <p class="mp-state-title">No matching items</p>
        <p class="mp-state-desc mt-1">${esc(desc)}</p>
      </div>`
    return
  }

  listEl.innerHTML = items.map(itemRow).join('')
}

function itemRow(item) {
  const checked = purchased.has(item.key)
  const usage = formatUsageHint(item.usage)
  const usageTitle = item.usage.length
    ? `Used in: ${item.usage.map((u) => `${u.day} ${MEAL_LABELS[u.meal] || u.meal} (${u.recipeName})`).join(', ')}`
    : ''
  const qty = `${formatQuantity(item.quantity)} ${esc(item.servingUnit || '')}`.trim()
  const nameCls = checked ? 'line-through text-muted opacity-60' : 'text-primary font-medium'
  const rowBg = checked ? 'bg-subtle/40' : 'hover:bg-subtle/50'

  return `
    <label class="mp-check w-full p-3.5 border-b border-line-subtle last:border-0 transition-all cursor-pointer ${rowBg}" data-key="${esc(item.key)}">
      <input type="checkbox" data-action="toggle" data-key="${esc(item.key)}"${checked ? ' checked' : ''} class="mt-0.5">
      <span class="flex-1 min-w-0">
        <span class="flex items-center justify-between gap-3">
          <span class="${nameCls} text-sm truncate transition-all">${esc(item.name)}</span>
          <span class="mp-badge mp-badge-outline text-xs font-semibold tnum flex-none">${qty}</span>
        </span>
        ${usage ? `<span class="inline-flex items-center gap-1 text-[11px] text-muted truncate mt-1"${usageTitle ? ` title="${esc(usageTitle)}"` : ''}><span class="w-1.5 h-1.5 rounded-full bg-accent/60"></span>${esc(usage)}</span>` : ''}
      </span>
    </label>`
}

/* ------------------------- Event Delegation -------------------------- */

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

listEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="retry"]')
  if (btn) load()
})

function restoreFocus(key) {
  requestAnimationFrame(() => {
    const cb = listEl.querySelector(`input[data-action="toggle"][data-key="${cssEsc(key)}"]`)
    if (cb) cb.focus()
  })
}

function cssEsc(s) {
  return String(s).replace(/["\\]/g, '\\$&')
}

if (searchInput) {
  searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value
    render()
  })
}

if (hidePurchasedInput) {
  hidePurchasedInput.addEventListener('change', () => {
    hidePurchased = hidePurchasedInput.checked
    render()
  })
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (purchased.size === 0) return
    purchased = new Set()
    savePurchased()
    toast.info('Shopping check-marks reset.')
    render()
  })
}

// Copy List to Clipboard
if (copyBtn) {
  copyBtn.addEventListener('click', () => {
    if (!state.items.length) {
      toast.warning('No shopping items to copy.')
      return
    }
    const lines = state.items.map((i) => {
      const isDone = purchased.has(i.key) ? '[x]' : '[ ]'
      const qty = `${formatQuantity(i.quantity)} ${i.servingUnit || ''}`.trim()
      return `${isDone} ${i.name} - ${qty}`
    })
    const text = `Weekly Grocery Shopping List:\n\n${lines.join('\n')}`

    navigator.clipboard.writeText(text).then(
      () => toast.success('Shopping list copied to clipboard!'),
      () => toast.error('Failed to copy to clipboard.')
    )
  })
}

/* ------------------------------- Boot -------------------------------- */

async function load() {
  state.status = 'loading'
  state.error = null
  render()
  try {
    const shoppingList = await fetchShoppingList()
    state.shoppingList = shoppingList || {}

    try {
      const [plan, recipes] = await Promise.all([fetchPlan(), fetchRecipes()])
      state.usageIndex = buildUsageIndex(plan || {}, Array.isArray(recipes) ? recipes : [])
      state.hasPlan = planHasEntries(plan)
    } catch (enrichErr) {
      if (enrichErr && enrichErr.message === 'auth') throw enrichErr
      state.usageIndex = {}
      state.hasPlan = false
      toast.warning('Day/meal hints offline — showing items only.', { title: 'Hints Offline', duration: 4000 })
    }

    state.items = mergeItems(state.shoppingList, state.usageIndex)
    state.status = 'ready'
    render()
  } catch (err) {
    if (err && err.message === 'auth') return
    state.status = 'error'
    state.error = err && err.message ? err.message : 'Unknown error'
    render()
  }
}

mountLayout({ activeNav: 'shopping' })
load()