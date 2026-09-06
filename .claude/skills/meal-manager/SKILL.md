---
name: meal-manager
description: Manage meals in the MealPlanner app — update the weekly plan, create/edit/delete recipes, manage ingredients and pantry stock, and pull the derived shopping list or per-day nutrition. Use this whenever the user wants to do anything with their meal planning: planning meals for a day or week, adding or editing recipes, adding ingredients or marking them in/out of the pantry, checking what's available, generating a shopping list, asking about nutrition for a day, or exporting the plan to PDF. Trigger it even when the user doesn't say "MealPlanner" explicitly — phrases like "what's for dinner on Monday", "add a recipe for...", "I have chicken in the pantry", "what do I need to buy", "plan lunch for the week", or "mark oats as available" all mean use this skill. All operations go through the MealPlanner REST API on the local Docker stack.
---

# Meal Manager

Manage the MealPlanner app through its REST API. The app runs as a Docker stack
with the backend exposed on **port 5000** (e.g. `http://localhost:5000`).

Everything you do should go through the bundled CLI **`scripts/mp.sh`**. It handles
authentication and a set of API shape quirks that are easy to get wrong with raw
`curl` — use it instead of writing your own requests. Run `mp help` to see every
command.

## The model (read this first — it drives every decision)

The app has five interacting concepts. Understanding how they relate prevents the
most common mistakes:

- **Recipe** — a cookable dish. Has a `meal_type`, `serves` (how many people the
  batch feeds), a list of **recipe ingredients** (`{name, quantity, serving_unit}`),
  `instructions`, and `is_vegetarian`. **Nutrition is never sent by you** — a
  database trigger recomputes protein/carbs/fat/fiber/energy from the ingredient
  rows every time a recipe is saved. Sending nutrition fields is silently ignored
  at best; just omit them.
- **Ingredient** — a pantry/shopping item tracked independently of recipes. Has a
  `serving_unit`, a `serving_size` (the **nutrition basis** — the quantity its
  nutrient values are stated for, e.g. "per 100 g"), shelf-life, and nutrition
  values. A recipe references an ingredient **by name, not by id**.
- **Pantry** — there is no separate pantry object. The pantry is just the
  `available` boolean on each ingredient. "Mark available" / "I have X in the
  pantry" means flipping `available=true` (which also stamps `last_available`).
  Ingredients auto-expire: when an available ingredient's shelf life elapses, the
  server marks it unavailable on the next authenticated request.
- **Weekly plan** — one plan per user, structured as `{day: {meal_type: [recipe_ids]}}`.
  Writing a plan slot **replaces** that slot's recipe list; it does **not append**.
  To add a recipe to a slot that already has one, read the current ids, add the new
  one, and write the full combined list back.
- **Shopping list** — **derived and read-only**. The server computes it from the
  weekly plan minus ingredients currently marked available. Never try to edit it;
  change the plan or pantry instead.

## Meal types

Seven exist, but only **five are plannable**: `pre_breakfast`, `breakfast`,
`lunch`, `dinner`, `snack`. The other two — `sides` and `weekend_prep` — can be
assigned to a recipe (cataloguing) but **cannot be placed in the plan**. The CLI
rejects `sides`/`weekend_prep` at plan-set time so you get a clear error instead
of a 422.

Serving units are fixed: `g`, `ml`, `cup`, `tbsp`, `tsp`, `nos` (`mp units`).

Day names in the plan are **capitalized** (`Monday`…`Sunday`). The CLI accepts any
case on input and normalizes it, but the raw `mp plan` output uses capitalized
keys — index accordingly when you parse it.

## Getting started

```bash
MP=scripts/mp.sh        # use the absolute path to the bundled script
$MP login               # authenticate (form-data under the hood; caches token)
$MP me                   # confirm identity -> {"id":1,"email":"demo@demo.com"}
```

The script reads credentials from env with defaults — `MP_BASE_URL`,
`MP_USER`, `MP_PASS` (default `http://localhost:5000` / `demo@demo.com` /
`demo123`). Override them if the stack lives elsewhere or uses other creds. The
token is cached at `~/.cache/mealplanner/token` and auto-refreshed on 401.

## Commands you'll reach for

```bash
# --- look around (read-only, safe to run freely) ---
mp recipes                         # all recipes (yours + global)
mp recipes --only-available        # only recipes you can cook right now
mp recipe <id>                     # one recipe, full detail
mp ingredients                     # all ingredients (yours + global stock)
mp ingredients --available         # pantry: what's marked in-stock
mp ingredient <id>                 # one ingredient (list+filter; no single endpoint)
mp plan                            # the whole week
mp nutrition Monday                # macros for one day
mp shopping-list                   # derived shopping list (read-only)

# --- recipes (JSON body; NO nutrition fields) ---
mp recipe-create  '<json>'         # or a file path, or "-" for stdin
mp recipe-update  <id> '<json>'    # only recipes you own
mp recipe-delete  <id>             # only recipes you own

# --- ingredients (query-param endpoints — the CLI handles this) ---
mp ingredient-add    --name="oats" --unit=g --shelf-life=365
mp ingredient-update <id> --available=true --shelf-life=60 --energy=380
mp ingredient-delete <id>          # fails if any recipe still uses it
#   clear a nutrition field by passing an empty value: --energy=

# --- pantry (the `available` flag) ---
mp pantry list                     # in-stock ingredients
mp pantry add <id>                 # mark available
mp pantry remove <id>              # mark unavailable

# --- weekly plan (slot writes REPLACE, they do not append) ---
mp plan-set   Monday breakfast 72,80   # set Monday breakfast to those recipes
mp plan-clear Monday breakfast         # empty a slot
mp plan-pdf   plan.pdf                 # download the plan as PDF
```

### Recipe JSON shape (for create/update)

```json
{
  "name": "Vegetable stir fry",
  "serves": 2,
  "ingredients": [
    {"name": "capsicum", "quantity": 150, "serving_unit": "g"},
    {"name": "olive oil", "quantity": 2, "serving_unit": "tbsp"}
  ],
  "instructions": "Slice and stir fry over high heat.",
  "meal_type": "dinner",
  "is_vegetarian": true
}
```

Ingredient names in a recipe must match an existing ingredient **by name**
(case-insensitive, trimmed). If a name doesn't match anything, that row
contributes zero nutrition — so create the ingredient first if it's new. Use a
plannable meal_type for recipes you intend to plan; `sides`/`weekend_prep` are
fine for catalogue entries you'll never place on the plan.

## How to do common tasks

**"Plan dinner for Monday"** — find candidate recipes, then set the slot:
```bash
$MP recipes --only-available | jq '.[] | select(.meal_type=="dinner") | {id,name}'
$MP plan-set Monday dinner 72
```
If Monday dinner already has a recipe and the user wants to *add* one, read
current ids first and write the full list (replace, not append):
```bash
CUR=$($MP plan | jq -r '.Monday.dinner | map(tostring) | join(",")')
$MP plan-set Monday dinner "$CUR,72"
```

**"I just bought chicken"** — find the ingredient, mark it available:
```bash
$MP ingredients | jq '.[] | select(.name|test("chicken";"i")) | {id,name,available}'
$MP pantry add <id>
```

**"What do I need to buy?"** — the shopping list already excludes what's in the
pantry:
```bash
$MP shopping-list
```
If the user expected an item to be missing but it isn't, check whether it's
marked available (`mp pantry list`) — that's usually why.

**"Add a new recipe"** — if it uses an ingredient that doesn't exist yet, create
the ingredient first (so nutrition is computed), then the recipe:
```bash
$MP ingredient-add --name="tempeh" --unit=g --shelf-life=14
$MP recipe-create '{"name":"Tempeh stir fry","serves":2,"ingredients":[{"name":"tempeh","quantity":200,"serving_unit":"g"}],"instructions":"...","meal_type":"dinner","is_vegetarian":true}'
```

**"How much protein on Monday?"** — `$MP nutrition Monday`.

## Things that bite if you forget

- **Plan writes replace, never append.** Always read the current slot and write
  the full combined list when adding to a slot.
- **Don't send recipe nutrition fields.** They're computed by a DB trigger from
  the ingredient rows; including them is meaningless.
- **Recipe ↔ ingredient is by name.** Renaming an ingredient, changing its unit,
  or changing its `serving_size` automatically propagates into every recipe that
  uses it (the server rescales quantities to preserve nutrition). You don't sync
  recipes yourself — but it's why a rename is not a trivial change.
- **Deleting an ingredient fails if any recipe uses it** (HTTP 405 with the
  recipe names in the error). Remove it from those recipes first.
- **`serving_size` is the nutrition basis**, not a serving portion. For `g`/`ml`
  ingredients it defaults to 100; for others, 1. The trigger divides each recipe
  row's quantity by it.
- **Shopping list is read-only.** It's plan-minus-pantry; edit those instead.
- **Days are capitalized in `mp plan` output** (`Monday`). Meal types are
  lowercase snake_case (`pre_breakfast`).

## When the API isn't there

If `mp login` fails with a connection error, the Docker stack probably isn't up.
Check `docker ps` for a `mealplanner-backend` container with `5000->5000`, and
start the stack from the project root if needed. Don't try to fabricate data
locally — the API is the source of truth.