from fastapi import APIRouter
from fastapi import Depends, HTTPException, Response, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from typing import List
from models import Recipe, Ingredient, ServingUnits, User
from schemas import IngredientSchema
import datetime
from typing import Optional
from sqlalchemy.exc import IntegrityError


from database import get_db
from routers.auth_router import get_current_user
import logging
logger = logging.getLogger("uvicorn")
logger.setLevel(logging.DEBUG)

ing_router = APIRouter(prefix="/ingredients", tags=["Ingredients"])


## Ingredients
@ing_router.get("", response_model=List[IngredientSchema])
def get_ingredients_list(sort: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Show user's ingredients and global stock (user_id is NULL)
    query = db.query(Ingredient).filter((Ingredient.user_id == current_user.id) | (Ingredient.user_id == None))
    
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
    current_user: User = Depends(get_current_user),
    name: Optional[str] = None,
    available: Optional[bool] = None,
    shelf_life: Optional[int] = None,
    serving_unit: Optional[ServingUnits] = None,
    serving_size: Optional[float] = None,
    energy: Optional[float] = None,
    protein: Optional[float] = None,
    carbs: Optional[float] = None,
    fat: Optional[float] = None,
    fiber: Optional[float] = None,
    iron_mg: Optional[float] = None,
    magnesium_mg: Optional[float] = None,
    calcium_mg: Optional[float] = None,
    potassium_mg: Optional[float] = None,
    sodium_mg: Optional[float] = None,
    vitamin_c_mg: Optional[float] = None
    ):
    """
    Updates one or more fields of a specific ingredient.
    """
    
    # 1. Fetch the existing ingredient from the database
    db_ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id, Ingredient.user_id == current_user.id).first()
    

    # 2. If it doesn't exist, return a 404 error
    if not db_ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    logger.info(f"Updating ingredient ID: {ingredient_id}: {db_ingredient.name}")
    
    # if we updating the availability status ignore updating recipes
    logger.debug(f"Available {available}, Ingredient {db_ingredient.available}")
    if available != None or available is not db_ingredient.available:
        # Get the new values from the request payload
        update_data = {}
        if name is not None:
            update_data['name'] = name
        if serving_unit is not None:
            update_data['serving_unit'] = getattr(serving_unit, 'value', serving_unit)

        # 2. Check if name or unit, which are stored in recipes, have changed
        should_sync_recipes = ('name' in update_data) or ('serving_unit' in update_data)

        if should_sync_recipes:
            # Find all recipes containing the old ingredient name
            # Note: This query might need to be adapted based on your exact JSON structure
            recipes_to_update = db.query(Recipe).filter(
                    ((Recipe.user_id == current_user.id) | (Recipe.user_id == None))
                ).all()
            logger.info(f"Recipes to update: {[r.name for r in recipes_to_update]}")
            for recipe in recipes_to_update:
                # Create a new list for ingredients to avoid mutation issues
                new_ingredients_list = []
                for ingredient_in_recipe in recipe.ingredients:
                    if name.lower() == ingredient_in_recipe['name'].lower():
                        ingredient_in_recipe['name'] = update_data["name"]
                        ingredient_in_recipe['serving_unit'] = update_data['serving_unit']
                    new_ingredients_list.append(ingredient_in_recipe)
                
                # Re-assign the list to the recipe object
                recipe.ingredients = new_ingredients_list

                # Flag the JSON column as modified to ensure it's saved
                logger.info(f"Flaging update for recipe: {recipe.name}")
                flag_modified(recipe, "ingredients")

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
        db_ingredient.serving_unit = getattr(serving_unit, 'value', serving_unit)
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
    if iron_mg is not None:
        db_ingredient.iron_mg = iron_mg
    if magnesium_mg is not None:
        db_ingredient.magnesium_mg = magnesium_mg
    if calcium_mg is not None:
        db_ingredient.calcium_mg = calcium_mg
    if potassium_mg is not None:
        db_ingredient.potassium_mg = potassium_mg
    if sodium_mg is not None:
        db_ingredient.sodium_mg = sodium_mg
    if vitamin_c_mg is not None:
        db_ingredient.vitamin_c_mg = vitamin_c_mg
    

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
                   db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    logger.info(f"Adding new ingredient: {name}")

    # Check if ingredient already exists to provide a clear error
    existing_ingredient = db.query(Ingredient).filter(Ingredient.user_id == current_user.id, Ingredient.name == name).first()
    if existing_ingredient:
        raise HTTPException(
            status_code=409, # 409 Conflict is a good status code for this
            detail="Ingredient with this name already exists."
        )

    # Manually create the ORM model from the query parameters
    new_ingredient = Ingredient(
        user_id=current_user.id,
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
def delete_ingredient(ingredient_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logger.info(f"Deleting ingredient with ID: {ingredient_id}")

    # 1. Find the ingredient by its ID.
    db_ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id, Ingredient.user_id == current_user.id).first()
    all_recipes = db.query(Recipe).filter((Recipe.user_id == current_user.id) | (Recipe.user_id == None)).all()
    
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

