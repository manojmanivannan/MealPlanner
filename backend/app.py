import logging
import os
from typing import Dict, List, Literal, Optional

import psycopg2
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


# Pydantic model for validation
class Recipe(BaseModel):
    id: Optional[int] = None
    name: str
    ingredients: str
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


class PlanSlot(BaseModel):
    day: str
    meal_type: Literal[
        "pre-breakfast", "breakfast", "lunch", "dinner", "snack", "sides"
    ]
    recipe_ids: Optional[List[int]] = []


class Ingredient(BaseModel):
    id: int
    name: str
    available: bool
    shelf_life: Optional[int] = None  # original shelf life in days
    last_available: Optional[str] = None  # ISO timestamp
    remaining_shelf_life: Optional[int] = None  # days left


# DB Connection function
def get_db_connection():
    conn = psycopg2.connect(
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        host="db",
    )
    return conn


@app.get("/recipes", response_model=list[Recipe])
def get_recipes():
    logger.info("Fetching all recipes.")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, ingredients, instructions, meal_type, is_vegetarian FROM recipes ORDER BY name;"
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
        )
        for row in rows
    ]
    return recipes


@app.post("/recipes", status_code=201, response_model=Recipe)
def add_recipe(recipe: Recipe):
    logger.info(f"Adding new recipe: {recipe.name}")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO recipes (name, ingredients, instructions, meal_type, is_vegetarian) VALUES (%s, %s, %s, %s, %s) RETURNING id",
        (
            recipe.name,
            recipe.ingredients,
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
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE recipes SET name = %s, ingredients = %s, instructions = %s, meal_type = %s, is_vegetarian = %s WHERE id = %s",
        (
            recipe.name,
            recipe.ingredients,
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
    conn.commit()
    cur.close()
    conn.close()
    logger.debug(f"Recipe id {recipe_id} updated.")
    return Recipe(id=recipe_id, **recipe.dict(exclude={"id"}))


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
def get_ingredients_list():
    import datetime

    logger.info("Fetching ingredients list.")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, available, shelf_life, last_available FROM ingredients ORDER BY available desc, shelf_life;"
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    logger.debug(f"Fetched {len(rows)} ingredients from database.")
    result = []
    now = datetime.datetime.utcnow()
    for row in rows:
        id, name, available, shelf_life, last_available = row
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
            )
        )
    return result


@app.put("/ingredients/{ingredient_id}", response_model=Ingredient)
def update_ingredient_availability(
    ingredient_id: int,
    available: Optional[bool] = None,
    shelf_life: Optional[int] = None,
    name: Optional[str] = None,
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
    if not set_clauses:
        logger.warning(f"No valid fields to update for ingredient id: {ingredient_id}")
        conn.close()
        raise HTTPException(status_code=400, detail="No valid fields to update")
    set_clause = ", ".join(set_clauses)
    params.append(ingredient_id)
    try:
        cur.execute(
            f"UPDATE ingredients SET {set_clause} WHERE id = %s RETURNING id, name, available, shelf_life, last_available;",
            tuple(params),
        )
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        cur.close()
        conn.close()
        logger.warning(f"Ingredient name '{name}' already exists.")
        raise HTTPException(status_code=400, detail="Ingredient name already exists")
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not row:
        logger.warning(f"Ingredient id {ingredient_id} not found for update.")
        raise HTTPException(status_code=404, detail="Ingredient not found")
    # Compute remaining shelf life for response
    id, name, available, shelf_life, last_available = row
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
    )


@app.post("/ingredients", response_model=Ingredient, status_code=201)
def add_ingredient(name: str, shelf_life: int):
    logger.info(f"Adding new ingredient: {name}")
    conn = get_db_connection()
    cur = conn.cursor()
    # Insert new ingredient, default available to False
    cur.execute(
        "INSERT INTO ingredients (name, available, shelf_life) VALUES (%s, %s, %s) ON CONFLICT (name) DO NOTHING RETURNING id, name, available, shelf_life;",
        (name.strip(), False, shelf_life),
    )
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
