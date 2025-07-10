# Meal Planner

A simple, intuitive web application for planning your weekly meals, managing recipes, and tracking ingredients.

## How to Run

This project uses Docker for easy setup and deployment. You can run it locally or in a production environment with Tailscale for secure remote access.

### Local Development

1.  **Prerequisites:**
    *   Docker and Docker Compose installed.

2.  **Run the application:**
    ```bash
    docker-compose --profile local up --build
    ```

3.  **Access the application:**
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

*   **Weekly Meal Planner:** An interactive grid to assign recipes to each meal slot for the week.
*   **Recipe Hub:** A central place to store and manage all your recipes.
    *   Add, edit, and delete recipes.
    *   Filter recipes by meal type (breakfast, lunch, dinner, etc.) and dietary preference (vegetarian/non-vegetarian).
*   **Ingredient Management:**
    *   View a master list of all ingredients from your recipes.
    *   Track which ingredients you have on hand.
    *   Sort ingredients alphabetically or by remaining shelf life to monitor freshness.
*   **Responsive Design:** The application is designed to work on both desktop and mobile devices.

## Project Structure

```
.
├── backend/            # FastAPI backend
│   ├── app.py          # Main application file
│   ├── Dockerfile      # Dockerfile for the backend
│   └── ...
├── docker-compose.yml  # Docker Compose configuration
├── html/               # Frontend files
│   ├── index.html      # Main HTML file
│   ├── recipes.js      # JavaScript for the frontend
│   └── ...
├── nginx.conf          # Nginx configuration
└── README.md           # This file
```

## Technologies Used

*   **Backend:**
    *   [FastAPI](https://fastapi.tiangolo.com/): A modern, fast (high-performance) web framework for building APIs with Python 3.7+ based on standard Python type hints.
    *   [PostgreSQL](https://www.postgresql.org/): A powerful, open source object-relational database system.
    *   [Psycopg2](https://www.psycopg.org/): A PostgreSQL adapter for Python.
*   **Frontend:**
    *   [Tailwind CSS](https://tailwindcss.com/): A utility-first CSS framework for rapid UI development.
    *   JavaScript (ES6+): For frontend logic.
*   **Deployment:**
    *   [Docker](https://www.docker.com/): For containerization.
    *   [Nginx](https://www.nginx.com/): As a reverse proxy.
    *   [Tailscale](https://tailscale.com/): For secure networking.


### Database Schema Migrations

This project uses Alembic to manage database schema changes.

#### Upgrade Workflow

1. Modify Models: Make schema changes in `backend/db/models.py`.
2. Generate Script: Create a new migration script from your changes.
```bash
alembic -c backend/db/alembic.ini revision --autogenerate -m "Your summary message"
```
3. Review Script (Crucial): Always open and verify the new file in `backend/db/alembic/versions/.`
4. Apply Migration: Apply the change to your database. This is run automatically by the container on startup.
```bash
alembic -c backend/db/alembic.ini upgrade head
```

#### Downgrade Workflow

⚠️ Warning: Downgrading is destructive and can cause permanent data loss. Use with extreme caution.

- **Undo the Last Migration**:
```bash
alembic -c backend/db/alembic.ini downgrade -1
```

- **Revert to a Specific Version**:
1. Find the version hash with `alembic -c backend/db/alembic.ini history`.
2. Run `alembic -c backend/db/alembic.ini downgrade <revision_hash>`.

- **Reset the Entire Schema** (for development only):
```bash
alembic -c backend/db/alembic.ini downgrade base
```