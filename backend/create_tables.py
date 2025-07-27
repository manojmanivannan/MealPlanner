import csv
import os
import sys
from typing import Any, Dict, Optional

import psycopg2
from psycopg2.extensions import connection, cursor

# --- Custom Exception ---


class DatabaseError(Exception):
    """Custom exception for database-related errors."""

    pass


# --- Database Connection ---


def get_db_connection() -> connection:
    """
    Establishes and returns a connection to the PostgreSQL database.

    Raises:
        DatabaseError: If connection details are not found in environment variables
                       or if the connection fails.

    Returns:
        connection: A psycopg2 connection object.
    """
    try:
        return psycopg2.connect(
            dbname=os.environ["POSTGRES_DB"],
            user=os.environ["POSTGRES_USER"],
            password=os.environ["POSTGRES_PASSWORD"],
            host="db",
        )
    except KeyError as e:
        raise DatabaseError(f"Environment variable not set: {e}") from e
    except psycopg2.Error as e:
        raise DatabaseError(f"Database connection failed: {e}") from e


# --- SQL Queries ---

queries: Dict[str, str] = {
    "table_create_recipes": """
        CREATE TABLE IF NOT EXISTS recipes (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            ingredients JSONB NOT NULL,
            instructions TEXT NOT NULL,
            meal_type VARCHAR(50) CHECK (meal_type IN (
                'pre-breakfast', 'breakfast', 'lunch', 'dinner', 'snack', 'weekend prep', 'sides'
            )) NOT NULL,
            is_vegetarian BOOLEAN DEFAULT TRUE,
            protein NUMERIC(10, 2) DEFAULT 0.0,
            carbs NUMERIC(10, 2) DEFAULT 0.0,
            fat NUMERIC(10, 2) DEFAULT 0.0,
            fiber NUMERIC(10, 2) DEFAULT 0.0,
            energy NUMERIC(10, 2) DEFAULT 0.0

        );
    """,
    "table_create_weekly_plan": """
        CREATE TABLE IF NOT EXISTS weekly_plan (
            id SERIAL PRIMARY KEY,
            day VARCHAR(16) NOT NULL,
            meal_type VARCHAR(50) CHECK (meal_type IN (
                'pre-breakfast', 'breakfast', 'lunch', 'dinner', 'snack'
            )) NOT NULL,
            recipe_ids INTEGER[]
        );
    """,
    "table_create_ingredients": """
        CREATE TABLE IF NOT EXISTS ingredients (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            shelf_life INTEGER CHECK (shelf_life >= 0) DEFAULT NULL,
            available BOOLEAN DEFAULT FALSE,
            last_available TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            serving_unit VARCHAR(10) DEFAULT NULL,
            serving_size FLOAT DEFAULT 100,
            protein NUMERIC(10, 2) DEFAULT 0.0,
            carbs NUMERIC(10, 2) DEFAULT 0.0,
            fat NUMERIC(10, 2) DEFAULT 0.0,
            fiber NUMERIC(10, 2) DEFAULT 0.0,
            energy NUMERIC(10, 2) DEFAULT 0.0
        );
    """,
    "drop_unique_constraint": "ALTER TABLE weekly_plan DROP CONSTRAINT IF EXISTS unique_day_meal;",
    "add_unique_constraint": "ALTER TABLE weekly_plan ADD CONSTRAINT unique_day_meal UNIQUE(day, meal_type);",
    "insert_ingredient": """
        INSERT INTO ingredients (name, shelf_life, available, last_available, serving_unit, serving_size, protein, carbs, fat, fiber, energy)
        VALUES (%(name)s, %(shelf_life)s, %(available)s, %(last_available)s, %(serving_unit)s, %(serving_size)s, %(protein)s, %(carbs)s, %(fat)s, %(fiber)s, %(energy)s)
        ON CONFLICT (name) DO UPDATE SET shelf_life = EXCLUDED.shelf_life;
    """,
    "insert_recipe": """
        INSERT INTO recipes (id, name, ingredients, instructions, meal_type, is_vegetarian, protein, carbs, fat, fiber, energy)
        VALUES (%(id)s, %(name)s, %(ingredients)s, %(instructions)s, %(meal_type)s, %(is_vegetarian)s , %(protein)s, %(carbs)s, %(fat)s, %(fiber)s, %(energy)s)
        ON CONFLICT (id) DO NOTHING;
    """,
    "insert_weekly_plan": """
        INSERT INTO weekly_plan (id, day, meal_type, recipe_ids)
        VALUES (%(id)s, %(day)s, %(meal_type)s, %(recipe_ids)s)
        ON CONFLICT (day, meal_type) DO UPDATE SET recipe_ids = EXCLUDED.recipe_ids;
    """,
    "update_sequence": "SELECT setval('recipes_id_seq', (SELECT MAX(id) FROM recipes));",
    "create_recipe_ids_trigger_function": """
        CREATE OR REPLACE FUNCTION check_recipe_ids_exist()
        RETURNS trigger AS $$
        DECLARE
            rid integer;
        BEGIN
            IF NEW.recipe_ids IS NOT NULL THEN
                FOREACH rid IN ARRAY NEW.recipe_ids LOOP
                    IF NOT EXISTS (SELECT 1 FROM recipes WHERE id = rid) THEN
                        RAISE EXCEPTION 'Recipe id % does not exist', rid;
                    END IF;
                END LOOP;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """,
    "drop_recipe_ids_trigger": "DROP TRIGGER IF EXISTS trg_check_recipe_ids_exist ON weekly_plan;",
    "create_recipe_ids_trigger": """
        CREATE CONSTRAINT TRIGGER trg_check_recipe_ids_exist
        AFTER INSERT OR UPDATE ON weekly_plan
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION check_recipe_ids_exist();
    """,
    "create_nutrition_trigger_function": """
        CREATE OR REPLACE FUNCTION calculate_recipe_nutrients()
        RETURNS TRIGGER AS $$
        DECLARE
            ing_record RECORD;
            nutrient_data RECORD;
            total_protein FLOAT := 0.0;
            total_carbs FLOAT := 0.0;
            total_fat FLOAT := 0.0;
            total_fiber FLOAT := 0.0;
            total_energy FLOAT := 0.0;
        BEGIN
            -- Loop through each ingredient in the JSONB array of the new/updated recipe
            FOR ing_record IN SELECT * FROM jsonb_to_recordset(NEW.ingredients) AS x(name text, quantity float, unit text)
            LOOP
                -- Find the matching ingredient in the ingredients table
                SELECT * INTO nutrient_data FROM ingredients WHERE name = ing_record.name;

                -- If a matching ingredient is found, add its nutrients to the totals
                -- This assumes the recipe quantity corresponds to the base unit of the ingredient table
                IF FOUND THEN
                    total_protein := total_protein + (nutrient_data.protein * ing_record.quantity / nutrient_data.serving_size);
                    total_carbs := total_carbs + (nutrient_data.carbs * ing_record.quantity/ nutrient_data.serving_size);
                    total_fat := total_fat + (nutrient_data.fat * ing_record.quantity/ nutrient_data.serving_size);
                    total_fiber := total_fiber + (nutrient_data.fiber * ing_record.quantity/ nutrient_data.serving_size);
                    total_energy := total_energy + (nutrient_data.energy * ing_record.quantity/ nutrient_data.serving_size);
                END IF;
            END LOOP;

            -- Update the recipe row with the calculated totals
            NEW.protein := total_protein;
            NEW.carbs := total_carbs;
            NEW.fat := total_fat;
            NEW.fiber := total_fiber;
            NEW.energy := total_energy;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """,
    "drop_nutrition_trigger": "DROP TRIGGER IF EXISTS trg_update_recipe_nutrients ON recipes;",
    "create_nutrition_trigger": """
        CREATE TRIGGER trg_update_recipe_nutrients
        BEFORE INSERT OR UPDATE ON recipes
        FOR EACH ROW
        EXECUTE FUNCTION calculate_recipe_nutrients();
    """,
    "create_serving_unit_trigger_function": """
        CREATE OR REPLACE FUNCTION update_recipe_ingredient_unit()
        RETURNS TRIGGER AS $$
        BEGIN
            -- This function updates all recipes that contain the modified ingredient.
            -- It reconstructs the JSONB array for each affected recipe.
            UPDATE recipes
            SET ingredients = (
                SELECT jsonb_agg(
                    -- Use a CASE statement to find the correct ingredient element to update
                    CASE
                        -- If the ingredient name matches the one that was updated...
                        WHEN (elem->>'name') = NEW.name
                        -- ...then update its 'serving_unit' using jsonb_set.
                        THEN jsonb_set(elem, '{serving_unit}', to_jsonb(NEW.serving_unit))
                        -- Otherwise, keep the element as is.
                        ELSE elem
                    END
                )
                -- This subquery unnests the ingredients array for the current recipe row
                FROM jsonb_array_elements(recipes.ingredients) AS elem
            )
            -- The WHERE clause ensures we only update recipes that actually contain the ingredient.
            -- The @> operator checks if the left JSONB contains the right JSONB.
            -- We're looking for any recipe where the 'ingredients' array contains an object with a 'name' key matching the updated ingredient.
            WHERE recipes.ingredients @> jsonb_build_array(jsonb_build_object('name', NEW.name));

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """,
    "drop_serving_unit_trigger": "DROP TRIGGER IF EXISTS trg_after_ingredient_unit_update ON ingredients;",
    "create_serving_unit_trigger": """
        CREATE TRIGGER trg_after_ingredient_unit_update
        -- Fire AFTER the update operation is completed
        AFTER UPDATE ON ingredients
        -- The trigger will execute for each row that is updated
        FOR EACH ROW
        -- IMPORTANT: Only fire the trigger if the serving_unit was actually changed
        WHEN (OLD.serving_unit IS DISTINCT FROM NEW.serving_unit)
        -- Execute the function we created above
        EXECUTE FUNCTION update_recipe_ingredient_unit();
    """,
}

# --- Data Loading ---


def load_data_from_csv(
    cur: cursor, file_path: str, insert_query: str, transform: Optional[callable] = None
) -> None:
    """
    Loads data from a CSV file into a database table.

    Args:
        cur (cursor): The database cursor.
        file_path (str): The path to the CSV file.
        insert_query (str): The SQL INSERT statement.
        transform (Optional[callable]): A function to transform each row before insertion.
    """
    try:
        print(f"-- Loading data from {file_path}...")
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if transform:
                    row = transform(row)
                cur.execute(insert_query, row)
    except FileNotFoundError:
        print(f"Warning: CSV file not found at {file_path}. Skipping...")
    except (IOError, csv.Error) as e:
        raise DatabaseError(f"Error reading CSV file {file_path}: {e}") from e


def transform_weekly_plan_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transforms a row from the weekly_plan CSV for database insertion.
    """
    recipe_ids_str = row.get("recipe_ids", "")
    if recipe_ids_str and recipe_ids_str != "{}":
        row["recipe_ids"] = [int(x) for x in recipe_ids_str.strip("{}").split(",")]
    else:
        row["recipe_ids"] = []
    return row


# --- Main Logic ---


def setup_database() -> None:
    """
    Sets up the database by creating tables, loading initial data,
    and creating necessary triggers and constraints.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                print("Executing schema setup...")
                for key, query in queries.items():
                    if (
                        key.startswith("table_create_")
                        or key.startswith("add_")
                        or key.startswith("drop_")
                    ):
                        print(f"-- Executing query for {key}...")
                        cur.execute(query)



                print("Setting up triggers database setup...")

                cur.execute(queries["create_nutrition_trigger_function"])
                cur.execute(queries["drop_nutrition_trigger"])
                cur.execute(queries["create_nutrition_trigger"])
                cur.execute(queries["create_serving_unit_trigger_function"])
                cur.execute(queries["drop_serving_unit_trigger"])
                cur.execute(queries["create_serving_unit_trigger"])

                print("Loading initial data...")
                load_data_from_csv(cur, "ingredients.csv", queries["insert_ingredient"])
                load_data_from_csv(cur, "recipes.csv", queries["insert_recipe"])
                
                
                load_data_from_csv(
                    cur,
                    "weekly_plan.csv",
                    queries["insert_weekly_plan"],
                    transform_weekly_plan_row,
                )

                cur.execute(queries["update_sequence"])
                # cur.execute(queries["create_recipe_ids_trigger_function"])
                # cur.execute(queries["drop_recipe_ids_trigger"])
                # cur.execute(queries["create_recipe_ids_trigger"])

                conn.commit()
        print("Database setup completed successfully.")

    except (DatabaseError, psycopg2.Error) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    setup_database()
