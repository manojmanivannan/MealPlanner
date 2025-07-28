import datetime
import logging
from typing import Dict, List, Optional

from fastapi import FastAPI, Depends, HTTPException, Response, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

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

from database import SessionLocal
from models import Recipe, Ingredient, WeeklyPlan, RecipeMealType, ServingUnits, DaysOfWeek





# --- Pydantic Schemas ---
# These classes define the shape of the API request/response data.
class IngredientItemSchema(BaseModel):
    name: str
    quantity: float
    serving_unit: ServingUnits

class RecipeSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True) # Replaces orm_mode=True
    
    id: int
    name: str
    ingredients: List[IngredientItemSchema]
    instructions: str
    meal_type: RecipeMealType
    is_vegetarian: bool
    protein: float
    carbs: float
    fat: float
    fiber: float
    energy: float

class RecipeCreateUpdateSchema(BaseModel):
    name: str
    ingredients: List[IngredientItemSchema]
    instructions: str
    meal_type: RecipeMealType
    is_vegetarian: bool

class PlanSlotSchema(BaseModel):
    day: DaysOfWeek
    meal_type: RecipeMealType
    recipe_ids: Optional[List[int]] = []

class IngredientSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    available: bool
    shelf_life: Optional[int]
    last_available: Optional[datetime.datetime]
    serving_unit: ServingUnits
    serving_size: float
    energy: float
    protein: float
    carbs: float
    fat: float
    fiber: float
    remaining_shelf_life: Optional[int] = None

class IngredientUpdateSchema(BaseModel):
    available: Optional[bool] = None
    shelf_life: Optional[int] = None
    name: Optional[str] = None
    serving_unit: Optional[ServingUnits] = None
    serving_size: Optional[float] = None
    energy: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    fiber: Optional[float] = None

class HealthCheckSchema(BaseModel):
    status: str = "OK"


# --- Database Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- API Endpoints ---

@app.get("/health", tags=["healthcheck"], response_model=HealthCheckSchema)
def get_health() -> HealthCheckSchema:
    return HealthCheckSchema(status="OK")

@app.get("/list-serving-units", tags=["Utilities"], response_model=List[str])
def get_serving_units():
    return [unit.value for unit in ServingUnits]

## Recipes
@app.get("/recipes", tags=["Recipes"], response_model=List[RecipeSchema])
def get_recipes(db: Session = Depends(get_db)):
    db_recipes = db.query(Recipe).order_by(Recipe.name).all()
    return db_recipes

@app.get("/recipes/{recipe_id}", tags=["Recipes"], response_model=RecipeSchema)
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    db_recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return db_recipe

@app.post("/recipes", tags=["Recipes"], status_code=status.HTTP_201_CREATED, response_model=RecipeSchema)
def add_recipe(recipe: RecipeCreateUpdateSchema, db: Session = Depends(get_db)):
    # Pydantic's model_dump() replaces dict()
    new_recipe = Recipe(**recipe.model_dump())
    db.add(new_recipe)
    db.commit()
    db.refresh(new_recipe)
    return new_recipe

@app.put("/recipes/{recipe_id}", tags=["Recipes"], response_model=RecipeSchema)
def update_recipe(recipe_id: int, recipe: RecipeCreateUpdateSchema, db: Session = Depends(get_db)):
    db_recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    update_data = recipe.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_recipe, key, value)
        
    db.commit()
    db.refresh(db_recipe)
    return db_recipe

@app.delete("/recipes/{recipe_id}", tags=["Recipes"], status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    db_recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(db_recipe)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

## Ingredients
@app.get("/ingredients", tags=["Ingredients"], response_model=List[IngredientSchema])
def get_ingredients_list(sort: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Ingredient)
    
    # Safe sorting
    if sort and hasattr(Ingredient, sort):
        query = query.order_by(getattr(Ingredient, sort))
    else:
        query = query.order_by(Ingredient.available.desc(), Ingredient.name)

    db_ingredients = query.all()
    
    # Add remaining shelf life calculation
    now = datetime.datetime.utcnow()
    result = []
    for ing in db_ingredients:
        ing_schema = IngredientSchema.model_validate(ing)
        if ing.available and ing.last_available and ing.shelf_life is not None:
            days_passed = (now.date() - ing.last_available.date()).days
            ing_schema.remaining_shelf_life = max(0, ing.shelf_life - days_passed)
        else:
            ing_schema.remaining_shelf_life = ing.shelf_life
        result.append(ing_schema)
        
    return result

@app.put("/ingredients/{ingredient_id}", tags=["Ingredients"], response_model=IngredientSchema)
def update_ingredient(
    ingredient_id: int,
    db: Session = Depends(get_db),
    name: Optional[str] = None,
    available: Optional[bool] = None,
    shelf_life: Optional[int] = None,
    serving_unit: Optional[ServingUnits] = None,
    serving_size: Optional[float] = None,
    energy: Optional[float] = None,
    protein: Optional[float] = None,
    carbs: Optional[float] = None,
    fat: Optional[float] = None,
    fiber: Optional[float] = None
    ):
    """
    Updates one or more fields of a specific ingredient.
    """
    logger.info(f"Updating ingredient with ID: {ingredient_id}")
    # 1. Fetch the existing ingredient from the database
    db_ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()

    # 2. If it doesn't exist, return a 404 error
    if not db_ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    # 3. Update attributes only for the parameters that were provided
    if name is not None:
        db_ingredient.name = name
    if available is not None:
        db_ingredient.available = available
        # If marking as available, update the timestamp
        if available:
            db_ingredient.last_available = datetime.datetime.utcnow()
    if shelf_life is not None:
        db_ingredient.shelf_life = shelf_life
    if serving_unit is not None:
        db_ingredient.serving_unit = serving_unit
    if serving_size is not None:
        db_ingredient.serving_size = serving_size
    if energy is not None:
        db_ingredient.energy = energy
    if protein is not None:
        db_ingredient.protein = protein
    if carbs is not None:
        db_ingredient.carbs = carbs
    if fat is not None:
        db_ingredient.fat = fat
    if fiber is not None:
        db_ingredient.fiber = fiber
    
    try:
        # 4. Commit the changes to the database
        db.commit()
        # 5. Refresh the instance to get the updated data
        db.refresh(db_ingredient)
    except IntegrityError: # Catch errors like duplicate names
        db.rollback()
        raise HTTPException(status_code=409, detail="Ingredient name already exists.")
    
    return db_ingredient

@app.post("/ingredients", tags=["Ingredients"], response_model=IngredientSchema, status_code=201)
def add_ingredient(name: str = Query(...),
                   shelf_life: str = Query(),
                   serving_unit: str = Query(),
                   db: Session = Depends(get_db)):
    logger.info(f"Adding new ingredient: {name}")

    # Check if ingredient already exists to provide a clear error
    existing_ingredient = db.query(Ingredient).filter(Ingredient.name == name).first()
    if existing_ingredient:
        raise HTTPException(
            status_code=409, # 409 Conflict is a good status code for this
            detail="Ingredient with this name already exists."
        )

    # Manually create the ORM model from the query parameters
    new_ingredient = Ingredient(
        name=name,
        shelf_life=shelf_life,
        serving_unit=serving_unit,
        serving_size=100 if serving_unit in ['g','ml'] else 1,
        available=False # Set default value
    )
    db.add(new_ingredient)
    db.commit()
    db.refresh(new_ingredient)
    return new_ingredient

@app.delete("/ingredients/{ingredient_id}", tags=["Ingredients"], status_code=status.HTTP_204_NO_CONTENT)
def delete_ingredient(ingredient_id: int, db: Session = Depends(get_db)):
    logger.info(f"Deleting ingredient with ID: {ingredient_id}")

    # 1. Find the ingredient by its ID.
    db_ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()

    # 2. If the ingredient doesn't exist, raise a 404 error.
    if not db_ingredient:
        logger.warning(f"Ingredient with ID {ingredient_id} not found for deletion.")
        raise HTTPException(status_code=404, detail="Ingredient not found")

    # 3. If found, delete it and commit the change.
    db.delete(db_ingredient)
    db.commit()
    
    logger.info(f"Successfully deleted ingredient with ID: {ingredient_id}")
    # 4. Return a 204 No Content response.
    return Response(status_code=status.HTTP_204_NO_CONTENT)

## Weekly Plan
@app.get("/weekly-plan", tags=["Weekly Plan"], response_model=Dict[str, Dict[str, List[int]]])
def get_weekly_plan(db: Session = Depends(get_db)):
    db_plan_items = db.query(WeeklyPlan).all()
    
    # Initialize empty plan
    plan = {day.value: {meal.value: [] for meal in RecipeMealType} for day in DaysOfWeek}
    
    # Populate with data from DB
    for item in db_plan_items:
        plan[item.day][item.meal_type] = item.recipe_ids if item.recipe_ids else []
        
    return plan

@app.post("/weekly-plan", tags=["Weekly Plan"], status_code=status.HTTP_201_CREATED)
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

## Nutrition
@app.get("/nutrition/{day}", tags=["Nutrition"], response_model=Dict[str, float])
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