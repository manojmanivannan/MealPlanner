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
- **Serving-size rescale.** A recipe row's quantity only means something *relative to the ingredient's `serving_size`* (the trigger computes `nutrient × quantity / serving_size` and never reads the row's unit). So any **actual** `serving_size` change rescales every matching recipe row by `new_size / old_size` — stored rounded to 8 decimal places, which keeps write-time error ≤ 5e-9 per edit and can never collapse a real quantity to zero (4-decimal storage turned a 4 mg spice row downsized ×0.01 into exactly 0.0, and compounded truncation drift across repeated edits) — preserving each recipe's nutrition by construction: the same ratio cancels in the trigger math. The factor is computed from the DB's old size in a single atomic update (the unit change and size re-entry arrive in one request; no two-phase apply). Rows are matched by name, case-insensitively and trimmed, across the current user's recipes and global recipes.
- **Unit sync is a relabel.** Updating an ingredient's serving unit rewrites matching recipe rows' `serving_unit` only. It does nothing numeric itself: the rescale flows exclusively through the serving-size ratio above, which is why the edit UI forces the serving size to be re-confirmed (required, pre-filled with a unit-based suggestion) whenever the unit changes. There is no generic unit-conversion table — a tbsp of oil ≈ 13.5 g but a tbsp of flour ≈ 8 g, so food-specific conversions are the user's call, expressed through the new serving size.
- **Change detection.** Sync only fires when a value actually changed. The edit UIs re-send current values on every save; historically, a blind rescale on a no-op save corrupted recipe quantities (a ×100 factor applied per save). This is why the sync code compares old vs new before touching recipes — a no-op save leaves recipe rows byte-identical.
- **`serving_size` validation.** When provided on update it must be a number > 0 (400 otherwise) — it is the nutrition anchor, and null/zero would poison the trigger's division. Absence stays allowed: the pantry availability toggle PUTs only `available`. "Required" is enforced by the edit UI, not by rejecting absent params.
- **Legacy unusable sizes.** Rows written before validation existed can hold `serving_size` NULL, 0, negative, NaN, or ±Inf (pydantic used to accept NaN floats; Postgres Numeric stores them). None of these is a usable rescale factor: a size-change PUT that hits one is **rejected with 400 naming the referencing recipes** — silently storing the new size while leaving quantities would shift every referencing recipe's nutrition by the old/new ratio (#43 for NULL/≤0, #48 for the non-finite variants, where `new/NaN` would additionally write NaN into recipe JSONB). A PUT without recipes referencing the ingredient succeeds, so the value can be repaired. `setup_db` backfills the NULL and non-finite rows (NaN and ±Inf) to the create-time default (100 for g/ml, else 1) on startup; 0 and negative sizes are finite values the rejection's guided repair is meant for, so the migration leaves them alone. The nutrition trigger routes a non-finite divisor to a 0.0 contribution, and `IngredientSchema` echoes a non-finite size as null instead of 500-ing the response.
- **Deletion guard.** Deleting an ingredient is refused (HTTP 405) while any recipe still mentions its name.

The nutrition trigger's ingredient lookup follows the same rule: prefer the owning user's ingredient row, fall back to global stock. Unmatched names silently contribute zero — a recipe ingredient with no matching pantry entry still works, but its nutrition is absent.

**Known deviation:** `PUT /ingredients/{id}` filters ownership (`Ingredient.user_id == current_user.id`), so **no user can edit a global ingredient through the API**. Consequence: a global ingredient's serving size can never change via the app, and the rescale's non-propagation to other users' fallback recipes is currently unreachable — a global ingredient is effectively frozen (creatable only outside the API). If global-ingredient editing is ever opened up, the rescale must consider other users' recipes too.

**Pre-existing issues left untouched by the serving-size-rescale slice** (flagged, deliberately not fixed):
- The trigger also matches recipe rows **case-sensitively** (`WHERE name = ing_record.name`), while the ingredient-sync rescale matches case-insensitively. For a row spelled differently from the ingredient (row `ginger`, ingredient `Ginger`) the rescale's nutrition-preservation guarantee doesn't hold: the trigger either finds no ingredient (the row contributes zero, before and after) or finds a differently-cased ingredient's basis, so the nutrition moves by the rescale factor.
- The companion deviation — the trigger's fallback not being restricted to global stock, letting another user's ingredient values feed a recipe's nutrition — was fixed in #47: the fallback now selects only `user_id IS NULL` rows.

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