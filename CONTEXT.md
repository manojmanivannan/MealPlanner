# CONTEXT.md

Glossary for the MealPlanner domain. Terms only — no implementation details.

## Domain terms

- **Recipe** — a cookable dish with ingredients, serving units, and nutrition data; the unit the planner places onto days.
- **Ingredient** — a pantry/shopping item, tracked independently of recipes.
- **Weekly plan** — the assignment of recipes to days of a week; the central state of the app.
- **Plan day** — one day slot within the weekly plan, holding zero or more recipe placements.
- **Shopping list** — the aggregated ingredient needs derived from the current weekly plan.
- **Serving unit** — a unit in which a recipe or ingredient is measured (portion, gram, cup, …).

## Agent-facing terms (WebMCP effort)

- **Agent** — an AI system browsing the site and acting through its tools, in place of a human user.
- **WebMCP tool** — a capability the site declares for agents browsing it, registered through the browser's model-context interface so the agent can call it directly.
- **Tool registration** — the act of declaring the tool inventory to the browser when a page loads.
- **Tool inventory** — the complete, named set of tools the site offers; identical on every page.
- **Semantic verb** — a tool named for the user's intention (e.g. "add this recipe to Tuesday") rather than a raw storage operation; implemented by the site, not exposed as a primitive.
- **Read / mutate tier** — the classification of a tool by whether it changes state, surfaced to agents as safety hints (read-only vs consequential).
- **Secure context** — the HTTPS-only browsing context the browser requires before tool registration is possible.