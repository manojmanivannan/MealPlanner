from fastapi import APIRouter
from fastapi import Depends, HTTPException, Response, status, Query
import math
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


def _row_matches_ingredient(row, name: str) -> bool:
    """Whether a recipe's ingredient row refers to `name`, case-insensitively
    and whitespace-trimmed, the same way recipe availability and
    shopping-list code match ingredient names. Shared by the legacy-size
    pre-check and the sync loop so the two cannot drift apart."""
    return str(row.get('name', '')).strip().lower() == name.strip().lower()


def _parse_serving_size(raw: Optional[str]) -> Optional[float]:
    """Validate an incoming serving_size when the parameter is provided.

    The serving_size is the nutrition anchor (the trigger divides the recipe
    row's quantity by it), so a provided value must parse to a number > 0 —
    null/zero would poison that division, and NaN/Infinity would poison it
    worse (NaN stored in the column, or NaN quantities written into recipe
    JSONB). Absence (None) stays allowed: the availability toggle PUTs only
    `available`.
    """
    if raw is None:
        return None
    try:
        size = float(str(raw).strip())
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Serving size must be a positive number.")
    if not math.isfinite(size) or size <= 0:
        raise HTTPException(status_code=400, detail="Serving size must be a positive number.")
    return size


# Sentinel distinguishing "param omitted" from "param sent empty". A query
# param that is absent arrives as None; one sent as an empty string arrives
# as ''. Only the empty string clears a stored value.
_NUTRITION_UNSET = object()


def _parse_nutrition(raw: Optional[str], field: str):
    """Parse one nutrition query param into UNSET / None / float.

    The nutrition params arrive as strings: the edit modal sends every
    nutrition field on every save, and a cleared field arrives as an empty
    string, which an `Optional[float]` query param would 422 before this
    handler runs (#41). So they are parsed here instead:
      • omitted (None)  → _NUTRITION_UNSET: leave the stored value untouched
      • empty string    → None: clear the stored value to NULL
      • otherwise       → the parsed float; non-numeric or non-finite → 400
    """
    if raw is None:
        return _NUTRITION_UNSET
    text = str(raw).strip()
    if text == '':
        return None
    try:
        value = float(text)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"{field} must be a number.")
    if not math.isfinite(value):
        raise HTTPException(status_code=400, detail=f"{field} must be a finite number.")
    return value


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
    serving_size: Optional[str] = None,
    # Nutrition arrives as strings so a cleared field (empty string) can
    # mean "unset to NULL" instead of a float-parse 422 (#41); parsed by
    # _parse_nutrition below.
    energy: Optional[str] = None,
    protein: Optional[str] = None,
    carbs: Optional[str] = None,
    fat: Optional[str] = None,
    fiber: Optional[str] = None,
    iron_mg: Optional[str] = None,
    magnesium_mg: Optional[str] = None,
    calcium_mg: Optional[str] = None,
    potassium_mg: Optional[str] = None,
    sodium_mg: Optional[str] = None,
    vitamin_c_mg: Optional[str] = None
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

    # serving_size arrives as a string and is validated up front: when
    # provided it must be a number > 0, else 400 (an empty string is rejected,
    # not silently ignored — it is the nutrition anchor).
    parsed_serving_size = _parse_serving_size(serving_size)
    # Parse the nutrition params before any DB writes so a bad value fails
    # fast with a 400 (a non-finite float would poison the Numeric columns;
    # an unparseable one used to 422 before the handler ran, #41).
    raw_nutrition = {
        'energy': energy, 'protein': protein, 'carbs': carbs, 'fat': fat, 'fiber': fiber,
        'iron_mg': iron_mg, 'magnesium_mg': magnesium_mg, 'calcium_mg': calcium_mg,
        'potassium_mg': potassium_mg, 'sodium_mg': sodium_mg, 'vitamin_c_mg': vitamin_c_mg,
    }
    parsed_nutrition = {}
    for key, raw in raw_nutrition.items():
        parsed = _parse_nutrition(raw, key)
        if parsed is not _NUTRITION_UNSET:
            parsed_nutrition[key] = parsed
    logger.debug(f"Available {available}, Ingredient {db_ingredient.available}")
    # Recipe sync runs for every update: only availability toggles carry
    # nothing to sync, and the change detection below keeps no-op saves
    # inert. (The previous guard `available != None or available is not
    # db_ingredient.available` was always true except when the stored
    # `available` was NULL, which silently skipped a serving_size rescale.)
    # Get the new values from the request payload. serving_size is the
    # nutrition basis of the ingredient (nutrients are per serving_size of
    # serving_unit); recipe rows don't store it, but a change to it DOES
    # rescale their quantities so each recipe's nutrition is preserved.
    update_data = {}
    if name is not None:
        update_data['name'] = name
    if serving_unit is not None:
        update_data['serving_unit'] = getattr(serving_unit, 'value', serving_unit)
    if serving_size is not None:
        update_data['serving_size'] = parsed_serving_size

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
    # serving_size is Numeric, so the DB hands us a Decimal; the factor
    # math needs a float.
    old_size = float(db_ingredient.serving_size) if db_ingredient.serving_size is not None else None
    new_name = update_data.get('name')
    new_unit = update_data.get('serving_unit')
    new_size = update_data.get('serving_size')
    name_changed = new_name is not None and new_name != old_name
    unit_changed = new_unit is not None and new_unit != old_unit
    size_changed = new_size is not None and new_size != old_size

    if name_changed or unit_changed or size_changed:
        # Find all recipes (this user's + global) that might contain the
        # ingredient; rows are matched by name below.
        recipes_to_update = db.query(Recipe).filter(
                ((Recipe.user_id == current_user.id) | (Recipe.user_id == None))
            ).all()
        logger.debug(f"Recipes to update: {[r.name for r in recipes_to_update]}")

        if size_changed and (old_size is None or not math.isfinite(old_size) or old_size <= 0):
            # Legacy row with a NULL, NaN/±Inf, 0, or negative serving_size:
            # there is no usable old size, so a rescale has no meaningful
            # factor. Skipping it silently while still storing the new size
            # would shift every affected recipe's nutrition by the old/new
            # ratio (#43) and a NaN factor would write NaN into recipe JSONB
            # (#48) — reject instead. Nothing has been written yet, so the
            # PUT is all-or-nothing.
            affected = [
                recipe.name for recipe in recipes_to_update
                if any(_row_matches_ingredient(row, old_name) for row in recipe.ingredients)
            ]
            if affected:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Cannot change serving size: '{old_name}' has no usable "
                        f"stored serving size to rescale from. Remove '{old_name}' "
                        f"from these recipes first, then set the serving size here "
                        f"and re-add the rows with the new basis: "
                        f"{', '.join(affected)}"
                    ),
                )

        for recipe in recipes_to_update:
            recipe_changed = False
            for ingredient_in_recipe in recipe.ingredients:
                # Match on the OLD name, case-insensitively and
                # whitespace-trimmed, the same way recipe availability and
                # shopping-list code match ingredient names.
                if not _row_matches_ingredient(ingredient_in_recipe, old_name):
                    continue

                if name_changed:
                    # Rename only: keep the row's quantity and unit as-is.
                    ingredient_in_recipe['name'] = new_name
                if size_changed:
                    # A recipe row's quantity only means something relative
                    # to the ingredient's serving_size: the nutrition
                    # trigger computes nutrient x quantity / serving_size.
                    # Rescaling every matching row by new_size / old_size
                    # therefore preserves each recipe's nutrition by
                    # construction — the ratio cancels in the trigger math.
                    # The unit change (if any) travels in the same request;
                    # the factor is computed from the DB's old size. A
                    # legacy non-usable (NULL, non-finite, or ≤ 0) old size
                    # was rejected above, so a matched row here always has a
                    # usable factor.
                    quantity = ingredient_in_recipe.get('quantity')
                    if isinstance(quantity, (int, float)) and not isinstance(quantity, bool):
                        factor = new_size / old_size
                        # Stored rounded to 8 decimals: the JSONB float
                        # column carries the digits, and write-time rounding
                        # must stay far below display precision or it bites
                        # twice — 4 decimals stored a 4 mg spice row
                        # downsized 100 -> 1 as exactly 0.0 (zero nutrition,
                        # zero shopping-list quantity), and each edit rounded
                        # the previous truncation again, compounding drift
                        # monotonically (#44). 8 decimals keeps a single
                        # edit's error ≤ 5e-9 absolute and cleans float
                        # multiplication artifacts (…0002 -> exact) without
                        # ever collapsing a real quantity to zero.
                        ingredient_in_recipe['quantity'] = round(quantity * factor, 8)
                    else:
                        # Missing or non-numeric quantity (legacy/hand-edited
                        # JSONB): no meaningful factor — leave it and log.
                        logger.warning(
                            f"Recipe '{recipe.name}' row "
                            f"'{ingredient_in_recipe.get('name')}' has non-numeric "
                            f"quantity {quantity!r}; not rescaled"
                        )
                if unit_changed:
                    # Unit change relabels the rows only; any numeric
                    # effect flows exclusively through the size ratio above
                    # (the UI forces the serving_size to be re-confirmed
                    # whenever the unit changes).
                    ingredient_in_recipe['serving_unit'] = new_unit
                recipe_changed = True

            if recipe_changed:
                # Re-assign the list and flag the JSON column as modified to
                # ensure the mutated rows are persisted.
                recipe.ingredients = list(recipe.ingredients)
                flag_modified(recipe, "ingredients")
                logger.info(f"Synced ingredient '{old_name}' change into recipe: {recipe.name}")

    # 3. Update attributes only for the parameters that were provided
    # name / serving_unit / serving_size were already parsed into update_data
    # for change detection — assign them from there instead of repeating the
    # per-field bookkeeping.
    for key, value in update_data.items():
        setattr(db_ingredient, key, value)
    if available is not None:
        db_ingredient.available = available
        # If marking as available, update the timestamp
        if available:
            db_ingredient.last_available = datetime.datetime.utcnow()
    if shelf_life is not None:
        db_ingredient.shelf_life = shelf_life
    # Nutrition values were parsed up front: a provided value sets the
    # column (including NULL for an empty string, i.e. cleared), an omitted
    # param is absent from parsed_nutrition and leaves the column as-is.
    for key, value in parsed_nutrition.items():
        setattr(db_ingredient, key, value)
    

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
        serving_size=100 if serving_unit in ['g', 'ml'] else 1,
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

