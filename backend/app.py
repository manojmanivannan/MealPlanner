from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import psycopg2
import os
from typing import Literal

app = FastAPI()


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
    name: str
    ingredients: str
    instructions: str
    # meal_type can only be 'breakfast', 'lunch', 'dinner', or 'snack'
    meal_type: Literal['breakfast', 'lunch', 'dinner', 'snack','weekend prep']



# DB Connection function
def get_db_connection():
    conn = psycopg2.connect(
        dbname=os.environ['POSTGRES_DB'],
        user=os.environ['POSTGRES_USER'],
        password=os.environ['POSTGRES_PASSWORD'],
        host='db'
    )
    return conn


@app.get("/recipes")
def get_recipes():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM recipes;")
    recipes = cur.fetchall()
    cur.close()
    conn.close()
    return recipes


@app.post("/recipes", status_code=201)
def add_recipe(recipe: Recipe):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO recipes (name, ingredients, instructions) VALUES (%s, %s, %s)",
        (recipe.name, recipe.ingredients, recipe.instructions)
    )
    conn.commit()
    cur.close()
    conn.close()
    return recipe


@app.put("/recipes/{recipe_id}")
def update_recipe(recipe_id: int, recipe: Recipe):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE recipes SET name = %s, ingredients = %s, instructions = %s WHERE id = %s",
        (recipe.name, recipe.ingredients, recipe.instructions, recipe_id)
    )
    if cur.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Recipe not found")
    conn.commit()
    cur.close()
    conn.close()
    return recipe


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
    return JSONResponse(content={}, status_code=204)
