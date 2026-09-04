# CONTEXT.md

Glossary for the MealPlanner domain. Terms only — no implementation details.

## Language

### Core

- **Recipe** — a cookable dish with ingredients, serving units, and nutrition data; the unit the planner places onto days.
- **Ingredient** — a pantry/shopping item, tracked independently of recipes.
- **Weekly plan** — the assignment of recipes to days of a week; the central state of the app.
- **Plan day** — one day slot within the weekly plan, holding zero or more recipe placements.
- **Meal slot** — one plannable meal-type position within a plan day, holding zero or more recipes.
- **Meal type** — one of the seven categories a recipe belongs to: the five plannable occasions (pre-breakfast, breakfast, lunch, snack, dinner) plus two hub-only ones (sides, weekend prep) that can be catalogued but never planned.
- **Shopping list** — the ingredient needs derived from the current weekly plan, reduced by what is already available; a derived view, never edited directly.
- **Recipe ingredient** — the mention of an ingredient inside a recipe, carrying quantity and serving unit, identified by the ingredient's name._Avoid_: ingredient row, recipe row.
- **Serving unit** — a unit in which a recipe or ingredient is measured (g, ml, cup, tbsp, tsp, nos)._Avoid_: serving size (reserved for the basis concept below).
- **Nutrition basis** — the quantity of an ingredient its nutrient values are stated for (e.g. "per 100 g"); has nothing to do with people._Avoid_: serving size.
- **Serving** — one person's portion of a cooked recipe; a batch yields a fixed number of servings._Avoid_: portion, serving size.

### Ownership

- **Global stock** — an ingredient (or recipe) visible to every user, not owned by anyone. Publishing a recipe as global is an intended capability, not yet reachable in the product._Avoid_: shared, public, master.
- **User ingredient / user recipe** — an ingredient or recipe owned by one user and invisible to others.

## Relationships

- A **Plan day** contains one **Meal slot** per plannable **Meal type**.
- A **Meal slot** holds zero or more **Recipes**.
- A **Recipe** is stated in **Servings**; its nutrition is stated for the whole batch, and one **Serving**'s nutrition is derived from it.
- A **Recipe ingredient** references an **Ingredient** by name.
- An **Ingredient**'s nutrition is stated per **Nutrition basis**.
- The **Shopping list** is derived from the **Weekly plan** minus **Global stock**/user ingredients marked available.

## Flagged ambiguities

- "serving" was used to mean three things — the unit of measure, the ingredient's nutrition basis, and one person's portion. Resolved: **Serving unit**, **Nutrition basis**, and **Serving** are distinct concepts.
- "plan day" vs "meal slot" — resolved: the day is the container, the **Meal slot** is the day × meal-type position that actually holds recipes.