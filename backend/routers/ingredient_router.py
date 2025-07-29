from fastapi import APIRouter
from fastapi import Depends, HTTPException, Response, status, Query
from sqlalchemy.orm import Session
from typing import List
from models import Recipe, Ingredient, ServingUnits
from schemas import IngredientSchema
import datetime
from typing import Optional
from sqlalchemy.exc import IntegrityError


from database import get_db
import logging
logger = logging.getLogger("uvicorn")
logger.setLevel(logging.DEBUG)

ing_router = APIRouter(prefix="/ingredients", tags=["Ingredients"])


## Ingredients
@ing_router.get("", response_model=List[IngredientSchema])
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

@ing_router.put("/{ingredient_id}", response_model=IngredientSchema)
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

@ing_router.post("", response_model=IngredientSchema, status_code=201)
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

@ing_router.delete("/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ingredient(ingredient_id: int, db: Session = Depends(get_db)):
    logger.info(f"Deleting ingredient with ID: {ingredient_id}")

    # 1. Find the ingredient by its ID.
    db_ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    all_recipes = db.query(Recipe).all()
    
    recipes_using_ingredient_list = []
    
    # find all recipes that are using this ingredient
    for recipe in all_recipes:
        for ingredient in recipe.ingredients:
            if ingredient['name'] == db_ingredient.name:
                recipes_using_ingredient_list.append(recipe.name)
    if recipes_using_ingredient_list:
        raise HTTPException(status_code=405, detail="Recipes:"+", ".join(recipes_using_ingredient_list)+" are using this ingredient")
    
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

