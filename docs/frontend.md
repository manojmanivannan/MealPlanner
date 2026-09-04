# Frontend

The frontend is a **Vite multi-page app (MPA)** with compiled **Tailwind v4** — no runtime CDN, no SPA framework. Design language: "Material Flat Minimalist".

## Build scaffold

`frontend/vite.config.js` (`appType: 'mpa'`): one HTML entry per page, each page served directly with no history fallback. Entries: `index` (weekly planner), `recipe-hub`, `ingredients`, `shopping-list`, `welcome`, plus `catalog` — the component catalog, a design artifact reachable only in the build, not part of the nav. Output goes to `dist/`, which is what nginx serves in every deployment profile.

The dev server proxies `/api` to `localhost:5000` and strips the prefix, mirroring nginx's `location /api/` (the backend routers mount without the prefix).

## Page inventory

| Page | Entry | Content module(s) |
|---|---|---|
| Weekly Planner | `index.html` | `src/pages/weekly-planner.js` |
| Recipe Hub | `recipe-hub.html` | `src/pages/recipe-hub.js` + `recipe-hub-logic.js` |
| Ingredients (Pantry) | `ingredients.html` | `src/pages/ingredients.js` + `ingredients-logic.js` |
| Shopping List | `shopping-list.html` | `src/pages/shopping-list.js` + `shopping-list-logic.js` |
| Welcome / Auth | `welcome.html` | `src/pages/welcome.js` |
| Component catalog | `catalog.html` | `src/pages/catalog.js` |

Every authenticated page entry is the same three lines: import `bootstrap.js`, call `mountLayout({ activeNav })` (from `layout.js`), then run the page logic. `bootstrap.js` loads the self-hosted Inter fonts, the compiled stylesheet, and re-exports `mountLayout`.

## Design system

- **Tokens** — `design/tokens.css` defines semantic custom properties (surfaces, borders, text, accent, radius, fonts); `styles.css` maps them into Tailwind v4's `@theme inline`, so Tailwind utilities (e.g. `text-primary`, `bg-canvas`) are token-driven.
- **Shared components** — `src/components/modal.js` (focus trap, ESC, click-outside) and `toast.js`; `design/components.css` is the reference styling, `src/legacy.css` bridges rules not yet tokenized.
- **Catalog** (`catalog.html` + `catalog.js`) — the living reference for restyled primitives, tab pattern (roving tabindex, arrow-key nav), modal/toast triggers, and the auth form showcase. Page redesigns copy its patterns; it is deliberately outside the nav.
- **Layout** — `layout.js` renders the Material flat top app bar (desktop nav), bottom navigation (mobile), theme toggle (light/dark/system persisted in `localStorage` as `mp-theme`), and the auth bootstrap. Nav labels: Planner, Recipes, Pantry, Shopping.
- **Auth bootstrap** — pages check the cached JWT in `localStorage.token`; the welcome page redirects authenticated users straight to the planner.

## Structure convention: logic / render split

Each redesigned page splits a DOM-free, pure-logic module (`*-logic.js`) from its render module (`*.js`):

- The logic module contains vocabulary constants (days, meal order, labels), filters/sorters, validation, and formatting — no `document`, no `fetch`, no `localStorage`, and never mutating its arguments.
- The render module imports the logic module and owns the DOM and network.
- `frontend/test/*.test.mjs` exercises the logic modules with Node's built-in `node --test` (`npm test`) — no browser needed.

This is the enforced pattern for new page work: pure logic testable in isolation, render kept thin.

## API conventions in the browser

- All calls go through the `/api` prefix (nginx strips it); JWT is sent as a Bearer token from `localStorage`.
- The frontend owns client-side enrichment where the backend response is minimal — e.g. the shopping list page rebuilds a plan + recipes usage index client-side to power the "which day/meal uses this" hint, matching the backend's lowercased ingredient-name keys.
- The weekly planner computes day nutrition client-side as **per-serving** sums (`recipe nutrition / serves`) from the recipes list + plan; the backend day-nutrition endpoint currently disagrees (see [`domain-logic.md`](./domain-logic.md#known-deviations)).

## The legacy tree is dead

`frontend/html/` (plain-JS `weekly-plan.js`, `recipe-hub.js`, `ingredients.js`, `styles.css`) is the pre-Vite frontend. It is **superseded and unreachable**: no nginx path serves it, and every page lives in the Vite build. Do not edit it; it exists only as historical reference and can be deleted wholesale. (Its last parallel maintenance produced the same change applied twice — the tree was retired to stop that.)

## Responsive & accessibility posture

Mobile bottom nav + desktop top bar; the catalog documents the shared tab, modal, and toast patterns including keyboard handling (arrow/Home/End tabs, focus-trapped modals, ESC to close); theme choice honors system preference by default.