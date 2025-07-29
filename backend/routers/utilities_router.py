

from fastapi import APIRouter
from fastapi import Depends, HTTPException, Response, status, Query

from sqlalchemy.orm import Session
from typing import List, Dict
from models import WeeklyPlan, ServingUnits, Recipe, DaysOfWeek
from sqlalchemy import func



from database import get_db
import logging
logger = logging.getLogger("uvicorn")
logger.setLevel(logging.DEBUG)


util_router = APIRouter(prefix="/utilities", tags=["Utilities"])

@util_router.get("/list-serving-units", tags=["Utilities"], response_model=List[str])
def get_serving_units():
    return [unit.value for unit in ServingUnits]


## Nutrition
@util_router.get("/nutrition/{day}", tags=["Utilities"], response_model=Dict[str, float])
def get_nutrition_for_day(day: DaysOfWeek, db: Session = Depends(get_db)):
    result = db.query(
        func.sum(Recipe.protein).label("total_protein"),
        func.sum(Recipe.carbs).label("total_carbs"),
        func.sum(Recipe.fat).label("total_fat"),
        func.sum(Recipe.fiber).label("total_fiber"),
        func.sum(Recipe.energy).label("total_energy")
    ).join(WeeklyPlan, Recipe.id == func.any(WeeklyPlan.recipe_ids)).filter(WeeklyPlan.day == day).first()

    if not result or result.total_energy is None:
        return {"protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "energy": 0}

    return {
        "protein": float(result.total_protein), "carbs": float(result.total_carbs),
        "fat": float(result.total_fat), "fiber": float(result.total_fiber),
        "energy": float(result.total_energy)
    }