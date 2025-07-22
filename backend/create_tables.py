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
            ingredients TEXT NOT NULL,
            instructions TEXT NOT NULL,
            meal_type VARCHAR(50) CHECK (meal_type IN (
                'pre-breakfast', 'breakfast', 'lunch', 'dinner', 'snack', 'weekend prep', 'sides'
            )) NOT NULL,
            is_vegetarian BOOLEAN DEFAULT TRUE
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
            serving_unit VARCHAR(10) DEFAULT NULL
        );
    """,
    "drop_unique_constraint": "ALTER TABLE weekly_plan DROP CONSTRAINT IF EXISTS unique_day_meal;",
    "add_unique_constraint": "ALTER TABLE weekly_plan ADD CONSTRAINT unique_day_meal UNIQUE(day, meal_type);",
    "insert_ingredient": """
        INSERT INTO ingredients (name, shelf_life, available, last_available, serving_unit)
        VALUES (%(name)s, %(shelf_life)s, %(available)s, %(last_available)s, %(serving_unit)s)
        ON CONFLICT (name) DO UPDATE SET shelf_life = EXCLUDED.shelf_life;
    """,
    "insert_recipe": """
        INSERT INTO recipes (id, name, ingredients, instructions, meal_type, is_vegetarian)
        VALUES (%(id)s, %(name)s, %(ingredients)s, %(instructions)s, %(meal_type)s, %(is_vegetarian)s)
        ON CONFLICT (id) DO NOTHING;
    """,
    "insert_weekly_plan": """
        INSERT INTO weekly_plan (id, day, meal_type, recipe_ids)
        VALUES (%(id)s, %(day)s, %(meal_type)s, %(recipe_ids)s)
        ON CONFLICT (day, meal_type) DO UPDATE SET recipe_ids = EXCLUDED.recipe_ids;
    """,
    "update_sequence": "SELECT setval('recipes_id_seq', (SELECT MAX(id) FROM recipes));",
    "create_trigger_function": """
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
    "drop_trigger": "DROP TRIGGER IF EXISTS trg_check_recipe_ids_exist ON weekly_plan;",
    "create_trigger": """
        CREATE CONSTRAINT TRIGGER trg_check_recipe_ids_exist
        AFTER INSERT OR UPDATE ON weekly_plan
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION check_recipe_ids_exist();
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

                print("Loading initial data...")
                load_data_from_csv(cur, "ingredients.csv", queries["insert_ingredient"])
                load_data_from_csv(cur, "recipes.csv", queries["insert_recipe"])
                load_data_from_csv(
                    cur,
                    "weekly_plan.csv",
                    queries["insert_weekly_plan"],
                    transform_weekly_plan_row,
                )

                print("Finalizing database setup...")
                cur.execute(queries["update_sequence"])
                cur.execute(queries["create_trigger_function"])
                cur.execute(queries["drop_trigger"])
                cur.execute(queries["create_trigger"])

                conn.commit()
        print("Database setup completed successfully.")

    except (DatabaseError, psycopg2.Error) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    setup_database()
