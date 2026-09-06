/*
 * Weekly Planner Page — Material Flat Minimalist Architecture
 * ------------------------------------------------------------------
 * Interactive 7-day meal planning across 5 slots with dynamic nutrition
 * calculations, searchable recipe assignment, copy day automation, and PDF export.
 */
import { mountLayout } from '../bootstrap.js'
import { openModal } from '../components/modal.js'
import { toast } from '../components/toast.js'
import {
  DAYS,
  DAY_SHORT,
  MEAL_ORDER,
  MEAL_LABELS,
} from './shopping-list-logic.js'
import { availablePantryNames, pantryChipClass } from './ingredients-logic.js'

/* ----------------------------- Constants ----------------------------- */

const API_BASE = '/api'
const RECENT_KEY = 'mp-recent-recipes'

const DAY_TOKEN = {
  Monday: 'mon',
  Tuesday: 'tue',
  Wednesday: 'wed',
  Thursday: 'thu',
  Friday: 'fri',
  Saturday: 'sat',
  Sunday: 'sun',
}

const MEAL_SLOTS = ['pre_breakfast', 'breakfast', 'lunch', 'snack', 'dinner']

const MEAL_ICONS = {
  pre_breakfast: '🌅',
  breakfast: '🍳',
  lunch: '🥗',
  snack: '🍎',
  dinner: '🍲',
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

function getCurrentDayName() {
  const dayIndex = new Date().getDay()
  const mapping = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return mapping[dayIndex] || 'Monday'
}

const state = {
  recipes: [],
  plan: {},
  status: 'loading',
  error: null,
  mobileSelectedDay: getCurrentDayName(),
}

let recentIds = loadRecent()

const grid = document.getElementById('meal-plan-grid')
const summaryBanner = document.getElementById('week-summary-banner')
const dayPicker = document.getElementById('mobile-day-picker')
const exportPdfBtn = document.getElementById('export-pdf-btn')
const weekLabel = document.getElementById('current-week-label')

/* ----------------------- LocalStorage Persistence -------------------- */

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.map(Number).filter(Boolean) : []
  } catch (_) {
    return []
  }
}

function recordRecent(id) {
  if (!id) return
  recentIds = [id, ...recentIds.filter((x) => x !== id)].slice(0, 10)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentIds))
  } catch (_) {}
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

async function fetchPantryIngredients() {
  return fetchJson(`${API_BASE}/ingredients?sort=name`)
}

/* Pantry availability for the recipe-detail chips. Loaded once, in the
 * background alongside the plan; a failed fetch caches null so the chips
 * stay neutral instead of falsely flagging everything missing. */
let pantryNamesCache
let pantryNamesPromise = null

function pantryNames() {
  if (!pantryNamesPromise) {
    pantryNamesPromise = fetchPantryIngredients()
      .then((list) => { pantryNamesCache = availablePantryNames(list) })
      .catch((err) => {
        if (err && err.message === 'auth') throw err
        pantryNamesCache = null
      })
  }
  return pantryNamesPromise.then(() => pantryNamesCache)
}

async function putSlot(day, meal, recipeIds) {
  return fetchJson(`${API_BASE}/weekly-plan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ day, meal_type: meal, recipe_ids: recipeIds }),
  })
}

async function putFullPlan(plan) {
  return fetchJson(`${API_BASE}/weekly-plan/all`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  })
}

/* --------------------------- Nutrition Helpers ------------------------ */

function emptyNutrition() {
  return { energy: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
}

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
  if (state.status === 'loading') {
    renderSkeleton()
    return
  }
  if (state.status === 'error') {
    renderError()
    return
  }
  if (state.recipes.length === 0 && !hasPlan()) {
    renderEmpty()
    return
  }
  renderSummaryBanner()
  renderMobileDayPicker()
  renderGrid()
}

function renderSummaryBanner() {
  if (!summaryBanner) return

  let totalMeals = 0
  const maxMeals = DAYS.length * MEAL_SLOTS.length
  const weekTotals = emptyNutrition()

  DAYS.forEach((day) => {
    MEAL_SLOTS.forEach((meal) => {
      const ids = slotIds(day, meal)
      if (ids.length > 0) {
        totalMeals++
        addInto(weekTotals, sumNutrition(ids))
      }
    })
  })

  const dailyAvg = {
    energy: weekTotals.energy / 7,
    protein: weekTotals.protein / 7,
    carbs: weekTotals.carbs / 7,
    fat: weekTotals.fat / 7,
    fiber: weekTotals.fiber / 7,
  }

  const completionPct = Math.round((totalMeals / maxMeals) * 100)

  summaryBanner.innerHTML = `
    <!-- Planned Meals Metric -->
    <div class="mp-card p-3.5 flex flex-col justify-between flex-none w-[145px] sm:w-auto snap-start">
      <div class="flex items-center justify-between text-xs text-muted mb-1">
        <span class="font-medium uppercase tracking-wider text-[10px]">Planned Meals</span>
        <span class="font-semibold text-primary tnum">${totalMeals}/${maxMeals}</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-xl font-bold text-primary tnum">${completionPct}%</span>
        <span class="text-[11px] text-muted">of weekly plan</span>
      </div>
      <div class="mp-progress mt-2 h-1.5 bg-subtle">
        <div class="mp-progress-bar bg-accent" style="width: ${completionPct}%"></div>
      </div>
    </div>

    <!-- Avg Calories Metric -->
    <div class="mp-card p-3.5 flex flex-col justify-between flex-none w-[145px] sm:w-auto snap-start">
      <div class="text-xs text-muted uppercase tracking-wider text-[10px] mb-1 font-medium">Avg Daily Cal</div>
      <div class="flex items-baseline gap-1">
        <span class="text-xl font-bold text-primary tnum">${fmt(dailyAvg.energy, 0)}</span>
        <span class="text-xs text-muted">kcal/day</span>
      </div>
      <span class="text-[11px] text-muted truncate mt-1">Total: ${fmt(weekTotals.energy, 0)} kcal</span>
    </div>

    <!-- Avg Protein Metric -->
    <div class="mp-card p-3.5 flex flex-col justify-between flex-none w-[145px] sm:w-auto snap-start">
      <div class="text-xs text-muted uppercase tracking-wider text-[10px] mb-1 font-medium">Avg Daily Protein</div>
      <div class="flex items-baseline gap-1">
        <span class="text-xl font-bold text-emerald-600 dark:text-emerald-400 tnum">${fmt(dailyAvg.protein, 1)}</span>
        <span class="text-xs text-muted">g/day</span>
      </div>
      <span class="text-[11px] text-muted truncate mt-1">Total: ${fmt(weekTotals.protein, 0)} g</span>
    </div>

    <!-- Avg Carbs Metric -->
    <div class="mp-card p-3.5 flex flex-col justify-between flex-none w-[145px] sm:w-auto snap-start">
      <div class="text-xs text-muted uppercase tracking-wider text-[10px] mb-1 font-medium">Avg Daily Carbs</div>
      <div class="flex items-baseline gap-1">
        <span class="text-xl font-bold text-blue-600 dark:text-blue-400 tnum">${fmt(dailyAvg.carbs, 1)}</span>
        <span class="text-xs text-muted">g/day</span>
      </div>
      <span class="text-[11px] text-muted truncate mt-1">Total: ${fmt(weekTotals.carbs, 0)} g</span>
    </div>

    <!-- Avg Fat Metric -->
    <div class="mp-card p-3.5 flex flex-col justify-between flex-none w-[145px] sm:w-auto snap-start">
      <div class="text-xs text-muted uppercase tracking-wider text-[10px] mb-1 font-medium">Avg Daily Fat</div>
      <div class="flex items-baseline gap-1">
        <span class="text-xl font-bold text-rose-600 dark:text-rose-400 tnum">${fmt(dailyAvg.fat, 1)}</span>
        <span class="text-xs text-muted">g/day</span>
      </div>
      <span class="text-[11px] text-muted truncate mt-1">Total: ${fmt(weekTotals.fat, 0)} g</span>
    </div>

    <!-- Avg Fiber Metric -->
    <div class="mp-card p-3.5 flex flex-col justify-between flex-none w-[145px] sm:w-auto snap-start">
      <div class="text-xs text-muted uppercase tracking-wider text-[10px] mb-1 font-medium">Avg Daily Fiber</div>
      <div class="flex items-baseline gap-1">
        <span class="text-xl font-bold text-purple-600 dark:text-purple-400 tnum">${fmt(dailyAvg.fiber, 0)}</span>
        <span class="text-xs text-muted">g/day</span>
      </div>
      <span class="text-[11px] text-muted truncate mt-1">Total: ${fmt(weekTotals.fiber, 0)} g</span>
    </div>
  `
}

function renderMobileDayPicker() {
  if (!dayPicker) return

  const items = [
    { key: 'all', label: 'All', count: '' },
    ...DAYS.map((d) => {
      let count = 0
      MEAL_SLOTS.forEach((m) => {
        const ids = slotIds(d, m)
        if (ids.length && ids.some((id) => state.recipes.find((r) => r.id === id))) count++
      })
      return { key: d, label: DAY_SHORT[d] || d.slice(0, 3), count: `${count}/5` }
    }),
  ]

  dayPicker.innerHTML = items.map((item) => {
    const active = state.mobileSelectedDay === item.key
    return `
      <button type="button" class="mp-day-picker-item ${active ? 'active' : ''}" data-day-pick="${item.key}" role="tab" aria-selected="${active}">
        <span class="font-bold text-xs uppercase tracking-tight">${item.label}</span>
        ${item.count ? `<span class="text-[10px] text-muted font-medium mt-0.5 tnum">${item.count}</span>` : ''}
      </button>`
  }).join('')
}

function renderSkeleton() {
  if (summaryBanner) {
    summaryBanner.innerHTML = Array.from({ length: 6 }).map(() => `
      <div class="mp-card p-4 flex-none w-[145px] sm:w-auto">
        <div class="mp-skeleton mp-skeleton-line" style="width: 50%"></div>
        <div class="mp-skeleton mp-skeleton-line" style="width: 80%; height: 1.5rem; margin-top: 0.5rem"></div>
      </div>
    `).join('')
  }

  grid.innerHTML = DAYS.map(() => `
    <div class="mp-card p-4">
      <div class="flex items-center justify-between pb-3 border-b border-line-subtle mb-3">
        <div class="flex items-center gap-2">
          <span class="mp-skeleton w-3 h-3 rounded-full"></span>
          <span class="mp-skeleton mp-skeleton-line w-20 mb-0"></span>
        </div>
        <span class="mp-skeleton w-12 h-5 rounded-pill"></span>
      </div>
      ${Array.from({ length: 5 }).map(() => `
        <div class="py-2.5 border-b border-line-subtle last:border-0">
          <div class="mp-skeleton mp-skeleton-line w-16 mb-2"></div>
          <div class="mp-skeleton mp-skeleton-line w-full h-8 rounded-lg"></div>
        </div>
      `).join('')}
      <div class="mt-3 pt-2">
        <div class="mp-skeleton mp-skeleton-line w-3/4"></div>
      </div>
    </div>`).join('')
}

function renderError() {
  if (summaryBanner) summaryBanner.innerHTML = ''
  if (dayPicker) dayPicker.innerHTML = ''
  grid.innerHTML = `
    <div class="col-span-full">
      <div class="mp-card mp-state mp-state-error p-8">
        <svg class="mp-state-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 6v5M10 14v.01" stroke-linecap="round"/></svg>
        <p class="mp-state-title">Couldn't load weekly plan</p>
        <p class="mp-state-desc">${esc(state.error || 'Something went wrong. Please check your connection and try again.')}</p>
        <button type="button" class="mp-btn mp-btn-secondary focus-ring mp-state-action" data-action="retry">Retry</button>
      </div>
    </div>`
}

function renderEmpty() {
  if (summaryBanner) summaryBanner.innerHTML = ''
  if (dayPicker) dayPicker.innerHTML = ''
  grid.innerHTML = `
    <div class="col-span-full">
      <div class="mp-card mp-state p-12">
        <div class="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-3">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>
        </div>
        <p class="mp-state-title text-xl font-bold">No recipes created yet</p>
        <p class="mp-state-desc mt-1">Get started by creating recipes in the Recipe Hub, then organize your weekly meal schedule here.</p>
        <a class="mp-btn mp-btn-primary focus-ring mp-state-action mt-4" href="recipe-hub.html">Go to Recipe Hub</a>
      </div>
    </div>`
}

function renderGrid() {
  const isMobile = window.innerWidth < 768
  const daysToRender = (isMobile && state.mobileSelectedDay !== 'all')
    ? [state.mobileSelectedDay]
    : DAYS

  grid.innerHTML = daysToRender.map((day) => dayCard(day)).join('')
}

/* ----------------------------- Day Card ------------------------------ */

function dayCard(day) {
  const tok = DAY_TOKEN[day]
  const isToday = day === getCurrentDayName()
  const dayTotals = emptyNutrition()
  let plannedCount = 0

  const slots = MEAL_SLOTS.map((meal) => {
    const ids = slotIds(day, meal)
    if (ids.length && ids.some((id) => state.recipes.find((r) => r.id === id))) {
      plannedCount++
    }
    const n = sumNutrition(ids)
    addInto(dayTotals, n)
    return mealSlot(day, meal, ids)
  }).join('')

  return `
    <article class="mp-card mp-card-day ${isToday ? 'mp-card-today' : ''} p-3 sm:p-3.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all" style="--day-color:var(--day-${tok});--day-fg:var(--day-${tok}-fg);--day-soft:var(--day-${tok}-soft)">
      <div>
        <!-- Card Day Header (Full Day Name Never Truncated) -->
        <header class="flex items-center justify-between gap-1.5 pb-2 border-b border-line-subtle mb-2.5">
          <div class="flex items-center gap-1.5 min-w-0 flex-1">
            <span class="day-dot flex-none" aria-hidden="true"></span>
            <h2 class="font-bold text-sm sm:text-base text-primary tracking-tight whitespace-nowrap overflow-visible">${day}</h2>
            ${isToday ? '<span class="mp-badge mp-badge-day text-[10px] px-1.5 py-0.5 font-semibold uppercase tracking-wide">Today</span>' : ''}
          </div>
          <div class="flex items-center gap-1 flex-none">
            <span class="mp-badge mp-badge-day text-[11px] px-1.5 py-0.5 font-semibold" title="${plannedCount} of ${MEAL_SLOTS.length} meals planned">${plannedCount}/${MEAL_SLOTS.length}</span>
            <button type="button" class="mp-btn mp-btn-ghost mp-btn-icon mp-btn-xs focus-ring text-secondary hover:text-primary" data-action="copy-day" data-day="${day}" aria-label="Copy ${day}'s plan" title="Copy ${day}'s plan to other days">
              <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="7" width="9" height="9" rx="1.5"/><path d="M4 13V4a1 1 0 011-1h9"/></svg>
            </button>
          </div>
        </header>

        <!-- 5 Meal Slots -->
        <div class="flex flex-col divide-y divide-line-subtle">${slots}</div>
      </div>

      <!-- Day Nutrition Summary Footer -->
      ${dayFooter(dayTotals)}
    </article>`
}

/* ----------------------------- Meal Slot ------------------------------ */

function mealSlot(day, meal, ids) {
  const label = MEAL_LABELS[meal] || meal.replace('_', ' ')
  const icon = MEAL_ICONS[meal] || '🍽️'
  const occupied = ids.length > 0

  const chips = ids.map((rid) => {
    const recipe = state.recipes.find((r) => r.id === rid)
    if (!recipe) {
      return `
        <div class="flex items-center justify-between gap-1.5 w-full bg-subtle border border-line rounded-lg px-2.5 py-1.5 text-xs">
          <span class="text-muted italic truncate">Unknown recipe #${rid}</span>
          <button type="button" class="text-muted hover:text-red-500 p-0.5 rounded focus-ring" data-action="remove" data-day="${day}" data-meal="${meal}" data-recipe-id="${rid}" aria-label="Remove recipe" title="Remove">
            <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>
          </button>
        </div>`
    }

    const n = perRecipe(recipe)
    const dietDot = recipe.is_vegetarian
      ? `<span class="w-2 h-2 rounded-full bg-emerald-500 flex-none" title="Vegetarian"></span>`
      : `<span class="w-2 h-2 rounded-full bg-amber-500 flex-none" title="Non-Vegetarian"></span>`

    return `
      <div class="group relative flex flex-col gap-1 w-full bg-surface border border-line hover:border-border-strong rounded-lg p-2 transition-all shadow-xs">
        <div class="flex items-center justify-between gap-1.5 min-w-0">
          <div class="flex items-center gap-1.5 min-w-0 flex-1">
            ${dietDot}
            <button type="button" class="font-semibold text-xs text-primary hover:text-accent truncate text-left focus-ring" data-action="recipe" data-recipe-id="${rid}" title="View details for ${esc(recipe.name)}">
              ${esc(recipe.name)}
            </button>
          </div>
          <button type="button" class="text-muted hover:text-red-500 p-1 rounded hover:bg-subtle focus-ring transition-colors flex-none" data-action="remove" data-day="${day}" data-meal="${meal}" data-recipe-id="${rid}" aria-label="Remove ${esc(recipe.name)}" title="Remove recipe">
            <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>
          </button>
        </div>

        <!-- Recipe Macro Tag Row -->
        <div class="flex items-center gap-1.5 text-[10px] text-muted flex-wrap">
          <span class="font-bold text-primary tnum">${fmt(n.energy, 0)} kcal</span>
          <span class="text-muted/40">•</span>
          <span class="text-emerald-600 dark:text-emerald-400 font-medium tnum">${fmt(n.protein, 1)}g P</span>
          <span class="text-muted/40">•</span>
          <span class="text-blue-600 dark:text-blue-400 font-medium tnum">${fmt(n.carbs, 1)}g C</span>
          <span class="text-muted/40">•</span>
          <span class="text-rose-600 dark:text-rose-400 font-medium tnum">${fmt(n.fat, 1)}g F</span>
        </div>
      </div>`
  }).join('')

  return `
    <div class="mp-meal-slot py-2.5 first:pt-1.5 last:pb-1.5">
      <div class="flex items-center justify-between gap-2 mb-1.5">
        <span class="text-[11px] font-semibold text-secondary uppercase tracking-wider flex items-center gap-1">
          <span>${icon}</span>
          <span>${label}</span>
        </span>
        <div class="flex items-center gap-1">
          ${occupied ? `<button type="button" class="text-[10px] text-muted hover:text-red-500 font-medium px-1 py-0.5 rounded focus-ring" data-action="clear" data-day="${day}" data-meal="${meal}">Clear</button>` : ''}
          <button type="button" class="text-[10px] text-accent hover:text-accent-hover font-semibold px-1 py-0.5 rounded focus-ring" data-action="assign" data-day="${day}" data-meal="${meal}">${occupied ? '+ Add' : '+ Assign'}</button>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        ${chips || `
          <button type="button" class="w-full text-left py-2 px-2.5 border border-dashed border-line hover:border-accent/50 rounded-lg text-xs text-muted hover:text-accent hover:bg-accent/5 transition-all flex items-center justify-center gap-1.5 focus-ring" data-action="assign" data-day="${day}" data-meal="${meal}">
            <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>
            <span>Assign ${label.toLowerCase()}</span>
          </button>
        `}
      </div>
    </div>`
}

/* ------------------------- Day Summary Footer ------------------------ */

function dayFooter(dayTotals) {
  const p = Math.max(0, dayTotals.protein || 0)
  const c = Math.max(0, dayTotals.carbs || 0)
  const f = Math.max(0, dayTotals.fat || 0)
  const fib = Math.max(0, dayTotals.fiber || 0)
  const totalGrams = p + c + f + fib

  const protPct = totalGrams > 0 ? Math.round((p / totalGrams) * 100) : 25
  const carbPct = totalGrams > 0 ? Math.round((c / totalGrams) * 100) : 25
  const fatPct = totalGrams > 0 ? Math.round((f / totalGrams) * 100) : 25
  const fibPct = totalGrams > 0 ? Math.max(0, 100 - protPct - carbPct - fatPct) : 25

  return `
    <footer class="mt-3 pt-3 border-t border-line">
      <!-- Total Calories Line -->
      <div class="flex items-center justify-between mb-2">
        <span class="text-[11px] font-bold uppercase tracking-wider text-muted">Daily Total</span>
        <span class="text-sm font-bold text-primary tnum">${fmt(dayTotals.energy, 0)} <span class="text-xs font-normal text-muted">kcal</span></span>
      </div>

      <!-- Macro + Fiber Ratio Visual Strip (Protein / Carbs / Fat / Fiber) -->
      <div class="mp-macro-ratio mb-2.5" title="Protein ${protPct}% (${fmt(p, 1)}g) | Carbs ${carbPct}% (${fmt(c, 1)}g) | Fat ${fatPct}% (${fmt(f, 1)}g) | Fiber ${fibPct}% (${fmt(fib, 0)}g)">
        <div class="bg-emerald-500 transition-all" style="width: ${protPct}%" title="Protein: ${fmt(p, 1)}g (${protPct}%)"></div>
        <div class="bg-blue-500 transition-all" style="width: ${carbPct}%" title="Carbs: ${fmt(c, 1)}g (${carbPct}%)"></div>
        <div class="bg-rose-500 transition-all" style="width: ${fatPct}%" title="Fat: ${fmt(f, 1)}g (${fatPct}%)"></div>
        <div class="bg-purple-500 transition-all" style="width: ${fibPct}%" title="Fiber: ${fmt(fib, 0)}g (${fibPct}%)"></div>
      </div>

      <!-- 2x2 Macro Metric Cards (Clean & Uncrowded) -->
      <div class="mp-macro-grid">
        <div class="mp-macro-card">
          <span class="mp-macro-card-title">Protein</span>
          <span class="mp-macro-card-val text-emerald-600 dark:text-emerald-400">${fmt(dayTotals.protein, 1)}g</span>
        </div>
        <div class="mp-macro-card">
          <span class="mp-macro-card-title">Carbs</span>
          <span class="mp-macro-card-val text-blue-600 dark:text-blue-400">${fmt(dayTotals.carbs, 1)}g</span>
        </div>
        <div class="mp-macro-card">
          <span class="mp-macro-card-title">Fat</span>
          <span class="mp-macro-card-val text-rose-600 dark:text-rose-400">${fmt(dayTotals.fat, 1)}g</span>
        </div>
        <div class="mp-macro-card">
          <span class="mp-macro-card-title">Fiber</span>
          <span class="mp-macro-card-val text-purple-600 dark:text-purple-400">${fmt(dayTotals.fiber, 0)}g</span>
        </div>
      </div>
    </footer>`
}

/* --------------------------- Slot Accessors ------------------------- */

function slotIds(day, meal) {
  let ids = state.plan[day]?.[meal] || []
  if (!Array.isArray(ids)) ids = ids ? [ids] : []
  return ids
}

function hasPlan() {
  return Object.values(state.plan).some((day) =>
    Object.values(day || {}).some((arr) => Array.isArray(arr) && arr.length > 0)
  )
}

function recipesForMeal(meal) {
  if (meal === 'pre_breakfast') return state.recipes.filter((r) => r.meal_type === 'pre_breakfast')
  if (meal === 'snack') return state.recipes.filter((r) => r.meal_type === 'snack')
  return state.recipes.filter((r) => !['pre_breakfast', 'snack'].includes(r.meal_type))
}

/* ------------------------- Event Delegation -------------------------- */

grid.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]')
  if (!btn || !grid.contains(btn)) return
  const action = btn.dataset.action
  const { day, meal } = btn.dataset
  const recipeId = btn.dataset.recipeId ? parseInt(btn.dataset.recipeId, 10) : null

  if (action === 'assign') openAssignModal(day, meal, btn)
  else if (action === 'remove') removeFromSlot(day, meal, recipeId)
  else if (action === 'clear') clearSlot(day, meal)
  else if (action === 'copy-day') openCopyDayModal(day, btn)
  else if (action === 'recipe') showRecipeDetails(recipeId, btn)
  else if (action === 'retry') load()
})

if (dayPicker) {
  dayPicker.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-day-pick]')
    if (!btn) return
    state.mobileSelectedDay = btn.dataset.dayPick
    renderMobileDayPicker()
    renderGrid()
  })
}

window.addEventListener('resize', () => {
  renderGrid()
})

/* ------------------------------- Modals ------------------------------ */

function openAssignModal(day, meal, returnFocus) {
  const eligible = recipesForMeal(meal)
  const selected = new Set(slotIds(day, meal))
  const recentForMeal = recentIds
    .map((id) => eligible.find((r) => r.id === id))
    .filter(Boolean)
  const rest = eligible.filter((r) => !recentIds.includes(r.id))

  const item = (r) => `
    <label class="mp-check w-full p-2.5 rounded-lg hover:bg-subtle border border-transparent hover:border-line transition-all">
      <input type="checkbox" name="recipeId" value="${r.id}" ${selected.has(r.id) ? 'checked' : ''}>
      <span class="min-w-0 flex-1">
        <span class="flex items-center gap-1.5">
          ${r.is_vegetarian ? '<span class="w-2 h-2 rounded-full bg-emerald-500 flex-none"></span>' : '<span class="w-2 h-2 rounded-full bg-amber-500 flex-none"></span>'}
          <span class="font-medium text-primary text-sm truncate">${esc(r.name)}</span>
        </span>
        <span class="block text-muted text-xs tnum mt-0.5">Serves ${r.serves || 1} · ${fmt(perRecipe(r).energy, 0)} kcal · Pr ${fmt(perRecipe(r).protein, 1)}g · Carb ${fmt(perRecipe(r).carbs, 1)}g</span>
      </span>
    </label>`

  const recentSection = recentForMeal.length
    ? `<div class="mb-4" data-group="recent">
         <p class="text-xs font-bold text-muted uppercase tracking-wider mb-2">Recently Used</p>
         <div class="flex flex-col gap-1.5">${recentForMeal.map(item).join('')}</div>
       </div>`
    : ''

  const allSection = rest.length
    ? `<div data-group="all">
         ${recentForMeal.length ? '<p class="text-xs font-bold text-muted uppercase tracking-wider mb-2">All Recipes</p>' : ''}
         <div class="flex flex-col gap-1.5">${rest.map(item).join('')}</div>
       </div>`
    : ''

  const body = `
    <div class="mp-field mb-3">
      <div class="relative">
        <input id="assign-search-${day}-${meal}" type="search" class="mp-input pl-9 focus-ring" placeholder="Search recipes by name..." autocomplete="off">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="9" r="6"/><path d="M14 14l3 3"/></svg>
      </div>
    </div>
    <div id="assign-list" class="max-h-80 overflow-y-auto pr-1">
      ${eligible.length ? recentSection + allSection : '<p class="text-muted text-center py-6">No recipes available for this meal type.</p>'}
    </div>`

  const footer = `
    <button type="button" class="mp-btn mp-btn-ghost focus-ring" data-close>Cancel</button>
    <button type="button" class="mp-btn mp-btn-primary focus-ring" data-save>Save Selection</button>`

  const ctrl = openModal({
    title: `Assign to ${MEAL_LABELS[meal] || meal} · ${day}`,
    body,
    footer,
    size: 'md',
    returnFocus,
  })

  const list = ctrl.panel.querySelector('#assign-list')
  const search = ctrl.panel.querySelector('input[type="search"]')

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

  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

function openCopyDayModal(sourceDay, returnFocus) {
  const targets = DAYS.filter((d) => d !== sourceDay)
  const body = `
    <p class="text-secondary text-sm mb-4">Select target days to copy <strong class="text-primary">${sourceDay}</strong>'s meal plan into:</p>
    <div id="copy-targets" class="grid grid-cols-2 gap-2">
      ${targets.map((d) => `
        <label class="mp-check p-2.5 rounded-lg border border-line hover:bg-subtle cursor-pointer transition-colors">
          <input type="checkbox" name="target" value="${d}">
          <span class="text-primary font-medium text-sm flex items-center gap-2">
            <span class="day-dot" style="--day-color:var(--day-${DAY_TOKEN[d]})" aria-hidden="true"></span>${d}
          </span>
        </label>`).join('')}
    </div>`

  const footer = `
    <button type="button" class="mp-btn mp-btn-ghost focus-ring" data-close>Cancel</button>
    <button type="button" class="mp-btn mp-btn-primary focus-ring" data-copy disabled>Copy Plan</button>`

  const ctrl = openModal({
    title: `Copy ${sourceDay}'s Meal Plan`,
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
    const selectedTargets = Array.from(ctrl.panel.querySelectorAll('input[name="target"]:checked'))
      .map((cb) => cb.value)
    ctrl.close()
    copyDayToTargets(sourceDay, selectedTargets)
  })

  ctrl.panel.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => ctrl.close()))
}

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
      return `<span${hint ? ` title="${hint}"` : ''} class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${toneCls}">${i.quantity} ${i.serving_unit} ${esc(i.name)}</span>`
    })
    .join(' ') || '<span class="text-muted">—</span>'

  const instr = esc((recipe.instructions || '').trim()) || '<span class="text-muted">No instructions provided.</span>'

  const body = `
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="mp-badge mp-badge-accent font-semibold">${esc(recipe.meal_type)}</span>
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

/* --------------------------- Plan Mutations ------------------------- */

async function saveSlotAndRender(day, meal, ids) {
  if (!state.plan[day]) state.plan[day] = {}
  state.plan[day][meal] = ids
  ids.forEach(recordRecent)
  render()

  try {
    await putSlot(day, meal, ids)
    toast.success(`Updated ${day} ${MEAL_LABELS[meal] || meal}.`)
  } catch (err) {
    if (err && err.message === 'auth') return
    toast.error('Could not save slot update.', { title: 'Save Failed' })
    load()
  }
}

async function removeFromSlot(day, meal, recipeId) {
  const current = slotIds(day, meal)
  const next = current.filter((id) => id !== recipeId)
  saveSlotAndRender(day, meal, next)
}

async function clearSlot(day, meal) {
  saveSlotAndRender(day, meal, [])
}

async function copyDayToTargets(sourceDay, targetDays) {
  const src = state.plan[sourceDay] || {}
  const nextPlan = JSON.parse(JSON.stringify(state.plan))
  targetDays.forEach((t) => {
    nextPlan[t] = JSON.parse(JSON.stringify(src))
  })
  state.plan = nextPlan
  render()

  try {
    await putFullPlan(state.plan)
    toast.success(`Copied ${sourceDay}'s plan to ${targetDays.join(', ')}.`)
  } catch (err) {
    if (err && err.message === 'auth') return
    toast.error('Could not copy meal plan.', { title: 'Copy Failed' })
    load()
  }
}

/* ----------------------------- Export PDF ---------------------------- */

if (exportPdfBtn) {
  exportPdfBtn.addEventListener('click', async () => {
    exportPdfBtn.dataset.loading = 'true'
    exportPdfBtn.disabled = true
    try {
      const resp = await fetch(`${API_BASE}/weekly-plan/pdf`, { headers: authHeaders() })
      if (handleAuthError(resp)) return
      if (!resp.ok) throw new Error('PDF export failed')
      const blob = await resp.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meal-plan-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Weekly plan PDF downloaded.')
    } catch (err) {
      if (err && err.message === 'auth') return
      toast.error('Could not export PDF. Please try again.', { title: 'Export Failed' })
    } finally {
      exportPdfBtn.dataset.loading = 'false'
      exportPdfBtn.disabled = false
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
    state.plan = plan || {}
    state.status = 'ready'
    render()
    pantryNames().catch(() => {}) // fire-and-forget; chips fall back to neutral
  } catch (err) {
    if (err && err.message === 'auth') return
    state.status = 'error'
    state.error = err && err.message ? err.message : 'Unknown error'
    render()
  }
}

mountLayout({ activeNav: 'planner' })
load()