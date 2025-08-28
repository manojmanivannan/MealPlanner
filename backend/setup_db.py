# setup_db.py
import csv
import sys
import json  # <-- ADD THIS IMPORT
from typing import Any, Dict, Optional, Callable
import os

from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.sql import text
from sqlalchemy import create_engine

from database import Base, SessionLocal
from models import Ingredient, Recipe, WeeklyPlan, RecipeMealType, User
from sqlalchemy import text as sa_text
from passlib.context import CryptContext

# --- Custom Exception ---
class DataLoadError(Exception):
    """Custom exception for data loading errors."""
    pass


# --- Data Transformation Functions ---

def _transform_common_types(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Helper function to convert common string types from a CSV row.
    Handles numbers and booleans.
    """
    processed_row = row.copy()
    for key, value in processed_row.items():
        if value == '':
            processed_row[key] = None
            continue
        if key in [
            'protein', 'carbs', 'fat', 'fiber', 'energy',
            'iron_mg', 'magnesium_mg', 'calcium_mg', 'potassium_mg', 'sodium_mg', 'vitamin_c_mg',
            'shelf_life', 'serving_size', 'id', 'serves']:
            if value is not None:
                try:
                    processed_row[key] = float(value) if '.' in value else int(value)
                except (ValueError, TypeError):
                    pass # Keep as is if conversion fails
        elif key in ['is_vegetarian', 'available']:
            processed_row[key] = value.lower() in ['true', '1', 't']

    if DEFAULT_USER_ID is not None:
        processed_row['user_id'] = DEFAULT_USER_ID
        
    return processed_row


def transform_recipe_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Transforms a recipe row, parsing the ingredients JSON and setting the meal_type enum."""
    processed_row = _transform_common_types(row)
    
    # Convert meal_type enum
    if processed_row.get('meal_type'):
        processed_row['meal_type'] = RecipeMealType(processed_row['meal_type'])
        
    # vvvvvvvv THE FIX IS HERE vvvvvvvv
    # Parse the ingredients string into a Python list of dictionaries
    ingredients_str = processed_row.get('ingredients')
    if ingredients_str and isinstance(ingredients_str, str):
        try:
            processed_row['ingredients'] = json.loads(ingredients_str)
        except json.JSONDecodeError:
            print(f"Warning: Could not decode ingredients JSON for row: {row}")
            processed_row['ingredients'] = [] # Default to an empty array on error
    # ^^^^^^^^ END OF FIX ^^^^^^^^^^
            
    return processed_row


DEFAULT_USER_ID: Optional[int] = 1


def transform_weekly_plan_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Transforms a weekly_plan row, handling recipe_ids array and meal_type enum."""
    processed_row = _transform_common_types(row)
    # Handle meal_type enum
    if processed_row.get('meal_type'):
        processed_row['meal_type'] = RecipeMealType(processed_row['meal_type']).value
    # Handle recipe_ids array
    recipe_ids_str = processed_row.get("recipe_ids", "")
    if recipe_ids_str and recipe_ids_str not in ["{}", ""]:
        processed_row["recipe_ids"] = [int(x) for x in recipe_ids_str.strip("{}").split(",")]
    else:
        processed_row["recipe_ids"] = []
    # Attach default user id for seed data

    return processed_row


def transform_ingredient_row(row: Dict[str, Any]) -> Dict[str, Any]:
    processed_row = _transform_common_types(row)
    # Keep CSV-loaded ingredients as global stock (no user_id)
    return processed_row


def load_data_from_csv(
    session: Session,
    model: Base,
    file_path: str,
    transform_func: Optional[Callable[[Dict], Dict]] = None
) -> None:
    """Loads data from a CSV file into a database table using SQLAlchemy."""
    try:
        print(f"-- Loading data from {file_path} into {model.__tablename__}...")
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            data = [transform_func(row) if transform_func else row for row in reader]

            if not data:
                print(f"   No data found in {file_path}. Skipping.")
                return

            stmt = insert(model).values(data)
            
            if model == Ingredient:
                update_dict = {
                    col.name: stmt.excluded[col.name]
                    for col in model.__table__.columns
                    if not col.primary_key and col.name not in ('name','user_id')
                }
                stmt = stmt.on_conflict_do_update(index_elements=['user_id','name'], set_=update_dict)
            elif model == Recipe:
                stmt = stmt.on_conflict_do_nothing(index_elements=['id'])
            elif model == WeeklyPlan:
                # Upsert per user/week slot
                stmt = stmt.on_conflict_do_update(
                    index_elements=['user_id', 'day', 'meal_type'],
                    set_=dict(recipe_ids=stmt.excluded.recipe_ids)
                )

            session.execute(stmt)
            print(f"   Successfully loaded and upserted {len(data)} rows.")

    except FileNotFoundError:
        print(f"Warning: CSV file not found at {file_path}. Skipping...")
    except (IOError, csv.Error) as e:
        raise DataLoadError(f"Error reading CSV file {file_path}: {e}") from e
    except ValueError as e:
        raise DataLoadError(f"Data conversion error in {file_path}: {e}") from e


# --- Main Logic ---

# Use env vars for DB connection (Cloud SQL/Secret Manager compatible)
DB_USER = os.getenv("DB_USER", os.getenv("POSTGRES_USER", "mealplanner"))
DB_PASSWORD = os.getenv("DB_PASSWORD", os.getenv("POSTGRES_PASSWORD", "password"))
DB_NAME = os.getenv("DB_NAME", os.getenv("POSTGRES_DB", "mealplanner"))
DB_HOST = os.getenv("DB_HOST", "localhost")
DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

engine = create_engine(DATABASE_URL)


def setup_database() -> None:
    """Sets up the database by creating tables and loading initial data."""
    try:
        print("Executing schema setup...")
        Base.metadata.create_all(bind=engine)
        print("Schema and triggers created successfully.")

        # Ensure new micronutrient columns exist for existing databases
        
        with engine.connect() as conn:
            # print("Ensuring micronutrient columns exist on 'ingredients' table...")
            # conn.execute(sa_text("""
            #     ALTER TABLE IF EXISTS ingredients 
            #     ADD COLUMN IF NOT EXISTS iron_mg numeric(10,2) DEFAULT 0.0;
            # """))
            # conn.execute(sa_text("""
            #     ALTER TABLE IF EXISTS ingredients 
            #     ADD COLUMN IF NOT EXISTS magnesium_mg numeric(10,2) DEFAULT 0.0;
            # """))
            # conn.execute(sa_text("""
            #     ALTER TABLE IF EXISTS ingredients 
            #     ADD COLUMN IF NOT EXISTS calcium_mg numeric(10,2) DEFAULT 0.0;
            # """))
            # conn.execute(sa_text("""
            #     ALTER TABLE IF EXISTS ingredients 
            #     ADD COLUMN IF NOT EXISTS potassium_mg numeric(10,2) DEFAULT 0.0;
            # """))
            # conn.execute(sa_text("""
            #     ALTER TABLE IF EXISTS ingredients 
            #     ADD COLUMN IF NOT EXISTS sodium_mg numeric(10,2) DEFAULT 0.0;
            # """))
            # conn.execute(sa_text("""
            #     ALTER TABLE IF EXISTS ingredients 
            #     ADD COLUMN IF NOT EXISTS vitamin_c_mg numeric(10,2) DEFAULT 0.0;
            # """))
            # User and multi-tenant adjustments
            # print("Ensuring 'users' table and user_id columns exist...")
            # conn.execute(sa_text("""
            #     CREATE TABLE IF NOT EXISTS users (
            #         id SERIAL PRIMARY KEY,
            #         email VARCHAR(255) UNIQUE NOT NULL,
            #         password_hash VARCHAR(255) NOT NULL,
            #         created_at TIMESTAMP DEFAULT now()
            #     );
            # """))
            # # Add user_id to recipes if missing
            # conn.execute(sa_text("""
            #     ALTER TABLE IF EXISTS recipes 
            #     ADD COLUMN IF NOT EXISTS user_id INTEGER NULL REFERENCES users(id);
            # """))
            # conn.execute(sa_text("""
            #     CREATE INDEX IF NOT EXISTS ix_recipes_user_id ON recipes(user_id);
            # """))
            # # Add user_id to weekly_plan and update unique constraint
            # conn.execute(sa_text("""
            #     ALTER TABLE IF EXISTS weekly_plan 
            #     ADD COLUMN IF NOT EXISTS user_id INTEGER NULL REFERENCES users(id);
            # """))
            # # Add user_id to ingredients and make name unique per user, but allow a single global copy (user_id NULL)
            # conn.execute(sa_text("""
            #     ALTER TABLE IF EXISTS ingredients
            #     ADD COLUMN IF NOT EXISTS user_id INTEGER NULL REFERENCES users(id);
            # """))
            conn.execute(sa_text("""
                CREATE INDEX IF NOT EXISTS ix_ingredients_user_id ON ingredients(user_id);
            """))
            conn.execute(sa_text("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ingredients_name_key') THEN
                        ALTER TABLE ingredients DROP CONSTRAINT ingredients_name_key;
                    END IF;
                END$$;
            """))
            conn.execute(sa_text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uniq_user_ingredient_name') THEN
                        ALTER TABLE ingredients ADD CONSTRAINT uniq_user_ingredient_name UNIQUE (user_id, name);
                    END IF;
                END$$;
            """))
            conn.execute(sa_text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
                        WHERE c.relname = 'uniq_global_ingredient_name' AND n.nspname = 'public'
                    ) THEN
                        CREATE UNIQUE INDEX uniq_global_ingredient_name ON ingredients(name) WHERE user_id IS NULL;
                    END IF;
                END$$;
            """))
            conn.execute(sa_text("""
                CREATE INDEX IF NOT EXISTS ix_weekly_plan_user_id ON weekly_plan(user_id);
            """))
            # Drop old unique constraint if exists and create new one
            conn.execute(sa_text("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'unique_day_meal'
                    ) THEN
                        ALTER TABLE weekly_plan DROP CONSTRAINT unique_day_meal;
                    END IF;
                END$$;
            """))
            conn.execute(sa_text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_day_meal'
                    ) THEN
                        ALTER TABLE weekly_plan ADD CONSTRAINT unique_user_day_meal UNIQUE (user_id, day, meal_type);
                    END IF;
                END$$;
            """))
            # Ensure at least one default user exists for seed data
            # Insert default demo user with a bcrypt hash if none exists
            pwd = CryptContext(schemes=["bcrypt"], deprecated="auto").hash("demo123")
            conn.execute(sa_text(f"""
                INSERT INTO users (email, password_hash)
                SELECT 'demo@demo.com', :pwd
                WHERE NOT EXISTS (SELECT 1 FROM users);
            """), {"pwd": pwd})
            # Backfill weekly_plan user_id if null
            conn.execute(sa_text("""
                UPDATE weekly_plan 
                SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1)
                WHERE user_id IS NULL;
            """))
            conn.commit()

        with SessionLocal() as session:
            print("Loading initial data...")
            # Set DEFAULT_USER_ID for transformation
            global DEFAULT_USER_ID
            DEFAULT_USER_ID = session.query(User.id).order_by(User.id).limit(1).scalar()
            # Keep stock ingredients as global (user_id NULL); do not backfill
            load_data_from_csv(session, Ingredient, "data/ingredients.csv", transform_ingredient_row)
            load_data_from_csv(session, Recipe, "data/recipes.csv", transform_recipe_row)
            load_data_from_csv(session, WeeklyPlan, "data/weekly_plan.csv", transform_weekly_plan_row)
            
            print("-- Updating '*_id_seq' sequence...")
            session.execute(text("SELECT setval('recipes_id_seq', (SELECT MAX(id) FROM recipes));"))
            session.execute(text("SELECT setval('ingredients_id_seq', (SELECT MAX(id) FROM ingredients));"))
            session.execute(text("SELECT setval('weekly_plan_id_seq', (SELECT MAX(id) FROM weekly_plan));"))
            
            session.commit()

        print("Database setup completed successfully.")

    except (DataLoadError, Exception) as e:
        print(f"An error occurred during database setup: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    setup_database()