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
import { normalizeName } from './shopping-list-logic.js'

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
 * The serving_size a unit change pre-fills in the edit modal: a nutrition-basis
 * suggestion, not the create-time default (backend `add_ingredient` defaults
 * everything non-bulk to 1, cup included). Bulk units suggest "per 100", a cup
 * suggests 240 ml, discrete units "per unit".
 * @param {string} unit
 * @returns {number}
 */
export function defaultServingSize(unit) {
  if (unit === 'g' || unit === 'ml') return 100
  if (unit === 'cup') return 240
  return 1
}

/**
 * Decide what the edit modal's serving-size field should hold after a unit
 * switch, and what the modal last wrote into it.
 *
 * `lastAutoFill` is the value the modal last wrote into the field, or `null`
 * once the user has typed their own value (the modal clears it on any input
 * event). A value the user typed is never replaced — only a field the modal
 * owns gets restored to `originalSize` (switching back) or pre-filled with
 * the new unit's default (switching away).
 *
 * @param {{current:string, lastAutoFill:string|null, originalSize:string|number, newUnit:string, initialUnit:string}} args
 * @returns {{value:string, lastAutoFill:string|null}} the value to put in the
 *   field and the updated auto-fill marker for the next unit change
 */
export function resolveServingSizeOnUnitChange({
  current,
  lastAutoFill,
  originalSize,
  newUnit,
  initialUnit,
}) {
  const userTyped = current !== '' && current !== String(lastAutoFill ?? '')
  if (!userTyped) {
    if (newUnit === initialUnit) {
      const restored = String(originalSize)
      if (restored === '') {
        // NULL original size: there is nothing to restore — keep the value the
        // modal already confirmed (restoring '' would fail the required-size
        // validation on save for no visible reason).
        return { value: current, lastAutoFill }
      }
      return { value: restored, lastAutoFill: restored }
    }
    const suggested = String(defaultServingSize(newUnit))
    return { value: suggested, lastAutoFill: suggested }
  }
  return { value: current, lastAutoFill: null }
}

/**
 * The stored serving size as a usable rescale factor (a finite number > 0),
 * or null when there is none ('' / NULL / non-numeric / ≤ 0). The single
 * definition of "usable original size" shared by the banner's visibility
 * (servingSizeWillRescale) and its factor text (formatRescaleFactor), so
 * the two cannot disagree about which states are rescale-able.
 * @param {string|number|null} originalSize - the ingredient's stored serving_size
 * @returns {number|null}
 */
function usableOriginalSize(originalSize) {
  if (originalSize === '' || originalSize == null) return null
  const orig = Number(originalSize)
  return Number.isFinite(orig) && orig > 0 ? orig : null
}

/**
 * Whether SAVING the current modal state will rescale recipe quantities:
 * the backend rescales matching recipe rows whenever the saved serving_size
 * differs from the stored one — a unit change is NOT required. A NULL
 * original size (no usable factor) and an empty/invalid current value never
 * rescale (the backend leaves quantities alone and warns), and neither does
 * a current value the save path rejects (serving size must be > 0) — the
 * banner must not promise a rescale the save cannot apply.
 * @param {string|number} current - the value currently in the size field
 * @param {string|number} originalSize - the ingredient's stored serving_size ('' when NULL)
 * @returns {boolean}
 */
export function servingSizeWillRescale(current, originalSize) {
  const orig = usableOriginalSize(originalSize)
  if (orig == null) return false
  if (current === '' || current == null) return false
  const cur = Number(current)
  return Number.isFinite(cur) && cur > 0 && cur !== orig
}

/**
 * The rescale-factor text the edit modal's warning banner promises:
 * `<original> → <suggested> (×<ratio>)`. Recomputed from the LIVE serving
 * size on every render so the promised factor always matches what a save
 * will apply (#42) — the user edits the field while the banner is showing.
 * The output is plain text; the page esc()s the whole string.
 * @param {string|number} originalSize - the ingredient's stored serving_size ('' when NULL)
 * @param {string|number} suggested - the value currently in the size field
 * @returns {string} the factor text, '' with no usable original size, or
 *   the range without a ×ratio when the suggested value isn't save-valid.
 */
export function formatRescaleFactor(originalSize, suggested) {
  const orig = usableOriginalSize(originalSize)
  if (orig == null) return ''
  const cur = Number(suggested)
  // An empty/invalid or non-positive suggested value yields no ratio
  // (Number('') is 0, not a factor). The banner is hidden in these states
  // anyway — servingSizeWillRescale is false — so keep the range text only.
  if (suggested === '' || suggested == null || !Number.isFinite(cur) || cur <= 0) {
    return `${originalSize} → ${suggested}`
  }
  return `${originalSize} → ${suggested} (×${cur / orig})`
}

/**
 * How many recipes use an ingredient, matched the way the backend sync and
 * the shopping list do: case-insensitive and trimmed against each recipe
 * row's name (via the shopping list's `normalizeName`). The recipes come
 * from `GET /recipes` (rows are `{name, quantity, serving_unit}`). Does not
 * mutate the input.
 * @param {Array<{ingredients?:Array<{name?:string}>}>} recipes
 * @param {string} name
 * @returns {number}
 */
export function countRecipesUsingIngredient(recipes, name) {
  const target = normalizeName(name)
  if (!target) return 0
  return (recipes || []).filter((recipe) =>
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.some((row) => normalizeName(row.name) === target)
  ).length
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
 *   • serving_size — when present, a number > 0; required > 0 when
 *     `options.requireServingSize` is set (the edit flow, where a size
 *     change rescales recipe quantities)
 *
 * @param {{name?:string, shelf_life?:string|number, serving_unit?:string, serving_size?:string|number}} values
 * @param {{requireServingSize?:boolean}} [options]
 * @returns {{valid:boolean, errors:Record<string,string>}}
 */
export function validateIngredient(values, options = {}) {
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

  // serving_size is optional in the add form (the create endpoint defaults
  // it); in the edit flow it is required — it is the anchor a recipe
  // rescale divides by — and the user typed value must be a positive number.
  const sizeRaw = values.serving_size == null ? '' : String(values.serving_size).trim()
  if (options.requireServingSize && sizeRaw === '') {
    errors['serving-size'] = 'Serving size is required.'
  } else if (sizeRaw !== '') {
    const size = Number(sizeRaw)
    // Number.isFinite also rejects Infinity ('1e999' typed into a number
    // input), which would poison the backend rescale like NaN would.
    if (!Number.isFinite(size) || size <= 0) {
      errors['serving-size'] = 'Serving size must be a positive number.'
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}