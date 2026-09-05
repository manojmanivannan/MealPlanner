/*
 * Unit tests for the ingredients pure logic (T6 TDD seam).
 *
 * Runs with Node's built-in runner — no test deps, no DOM:
 *   node --test frontend/test/ingredients-logic.test.mjs
 *
 * The logic module imports nothing DOM-bound, so these helpers (nutrition
 * vocabulary, per-unit labels, ordering, badges, search, validation) are
 * testable in isolation from the page render.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_UNITS,
  MACRO_FIELDS,
  MINERAL_FIELDS,
  NUTRITION_FIELDS,
  perUnitLabel,
  nutritionLabel,
  groupByLetter,
  sortByShelfLife,
  sortByName,
  shelfLifeBadge,
  filterIngredients,
  validateIngredient,
  defaultServingSize,
  resolveServingSizeOnUnitChange,
  countRecipesUsingIngredient,
  servingSizeWillRescale,
  formatRescaleFactor,
} from '../src/pages/ingredients-logic.js'

const sample = [
  { id: 1, name: 'Apple',  available: true,  remaining_shelf_life: 5 },
  { id: 2, name: 'Banana', available: true,  remaining_shelf_life: 1 },
  { id: 3, name: 'Carrot', available: false, remaining_shelf_life: 10 },
  { id: 4, name: 'almond', available: true,  remaining_shelf_life: 0 },
  { id: 5, name: '3 eggs', available: false, remaining_shelf_life: null },
]

/* ----------------------------- Vocabulary ----------------------------- */

test('DEFAULT_UNITS matches the backend ServingUnits enum', () => {
  assert.deepEqual(DEFAULT_UNITS, ['g', 'ml', 'cup', 'tbsp', 'tsp', 'nos'])
})

test('MACRO_FIELDS lists the 5 always-visible macro fields in order', () => {
  assert.deepEqual(MACRO_FIELDS.map((f) => f.key), ['energy', 'protein', 'carbs', 'fat', 'fiber'])
})

test('MINERAL_FIELDS lists the 6 progressive-disclosure minerals in order', () => {
  assert.deepEqual(MINERAL_FIELDS.map((f) => f.key), [
    'iron_mg', 'magnesium_mg', 'calcium_mg', 'potassium_mg', 'sodium_mg', 'vitamin_c_mg',
  ])
})

test('NUTRITION_FIELDS is macros then minerals', () => {
  assert.deepEqual(
    NUTRITION_FIELDS.map((f) => f.key),
    [...MACRO_FIELDS.map((f) => f.key), ...MINERAL_FIELDS.map((f) => f.key)],
  )
})

/* ----------------------- perUnitLabel / nutritionLabel ----------------------- */

test('perUnitLabel uses 100g / 100ml for bulk units, the unit itself otherwise', () => {
  assert.equal(perUnitLabel('g'), '100g')
  assert.equal(perUnitLabel('ml'), '100ml')
  assert.equal(perUnitLabel('cup'), 'cup')
  assert.equal(perUnitLabel('tbsp'), 'tbsp')
  assert.equal(perUnitLabel('nos'), 'nos')
})

test('nutritionLabel formats field + unit + per-unit suffix', () => {
  const energy = MACRO_FIELDS.find((f) => f.key === 'energy')
  const protein = MACRO_FIELDS.find((f) => f.key === 'protein')
  const iron = MINERAL_FIELDS.find((f) => f.key === 'iron_mg')
  assert.equal(nutritionLabel(energy, 'g'), 'Energy (kcal/100g)')
  assert.equal(nutritionLabel(protein, 'tbsp'), 'Protein (g/tbsp)')
  assert.equal(nutritionLabel(iron, 'ml'), 'Iron (mg/100ml)')
  assert.equal(nutritionLabel(iron, 'nos'), 'Iron (mg/nos)')
})

/* ------------------------------ groupByLetter ------------------------------ */

test('groupByLetter buckets by first letter and orders A–Z then #', () => {
  const groups = groupByLetter(sample)
  assert.deepEqual(Object.keys(groups), ['A', 'B', 'C', '#'])
  assert.deepEqual(groups.A.map((i) => i.id), [1, 4]) // Apple, almond → both 'A'
  assert.deepEqual(groups.B.map((i) => i.id), [2])
  assert.deepEqual(groups.C.map((i) => i.id), [3])
  assert.deepEqual(groups['#'].map((i) => i.id), [5]) // '3 eggs'
})

test('groupByLetter does not mutate the input', () => {
  const copy = sample.map((i) => ({ ...i }))
  groupByLetter(sample)
  assert.deepEqual(sample, copy)
})

test('groupByLetter of an empty list returns an empty object', () => {
  assert.deepEqual(groupByLetter([]), {})
})

/* ------------------------------ sortByShelfLife ------------------------------ */

test('sortByShelfLife puts available first, then by remaining asc', () => {
  const out = sortByShelfLife(sample).map((i) => i.id)
  // available (expired almond id4 [0], banana id2 [1], apple id1 [5]),
  // then unavailable (carrot id3 [10], eggs id5 [null → last]).
  assert.deepEqual(out, [4, 2, 1, 3, 5])
})

test('sortByShelfLife treats null remaining as last within its group', () => {
  const out = sortByShelfLife([
    { id: 'a', available: true, remaining_shelf_life: null },
    { id: 'b', available: true, remaining_shelf_life: 3 },
    { id: 'c', available: false, remaining_shelf_life: null },
  ]).map((i) => i.id)
  assert.deepEqual(out, ['b', 'a', 'c'])
})

test('sortByShelfLife does not mutate the input', () => {
  const copy = sample.map((i) => ({ ...i }))
  sortByShelfLife(sample)
  assert.deepEqual(sample, copy)
})

/* ------------------------------ shelfLifeBadge ------------------------------ */

test('shelfLifeBadge: expired is danger', () => {
  assert.deepEqual(shelfLifeBadge({ available: true, remaining_shelf_life: 0 }),
    { text: 'Expired', tone: 'danger', shown: true })
})

test('shelfLifeBadge: 1 day left is warning', () => {
  assert.deepEqual(shelfLifeBadge({ available: true, remaining_shelf_life: 1 }),
    { text: '1 day left', tone: 'warning', shown: true })
})

test('shelfLifeBadge: 2 days left is warning, 3 is neutral', () => {
  assert.deepEqual(shelfLifeBadge({ available: true, remaining_shelf_life: 2 }),
    { text: '2 days left', tone: 'warning', shown: true })
  assert.equal(shelfLifeBadge({ available: true, remaining_shelf_life: 3 }).tone, 'neutral')
})

test('shelfLifeBadge: not available is not shown', () => {
  const b = shelfLifeBadge({ available: false, remaining_shelf_life: 5 })
  assert.equal(b.shown, false)
  assert.equal(b.text, '')
})

test('shelfLifeBadge: null remaining but available shows a pantry label', () => {
  const b = shelfLifeBadge({ available: true, remaining_shelf_life: null })
  assert.equal(b.shown, true)
  assert.equal(b.tone, 'neutral')
})

/* ------------------------------ filterIngredients ------------------------------ */

test('sortByName orders by name (case-aware) and does not mutate the input', () => {
  const out = sortByName([{ name: 'banana' }, { name: 'Apple' }, { name: 'cherry' }])
  assert.deepEqual(out.map((i) => i.name), ['Apple', 'banana', 'cherry'])
  const copy = sample.map((i) => ({ ...i }))
  sortByName(sample)
  assert.deepEqual(sample, copy)
})

test('filterIngredients: empty term returns all (as a new array)', () => {
  const out = filterIngredients(sample, '')
  assert.deepEqual(out.map((i) => i.id), sample.map((i) => i.id))
  assert.notEqual(out, sample) // new array
})

test('filterIngredients: case-insensitive name substring', () => {
  const out = filterIngredients(sample, 'app')
  assert.deepEqual(out.map((i) => i.id), [1])
  assert.deepEqual(filterIngredients(sample, 'A').map((i) => i.id), [1, 2, 3, 4]) // Apple, Banana, Carrot, almond
})

test('filterIngredients: no match returns empty', () => {
  assert.deepEqual(filterIngredients(sample, 'zzz'), [])
})

test('filterIngredients does not mutate the input', () => {
  const copy = sample.map((i) => ({ ...i }))
  filterIngredients(sample, 'a')
  assert.deepEqual(sample, copy)
})

/* ------------------------------ validateIngredient ------------------------------ */

test('validateIngredient: a valid ingredient has no errors', () => {
  const r = validateIngredient({ name: 'Tomato', shelf_life: '5', serving_unit: 'g', serving_size: '100' })
  assert.equal(r.valid, true)
  assert.deepEqual(r.errors, {})
})

test('validateIngredient: name required', () => {
  const r = validateIngredient({ name: '   ', shelf_life: '5', serving_unit: 'g' })
  assert.equal(r.valid, false)
  assert.equal(r.errors['name'], 'Name is required.')
})

test('validateIngredient: shelf life required', () => {
  const r = validateIngredient({ name: 'X', shelf_life: '', serving_unit: 'g' })
  assert.equal(r.valid, false)
  assert.ok(r.errors['shelf-life'])
})

test('validateIngredient: shelf life must be a positive integer', () => {
  assert.ok(validateIngredient({ name: 'X', shelf_life: '0', serving_unit: 'g' }).errors['shelf-life'])
  assert.ok(validateIngredient({ name: 'X', shelf_life: '-3', serving_unit: 'g' }).errors['shelf-life'])
  assert.ok(validateIngredient({ name: 'X', shelf_life: '2.5', serving_unit: 'g' }).errors['shelf-life'])
  assert.ok(validateIngredient({ name: 'X', shelf_life: '5', serving_unit: 'g' }).errors['shelf-life'] === undefined)
})

test('validateIngredient: serving unit required and must be a known unit', () => {
  assert.ok(validateIngredient({ name: 'X', shelf_life: '5', serving_unit: '' }).errors['serving-unit'])
  assert.ok(validateIngredient({ name: 'X', shelf_life: '5', serving_unit: 'kg' }).errors['serving-unit'])
  assert.ok(validateIngredient({ name: 'X', shelf_life: '5', serving_unit: 'g' }).errors['serving-unit'] === undefined)
})

test('validateIngredient: serving size optional, but if present must be > 0', () => {
  assert.equal(validateIngredient({ name: 'X', shelf_life: '5', serving_unit: 'g' }).valid, true)
  assert.ok(validateIngredient({ name: 'X', shelf_life: '5', serving_unit: 'g', serving_size: '0' }).errors['serving-size'])
  assert.ok(validateIngredient({ name: 'X', shelf_life: '5', serving_unit: 'g', serving_size: '-1' }).errors['serving-size'])
  assert.equal(validateIngredient({ name: 'X', shelf_life: '5', serving_unit: 'g', serving_size: '100' }).valid, true)
})

test('validateIngredient: multiple errors are reported together', () => {
  const r = validateIngredient({ name: '', shelf_life: '', serving_unit: '' })
  assert.equal(r.valid, false)
  assert.ok(r.errors['name'])
  assert.ok(r.errors['shelf-life'])
  assert.ok(r.errors['serving-unit'])
})
/* --------------------------- serving-size helpers --------------------------- */

test('defaultServingSize matches create-time defaults extended to volume units', () => {
  assert.equal(defaultServingSize('g'), 100)
  assert.equal(defaultServingSize('ml'), 100)
  assert.equal(defaultServingSize('cup'), 240)
  assert.equal(defaultServingSize('tbsp'), 1)
  assert.equal(defaultServingSize('tsp'), 1)
  assert.equal(defaultServingSize('nos'), 1)
})

test('countRecipesUsingIngredient matches case-insensitively and trimmed', () => {
  const recipes = [
    { name: 'A', ingredients: [{ name: ' Ginger ', quantity: 1 }] },
    { name: 'B', ingredients: [{ name: 'ginger', quantity: 2 }, { name: 'garlic', quantity: 1 }] },
    { name: 'C', ingredients: [{ name: 'Garlic', quantity: 1 }] },
    { name: 'D', ingredients: [] },
  ]
  assert.equal(countRecipesUsingIngredient(recipes, 'ginger'), 2)
  assert.equal(countRecipesUsingIngredient(recipes, '  GARLIC '), 2)
  assert.equal(countRecipesUsingIngredient(recipes, 'pepper'), 0)
  assert.equal(countRecipesUsingIngredient(recipes, ''), 0)
  assert.equal(countRecipesUsingIngredient(null, 'ginger'), 0)
})

test('resolveServingSizeOnUnitChange keeps a user-typed size when switching away', () => {
  // Ingredient with serving_size 100; user typed 150 over the untouched 100,
  // so the modal's last auto-fill is still the original size.
  const r = resolveServingSizeOnUnitChange({
    current: '150', lastAutoFill: '100', originalSize: '100', newUnit: 'nos', initialUnit: 'g',
  })
  assert.equal(r.value, '150')
  // The user's value stays user-owned, not recorded as an auto-fill.
  assert.equal(r.lastAutoFill, null)
})

test('resolveServingSizeOnUnitChange keeps a user-typed size when switching back to the initial unit', () => {
  // User typed 150, so the field is user-owned even back on the original unit.
  const r = resolveServingSizeOnUnitChange({
    current: '150', lastAutoFill: null, originalSize: '100', newUnit: 'g', initialUnit: 'g',
  })
  assert.equal(r.value, '150')
  assert.equal(r.lastAutoFill, null)
})

test('resolveServingSizeOnUnitChange keeps a user-typed size with a NULL original when switching back', () => {
  // NULL serving_size: user typed 50, switched away and back — the field must
  // not be restored to '' (which would fail the required-size validation).
  const r = resolveServingSizeOnUnitChange({
    current: '50', lastAutoFill: null, originalSize: '', newUnit: 'g', initialUnit: 'g',
  })
  assert.equal(r.value, '50')
  assert.equal(r.lastAutoFill, null)
})

test('resolveServingSizeOnUnitChange restores the original size when an untouched field switches back', () => {
  // Modal last wrote 240 (a cup pre-fill); back on g, the original wins.
  const r = resolveServingSizeOnUnitChange({
    current: '240', lastAutoFill: '240', originalSize: '100', newUnit: 'g', initialUnit: 'g',
  })
  assert.equal(r.value, '100')
  assert.equal(r.lastAutoFill, '100')
})

test('resolveServingSizeOnUnitChange keeps the confirmed pre-fill when the original size is NULL', () => {
  // NULL original size: switching back to the initial unit must not restore ''
  // (the field would then fail the required-size validation on save).
  const r = resolveServingSizeOnUnitChange({
    current: '240', lastAutoFill: '240', originalSize: '', newUnit: 'g', initialUnit: 'g',
  })
  assert.equal(r.value, '240')
  assert.equal(r.lastAutoFill, '240')
  // An empty modal-owned field stays empty (validation catches it on save).
  const empty = resolveServingSizeOnUnitChange({
    current: '', lastAutoFill: null, originalSize: '', newUnit: 'g', initialUnit: 'g',
  })
  assert.equal(empty.value, '')
})

test('resolveServingSizeOnUnitChange pre-fills the unit default when the field is empty', () => {
  const r = resolveServingSizeOnUnitChange({
    current: '', lastAutoFill: null, originalSize: '100', newUnit: 'cup', initialUnit: 'g',
  })
  assert.equal(r.value, '240')
  // The pre-fill is recorded as modal-written so a later unit change can tell.
  assert.equal(r.lastAutoFill, '240')
})

test('resolveServingSizeOnUnitChange replaces a stale auto-fill with the new unit default', () => {
  const r = resolveServingSizeOnUnitChange({
    current: '1', lastAutoFill: '1', originalSize: '100', newUnit: 'ml', initialUnit: 'g',
  })
  assert.equal(r.value, '100')
  assert.equal(r.lastAutoFill, '100')
})

test('servingSizeWillRescale tracks any size change, unit change or not', () => {
  // A size differing from the stored one rescales even back on the initial
  // unit — this is what the banner visibility must follow.
  assert.equal(servingSizeWillRescale('300', '100'), true)
  assert.equal(servingSizeWillRescale('100', '100'), false)
  assert.equal(servingSizeWillRescale('240', '100'), true)
  // Empty current value: validation blocks the save, nothing rescales.
  assert.equal(servingSizeWillRescale('', '100'), false)
  // A size the save path rejects (must be > 0) can never be saved, so
  // nothing rescales — the banner must not promise one.
  assert.equal(servingSizeWillRescale('0', '100'), false)
  assert.equal(servingSizeWillRescale('-5', '100'), false)
  // NULL original size: the backend has no usable factor and only warns.
  assert.equal(servingSizeWillRescale('240', ''), false)
  assert.equal(servingSizeWillRescale('240', null), false)
  // Non-numeric current value never rescales.
  assert.equal(servingSizeWillRescale('abc', '100'), false)
})

test('formatRescaleFactor recomputes the promised factor from the live size value', () => {
  // The unit-change repro from #42: g→cup pre-fills 240 (×2.4), then the
  // user types 480 — the banner text must follow the field, not the
  // value captured at unit-change time.
  assert.equal(formatRescaleFactor('100', '240'), '100 → 240 (×2.4)')
  assert.equal(formatRescaleFactor('100', '480'), '100 → 480 (×4.8)')
  assert.equal(formatRescaleFactor('100', '300'), '100 → 300 (×3)')
  // The values are interpolated verbatim (the page esc()s the whole string).
  assert.equal(formatRescaleFactor(100, 480), '100 → 480 (×4.8)')
})

test('formatRescaleFactor degrades without inventing a factor', () => {
  // NULL original size: no usable factor at all.
  assert.equal(formatRescaleFactor('', '240'), '')
  assert.equal(formatRescaleFactor(null, '240'), '')
  // A non-numeric suggested value keeps the range text but no ×ratio —
  // the banner is hidden in that state anyway (servingSizeWillRescale).
  assert.equal(formatRescaleFactor('100', 'abc'), '100 → abc')
  assert.equal(formatRescaleFactor('100', ''), '100 → ')
  // Number('') is 0, not a factor — a save-invalid size gets no invented ratio.
  assert.equal(formatRescaleFactor('100', '0'), '100 → 0')
  assert.equal(formatRescaleFactor('100', '-2'), '100 → -2')
})

test('validateIngredient: requireServingSize makes serving_size mandatory and > 0', () => {
  const base = { name: 'X', shelf_life: '5', serving_unit: 'g' }
  // Add flow unchanged: missing size is still fine.
  assert.equal(validateIngredient(base).valid, true)
  // Edit flow: missing/empty is an error; 0 and negatives too.
  assert.ok(validateIngredient(base, { requireServingSize: true }).errors['serving-size'])
  assert.ok(validateIngredient({ ...base, serving_size: '' }, { requireServingSize: true }).errors['serving-size'])
  assert.ok(validateIngredient({ ...base, serving_size: '0' }, { requireServingSize: true }).errors['serving-size'])
  assert.ok(validateIngredient({ ...base, serving_size: '-2' }, { requireServingSize: true }).errors['serving-size'])
  assert.ok(validateIngredient({ ...base, serving_size: '1e999' }, { requireServingSize: true }).errors['serving-size'])
  assert.equal(validateIngredient({ ...base, serving_size: '250' }, { requireServingSize: true }).valid, true)
})
