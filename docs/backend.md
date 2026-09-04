# Backend

Architecture and logic of the FastAPI backend. Domain vocabulary lives in [`CONTEXT.md`](../CONTEXT.md); cross-cutting business rules live in [`domain-logic.md`](./domain-logic.md).

## Stack

- **FastAPI** app (`backend/app.py`) — thin composition root: CORS middleware plus the five routers, one `/health` endpoint. No global dependency wiring beyond that.
- **PostgreSQL 17** accessed through **SQLAlchemy** ORM (`backend/database.py`), configured entirely from the `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` environment variables. The process exits at import time if any of them is missing.
- **Pydantic v2** schemas (`backend/schemas.py`) define the API shapes.

The routers mount **without an `/api` prefix**. Nginx maps `location /api/ { proxy_pass http://backend:5000/; }` (`nginx.conf`), stripping the prefix; the Vite dev server mirrors this with a rewrite rule (`frontend/vite.config.js`). A client URL of `/api/recipes` is the router's `/recipes`.

## Routers

| Router | Prefix | Responsibility |
|---|---|---|
| `auth_router` | `/auth` | signup, login, `/me`; JWT issuing and the `get_current_user` dependency everything else uses |
| `recipe_router` | `/recipes` | global + user recipe CRUD, `only_available` filter |
| `ingredient_router` | `/ingredients` | pantry list with remaining-shelf-life, add/update/delete with recipe-sync side effects |
| `plan_router` | `/weekly-plan` | get the full week as a nested dict, upsert one meal slot, PDF export |
| `utilities_router` | `/utilities` | serving-unit list, per-day nutrition, shopping list |

All routers except `/auth/signup`, `/auth/login`, `/utilities/list-serving-units`, and `/health` require the `get_current_user` dependency.

## Data model

`backend/models.py`:

- **`User`** — email + bcrypt hash.
- **`Ingredient`** — nutrition values (5 macros + 6 micronutrients), `available`, `shelf_life`, `last_available`, `serving_unit`, `serving_size` (the **nutrition basis**). Ownership via nullable `user_id`: `NULL` = global stock, else user-owned. Uniqueness: `(user_id, name)` plus a partial unique index on bare `name` where `user_id IS NULL`.
- **`Recipe`** — `name`, `serves`, `ingredients` (JSONB array of `{name, quantity, serving_unit}`), `instructions`, `meal_type`, `is_vegetarian`, nutrition columns, nullable `user_id` with the same dual uniqueness pattern. **Recipe nutrition columns are whole-batch totals computed by a trigger, not stored app-side values** (see below).
- **`WeeklyPlan`** — one row per `(user_id, day, meal_type)` with `recipe_ids: ARRAY(Integer)`. This is the single source of truth for the weekly plan; there is no separate "current week" concept — every user has exactly one plan.

### Database-level invariants (triggers)

Two behaviors live in Postgres, not Python — created by SQLAlchemy DDL events at table creation:

1. **`calculate_recipe_nutrients`** — `BEFORE INSERT OR UPDATE` on `recipes`. Recomputes all nutrition columns from the JSONB ingredient rows, scaling each ingredient's nutrients from its **nutrition basis** by the row quantity. Ingredient lookup prefers the owning user's ingredient row, falling back to any global ingredient with the same name; unmatched names contribute zero. This means the DB is authoritative for recipe nutrition — Python never sets those columns.
2. **`check_recipe_ids_exist`** — deferred constraint trigger on `weekly_plan.recipe_ids`, raising if any id is missing from `recipes`. A plan-slot write with a bogus recipe id fails at commit with a 400.

### Seeding (`setup_db.py`)

Runs on container start (`CMD python setup_db.py && uvicorn …`):

1. `Base.metadata.create_all` (which also creates the two triggers).
2. Idempotent constraint/index migration for multi-user ownership (drops the legacy single-column unique constraints, adds the per-user + global-partial ones for ingredients and recipes, the `(user_id, day, meal_type)` unique for the plan).
3. Creates or updates the **default user** from `DEFAULT_USER_EMAIL` / `DEFAULT_USER_PASSWORD` env vars (fallbacks `demo@demo.com` / `demo123`).
4. Upserts CSV seed data from `backend/data/`: `ingredients.csv` → **global stock** (`user_id` stays NULL), `recipes.csv` → owned by the default user, `weekly_plan.csv` → default user's plan. All three upsert on their natural keys, so re-running is idempotent.
5. Resets id sequences to the seeded max.

Note the asymmetry: seeded **ingredients are global**, seeded **recipes belong to the demo user** (and become each new signup's starter pack — see auth below).

## Auth

- JWT bearer tokens (HS256, `MEALPLANNER_SECRET`, default expiry 24 h via `MEALPLANNER_TOKEN_MINUTES`). Login is OAuth2 password-form at `/auth/login`.
- Token source: standard `Authorization` header, or `X-Forwarded-Authorization` — the latter exists because some proxies strip the original header; nginx forwards both.
- **Signup clones the demo user's recipes and ingredients into the new account** — an intentional starter pack, not a migration hack. The clone is located by the configured default-user email, falling back to `demo@demo.com`, then to the first user by id; new accounts get that user's data with `available = False` for ingredients. If the demo account is deleted or renamed, the starter pack changes with it — treat the default user as load-bearing.
- Signup does **not** clone the demo user's weekly plan.

## PDF export

`GET /weekly-plan/pdf` renders the plan as a LaTeX table via `pylatex` (that's why the backend image installs TeX Live). Only the five plannable meal types appear; recipe names, not ids. In-memory; streamed as an attachment.

## Testing

`tests/` runs against a real PostgreSQL — JSONB, ARRAY, and the triggers are exactly the behaviors tests must exercise. `conftest.py` spins up an ephemeral `postgres:15-alpine` via **Testcontainers** for the session, creates all tables (trigger DDL events fire), truncates between tests, and overrides `get_db`. Frontend pure-logic tests run separately with `node --test` in `frontend/test/`.

## Known deviations

See [`domain-logic.md`](./domain-logic.md#known-deviations).