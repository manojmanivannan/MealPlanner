/*
 * Unit tests for the recipe-hub pure logic (T5 TDD seam).
 *
 * Runs with Node's built-in runner — no test deps, no DOM:
 *   node --test frontend/test/recipe-hub-logic.test.mjs
 *
 * The logic module intentionally imports nothing DOM-bound so these helpers
 * (category vocabulary, filtering, slot suggestion) are testable in
 * isolation from the page render.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  CATEGORIES,
  CATEGORY_KEYS,
  PLANNABLE_SLOTS,
  MEAL_TYPE_LABELS,
  SLOT_LABELS,
  filterRecipes,
  suggestSlot,
  isHubOnlyMealType,
  isHubOnlyCategory,
  defaultMealTypeForCategory,
  categoryForMealType,
} from '../src/pages/recipe-hub-logic.js'

const sample = [
  { id: 1, name: 'Smoothie', meal_type: 'breakfast', is_vegetarian: true },
  { id: 2, name: 'Oats', meal_type: 'pre_breakfast', is_vegetarian: true },
  { id: 3, name: 'Pasta', meal_type: 'lunch', is_vegetarian: true },
  { id: 4, name: 'Steak', meal_type: 'dinner', is_vegetarian: false },
  { id: 5, name: 'Nuts', meal_type: 'snack', is_vegetarian: true },
  { id: 6, name: 'Chips', meal_type: 'snack', is_vegetarian: false },
  { id: 7, name: 'Salsa', meal_type: 'sides', is_vegetarian: true },
  { id: 8, name: 'Batch Sauce', meal_type: 'weekend_prep', is_vegetarian: true },
  { id: 9, name: 'Oats Deluxe', meal_type: 'pre_breakfast', is_vegetarian: false },
]

/* ----------------------------- Vocabulary ----------------------------- */

test('CATEGORIES lists the six unified-vocabulary tabs in order', () => {
  assert.deepEqual(CATEGORY_KEYS, [
    'pre_breakfast', 'breakfast', 'lunch_dinner', 'snacks', 'sides', 'weekend_prep',
  ])
  assert.equal(CATEGORIES.length, 6)
})

test('slot-aligned categories map to the 5 plannable slots; sides & weekend_prep are hub-only', () => {
  assert.equal(isHubOnlyCategory('sides'), true)
  assert.equal(isHubOnlyCategory('weekend_prep'), true)
  assert.equal(isHubOnlyCategory('breakfast'), false)
  assert.equal(isHubOnlyCategory('lunch_dinner'), false)
})

test('Lunch & Dinner category spans both lunch and dinner meal types', () => {
  const cat = CATEGORIES.find((c) => c.key === 'lunch_dinner')
  assert.deepEqual(cat.mealTypes, ['lunch', 'dinner'])
})

test('PLANNABLE_SLOTS excludes sides and weekend_prep', () => {
  assert.deepEqual(PLANNABLE_SLOTS, ['pre_breakfast', 'breakfast', 'lunch', 'snack', 'dinner'])
  assert.ok(!PLANNABLE_SLOTS.includes('sides'))
  assert.ok(!PLANNABLE_SLOTS.includes('weekend_prep'))
})

test('every category maps to at least one valid RecipeMealType', () => {
  const validTypes = new Set([
    'pre_breakfast', 'breakfast', 'lunch', 'dinner', 'snack', 'weekend_prep', 'sides',
  ])
  for (const c of CATEGORIES) {
    assert.ok(c.mealTypes.length > 0, `${c.key} has no meal types`)
    for (const t of c.mealTypes) assert.ok(validTypes.has(t), `${t} is not a valid RecipeMealType`)
  }
})

/* ----------------------------- filterRecipes ----------------------------- */

test('filterRecipes returns only recipes whose meal_type is in the active category', () => {
  const out = filterRecipes(sample, 'breakfast', 'both', '')
  assert.deepEqual(out.map((r) => r.id), [1])
})

test('Lunch & Dinner category merges lunch + dinner recipes', () => {
  const out = filterRecipes(sample, 'lunch_dinner', 'both', '')
  assert.deepEqual(out.map((r) => r.id), [3, 4])
})

test('veg filter restricts to is_vegetarian recipes', () => {
  const out = filterRecipes(sample, 'snacks', 'veg', '')
  assert.deepEqual(out.map((r) => r.id), [5])
})

test('nonveg filter restricts to non-vegetarian recipes', () => {
  const out = filterRecipes(sample, 'snacks', 'nonveg', '')
  assert.deepEqual(out.map((r) => r.id), [6])
})

test('both diet returns veg and non-veg', () => {
  const out = filterRecipes(sample, 'snacks', 'both', '')
  assert.deepEqual(out.map((r) => r.id), [5, 6])
})

test('search term filters by case-insensitive name substring', () => {
  const out = filterRecipes(sample, 'pre_breakfast', 'both', 'oats')
  assert.deepEqual(out.map((r) => r.id), [2, 9])
})

test('search and veg filter compose', () => {
  const out = filterRecipes(sample, 'pre_breakfast', 'veg', 'oats')
  assert.deepEqual(out.map((r) => r.id), [2])
})

test('search term with no matches returns empty', () => {
  assert.deepEqual(filterRecipes(sample, 'breakfast', 'both', 'zzzz'), [])
})

test('unknown category key returns empty', () => {
  assert.deepEqual(filterRecipes(sample, 'nope', 'both', ''), [])
})

test('hub-only categories still filter correctly', () => {
  assert.deepEqual(filterRecipes(sample, 'sides', 'both', '').map((r) => r.id), [7])
  assert.deepEqual(filterRecipes(sample, 'weekend_prep', 'both', '').map((r) => r.id), [8])
})

test('filterRecipes does not mutate input', () => {
  const copy = sample.map((r) => ({ ...r }))
  filterRecipes(sample, 'lunch_dinner', 'veg', 'pasta')
  assert.deepEqual(sample, copy)
})

/* --------------------------- suggestSlot / hub-only --------------------------- */

test('suggestSlot maps each plannable meal_type to itself', () => {
  assert.equal(suggestSlot('pre_breakfast'), 'pre_breakfast')
  assert.equal(suggestSlot('breakfast'), 'breakfast')
  assert.equal(suggestSlot('lunch'), 'lunch')
  assert.equal(suggestSlot('dinner'), 'dinner')
  assert.equal(suggestSlot('snack'), 'snack')
})

test('suggestSlot returns null for hub-only meal types', () => {
  assert.equal(suggestSlot('sides'), null)
  assert.equal(suggestSlot('weekend_prep'), null)
})

test('isHubOnlyMealType flags sides and weekend_prep only', () => {
  assert.equal(isHubOnlyMealType('sides'), true)
  assert.equal(isHubOnlyMealType('weekend_prep'), true)
  assert.equal(isHubOnlyMealType('breakfast'), false)
  assert.equal(isHubOnlyMealType('lunch'), false)
})

/* --------------------- defaultMealTypeForCategory / categoryForMealType --------------------- */

test('defaultMealTypeForCategory preselects a sensible meal type per tab for the Add modal', () => {
  assert.equal(defaultMealTypeForCategory('pre_breakfast'), 'pre_breakfast')
  assert.equal(defaultMealTypeForCategory('breakfast'), 'breakfast')
  assert.equal(defaultMealTypeForCategory('lunch_dinner'), 'lunch')
  assert.equal(defaultMealTypeForCategory('snacks'), 'snack')
  assert.equal(defaultMealTypeForCategory('sides'), 'sides')
  assert.equal(defaultMealTypeForCategory('weekend_prep'), 'weekend_prep')
})

test('categoryForMealType maps a raw meal_type back to its category key', () => {
  assert.equal(categoryForMealType('breakfast'), 'breakfast')
  assert.equal(categoryForMealType('lunch'), 'lunch_dinner')
  assert.equal(categoryForMealType('dinner'), 'lunch_dinner')
  assert.equal(categoryForMealType('sides'), 'sides')
  assert.equal(categoryForMealType('weekend_prep'), 'weekend_prep')
  assert.equal(categoryForMealType('snack'), 'snacks')
})

/* ------------------------------- labels ------------------------------- */

test('SLOT_LABELS covers the 5 plannable slots', () => {
  assert.equal(SLOT_LABELS.lunch, 'Lunch')
  assert.equal(SLOT_LABELS.dinner, 'Dinner')
  assert.equal(SLOT_LABELS.pre_breakfast, 'Pre-breakfast')
  assert.equal(SLOT_LABELS.snack, 'Snack')
  assert.equal(SLOT_LABELS.breakfast, 'Breakfast')
})

test('MEAL_TYPE_LABELS covers all 7 enum values', () => {
  for (const t of ['pre_breakfast', 'breakfast', 'lunch', 'dinner', 'snack', 'weekend_prep', 'sides']) {
    assert.ok(typeof MEAL_TYPE_LABELS[t] === 'string' && MEAL_TYPE_LABELS[t].length > 0, `missing label for ${t}`)
  }
})