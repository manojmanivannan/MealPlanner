import os
from typing import Dict, List, Literal, Optional

import psycopg2
from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

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
    return HealthCheck(status="OK")


# Pydantic model for validation
class Recipe(BaseModel):
    id: Optional[int] = None
    name: str
    ingredients: str
    instructions: str
    # meal_type can only be 'breakfast', 'lunch', 'dinner', or 'snack'
    meal_type: Literal["breakfast", "lunch", "dinner", "snack", "weekend prep", "sides"]


class PlanSlot(BaseModel):
    day: str
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"]
    recipe_id: Optional[int] = None


class Ingredient(BaseModel):
    id: int
    name: str
    available: bool


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
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, ingredients, instructions, meal_type FROM recipes ORDER BY name;"
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    recipes = [
        Recipe(
            id=row[0],
            name=row[1],
            ingredients=row[2],
            instructions=row[3],
            meal_type=row[4],
        )
        for row in rows
    ]
    return recipes


@app.post("/recipes", status_code=201, response_model=Recipe)
def add_recipe(recipe: Recipe):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO recipes (name, ingredients, instructions, meal_type) VALUES (%s, %s, %s, %s) RETURNING id",
        (recipe.name, recipe.ingredients, recipe.instructions, recipe.meal_type),
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return Recipe(id=new_id, **recipe.dict(exclude={"id"}))


@app.put("/recipes/{recipe_id}", response_model=Recipe)
def update_recipe(recipe_id: int, recipe: Recipe):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE recipes SET name = %s, ingredients = %s, instructions = %s, meal_type = %s WHERE id = %s",
        (
            recipe.name,
            recipe.ingredients,
            recipe.instructions,
            recipe.meal_type,
            recipe_id,
        ),
    )
    if cur.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Recipe not found")
    conn.commit()
    cur.close()
    conn.close()
    return Recipe(id=recipe_id, **recipe.dict(exclude={"id"}))


@app.delete("/recipes/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM recipes WHERE id = %s", (recipe_id,))
    if cur.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Recipe not found")
    conn.commit()
    cur.close()
    conn.close()
    return Response(status_code=204)


@app.get("/weekly-plan", response_model=Dict[str, Dict[str, Optional[int]]])
def get_weekly_plan():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT day, meal_type, recipe_id FROM weekly_plan;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
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
    meal_types = ["breakfast", "lunch", "snack", "dinner"]
    plan = {day: {meal: None for meal in meal_types} for day in days}
    for day, meal, recipe_id in rows:
        plan[day][meal] = recipe_id
    return plan


@app.post("/weekly-plan", status_code=201)
def set_weekly_plan_slot(slot: PlanSlot):
    conn = get_db_connection()
    cur = conn.cursor()
    # Upsert logic: update if exists, else insert
    cur.execute(
        """
        INSERT INTO weekly_plan (day, meal_type, recipe_id)
        VALUES (%s, %s, %s)
        ON CONFLICT (day, meal_type) DO UPDATE SET recipe_id = EXCLUDED.recipe_id
        """,
        (slot.day, slot.meal_type, slot.recipe_id),
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Plan updated"}


@app.get("/ingredients", response_model=List[str])
def get_unique_ingredients():
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
    return [row[0] for row in rows]


@app.get("/ingredients-list", response_model=List[Ingredient])
def get_ingredients_list():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, available FROM ingredients ORDER BY name;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [Ingredient(id=row[0], name=row[1], available=row[2]) for row in rows]


@app.put("/ingredients/{ingredient_id}", response_model=Ingredient)
def update_ingredient_availability(ingredient_id: int, available: bool):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE ingredients SET available = %s WHERE id = %s RETURNING id, name, available;",
        (available, ingredient_id),
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return Ingredient(id=row[0], name=row[1], available=row[2])


@app.post("/ingredients", response_model=Ingredient, status_code=201)
def add_ingredient(name: str):
    conn = get_db_connection()
    cur = conn.cursor()
    # Insert new ingredient, default available to False
    cur.execute(
        "INSERT INTO ingredients (name, available) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING RETURNING id, name, available;",
        (name.strip(), False),
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(
            status_code=400, detail="Ingredient already exists or invalid name"
        )
    return Ingredient(id=row[0], name=row[1], available=row[2])
