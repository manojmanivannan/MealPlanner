# Meal Planner

![planner](https://github.com/manojmanivannan/mealplanner/blob/master/samples/planner.png?raw=true)

![recipe_hub](https://github.com/manojmanivannan/mealplanner/blob/master/samples/recipe_hub.png?raw=true)

![ingredients](https://github.com/manojmanivannan/mealplanner/blob/master/samples/ingredients.png?raw=true)
A simple, intuitive web application for planning your weekly meals, managing recipes, and tracking ingredients.

## How to Run

This project uses Docker for easy setup and deployment. You can run it locally or in a production environment with Tailscale for secure remote access.

### Local Development

1.  **Prerequisites:**
    *   Docker and Docker Compose installed.

2.  **Configure environment (Optional):**
    *   Create or edit the `.env` file in the project root to configure your database and default login credentials:
        ```bash
        cp .env.example .env
        ```
    *   Set your desired login credentials in `.env`:
        ```dotenv
        DEFAULT_USER_EMAIL=demo@demo.com
        DEFAULT_USER_PASSWORD=demo123
        ```

3.  **Run the application:**
    ```bash
    docker-compose --profile local up --build
    # or using the start helper script:
    ./start.sh up
    ```

4.  **Access the application:**
    *   Open your web browser and go to `http://localhost:8080`.

### Production with Tailscale

1.  **Prerequisites:**
    *   Docker and Docker Compose installed.
    *   A Tailscale account and an auth key.

2.  **Set up your environment:**
    *   Create a `.env` file in the project root and add your Tailscale auth key:
        ```
        TS_AUTHKEY=your_tailscale_auth_key
        ```

3.  **Run the application:**
    ```bash
    docker-compose --profile prod up --build
    ```

4.  **Access the application:**
    *   The application will be available on your Tailscale network at `http://meal_planner`.

## Features

*   **Weekly Meal Planner:** An interactive grid assigning recipes to each of the 5 plannable meal slots (pre-breakfast, breakfast, lunch, snack, dinner) across the 7 days, with per-serving day nutrition totals and a PDF export.
*   **Recipe Hub:** A central place to store and manage all your recipes.
    *   Add, edit, and delete recipes (nutrition is computed automatically from the ingredient rows).
    *   Filter recipes by meal type — including the hub-only Sides and Weekend Prep categories — and dietary preference (vegetarian/non-vegetarian).
*   **Ingredient Management (Pantry):**
    *   A master ingredient list combining global stock with your own.
    *   Track which ingredients you have on hand; mark availability.
    *   Sort alphabetically or by remaining shelf life to monitor freshness.
*   **Shopping List:** Derived from the weekly plan minus what's already in your pantry, with per-ingredient usage hints (which day/meal uses it) and check-off progress.
*   **User Accounts:** Email + password auth; new accounts start from the demo collection as a starter pack.

## Documentation

*   [`CONTEXT.md`](./CONTEXT.md) — domain glossary (canonical vocabulary).
*   [`docs/backend.md`](./docs/backend.md) — backend architecture, data model, triggers, auth, seeding, testing.
*   [`docs/domain-logic.md`](./docs/domain-logic.md) — business rules (nutrition chain, by-name ingredient linking, shopping list, pantry lifecycle) and known deviations.
*   [`docs/frontend.md`](./docs/frontend.md) — Vite MPA scaffold, design system, page inventory, logic/render convention.

## Project Structure

```
.
├── backend
│   ├── app.py
│   ├── data/
│   │   ├── ingredients.csv
│   │   ├── recipes.csv
│   │   └── weekly_plan.csv
│   ├── database.py
│   ├── Dockerfile
│   ├── models.py
│   ├── routers/
│   │   ├── auth_router.py
│   │   ├── ingredient_router.py
│   │   ├── plan_router.py
│   │   ├── recipe_router.py
│   │   └── utilities_router.py
│   ├── schemas.py
│   ├── setup_db.py
│   └── utils.py
├── backup_db.sh
├── config/
│   └── meal.json
├── CONTEXT.md
├── docker-compose.yml
├── docs/
│   ├── agents/
│   ├── backend.md
│   ├── domain-logic.md
│   └── frontend.md
├── frontend
│   ├── Dockerfile
│   ├── index.html          # Vite MPA entries (one HTML per page)
│   ├── recipe-hub.html
│   ├── ingredients.html
│   ├── shopping-list.html
│   ├── welcome.html
│   ├── catalog.html
│   ├── src/                # page logic, layout, components, design tokens
│   ├── test/               # node --test pure-logic unit tests
│   └── vite.config.js
├── nginx.conf
├── README.md
├── requirements-dev.txt
├── restore_db.sh
├── samples
└── tests/                  # pytest suite (Testcontainers PostgreSQL)
```

## Technologies Used

*   **Backend:**
    *   [FastAPI](https://fastapi.tiangolo.com/): API framework with Pydantic v2 schemas.
    *   [PostgreSQL](https://www.postgresql.org/): Data store (JSONB recipe ingredients, ARRAY recipe ids, nutrition/integrity triggers).
    *   [SQLAlchemy](https://www.sqlalchemy.org/) + Psycopg2: ORM and driver.
    *   [pylatex](https://pypi.org/project/pylatex/): PDF export via LaTeX (TeX Live in the backend image).
*   **Frontend:**
    *   [Vite](https://vite.dev/): Multi-page app build (`dist/` served by nginx).
    *   [Tailwind CSS v4](https://tailwindcss.com/): Compiled utility CSS over semantic design tokens.
    *   JavaScript (ES modules), self-hosted Inter — no SPA framework, no runtime CDN.
*   **Testing:**
    *   pytest + [Testcontainers](https://testcontainers.com/) (ephemeral PostgreSQL).
    *   `node --test` for frontend pure-logic modules.
*   **Deployment:**
    *   [Docker](https://www.docker.com/) + Docker Compose (local / prod profiles).
    *   [Nginx](https://www.nginx.com/): static frontend + `/api` reverse proxy.
    *   [Tailscale](https://tailscale.com/): secure networking in the prod profile (Caddy alternative commented out).

## Backend tests (dedicated Dockerized PostgreSQL)

The backend uses PostgreSQL-specific features (JSONB, ARRAY, triggers). The test suite spins up a dedicated ephemeral PostgreSQL container using Testcontainers—no local DB setup needed.

1. Install dev dependencies (Docker must be running):
   ```bash
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements-dev.txt
   ```

2. Run tests:
   ```bash
   pytest -q
   ```

The suite starts a `postgres:15-alpine` container per test session, creates all tables and triggers, overrides the app's DB dependency, and seeds a user to obtain an auth token.

## Frontend tests

Pure-logic modules (no DOM) have unit tests run with Node's built-in runner:

```bash
cd frontend && npm test
```
