import json
import logging
import os
from typing import Dict, List, Literal, Optional
from enum import Enum
import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()
logger = logging.getLogger("uvicorn")
logger.setLevel(logging.DEBUG)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthCheck(BaseModel):
    """Response model to validate and return when performing a health check."""

    status: str = "OK"


@app.get(
    "/health",
    tags=["healthcheck"],
    summary="Perform a Health Check",
    response_description="Return HTTP Status Code 200 (OK)",
    status_code=status.HTTP_200_OK,
    response_model=HealthCheck,
)
def get_health() -> HealthCheck:
    """
    ## Perform a Health Check
    Endpoint to perform a healthcheck on. This endpoint can primarily be used Docker
    to ensure a robust container orchestration and management is in place. Other
    services which rely on proper functioning of the API service will not deploy if this
    endpoint returns any other HTTP status code except 200 (OK).
    Returns:
        HealthCheck: Returns a JSON response with the health status
    """
    logger.info("Health check endpoint called.")
    return HealthCheck(status="OK")


class ServingUnits(str, Enum):
    GRAMS = "g"
    MILLILITERS = "ml"
    CUP = "cup"
    TABLESPOON = "tbsp"
    TEASPOON = "tsp"
    NOS = "nos"  # number of items, e.g. eggs

class IngredientItem(BaseModel):
    """Represents a single ingredient with its quantity and unit."""
    name: str
    quantity: float
    serving_unit: ServingUnits

class Recipe(BaseModel):
    id: Optional[int] = None
    name: str
    ingredients: List[IngredientItem]
    instructions: str
    # meal_type can only be 'breakfast', 'lunch', 'dinner', or 'snack'
    meal_type: Literal[
        "pre-breakfast",
        "breakfast",
        "lunch",
        "dinner",
        "snack",
        "weekend prep",
        "sides",
    ]
    is_vegetarian: bool
    protein: Optional[float] = 0
    carbs: Optional[float] = 0
    fat: Optional[float] = 0
    fiber: Optional[float] = 0
    energy: Optional[float] = 0

    def __str__(self) -> str:
        return super().__str__()

class MealTypes(str, Enum):
    PRE_BREAKFAST = "pre-breakfast"
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"
    SIDES = "sides"
class PlanSlot(BaseModel):
    day: str
    meal_type: MealTypes
    recipe_ids: Optional[List[int]] = []

class DaysOfWeek(str, Enum):
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"
class Ingredient(BaseModel):
    id: int
    name: str
    available: bool
    shelf_life: Optional[int] = None  # original shelf life in days
    last_available: Optional[str] = None  # ISO timestamp
    remaining_shelf_life: Optional[int] = None  # days left
    serving_unit: ServingUnits = ServingUnits.GRAMS  # default to grams
    energy: Optional[float] = 0
    protein: Optional[float] = 0
    carbs: Optional[float] = 0
    fat: Optional[float] = 0
    fiber: Optional[float] = 0


# DB Connection function
def get_db_connection(factory=None):
    conn = psycopg2.connect(
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        host="db",
        cursor_factory=RealDictCursor if factory else None,  # Use RealDictCursor for dict-like access
    )
    return conn

@app.get("/list-serving-units", response_model=List[str])
def get_serving_units():
    """
    Endpoint to get the list of serving units.
    Returns:
        List[str]: List of serving units available in the system.
    """
    logger.info("Fetching list of serving units.")
    return [unit.value for unit in ServingUnits]

@app.get("/recipes", response_model=list[Recipe])
def get_recipes():
    logger.info("Fetching all recipes.")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, ingredients, instructions, meal_type, is_vegetarian, protein, carbs, fat, fiber, energy FROM recipes ORDER BY name;"
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    logger.debug(f"Fetched {len(rows)} recipes from database.")
    recipes = [
        Recipe(
            id=row[0],
            name=row[1],
            ingredients=row[2],
            instructions=row[3],
            meal_type=row[4],
            is_vegetarian=row[5],
            protein=row[6],
            carbs=row[7],
            fat=row[8],
            fiber=row[9],
            energy=row[10],
        )
        for row in rows
    ]
    return recipes


@app.post("/recipes", status_code=201, response_model=Recipe)
def add_recipe(recipe: Recipe):
    logger.info(f"Adding new recipe: {recipe.name}")
    ingredients_json_list = [ing.model_dump() for ing in recipe.ingredients]
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO recipes (name, ingredients, instructions, meal_type, is_vegetarian) VALUES (%s, %s, %s, %s, %s) RETURNING id",
        (
            recipe.name,
            json.dumps(ingredients_json_list),
            recipe.instructions,
            recipe.meal_type,
            recipe.is_vegetarian,
        ),
    )
    row = cur.fetchone()
    if not row:
        logger.warning(
            f"Failed to add recipe: {recipe.name}. No ID returned from database."
        )
        conn.rollback()
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Failed to add recipe.")
    new_id = row[0]
    conn.commit()
    cur.close()
    conn.close()
    logger.debug(f"Recipe added with id: {new_id}")
    return Recipe(id=new_id, **recipe.dict(exclude={"id"}))


@app.put("/recipes/{recipe_id}", response_model=Recipe)
def update_recipe(recipe_id: int, recipe: Recipe):
    logger.info(f"Updating recipe id: {recipe_id}")
    # Convert the list of Pydantic models to a list of dicts for the DB driver
    ingredients_for_db = [item.model_dump() for item in recipe.ingredients]

    conn = get_db_connection(factory=True)
    cur = conn.cursor()

    cur.execute(
        "UPDATE recipes SET name = %s, ingredients = %s, instructions = %s, meal_type = %s, is_vegetarian = %s WHERE id = %s",
        (
            recipe.name,
            json.dumps(ingredients_for_db),
            recipe.instructions,
            recipe.meal_type,
            recipe.is_vegetarian,
            recipe_id,
        ),
    )
    if cur.rowcount == 0:
        logger.warning(f"Recipe id {recipe_id} not found for update.")
        conn.close()
        raise HTTPException(status_code=404, detail="Recipe not found")

    # # get the updated record again
    cur.execute("SELECT * FROM recipes WHERE id = %s", (recipe_id,))
    updated_recipe_from_db = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()
    logger.debug(f"Recipe id {recipe_id} updated.")
    # return Recipe(id=recipe_id, **recipe.model_dump(exclude={"id"}))
    return Recipe(**updated_recipe_from_db)


@app.delete("/recipes/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: int):
    logger.info(f"Deleting recipe id: {recipe_id}")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM recipes WHERE id = %s", (recipe_id,))
    if cur.rowcount == 0:
        logger.warning(f"Recipe id {recipe_id} not found for deletion.")
        conn.close()
        raise HTTPException(status_code=404, detail="Recipe not found")
    conn.commit()
    cur.close()
    conn.close()
    logger.debug(f"Recipe id {recipe_id} deleted.")
    return Response(status_code=204)


@app.get("/weekly-plan", response_model=Dict[str, Dict[str, List[int]]])
def get_weekly_plan():
    logger.info("Fetching weekly plan.")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT day, meal_type, recipe_ids FROM weekly_plan;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    logger.debug(f"Fetched {len(rows)} weekly plan slots from database.")
    # Build nested dict: {day: {meal_type: recipe_id}}
    days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ]
    meal_types = ["pre-breakfast", "breakfast", "lunch", "snack", "dinner"]
    plan = {day: {meal: [] for meal in meal_types} for day in days}
    for day, meal, recipe_ids in rows:
        plan[day][meal] = recipe_ids
    return plan


@app.post("/weekly-plan", status_code=201)
def set_weekly_plan_slot(slot: PlanSlot):
    logger.info(
        f"Setting weekly plan slot: {slot.day} {slot.meal_type} -> {slot.recipe_ids}"
    )
    conn = get_db_connection()
    cur = conn.cursor()
    # Upsert logic: update if exists, else insert
    cur.execute(
        """
        INSERT INTO weekly_plan (day, meal_type, recipe_ids)
        VALUES (%s, %s, %s)
        ON CONFLICT (day, meal_type) DO UPDATE SET recipe_ids = EXCLUDED.recipe_ids
        """,
        (slot.day, slot.meal_type, slot.recipe_ids),
    )
    conn.commit()
    cur.close()
    conn.close()
    logger.debug(f"Weekly plan slot set for {slot.day} {slot.meal_type}.")
    return {"message": "Plan updated"}


@app.get("/ingredients", response_model=List[str])
def get_unique_ingredients():
    logger.info("Fetching unique ingredients.")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT DISTINCT LOWER(TRIM(ingredient)) AS ingredient
        FROM recipes,
             unnest(string_to_array(ingredients, ',')) AS ingredient
        ORDER BY ingredient;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    logger.debug(f"Fetched {len(rows)} unique ingredients from database.")
    return [row[0] for row in rows]


@app.get("/ingredients-list", response_model=List[Ingredient])
def get_ingredients_list(sort: Optional[str] = None):
    

    SORTING = f"ORDER BY {sort}" if sort else "ORDER BY available desc, shelf_life"

    logger.info("Fetching ingredients list.")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, name, available, shelf_life, last_available, serving_unit, energy, protein, carbs, fat, fiber FROM ingredients {SORTING};"
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    logger.debug(f"Fetched {len(rows)} ingredients from database.")
    result = []
    now = datetime.datetime.utcnow()
    for row in rows:
        id, name, available, shelf_life, last_available, serving_unit, energy, protein, carbs, fat, fiber = row
        # Compute remaining shelf life if available and last_available is set
        remaining = shelf_life
        last_available_str = last_available.isoformat() if last_available else None
        if available and last_available and shelf_life is not None:
            try:
                last_dt = (
                    last_available
                    if isinstance(last_available, datetime.datetime)
                    else datetime.datetime.fromisoformat(str(last_available))
                )
                days_passed = (now.date() - last_dt.date()).days
                remaining = max(0, shelf_life - days_passed)
            except Exception:
                pass
        result.append(
            Ingredient(
                id=id,
                name=name,
                available=available,
                shelf_life=shelf_life,  # original shelf life
                last_available=last_available_str,
                remaining_shelf_life=remaining,  # days left
                serving_unit=serving_unit,
                energy=energy,
                protein=protein,
                carbs=carbs,
                fat=fat,
                fiber=fiber
            )
        )
    return result


@app.put("/ingredients/{ingredient_id}", response_model=Ingredient)
def update_ingredient_availability(
    ingredient_id: int,
    available: Optional[bool] = None,
    shelf_life: Optional[int] = None,
    name: Optional[str] = None,
    serving_unit: Optional[ServingUnits] = None,
    energy: Optional[float] = None,
    protein: Optional[float] = None,
    carbs: Optional[float] = None,
    fat: Optional[float] = None,
    fiber: Optional[float] = None,
):
    import datetime

    logger.info(f"Updating ingredient id: {ingredient_id}")
    conn = get_db_connection()
    cur = conn.cursor()
    set_clauses = []
    params = []
    if name is not None:
        set_clauses.append("name = %s")
        params.append(name.strip())
    if available is not None:
        set_clauses.append("available = %s")
        params.append(available)
        if available:
            set_clauses.append("last_available = %s")
            params.append(datetime.datetime.utcnow().isoformat())
    if shelf_life is not None:
        set_clauses.append("shelf_life = %s")
        params.append(shelf_life)
    if serving_unit is not None:
        set_clauses.append("serving_unit = %s")
        params.append(serving_unit.strip())
    if energy is not None:
        set_clauses.append("energy = %s")
        params.append(energy)
    if protein is not None:
        set_clauses.append("protein = %s")
        params.append(protein)
    if carbs is not None:
        set_clauses.append("carbs = %s")
        params.append(carbs)
    if fat is not None:
        set_clauses.append("fat = %s")
        params.append(fat)
    if fiber is not None:
        set_clauses.append("fiber = %s")
        params.append(fiber)
    if not set_clauses:
        logger.warning(f"No valid fields to update for ingredient id: {ingredient_id}")
        conn.close()
        raise HTTPException(status_code=400, detail="No valid fields to update")
    set_clause = ", ".join(set_clauses)
    params.append(ingredient_id)
    try:
        cur.execute(
            f"UPDATE ingredients SET {set_clause} WHERE id = %s RETURNING id, name, available, shelf_life, last_available, serving_unit, energy, protein, carbs, fat, fiber;",
            tuple(params),
        )
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        cur.close()
        conn.close()
        logger.warning(f"Ingredient name '{name}' already exists.")
        raise HTTPException(status_code=400, detail="Ingredient name already exists")
    # except Exception as e:
    #     conn.rollback()
    #     cur.close()
    #     conn.close()
    #     logger.error(f"Error updating ingredient: {e}")
    #     raise HTTPException(status_code=500, detail=str(e))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not row:
        logger.warning(f"Ingredient id {ingredient_id} not found for update.")
        raise HTTPException(status_code=404, detail="Ingredient not found")
    # Compute remaining shelf life for response
    id, name, available, shelf_life, last_available, serving_unit, energy, protein, carbs, fat, fiber = row
    remaining = shelf_life
    last_available_str = last_available.isoformat() if last_available else None
    if available and last_available and shelf_life is not None:
        try:
            last_dt = (
                last_available
                if isinstance(last_available, datetime.datetime)
                else datetime.datetime.fromisoformat(str(last_available))
            )
            now = datetime.datetime.utcnow()
            days_passed = (now - last_dt).days
            remaining = max(0, shelf_life - days_passed)
        except Exception:
            pass
    return Ingredient(
        id=id,
        name=name,
        available=available,
        shelf_life=remaining,
        last_available=last_available_str,
        serving_unit=serving_unit,
        energy=energy,
        protein=protein,
        carbs=carbs,
        fat=fat,
        fiber=fiber
    )


@app.post("/ingredients", response_model=Ingredient, status_code=201)
def add_ingredient(name: str, shelf_life: int, serving_unit: ServingUnits):
    logger.info(f"Adding new ingredient: {name}")
    conn = get_db_connection()
    cur = conn.cursor()
    # Insert new ingredient, default available to False
    cur.execute(
        "INSERT INTO ingredients (name, available, shelf_life, serving_unit) VALUES (%s, %s, %s, %s) ON CONFLICT (name) DO NOTHING RETURNING id, name, available, shelf_life, serving_unit;",
        (name.strip(), False, shelf_life, serving_unit),   )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not row:
        logger.warning(f"Ingredient '{name}' already exists or invalid name.")
        raise HTTPException(
            status_code=400, detail="Ingredient already exists or invalid name"
        )
    logger.debug(f"Ingredient added with id: {row[0]}")
    return Ingredient(id=row[0], name=row[1], available=row[2])


@app.delete("/ingredients/{ingredient_id}", status_code=204)
def delete_ingredient(ingredient_id: int):
    logger.info(f"Deleting ingredient id: {ingredient_id}")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM ingredients WHERE id = %s", (ingredient_id,))
    if cur.rowcount == 0:
        logger.warning(f"Ingredient id {ingredient_id} not found for deletion.")
        conn.close()
        raise HTTPException(status_code=404, detail="Ingredient not found")
    conn.commit()
    cur.close()
    conn.close()
    logger.debug(f"Ingredient id {ingredient_id} deleted.")
    return Response(status_code=204)

@app.get("/recipe/{recipe_id}", response_model=Recipe)
def get_nutrition_for_recipe(recipe_id: int):
    logger.info(f"Fetching nutrition for recipe id: {recipe_id}")
    conn = get_db_connection(factory=True)
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, ingredients, instructions, meal_type, is_vegetarian, protein, carbs, fat, fiber, energy FROM recipes WHERE id = %s;",
        (recipe_id,),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        logger.warning(f"Recipe id {recipe_id} not found.")
        raise HTTPException(status_code=404, detail="Recipe not found")
    logger.debug(f"Fetched nutrition for recipe id: {recipe_id}")
    return Recipe(**row)

@app.get("/nutrition/{day}", response_model=Dict[str, float])
def get_nutrition_for_day(day: DaysOfWeek):
    logger.info(f"Fetching nutrition for {day}")
    conn = get_db_connection(factory=True)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT SUM(r.protein) AS total_protein,
               SUM(r.carbs) AS total_carbs,
               SUM(r.fat) AS total_fat,
               SUM(r.fiber) AS total_fiber,
               SUM(r.energy) AS total_energy
        FROM weekly_plan wp
        JOIN recipes r ON r.id = ANY(wp.recipe_ids)
        WHERE wp.day = %s;
        """,
        (day,),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        logger.warning(f"No meals found for {day}")
        raise HTTPException(status_code=404, detail="No meals found")
    print(row)
    nutrition = {
        "protein": dict(row).get("total_protein") or 0.0,
        "carbs": dict(row).get("total_carbs") or 0.0,
        "fat": dict(row).get("total_fat") or 0.0,
        "fiber": dict(row).get("total_fiber") or 0.0,
        "energy": dict(row).get("total_energy") or 0.0,
    }
    logger.debug(f"Nutrition for {day}: {nutrition}")
    return nutrition

@app.get("/nutrition/{day}/{meal_type}", response_model=Dict[str, float])
def get_nutrition_for_meal(day: DaysOfWeek, meal_type: MealTypes):
    logger.info(f"Fetching nutrition for {day} {meal_type}")
    conn = get_db_connection(factory=True)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT SUM(r.protein) AS total_protein,
               SUM(r.carbs) AS total_carbs,
               SUM(r.fat) AS total_fat,
               SUM(r.fiber) AS total_fiber,
               SUM(r.energy) AS total_energy
        FROM weekly_plan wp
        JOIN recipes r ON r.id = ANY(wp.recipe_ids)
        WHERE wp.day = %s AND wp.meal_type = %s;
        """,
        (day, meal_type),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        logger.warning(f"No meals found for {day} {meal_type}")
        raise HTTPException(status_code=404, detail="No meals found")
    print(row)
    nutrition = {
        "protein": dict(row).get("total_protein") or 0.0,
        "carbs": dict(row).get("total_carbs") or 0.0,
        "fat": dict(row).get("total_fat") or 0.0,
        "fiber": dict(row).get("total_fiber") or 0.0,
        "energy": dict(row).get("total_energy") or 0.0,
    }
    logger.debug(f"Nutrition for {day} {meal_type}: {nutrition}")
    return nutrition