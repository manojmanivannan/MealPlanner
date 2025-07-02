from fastapi import FastAPI, HTTPException, status, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import psycopg2
import os
from typing import Dict, Literal, Optional
from fastapi.middleware.cors import CORSMiddleware

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
    meal_type: Literal['breakfast', 'lunch', 'dinner', 'snack','weekend prep']

class PlanSlot(BaseModel):
    day: str
    meal_type: Literal['breakfast', 'lunch', 'dinner', 'snack']
    recipe_id: Optional[int] = None



# DB Connection function
def get_db_connection():
    conn = psycopg2.connect(
        dbname=os.environ['POSTGRES_DB'],
        user=os.environ['POSTGRES_USER'],
        password=os.environ['POSTGRES_PASSWORD'],
        host='db'
    )
    return conn


@app.get("/recipes", response_model=list[Recipe])
def get_recipes():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, ingredients, instructions, meal_type FROM recipes ORDER BY name;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    recipes = [
        Recipe(
            id=row[0],
            name=row[1],
            ingredients=row[2],
            instructions=row[3],
            meal_type=row[4]
        ) for row in rows
    ]
    return recipes


@app.post("/recipes", status_code=201, response_model=Recipe)
def add_recipe(recipe: Recipe):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO recipes (name, ingredients, instructions, meal_type) VALUES (%s, %s, %s, %s) RETURNING id",
        (recipe.name, recipe.ingredients, recipe.instructions, recipe.meal_type)
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return Recipe(id=new_id, **recipe.dict())


@app.put("/recipes/{recipe_id}", response_model=Recipe)
def update_recipe(recipe_id: int, recipe: Recipe):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE recipes SET name = %s, ingredients = %s, instructions = %s, meal_type = %s WHERE id = %s",
        (recipe.name, recipe.ingredients, recipe.instructions, recipe.meal_type, recipe_id)
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
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
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
        (slot.day, slot.meal_type, slot.recipe_id)
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Plan updated"}
