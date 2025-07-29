
from fastapi import APIRouter
from fastapi import Depends, HTTPException, Response, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict
from models import WeeklyPlan, RecipeMealType, DaysOfWeek
from schemas import PlanSlotSchema

from sqlalchemy.dialects.postgresql import insert
from typing import Optional
from sqlalchemy.exc import IntegrityError


from database import get_db
import logging
logger = logging.getLogger("uvicorn")
logger.setLevel(logging.DEBUG)

pl_router = APIRouter(prefix="/weekly-plan", tags=["Weekly Plan"])


## Weekly Plan
@pl_router.get("", response_model=Dict[str, Dict[str, List[int]]])
def get_weekly_plan(db: Session = Depends(get_db)):
    db_plan_items = db.query(WeeklyPlan).all()
    
    # Initialize empty plan
    plan = {day.value: {meal.value: [] for meal in RecipeMealType} for day in DaysOfWeek}
    
    # Populate with data from DB
    for item in db_plan_items:
        plan[item.day][item.meal_type] = item.recipe_ids if item.recipe_ids else []
        
    return plan

@pl_router.put("", status_code=status.HTTP_201_CREATED)
def set_weekly_plan_slot(slot: PlanSlotSchema, db: Session = Depends(get_db)):
    stmt = insert(WeeklyPlan).values(
        day=slot.day,
        meal_type=slot.meal_type,
        recipe_ids=slot.recipe_ids
    )
    # Use ON CONFLICT to perform an "upsert"
    stmt = stmt.on_conflict_do_update(
        index_elements=['day', 'meal_type'],
        set_=dict(recipe_ids=stmt.excluded.recipe_ids)
    )
    db.execute(stmt)
    db.commit()
    return {"message": f"Plan for {slot.day.value} {slot.meal_type.value} updated"}
