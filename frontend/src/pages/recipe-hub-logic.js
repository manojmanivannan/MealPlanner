/*
 * MealPlanner — Recipe Hub pure logic (T5)
 * ------------------------------------------------------------------
 * The DOM-free, testable core of the Recipe Hub: the unified-vocabulary
 * category list, the 5 plannable meal slots, and the filter / slot-suggest
 * helpers. frontend/src/pages/recipe-hub.js imports these to render; the
 * unit tests in frontend/test/recipe-hub-logic.test.mjs exercise them in
 * isolation with `node --test`.
 *
 * Vocabulary (locked from the T5 grilling brief):
 *   • Slot-aligned tabs (map to a planner slot): Pre-Breakfast, Breakfast,
 *     Lunch & Dinner (spans lunch + dinner), Snacks.
 *   • Hub-only tabs (no planner slot): Sides, Weekend Prep.
 *
 * The backend RecipeMealType enum already has all 7 values
 * (pre_breakfast, breakfast, lunch, dinner, snack, weekend_prep, sides),
 * and the seed data contains only those — so there is no deprecated
 * meal_type data to clean up (see the T5 fog item).
 */

/** The 5 meal slots the weekly planner exposes, in chronological order. */
export const PLANNABLE_SLOTS = ['pre_breakfast', 'breakfast', 'lunch', 'snack', 'dinner']

/**
 * The six Recipe Hub tabs in display order, aligned to the unified
 * vocabulary. `mealTypes` is the set of backend RecipeMealType values a tab
 * groups; `hubOnly` flags tabs with no planner slot (no Assign button).
 * @typedef {{ key: string, label: string, icon: string, mealTypes: string[], hubOnly: boolean }} Category
 */
export const CATEGORIES = [
  { key: 'pre_breakfast', label: 'Pre-Breakfast', icon: '☕', mealTypes: ['pre_breakfast'], hubOnly: false },
  { key: 'breakfast',    label: 'Breakfast',     icon: '🍳', mealTypes: ['breakfast'],    hubOnly: false },
  { key: 'lunch_dinner', label: 'Lunch & Dinner', icon: '🍲', mealTypes: ['lunch', 'dinner'], hubOnly: false },
  { key: 'snacks',       label: 'Snacks',        icon: '🥜', mealTypes: ['snack'],        hubOnly: false },
  { key: 'sides',        label: 'Sides',         icon: '🥗', mealTypes: ['sides'],        hubOnly: true },
  { key: 'weekend_prep', label: 'Weekend Prep',  icon: '🗓️', mealTypes: ['weekend_prep'], hubOnly: true },
]

/** Ordered category keys (handy for iteration / assertions). */
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key)

/** Friendly labels for the 5 plannable slots (matches the planner). */
export const SLOT_LABELS = {
  pre_breakfast: 'Pre-breakfast',
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
}

/** Friendly labels for all 7 backend RecipeMealType values. */
export const MEAL_TYPE_LABELS = {
  pre_breakfast: 'Pre-Breakfast',
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  weekend_prep: 'Weekend Prep',
  sides: 'Sides',
}

const HUB_ONLY_MEAL_TYPES = new Set(['sides', 'weekend_prep'])

/**
 * Filter `recipes` to the ones that belong to `categoryKey`, then apply the
 * veg diet filter and the (case-insensitive, name-substring) search term.
 * Pure: returns a new array and never mutates the input.
 *
 * @param {Array<{id:number,name:string,meal_type:string,is_vegetarian:boolean}>} recipes
 * @param {string} categoryKey - one of CATEGORY_KEYS
 * @param {'both'|'veg'|'nonveg'} vegFilter
 * @param {string} searchTerm
 * @returns {Array} the matching recipes (subset of the input array)
 */
export function filterRecipes(recipes, categoryKey, vegFilter, searchTerm) {
  const cat = CATEGORIES.find((c) => c.key === categoryKey)
  if (!cat) return []
  let out = recipes.filter((r) => cat.mealTypes.includes(r.meal_type))
  if (vegFilter === 'veg') out = out.filter((r) => r.is_vegetarian)
  else if (vegFilter === 'nonveg') out = out.filter((r) => !r.is_vegetarian)
  const term = (searchTerm || '').trim().toLowerCase()
  if (term) out = out.filter((r) => (r.name || '').toLowerCase().includes(term))
  return out
}

/**
 * Map a recipe's meal_type to the plannable slot the assign modal should
 * preselect, or `null` when the meal type is hub-only (sides / weekend_prep)
 * and so cannot be assigned to the plan at all.
 * @param {string} mealType
 * @returns {string|null}
 */
export function suggestSlot(mealType) {
  if (PLANNABLE_SLOTS.includes(mealType)) return mealType
  return null
}

/** True for the two hub-only meal types that have no planner slot. */
export function isHubOnlyMealType(mealType) {
  return HUB_ONLY_MEAL_TYPES.has(mealType)
}

/** True for the two hub-only category keys (Sides, Weekend Prep). */
export function isHubOnlyCategory(categoryKey) {
  const cat = CATEGORIES.find((c) => c.key === categoryKey)
  return !!cat && cat.hubOnly
}

/**
 * The meal_type the Add Recipe modal should preselect for a given tab —
 * the tab's own meal type, defaulting Lunch & Dinner to lunch.
 */
export function defaultMealTypeForCategory(categoryKey) {
  const cat = CATEGORIES.find((c) => c.key === categoryKey)
  if (!cat) return 'breakfast'
  return cat.mealTypes[0]
}

/** Map a raw backend meal_type back to the category key whose tab shows it. */
export function categoryForMealType(mealType) {
  const cat = CATEGORIES.find((c) => c.mealTypes.includes(mealType))
  return cat ? cat.key : null
}