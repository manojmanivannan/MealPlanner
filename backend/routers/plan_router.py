
from fastapi import APIRouter
from fastapi import Depends, HTTPException, Response, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict
from models import WeeklyPlan, RecipeMealType, DaysOfWeek, User
from schemas import PlanSlotSchema

from sqlalchemy.dialects.postgresql import insert
from typing import Optional
from sqlalchemy.exc import IntegrityError


from database import get_db
import logging
logger = logging.getLogger("uvicorn")
logger.setLevel(logging.DEBUG)

pl_router = APIRouter(prefix="/weekly-plan", tags=["Weekly Plan"])

from routers.auth_router import get_current_user

## Weekly Plan
@pl_router.get("", response_model=Dict[str, Dict[str, List[int]]])
def get_weekly_plan(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_plan_items = db.query(WeeklyPlan).filter(WeeklyPlan.user_id == current_user.id).all()
    
    # Initialize empty plan
    plan = {day.value: {meal.value: [] for meal in RecipeMealType} for day in DaysOfWeek}
    
    # Populate with data from DB
    for item in db_plan_items:
        key = getattr(item.meal_type, 'value', item.meal_type)
        plan[item.day][key] = item.recipe_ids if item.recipe_ids else []
        
    return plan

@pl_router.put("", status_code=status.HTTP_201_CREATED)
def set_weekly_plan_slot(slot: PlanSlotSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = insert(WeeklyPlan).values(
        user_id=current_user.id,
        day=slot.day,
        meal_type=slot.meal_type,
        recipe_ids=slot.recipe_ids
    )
    # Use ON CONFLICT to perform an "upsert"
    stmt = stmt.on_conflict_do_update(
        index_elements=['user_id', 'day', 'meal_type'],
        set_=dict(recipe_ids=stmt.excluded.recipe_ids)
    )
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Invalid recipe ID provided. {e}")

    return {"message": f"Plan for {slot.day.value} {slot.meal_type.value} updated"}
