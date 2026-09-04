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


# Definitional volume factors relative to ml (1 tbsp = 15 ml, 1 tsp = 5 ml,
# 1 cup = 240 ml). Volume units convert exactly between each other.
# 'g' is mass and 'nos' is a count: how many grams a tbsp/cup/nos of a food
# weighs is food-specific (1 tbsp oil ~ 13.5 g, 1 tbsp flour ~ 8 g), so there is
# NO correct generic factor for any conversion involving 'g' or 'nos'.
_VOLUME_FACTORS_ML = {'ml': 1.0, 'tsp': 5.0, 'tbsp': 15.0, 'cup': 240.0}


def _volume_unit_factor(old_unit: Optional[str], new_unit: Optional[str]) -> Optional[float]:
    """Exact conversion factor for a volume-to-volume unit change, else None.

    Returning None means the change is food-specific and no generic conversion
    exists; callers must leave the numeric quantity untouched rather than guess.
    """
    if old_unit in _VOLUME_FACTORS_ML and new_unit in _VOLUME_FACTORS_ML:
        return _VOLUME_FACTORS_ML[old_unit] / _VOLUME_FACTORS_ML[new_unit]
    return None


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
        # Get the new values from the request payload. serving_size is only the
        # nutrition basis of the ingredient (nutrients are per serving_size of
        # serving_unit); it is NOT stored in recipe rows, so it never triggers a
        # recipe sync and recipe quantities must NOT be rescaled for it.
        update_data = {}
        if name is not None:
            update_data['name'] = name
        if serving_unit is not None:
            update_data['serving_unit'] = getattr(serving_unit, 'value', serving_unit)
        if serving_size is not None:
            update_data['serving_size'] = serving_size

        # Recipe ingredient rows store {name, quantity, serving_unit} where
        # quantity is in RAW recipe units and the row references the ingredient
        # by NAME, not by id. So a rename must propagate the new name, and a
        # unit change must propagate the new unit, to every recipe that mentions
        # this ingredient.
        #
        # Only sync when a value ACTUALLY changed: the edit UIs re-send the
        # current name/unit/serving_size on every save, and re-scaling recipe
        # quantities on a no-op save is what historically corrupted them
        # (a blind x100 factor applied on each save).
        old_name = db_ingredient.name
        old_unit = db_ingredient.serving_unit
        new_name = update_data.get('name')
        new_unit = update_data.get('serving_unit')
        name_changed = new_name is not None and new_name != old_name
        unit_changed = new_unit is not None and new_unit != old_unit

        if name_changed or unit_changed:
            # Find all recipes (this user's + global) that might contain the
            # ingredient; rows are matched by name below.
            recipes_to_update = db.query(Recipe).filter(
                    ((Recipe.user_id == current_user.id) | (Recipe.user_id == None))
                ).all()
            logger.info(f"Recipes to update: {[r.name for r in recipes_to_update]}")
            for recipe in recipes_to_update:
                recipe_changed = False
                for ingredient_in_recipe in recipe.ingredients:
                    # Match on the OLD name, case-insensitively and
                    # whitespace-trimmed, the same way recipe availability and
                    # shopping-list code match ingredient names.
                    row_name = str(ingredient_in_recipe.get('name', '')).strip().lower()
                    if row_name != old_name.strip().lower():
                        continue

                    if name_changed:
                        # Rename only: keep the row's quantity and unit as-is.
                        ingredient_in_recipe['name'] = new_name
                    if unit_changed:
                        factor = _volume_unit_factor(old_unit, new_unit)
                        ingredient_in_recipe['serving_unit'] = new_unit
                        if factor is None:
                            # Food-specific conversion (g <-> volume/count, nos
                            # <-> anything): no generic factor exists, so the
                            # numeric quantity is deliberately left untouched
                            # for the caller to repair, instead of being scaled
                            # by an invented number.
                            logger.warning(
                                f"No generic conversion for unit change {old_unit} -> {new_unit} "
                                f"of ingredient '{old_name}'; recipe '{recipe.name}' keeps "
                                f"quantity {ingredient_in_recipe['quantity']} for row "
                                f"'{ingredient_in_recipe['name']}' and needs manual repair"
                            )
                        else:
                            ingredient_in_recipe['quantity'] = ingredient_in_recipe['quantity'] * factor
                    recipe_changed = True

                if recipe_changed:
                    # Re-assign the list and flag the JSON column as modified to
                    # ensure the mutated rows are persisted.
                    recipe.ingredients = list(recipe.ingredients)
                    flag_modified(recipe, "ingredients")
                    logger.info(f"Synced ingredient '{old_name}' change into recipe: {recipe.name}")

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

