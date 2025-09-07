import logging
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- Basic Setup ---
logger = logging.getLogger("uvicorn")
logger.setLevel(logging.DEBUG)

app = FastAPI()

# Load secret key from environment variable
# Try multiple environment variable names for flexibility
SECRET_KEY = (
    os.getenv("SECRET_KEY") or 
    os.getenv("MEALPLANNER_SECRET") or 
    os.getenv("JWT_SECRET")
)

# In testing, use a default secret key
if not SECRET_KEY:
    if os.getenv("ENVIRONMENT") == "test" or "pytest" in sys.modules:
        SECRET_KEY = "test-secret-key-for-development-only"
    else:
        raise SystemExit("Error: SECRET_KEY environment variable not set.")

# CORS configuration for Cloud Run
allowed_origins = [
    "http://localhost:8080",
    "http://localhost:3000",
    "https://*.run.app",  # Allow Cloud Run URLs
]

# In production, allow specific Cloud Run frontend URL
import os
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


from schemas import HealthCheckSchema
from routers.recipe_router import rec_router
from routers.ingredient_router import ing_router
from routers.plan_router import pl_router
from routers.utilities_router import util_router
from routers.auth_router import auth_router



app.include_router(rec_router)
app.include_router(ing_router)
app.include_router(pl_router)
app.include_router(util_router)
app.include_router(auth_router)


# --- API Endpoints ---

@app.get("/health", tags=["healthcheck"], response_model=HealthCheckSchema)
def get_health() -> HealthCheckSchema:
    return HealthCheckSchema(status="OK")

@app.get("/healthz", tags=["healthcheck"], response_model=HealthCheckSchema)
def get_healthz() -> HealthCheckSchema:
    """Kubernetes-style health check endpoint"""
    return HealthCheckSchema(status="OK")

