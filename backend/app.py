
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- Basic Setup ---
logger = logging.getLogger("uvicorn")
logger.setLevel(logging.DEBUG)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
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

