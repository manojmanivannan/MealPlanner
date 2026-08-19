/*
 * MealPlanner — Ingredients pure logic (T6)
 * ------------------------------------------------------------------
 * The DOM-free, testable core of the Ingredients page: the grouped
 * nutrition-form vocabulary, the per-unit label logic, alphabetical +
 * shelf-life ordering, the pantry/shelf-life badge helper, search, and the
 * inline-validation rules. frontend/src/pages/ingredients.js imports these
 * to render; the unit tests in frontend/test/ingredients-logic.test.mjs
 * exercise them in isolation with `node --test`.
 *
 * The logic module intentionally imports nothing DOM-bound, so every helper
 * here is pure (no document, no fetch, no localStorage, no mutation of its
 * arguments).
 */

/**
 * The six serving units the backend `ServingUnits` enum accepts
 * (backend/models.py). Used as the fallback list when
 * /utilities/list-serving-units is unreachable, and as the valid set for
 * inline validation.
 */
export const DEFAULT_UNITS = ['g', 'ml', 'cup', 'tbsp', 'tsp', 'nos']

/**
 * Nutrition-field definitions for the grouped edit form.
 * @typedef {{ key: string, label: string, unit: string }} NutritionField
 */

/** Macros — always-visible group in the edit form. Energy is kcal, the rest g. */
export const MACRO_FIELDS = [
  { key: 'energy',  label: 'Energy',  unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs',   label: 'Carbs',   unit: 'g' },
  { key: 'fat',     label: 'Fat',     unit: 'g' },
  { key: 'fiber',   label: 'Fiber',   unit: 'g' },
]

/** Minerals — the progressive-disclosure group (collapsed by default). */
export const MINERAL_FIELDS = [
  { key: 'iron_mg',       label: 'Iron',       unit: 'mg' },
  { key: 'magnesium_mg',  label: 'Magnesium',  unit: 'mg' },
  { key: 'calcium_mg',    label: 'Calcium',    unit: 'mg' },
  { key: 'potassium_mg',  label: 'Potassium',  unit: 'mg' },
  { key: 'sodium_mg',     label: 'Sodium',     unit: 'mg' },
  { key: 'vitamin_c_mg',  label: 'Vitamin C',  unit: 'mg' },
]

/** All nutrition fields, macros first then minerals (form display order). */
export const NUTRITION_FIELDS = [...MACRO_FIELDS, ...MINERAL_FIELDS]

/**
 * The per-serving-unit suffix shown in a nutrition field label. Bulk units
 * (g / ml) are "per 100"; discrete units (cup / tbsp / tsp / nos) are "per
 * unit". Matches the legacy `updateNutritionLabels` behaviour.
 * @param {string} unit
 * @returns {string}
 */
export function perUnitLabel(unit) {
  if (unit === 'g') return '100g'
  if (unit === 'ml') return '100ml'
  return unit
}

/**
 * A nutrition field label with its per-unit suffix, e.g.
 * `'Energy (kcal/100g)'` or `'Protein (g/tbsp)'`.
 * @param {NutritionField} field
 * @param {string} unit
 * @returns {string}
 */
export function nutritionLabel(field, unit) {
  return `${field.label} (${field.unit}/${perUnitLabel(unit)})`
}

/**
 * Bucket ingredients by the first letter of their name, returning an ordered
 * map `{ letter: Ingredient[] }`. Letter keys are uppercase A–Z; names that
 * don't start with a letter (digits or symbols) are bucketed under `#`.
 * Within a bucket the input order is preserved. Does not mutate the input.
 * @param {Array<{name:string}>} ingredients
 * @returns {Record<string, Array>}
 */
export function groupByLetter(ingredients) {
  const buckets = {}
  for (const ing of ingredients) {
    const first = (ing.name || '').charAt(0).toUpperCase()
    const key = /^[A-Z]$/.test(first) ? first : '#'
    if (!buckets[key]) buckets[key] = []
    buckets[key].push(ing)
  }
  // Stable, readable key order: A–Z first, then the `#` misc bucket last.
  const letters = Object.keys(buckets).filter((k) => k !== '#').sort()
  if (buckets['#']) letters.push('#')
  const ordered = {}
  for (const k of letters) ordered[k] = buckets[k]
  return ordered
}

/**
 * Order ingredients for the shelf-life view: pantry-available first, then by
 * `remaining_shelf_life` ascending (soonest-to-expire first). Missing
 * remaining shelf life sorts last within each availability group. Does not
 * mutate the input.
 * @param {Array<{available?:boolean, remaining_shelf_life?:number}>} ingredients
 * @returns {Array} a new sorted array
 */
export function sortByShelfLife(ingredients) {
  const rank = (ing) => {
    const r = ing.remaining_shelf_life
    // Treat a missing/null remaining as +Infinity so it sinks to the bottom.
    const days = r == null || isNaN(r) ? Infinity : r
    return { available: ing.available ? 1 : 0, days }
  }
  return [...ingredients].sort((a, b) => {
    const ra = rank(a), rb = rank(b)
    if (ra.available !== rb.available) return rb.available - ra.available
    return ra.days - rb.days
  })
}

/**
 * The shelf-life badge for an ingredient in the shelf-life view.
 * @param {{available?:boolean, remaining_shelf_life?:number}} ing
 * @returns {{text:string, tone:'danger'|'warning'|'neutral', shown:boolean}}
 *   `shown` is false when the ingredient isn't in the pantry (no remaining
 *   shelf life to display); the caller renders nothing in that case.
 */
export function shelfLifeBadge(ing) {
  if (!ing.available) return { text: '', tone: 'neutral', shown: false }
  const days = ing.remaining_shelf_life
  if (days == null || isNaN(days)) return { text: 'In pantry', tone: 'neutral', shown: true }
  if (days <= 0) return { text: 'Expired', tone: 'danger', shown: true }
  if (days === 1) return { text: '1 day left', tone: 'warning', shown: true }
  if (days <= 2) return { text: `${days} days left`, tone: 'warning', shown: true }
  return { text: `${days} days left`, tone: 'neutral', shown: true }
}

/**
 * Order a copy of the ingredients by name, case-aware `localeCompare`. The
 * backend `GET /ingredients?sort=name` already returns this order, but the
 * page re-sorts after a local mutation (add / rename) so the list re-anchors
 * without a refetch. Non-mutating.
 * @param {Array<{name:string}>} ingredients
 * @returns {Array} a new sorted array
 */
export function sortByName(ingredients) {
  return [...ingredients].sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

/**
 * Case-insensitive name-substring search. An empty/blank term returns the
 * list unchanged (the caller already short-circuits, but this keeps the
 * helper self-contained). Does not mutate the input.
 * @param {Array<{name:string}>} ingredients
 * @param {string} term
 * @returns {Array}
 */
export function filterIngredients(ingredients, term) {
  const t = (term || '').trim().toLowerCase()
  if (!t) return [...ingredients]
  return ingredients.filter((ing) => (ing.name || '').toLowerCase().includes(t))
}

/**
 * Inline-validation rules for the add / edit form. Returns a `errors` map
 * keyed by the form field id suffix used in ingredients.js
 * (`name` | `shelf-life` | `serving-unit` | `serving-size`).
 *
 * Rules:
 *   • name — required (non-empty after trim)
 *   • shelf_life — required, a positive integer (days)
 *   • serving_unit — required and one of DEFAULT_UNITS
 *   • serving_size — when present, a number > 0
 *
 * @param {{name?:string, shelf_life?:string|number, serving_unit?:string, serving_size?:string|number}} values
 * @returns {{valid:boolean, errors:Record<string,string>}}
 */
export function validateIngredient(values) {
  const errors = {}

  const name = (values.name || '').trim()
  if (!name) errors['name'] = 'Name is required.'

  // shelf_life arrives as a string from the input (the backend wants an int).
  const shelfRaw = values.shelf_life == null ? '' : String(values.shelf_life).trim()
  if (shelfRaw === '') {
    errors['shelf-life'] = 'Shelf life is required.'
  } else if (!/^\d+$/.test(shelfRaw) || parseInt(shelfRaw, 10) <= 0) {
    errors['shelf-life'] = 'Shelf life must be a whole number of days greater than 0.'
  }

  const unit = (values.serving_unit || '').trim()
  if (!unit) {
    errors['serving-unit'] = 'Serving unit is required.'
  } else if (!DEFAULT_UNITS.includes(unit)) {
    errors['serving-unit'] = 'Serving unit must be one of: ' + DEFAULT_UNITS.join(', ') + '.'
  }

  // serving_size is optional in the form but the backend stores a number; if
  // the user typed one it must be a positive number.
  const sizeRaw = values.serving_size == null ? '' : String(values.serving_size).trim()
  if (sizeRaw !== '') {
    const size = Number(sizeRaw)
    if (isNaN(size) || size <= 0) {
      errors['serving-size'] = 'Serving size must be a positive number.'
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}