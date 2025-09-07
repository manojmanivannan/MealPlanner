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
├── backend
│   ├── app.py
│   ├── data
│   │   ├── ingredients.csv
│   │   ├── recipes.csv
│   │   └── weekly_plan.csv
│   ├── database.py
│   ├── Dockerfile
│   ├── models.py
│   ├── routers
│   │   ├── auth_router.py
│   │   ├── ingredient_router.py
│   │   ├── plan_router.py
│   │   ├── recipe_router.py
│   │   └── utilities_router.py
│   ├── schemas.py
│   └── setup_db.py
├── backup_db.sh
├── config
│   └── meal.json
├── docker-compose.yml
├── frontend
│   ├── Dockerfile
│   └── html
│       ├── index.html
│       ├── ingredients.html
│       ├── ingredients.js
│       ├── meal_logo.ico
│       ├── recipe-hub.html
│       ├── recipe-hub.js
│       ├── styles.css
│       ├── weekly-plan.js
│       └── welcome.html
├── nginx.conf
├── README.md
├── requirements-dev.txt
├── restore_db.sh
├── samples
│   ├── ingredients.png
│   ├── planner.png
│   └── recipe_hub.png
└── tests
    ├── conftest.py
    ├── test_auth.py
    ├── test_health.py
    ├── test_ingredients.py
    ├── test_recipes.py
    └── test_weekly_plan_and_utilities.py
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

---

## Deploying MealPlanner on Google Cloud Platform (GCP)

This guide walks you through deploying the MealPlanner stack on GCP, including backend (Cloud Run + Cloud SQL), frontend (static bucket), secrets, IAM, and domain setup.

### 1. Create a Google Cloud Account
- Go to https://cloud.google.com and sign up or log in.
- Set up billing for your project.

### 2. Create a GCP Project
- In the Cloud Console, click the project dropdown and select "New Project".
- Name your project (e.g., `mealplanner-prod`).
- Note your Project ID (used in Terraform).

### 3. Enable Required APIs
- In the Cloud Console, go to "APIs & Services > Library".
- Enable:
  - Cloud Run
  - Cloud SQL Admin
  - Secret Manager
  - Artifact Registry
  - Cloud Storage

### 4. Install Prerequisites Locally
- Install [Terraform](https://www.terraform.io/downloads.html)
- Install [gcloud CLI](https://cloud.google.com/sdk/docs/install)
- Install Docker

### 5. Clone the Repository
```bash
git clone https://github.com/manojmanivannan/MealPlanner.git
cd MealPlanner
```

### 6. Configure Terraform Variables
- Copy `.env.example` to `.env` and fill in your secrets.
- Edit `terraform/variables.tf` or use a `terraform.tfvars` file:
```hcl
project_id    = "your-gcp-project-id"
region        = "us-east1"
db_user       = "mealplanner"
db_password   = "your-db-password"
db_name       = "mealplanner"
secret_key    = "your-secret-key"
```

### 7. Initialize and Apply Terraform
```bash
cd terraform
terraform init
terraform plan
terraform apply
```
- This will provision:
  - Cloud Run backend (with Cloud SQL connector, secrets)
  - Cloud SQL for PostgreSQL (with backups)
  - Secret Manager (DB password, DATABASE_URL)
  - Public static site bucket for frontend
  - Service account + IAM bindings
  - Required APIs
- Outputs will show Cloud Run URL, frontend bucket URL, service account, Cloud SQL connection name.

### 8. Build and Push Docker Images
- Authenticate Docker with GCP:
```bash
gcloud auth configure-docker
```
- Build and push images using Cloud Build (recommended):
```bash
gcloud builds submit --tag gcr.io/$PROJECT_ID/mealplanner-backend ./backend

gcloud builds submit --tag gcr.io/$PROJECT_ID/mealplanner-frontend ./frontend
```

### 9. Deploy Backend and Frontend
- Terraform will deploy Cloud Run services automatically.
- For frontend, upload static files to the bucket:
```bash
gsutil rsync -R ./frontend/html gs://$PROJECT_ID-frontend-static
```
- Access your frontend at the bucket website URL (see Terraform output).

### 10. Set Up a Custom Domain (Optional)
- Buy a domain from Google Domains or any registrar.
- In Cloud Console, go to Cloud Run > your service > "Manage custom domains".
- Follow instructions to map your domain to Cloud Run and/or static bucket.
- Update DNS records as instructed.

### 11. Secure Your Deployment
- Use HTTPS (Cloud Run and Cloud Storage support HTTPS by default).
- Store secrets in Secret Manager (already provisioned).
- Restrict IAM permissions to least privilege.

### 12. Monitor and Maintain
- Use GCP Console for logs, monitoring, and scaling.
- Set up backups for Cloud SQL (enabled by Terraform).
- Update your app by pushing new Docker images and re-deploying Cloud Run.

---

## Troubleshooting & Tips
- If you see permission errors, check IAM roles and service account bindings.
- For database connection issues, verify Cloud SQL connector and secrets.
- Use `terraform destroy` to tear down resources when done.

For more help, see the official GCP docs or open an issue in this repo.
