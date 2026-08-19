/*
 * Unit tests for the shopping-list pure logic (T7 TDD seam).
 *
 * Runs with Node's built-in runner — no test deps, no DOM:
 *   node --test frontend/test/shopping-list-logic.test.mjs
 *
 * The logic module intentionally imports nothing DOM-bound so these helpers
 * (name normalization, quantity formatting, the plan→usage index that powers
 * the "which day/meal uses this" hint, merging the backend shopping-list with
 * that usage, filtering, and progress) are testable in isolation from the
 * page render.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  DAYS,
  DAY_SHORT,
  MEAL_ORDER,
  MEAL_LABELS,
  normalizeName,
  titleCase,
  formatQuantity,
  buildUsageIndex,
  usageFor,
  formatUsageHint,
  mergeItems,
  filterItems,
  progress,
  planHasEntries,
} from '../src/pages/shopping-list-logic.js'

/* ----------------------------- Vocabulary ----------------------------- */

test('DAYS lists the week Monday → Sunday', () => {
  assert.deepEqual(DAYS, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
})

test('DAY_SHORT has a short label for every day', () => {
  for (const d of DAYS) assert.ok(typeof DAY_SHORT[d] === 'string' && DAY_SHORT[d].length <= 3, `missing short for ${d}`)
  assert.equal(DAY_SHORT.Wednesday, 'Wed')
  assert.equal(DAY_SHORT.Monday, 'Mon')
})

test('MEAL_ORDER lists the plannable slots first, hub-only last', () => {
  assert.deepEqual(MEAL_ORDER.slice(0, 5), ['pre_breakfast', 'breakfast', 'lunch', 'snack', 'dinner'])
  assert.ok(MEAL_ORDER.includes('sides'))
  assert.ok(MEAL_ORDER.includes('weekend_prep'))
})

test('MEAL_LABELS has a friendly label for every meal type in MEAL_ORDER', () => {
  for (const m of MEAL_ORDER) assert.ok(typeof MEAL_LABELS[m] === 'string' && MEAL_LABELS[m].length > 0, `missing label for ${m}`)
  assert.equal(MEAL_LABELS.pre_breakfast, 'Pre-breakfast')
  assert.equal(MEAL_LABELS.dinner, 'Dinner')
})

/* --------------------------- normalizeName / titleCase --------------------------- */

test('normalizeName lowercases and trims', () => {
  assert.equal(normalizeName('Rice'), 'rice')
  assert.equal(normalizeName('  Brown Rice '), 'brown rice')
  assert.equal(normalizeName(''), '')
  assert.equal(normalizeName(null), '')
  assert.equal(normalizeName(undefined), '')
})

test('titleCase uppercases the first char only, leaving the rest', () => {
  assert.equal(titleCase('rice'), 'Rice')
  assert.equal(titleCase('Rice'), 'Rice')
  assert.equal(titleCase('brown rice'), 'Brown rice')
  assert.equal(titleCase(''), '')
})

/* ------------------------------ formatQuantity ------------------------------ */

test('formatQuantity drops trailing .0 and rounds to 2 decimals', () => {
  assert.equal(formatQuantity(100), '100')
  assert.equal(formatQuantity(2), '2')
  assert.equal(formatQuantity(2.0), '2')
  assert.equal(formatQuantity(2.5), '2.5')
  assert.equal(formatQuantity(2.25), '2.25')
  assert.equal(formatQuantity(0), '0')
  assert.equal(formatQuantity(2.456), '2.46') // rounds to 2dp
  assert.equal(formatQuantity(2.999), '3')    // rounds up across the integer
})

test('formatQuantity guards null / NaN / undefined to "0"', () => {
  assert.equal(formatQuantity(null), '0')
  assert.equal(formatQuantity(undefined), '0')
  assert.equal(formatQuantity(NaN), '0')
})

/* ------------------------------ buildUsageIndex ------------------------------ */

const PLAN = {
  Monday: { pre_breakfast: [], breakfast: [1], lunch: [], snack: [], dinner: [2], sides: [], weekend_prep: [] },
  Wednesday: { pre_breakfast: [], breakfast: [], lunch: [], snack: [], dinner: [2], sides: [], weekend_prep: [] },
}
const RECIPES = [
  { id: 1, name: 'Smoothie', ingredients: [
    { name: 'Banana', quantity: 1, serving_unit: 'nos' },
    { name: 'Milk', quantity: 200, serving_unit: 'ml' },
  ] },
  { id: 2, name: 'Risotto', ingredients: [
    { name: 'Rice', quantity: 100, serving_unit: 'g' },
    { name: 'Milk', quantity: 50, serving_unit: 'ml' },
  ] },
]

test('buildUsageIndex maps each ingredient (lowercased) to the (day,meal,recipe) tuples that use it', () => {
  const idx = buildUsageIndex(PLAN, RECIPES)
  assert.deepEqual(
    idx.banana.map((u) => [u.day, u.meal, u.recipeId, u.recipeName]),
    [['Monday', 'breakfast', 1, 'Smoothie']],
  )
  // Milk is in two recipes across three slots → three entries.
  assert.deepEqual(
    idx.milk.map((u) => [u.day, u.meal, u.recipeId]),
    [['Monday', 'breakfast', 1], ['Monday', 'dinner', 2], ['Wednesday', 'dinner', 2]],
  )
  assert.deepEqual(
    idx.rice.map((u) => [u.day, u.meal, u.recipeId]),
    [['Monday', 'dinner', 2], ['Wednesday', 'dinner', 2]],
  )
})

test('buildUsageIndex does not mutate its inputs', () => {
  const planCopy = JSON.parse(JSON.stringify(PLAN))
  const recipesCopy = JSON.parse(JSON.stringify(RECIPES))
  buildUsageIndex(PLAN, RECIPES)
  assert.deepEqual(PLAN, planCopy)
  assert.deepEqual(RECIPES, recipesCopy)
})

test('buildUsageIndex of an empty plan returns an empty index', () => {
  assert.deepEqual(buildUsageIndex({}, RECIPES), {})
})

test('buildUsageIndex skips recipe ids that are not in the recipes list (stale plan)', () => {
  const idx = buildUsageIndex({ Monday: { breakfast: [99] } }, RECIPES)
  // No ingredient entries are produced for an unknown recipe, but no crash.
  assert.equal(Object.keys(idx).length, 0)
})

/* -------------------------------- usageFor -------------------------------- */

test('usageFor returns the entries for an ingredient sorted by day then meal', () => {
  const idx = buildUsageIndex(PLAN, RECIPES)
  const out = usageFor('milk', idx)
  assert.deepEqual(out.map((u) => [u.day, u.meal, u.recipeId]),
    [['Monday', 'breakfast', 1], ['Monday', 'dinner', 2], ['Wednesday', 'dinner', 2]])
})

test('usageFor is case-insensitive on the requested name', () => {
  const idx = buildUsageIndex(PLAN, RECIPES)
  assert.equal(usageFor('MILK', idx).length, usageFor('milk', idx).length)
})

test('usageFor returns [] for an unknown ingredient', () => {
  assert.deepEqual(usageFor('truffle', buildUsageIndex(PLAN, RECIPES)), [])
})

/* ------------------------------ formatUsageHint ------------------------------ */

test('formatUsageHint renders sorted, deduped "Day · Meal" pairs joined by commas', () => {
  const idx = buildUsageIndex(PLAN, RECIPES)
  assert.equal(formatUsageHint(usageFor('milk', idx)), 'Mon · Breakfast, Mon · Dinner, Wed · Dinner')
})

test('formatUsageHint dedupes the same day+meal across multiple recipes', () => {
  // Two recipes on Monday breakfast both using the same ingredient.
  const idx = buildUsageIndex(
    { Monday: { breakfast: [1, 2] } },
    [
      { id: 1, name: 'Smoothie', ingredients: [{ name: 'Milk', quantity: 1, serving_unit: 'ml' }] },
      { id: 2, name: 'Latte', ingredients: [{ name: 'Milk', quantity: 1, serving_unit: 'ml' }] },
    ],
  )
  assert.equal(formatUsageHint(usageFor('milk', idx)), 'Mon · Breakfast')
})

test('formatUsageHint of empty usage is an empty string', () => {
  assert.equal(formatUsageHint([]), '')
})

/* ------------------------------- mergeItems ------------------------------- */

test('mergeItems combines the backend shopping-list with usage, sorted by name', () => {
  const idx = buildUsageIndex(PLAN, RECIPES)
  const shoppingList = {
    carrot: { quantity: 300, serving_unit: 'g' },
    rice: { quantity: 100, serving_unit: 'g' },
  }
  const items = mergeItems(shoppingList, idx)
  // Alphabetical by display name: Carrot, Rice.
  assert.deepEqual(items.map((i) => i.name), ['Carrot', 'Rice'])
  assert.deepEqual(items.map((i) => i.key), ['carrot', 'rice'])
  assert.equal(items[1].quantity, 100)
  assert.equal(items[1].servingUnit, 'g')
  assert.equal(formatUsageHint(items[1].usage), 'Mon · Dinner, Wed · Dinner')
  assert.deepEqual(items[0].usage, []) // carrot not in any planned recipe
})

test('mergeItems normalizes keys and title-cases the display name', () => {
  const items = mergeItems({ 'brown rice': { quantity: 2, serving_unit: 'cup' } }, {})
  assert.equal(items[0].key, 'brown rice')
  assert.equal(items[0].name, 'Brown rice')
})

test('mergeItems of an empty shopping list returns []', () => {
  assert.deepEqual(mergeItems({}, buildUsageIndex(PLAN, RECIPES)), [])
})

test('mergeItems does not mutate the shopping-list input', () => {
  const shoppingList = { rice: { quantity: 100, serving_unit: 'g' } }
  const before = JSON.parse(JSON.stringify(shoppingList))
  mergeItems(shoppingList, buildUsageIndex(PLAN, RECIPES))
  assert.deepEqual(shoppingList, before)
})

/* ------------------------------- filterItems ------------------------------- */

const ITEMS = [
  { key: 'a', name: 'Apple' },
  { key: 'b', name: 'Banana' },
  { key: 'c', name: 'Carrot' },
]

test('filterItems: empty search returns all (as a new array)', () => {
  const out = filterItems(ITEMS, { search: '', hidePurchased: false, purchased: new Set() })
  assert.deepEqual(out.map((i) => i.key), ['a', 'b', 'c'])
  assert.notEqual(out, ITEMS)
})

test('filterItems: case-insensitive name substring search', () => {
  assert.deepEqual(filterItems(ITEMS, { search: 'AP', hidePurchased: false, purchased: new Set() }).map((i) => i.key), ['a'])
  assert.deepEqual(filterItems(ITEMS, { search: 'an', hidePurchased: false, purchased: new Set() }).map((i) => i.key), ['b']) // Banana
})

test('filterItems: hidePurchased drops items whose key is in the purchased set', () => {
  const out = filterItems(ITEMS, { search: '', hidePurchased: true, purchased: new Set(['b']) })
  assert.deepEqual(out.map((i) => i.key), ['a', 'c'])
})

test('filterItems: hidePurchased=false keeps purchased items', () => {
  const out = filterItems(ITEMS, { search: '', hidePurchased: false, purchased: new Set(['a', 'b', 'c']) })
  assert.deepEqual(out.map((i) => i.key), ['a', 'b', 'c'])
})

test('filterItems: search + hidePurchased compose', () => {
  // search 'ap' narrows to Apple only; it is purchased and hidden → empty.
  const out = filterItems(ITEMS, { search: 'ap', hidePurchased: true, purchased: new Set(['a']) })
  assert.deepEqual(out.map((i) => i.key), [])
  // With hidePurchased off, the same search returns Apple.
  const out2 = filterItems(ITEMS, { search: 'ap', hidePurchased: false, purchased: new Set(['a']) })
  assert.deepEqual(out2.map((i) => i.key), ['a'])
})

test('filterItems does not mutate the input', () => {
  const copy = ITEMS.map((i) => ({ ...i }))
  filterItems(ITEMS, { search: 'a', hidePurchased: true, purchased: new Set(['a']) })
  assert.deepEqual(ITEMS, copy)
})

/* -------------------------------- progress -------------------------------- */

test('progress counts only purchased keys that are still in the items list', () => {
  const items = [{ key: 'a' }, { key: 'b' }, { key: 'c' }]
  // 'd' is a stale purchased entry for an ingredient no longer needed.
  const p = progress(items, new Set(['a', 'd']))
  assert.deepEqual(p, { total: 3, done: 1, remaining: 2 })
})

test('progress of empty items is all zeros', () => {
  assert.deepEqual(progress([], new Set(['a'])), { total: 0, done: 0, remaining: 0 })
})

test('progress with nothing purchased is all remaining', () => {
  const items = [{ key: 'a' }, { key: 'b' }]
  assert.deepEqual(progress(items, new Set()), { total: 2, done: 0, remaining: 2 })
})

/* ------------------------------ planHasEntries ------------------------------ */

test('planHasEntries is true when any slot has a recipe id', () => {
  assert.equal(planHasEntries({ Monday: { breakfast: [1], lunch: [] } }), true)
})

test('planHasEntries is false when every slot is empty', () => {
  assert.equal(planHasEntries({ Monday: { breakfast: [], lunch: [] }, Tuesday: { dinner: [] } }), false)
})

test('planHasEntries is false for null / undefined / empty', () => {
  assert.equal(planHasEntries(null), false)
  assert.equal(planHasEntries(undefined), false)
  assert.equal(planHasEntries({}), false)
})

test('planHasEntries tolerates a non-array (legacy single-id) slot as occupied', () => {
  assert.equal(planHasEntries({ Monday: { breakfast: 3 } }), true)
})