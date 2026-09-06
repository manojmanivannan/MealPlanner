/*
 * MealPlanner — Shopping List pure logic (T7)
 * ------------------------------------------------------------------
 * The DOM-free, testable core of the Shopping List view. The backend
 * /utilities/shopping-list endpoint already aggregates the week's planned
 * recipes into { ingredientName(lowercase): { quantity, serving_unit } },
 * excluding ingredients the user has marked available in their pantry —
 * so there is no backend work (T7 is the one new view in the modernization).
 *
 * The endpoint does NOT say which day/meal uses each ingredient, so this
 * module rebuilds that mapping client-side from the weekly plan + recipes
 * (buildUsageIndex) and merges it with the endpoint response (mergeItems)
 * to power the "which day/meal uses this" hint.
 *
 * frontend/src/pages/shopping-list.js imports these to render; the unit
 * tests in frontend/test/shopping-list-logic.test.mjs exercise them in
 * isolation with `node --test`. Nothing here touches the DOM, fetch, or
 * localStorage, and no helper mutates its arguments.
 */

/** The week, Monday → Sunday (matches the backend DaysOfWeek order). */
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Short day labels for the compact "Mon · Breakfast" hint. */
export const DAY_SHORT = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
}

/**
 * Meal-type display order: the 5 plannable slots chronologically, then the
 * two hub-only categories last (the plan endpoint initializes all 7 keys per
 * day, so any slot may appear). Used to sort usage entries.
 */
export const MEAL_ORDER = ['pre_breakfast', 'breakfast', 'lunch', 'snack', 'dinner', 'sides', 'weekend_prep']

/** Friendly meal labels (matches the planner / recipe-hub vocabulary). */
export const MEAL_LABELS = {
  pre_breakfast: 'Pre-breakfast',
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
  sides: 'Sides',
  weekend_prep: 'Weekend Prep',
}

/* ------------------------------- helpers ------------------------------- */

/**
 * Normalize an ingredient name to the backend's lowercased key form. The
 * shopping-list endpoint keys are already lowercased; this is applied to
 * recipe ingredient names when building the usage index so the two line up.
 * @param {string|*} name
 * @returns {string}
 */
export function normalizeName(name) {
  return String(name == null ? '' : name).toLowerCase().trim()
}

/**
 * Title-case the first character only, leaving the rest of the string as-is.
 * The backend lowercases ingredient names, so this restores a readable
 * display name without re-casing the whole phrase.
 * @param {string} name
 * @returns {string}
 */
export function titleCase(name) {
  const s = String(name == null ? '' : name)
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Format a quantity for display: round to 2 decimals and drop a trailing
 * ".0". Guards null/undefined/NaN to "0" (a missing quantity should never
 * render as "undefined" or "NaN" in the list).
 *
 * A nonzero value whose 2-decimal round is 0 (a tiny spice quantity — the
 * backend stores rescaled rows at 8 decimals, #44) falls back to enough
 * precision to stay visible instead of rendering as "0"; a true zero still
 * shows as "0".
 * @param {number|*} q
 * @returns {string}
 */
export function formatQuantity(q) {
  if (q == null || Number.isNaN(q)) return '0'
  const n = Number(q)
  const rounded = Number(n.toFixed(2))
  if (rounded === 0 && n !== 0) {
    // Enough decimals to show 2 significant digits of a sub-0.005 quantity,
    // trailing zeros trimmed — never exponential notation (toPrecision
    // would render 4e-8 as "4e-8" in the list).
    const decimals = Math.min(20, -Math.floor(Math.log10(Math.abs(n))) + 1)
    return n.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '')
  }
  return String(rounded)
}

/* ----------------------------- usage index ----------------------------- */

function dayIndex(day) {
  const i = DAYS.indexOf(day)
  return i === -1 ? DAYS.length : i
}
function mealIndex(meal) {
  const i = MEAL_ORDER.indexOf(meal)
  return i === -1 ? MEAL_ORDER.length : i
}

/**
 * Build a { normalizedIngredientName: UsageEntry[] } index from the weekly
 * plan + recipes, where each entry says which day/meal/recipe uses that
 * ingredient. Mirrors the backend's lowercased-name convention so it lines
 * up with the /utilities/shopping-list keys.
 *
 * @param {Record<string, Record<string, number[]>>} plan - { day: { meal: recipeIds[] } }
 * @param {Array<{id:number,name:string,ingredients:Array<{name:string,quantity:number,serving_unit:string}>}>} recipes
 * @returns {Record<string, Array<{day:string,meal:string,recipeId:number,recipeName:string}>>}
 */
export function buildUsageIndex(plan, recipes) {
  const byId = new Map()
  for (const r of Array.isArray(recipes) ? recipes : []) byId.set(r.id, r)

  const index = {}
  const days = plan ? Object.keys(plan) : []
  for (const day of days) {
    const meals = plan[day] || {}
    for (const meal of Object.keys(meals)) {
      let ids = meals[meal]
      if (!Array.isArray(ids)) ids = ids ? [ids] : []
      for (const rid of ids) {
        const recipe = byId.get(rid)
        if (!recipe || !Array.isArray(recipe.ingredients)) continue
        for (const ing of recipe.ingredients) {
          const key = normalizeName(ing.name)
          if (!key) continue
          if (!index[key]) index[key] = []
          index[key].push({ day, meal, recipeId: rid, recipeName: recipe.name })
        }
      }
    }
  }
  return index
}

/**
 * Return the sorted, deduplicated usage entries for one ingredient. Sorted
 * by day (Mon→Sun) then meal (chronological). Duplicate (day, meal) tuples
 * (the same ingredient used by two recipes in the same slot) collapse to a
 * single entry so the hint reads "Mon · Breakfast" once, not twice.
 * @param {string} name
 * @param {Record<string, Array>} usageIndex
 * @returns {Array<{day:string,meal:string,recipeId:number,recipeName:string}>}
 */
export function usageFor(name, usageIndex) {
  const entries = (usageIndex && usageIndex[normalizeName(name)]) || []
  const seen = new Set()
  const out = []
  // Copy + sort so the input array is never mutated or reordered.
  const sorted = [...entries].sort((a, b) => {
    const d = dayIndex(a.day) - dayIndex(b.day)
    if (d !== 0) return d
    return mealIndex(a.meal) - mealIndex(b.meal)
  })
  for (const u of sorted) {
    const k = `${u.day}|${u.meal}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(u)
  }
  return out
}

/**
 * Render a compact "Mon · Breakfast, Wed · Dinner" hint from usage entries.
 * Deduplication is already handled by usageFor; this just maps to labels.
 * @param {Array<{day:string,meal:string}>} usage
 * @returns {string}
 */
export function formatUsageHint(usage) {
  if (!Array.isArray(usage) || usage.length === 0) return ''
  return usage
    .map((u) => `${DAY_SHORT[u.day] || u.day} · ${MEAL_LABELS[u.meal] || u.meal}`)
    .join(', ')
}

/* ------------------------------- mergeItems ------------------------------- */

/**
 * Combine the backend shopping-list response with the usage index into a
 * render-ready array of items, sorted alphabetically by display name.
 *
 * @param {Record<string, {quantity:number,serving_unit:string}>} shoppingList - endpoint response (lowercased keys)
 * @param {Record<string, Array>} usageIndex - from buildUsageIndex
 * @returns {Array<{key:string,name:string,quantity:number,servingUnit:string,usage:Array}>}
 */
export function mergeItems(shoppingList, usageIndex) {
  const out = []
  const keys = shoppingList ? Object.keys(shoppingList) : []
  for (const rawName of keys) {
    const key = normalizeName(rawName)
    const entry = shoppingList[rawName] || {}
    out.push({
      key,
      name: titleCase(rawName),
      quantity: entry.quantity,
      servingUnit: entry.serving_unit,
      usage: usageFor(rawName, usageIndex),
    })
  }
  // Sort by display name, case-insensitive, so "brown rice" sorts with the Bs.
  out.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
  return out
}

/* ------------------------------- filterItems ------------------------------- */

/**
 * Filter the merged item list by a case-insensitive name substring and,
 * optionally, hide items already checked off (purchased). Returns a new
 * array and never mutates the input.
 *
 * @param {Array<{key:string,name:string}>} items
 * @param {{search?:string, hidePurchased?:boolean, purchased?:Set<string>}} opts
 * @returns {Array}
 */
export function filterItems(items, { search = '', hidePurchased = false, purchased = new Set() } = {}) {
  const term = String(search || '').trim().toLowerCase()
  return items.filter((it) => {
    if (hidePurchased && purchased instanceof Set && purchased.has(it.key)) return false
    if (term && !String(it.name || '').toLowerCase().includes(term)) return false
    return true
  })
}

/* -------------------------------- progress -------------------------------- */

/**
 * Compute check-off progress over the current items, counting only purchased
 * keys that are still in the list (stale purchased entries for ingredients no
 * longer needed are ignored, so the count never exceeds the list size).
 * @param {Array<{key:string}>} items
 * @param {Set<string>} purchased
 * @returns {{total:number,done:number,remaining:number}}
 */
export function progress(items, purchased) {
  const total = Array.isArray(items) ? items.length : 0
  const set = purchased instanceof Set ? purchased : new Set()
  let done = 0
  for (const it of total ? items : []) if (set.has(it.key)) done++
  return { total, done, remaining: total - done }
}

/* ------------------------------ planHasEntries ------------------------------ */

/**
 * Whether the saved weekly plan has any assigned slot at all. Used by the
 * page to pick the right empty state when the shopping list comes back empty:
 * no plan yet ("plan some meals first") vs a plan whose ingredients the
 * pantry already covers ("nothing to buy").
 * @param {Record<string, Record<string, number[]>>} plan
 * @returns {boolean}
 */
export function planHasEntries(plan) {
  if (!plan) return false
  return Object.values(plan).some((day) =>
    Object.values(day || {}).some((ids) => {
      // Match buildUsageIndex's slot handling: a non-empty array is occupied,
      // and a lone truthy non-array id (a legacy single-id slot) counts too,
      // so the empty-state decision agrees with whether usage would be empty.
      if (Array.isArray(ids)) return ids.length > 0
      return !!ids
    })
  )
}