# Domain Logic

The business rules of MealPlanner as the code enforces them, plus the deviations where code contradicts its own intent. Vocabulary in [`CONTEXT.md`](../CONTEXT.md); architecture in [`backend.md`](./backend.md) and [`frontend.md`](./frontend.md).

## The nutrition chain

Nutrition flows through three levels, each with its own meaning:

1. **Ingredient level.** An ingredient's nutrient values (5 macros + 6 micronutrients) are stated per its **nutrition basis** (`serving_size` of its `serving_unit` — e.g. per 100 g, or per tbsp). The basis has nothing to do with people; bulk units (g, ml) default the basis to 100, discrete units (cup, tbsp, tsp, nos) to 1.
2. **Recipe level.** A recipe's nutrition columns are **whole-batch totals**: the DB trigger sums each recipe-ingredient's nutrients scaled from its basis to the row's quantity. These columns are never written by application code, only by the trigger.
3. **Serving level.** One person's portion is derived at read time by dividing the whole-batch totals by `Recipe.serves`. The weekly planner's day totals are per-serving sums, per the ruling below.

**Ruling (resolved):** *per-serving is the canonical meaning of "day nutrition" — a person eats a portion, not the batch.* Recipe tables keep whole-batch totals (that's the nutrition of the ingredients as used); anything "per person" divides by `serves` at read time.

## Recipe ↔ Ingredient linking is by name

Recipe ingredient rows (`{name, quantity, serving_unit}` in the recipe's JSONB) reference ingredients **by name string, not by id**. This is the intended model, not debt — name is the identity, and the codebase is built around it:

- Every match is **case-insensitive and trimmed** where it matters: recipe-availability filtering, the rename/unit sync, the shopping list, and the frontend usage index all normalize names the same way (lowercase + strip) before comparing.
- **Rename sync.** Updating an ingredient's name rewrites the matching row's name in every recipe (user's + global) that mentions the old name, case-insensitively; quantity and unit are left alone.
- **Unit sync.** Updating an ingredient's serving unit rewrites matching recipe rows' units. Quantity is converted only for exact **volume↔volume** factors (ml/tsp/tbsp/cup — 1 tsp = 5 ml, 1 tbsp = 15 ml, 1 cup = 240 ml). Any conversion involving `g` (mass) or `nos` (count) is **refused**: no generic factor exists (a tbsp of oil ≈ 13.5 g; a tbsp of flour ≈ 8 g), so the numeric quantity is deliberately left untouched and logged as needing manual repair, rather than scaled by an invented number.
- **Change detection.** Sync only fires when a value actually changed. The edit UIs re-send current values on every save; historically, a blind rescale on a no-op save corrupted recipe quantities (a ×100 factor applied per save). This is why the sync code compares old vs new before touching recipes.
- **`serving_size` is not synced and never rescales recipe quantities** — it is the ingredient's nutrition basis only, and recipe rows don't store it.
- **Deletion guard.** Deleting an ingredient is refused (HTTP 405) while any recipe still mentions its name.

The nutrition trigger's ingredient lookup follows the same rule: prefer the owning user's ingredient row, fall back to global stock. Unmatched names silently contribute zero — a recipe ingredient with no matching pantry entry still works, but its nutrition is absent.

## Shopping list derivation

`GET /utilities/shopping-list` derives, never stores:

1. Collect all recipes referenced anywhere in the user's weekly plan.
2. Flatten their recipe-ingredient rows, **excluding** ingredients the user has marked `available` (pantry stock).
3. Aggregate the rest by lowercased name, summing quantities and carrying the first-seen serving unit.

The frontend enriches this with a client-side usage index (which day/meal/recipe uses each ingredient), rebuilt from the plan + recipes because the backend response doesn't carry usage.

**Known limitation:** aggregation sums quantities across recipes **without unit conversion** and carries only the first-seen unit, so the same ingredient measured in different units across recipes produces a mixed-unit total. The code comments acknowledge this ("in a real app, you'd need unit conversion logic").

## Ingredient lifecycle (pantry / shelf life)

- `available` marks pantry stock; `last_available` timestamps the moment it was marked available.
- `remaining_shelf_life = shelf_life − days since last_available`, floored at 0; computed at read time in the list endpoint.
- **Auto-expiry** runs as a side effect of `get_current_user` — every authenticated request sweeps the user's available, shelf-lived ingredients and flips expired ones to unavailable. Consequence: expiry happens lazily, only when the user actually makes requests; nothing expires while nobody logs in.
- The frontend treats `remaining_shelf_life ≤ 0` as "Expired", ≤ 2 days as warning tone.

## Weekly plan shape

- The plan is a fixed frame: 7 days × 5 plannable meal slots (pre-breakfast, breakfast, lunch, snack, dinner), every slot an array of recipe ids (a slot can hold several recipes; the plan initializes all 7 meal-type keys per day even though only 5 are plannable).
- Writes are per-slot upserts (`PUT /weekly-plan` with one day + meal type), not whole-plan saves.
- Hub-only meal types (sides, weekend prep) exist in recipes but are never planned; the Recipe Hub groups them without an Assign affordance.

## Signup starter pack

Signup clones the demo user's recipes and ingredients into the new account (ingredients come across unavailable). Intended behavior — new users start from a working collection they then own. Dependency: the clone source is the configured default user; the demo account is load-bearing (see [`backend.md`](./backend.md#auth)).

## Known deviations

Where code contradicts the rulings above. Listed here, not silently blessed — each is a candidate fix.

1. **`GET /utilities/nutrition/{day}` sums whole-batch recipe totals** — it returns the batch-scale nutrition of a day (4× the UI's number for a 4-serving recipe), contradicting the per-serving ruling. Should divide by `serves` (e.g. via `SUM(Recipe.protein / NULLIF(Recipe.serves,0))`).
2. **`delete_ingredient`'s usage check matches names exactly** (`ingredient_router.py` compares `ingredient['name'] == db_ingredient.name`), while every other by-name match is case-insensitive + trimmed. A recipe containing `Cumin` will not block deleting ingredient `cumin`, leaving a dangling recipe-ingredient reference. Should reuse the normalized match.
3. **Shopping list aggregates without unit conversion** (see limitation above).
4. **Display-order drift:** the frontend sorts meal types chronologically (`pre_breakfast → breakfast → lunch → snack → dinner`), while the PDF export orders them `breakfast → lunch → dinner → snack` and the Recipe Hub groups lunch+dinner into one tab. Same vocabulary, three different orders — worth aligning if it ever matters visually.