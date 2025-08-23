

from fastapi import APIRouter
from fastapi import Depends, HTTPException, Response, status, Query

from sqlalchemy.orm import Session
from typing import List, Dict
from models import WeeklyPlan, ServingUnits, Recipe, DaysOfWeek, User, Ingredient
from schemas import ShoppingListItemSchema
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
from routers.auth_router import get_current_user

@util_router.get("/nutrition/{day}", tags=["Utilities"], response_model=Dict[str, float])
def get_nutrition_for_day(day: DaysOfWeek, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = db.query(
        func.sum(Recipe.protein).label("total_protein"),
        func.sum(Recipe.carbs).label("total_carbs"),
        func.sum(Recipe.fat).label("total_fat"),
        func.sum(Recipe.fiber).label("total_fiber"),
        func.sum(Recipe.energy).label("total_energy")
    ).join(WeeklyPlan, Recipe.id == func.any(WeeklyPlan.recipe_ids)).filter(WeeklyPlan.day == day, WeeklyPlan.user_id == current_user.id).first()

    if not result or result.total_energy is None:
        return {"protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "energy": 0}

    return {
        "protein": float(result.total_protein), "carbs": float(result.total_carbs),
        "fat": float(result.total_fat), "fiber": float(result.total_fiber),
        "energy": float(result.total_energy)
    }

@util_router.get("/shopping-list", tags=["Utilities"], response_model=Dict[str, ShoppingListItemSchema])
def get_shopping_list(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get all recipes in the user's weekly plan
    weekly_plan_recipes = db.query(Recipe).join(WeeklyPlan, Recipe.id == func.any(WeeklyPlan.recipe_ids)).filter(WeeklyPlan.user_id == current_user.id).all()

    # Get all ingredients available to the user
    available_ingredients = db.query(Ingredient).filter(Ingredient.user_id == current_user.id, Ingredient.available == True).all()
    available_ingredient_names = {ing.name.lower() for ing in available_ingredients}

    shopping_list = {}

    for recipe in weekly_plan_recipes:
        for ingredient_in_recipe in recipe.ingredients:
            ingredient_name = ingredient_in_recipe['name'].lower()
            if ingredient_name not in available_ingredient_names:
                quantity = ingredient_in_recipe['quantity']
                serving_unit = ingredient_in_recipe['serving_unit']

                if ingredient_name not in shopping_list:
                    shopping_list[ingredient_name] = {"quantity": 0.0, "serving_unit": serving_unit}
                
                # Assuming consistent serving units for simplicity in aggregation
                # In a real app, you'd need unit conversion logic here
                shopping_list[ingredient_name]["quantity"] += quantity

    return shopping_list