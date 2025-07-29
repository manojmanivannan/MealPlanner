# setup_db.py
import csv
import sys
import json  # <-- ADD THIS IMPORT
from typing import Any, Dict, Optional, Callable

from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.sql import text

from database import engine, Base, SessionLocal
from models import Ingredient, Recipe, WeeklyPlan, RecipeMealType

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
        if key in ['protein', 'carbs', 'fat', 'fiber', 'energy', 'shelf_life', 'serving_size', 'id']:
            if value is not None:
                try:
                    processed_row[key] = float(value) if '.' in value else int(value)
                except (ValueError, TypeError):
                    pass # Keep as is if conversion fails
        elif key in ['is_vegetarian', 'available']:
            processed_row[key] = value.lower() in ['true', '1', 't']
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
                    for col in model.__table__.columns if not col.primary_key and col.name != 'name'
                }
                stmt = stmt.on_conflict_do_update(index_elements=['name'], set_=update_dict)
            elif model == Recipe:
                stmt = stmt.on_conflict_do_nothing(index_elements=['id'])
            elif model == WeeklyPlan:
                stmt = stmt.on_conflict_do_update(
                    index_elements=['day', 'meal_type'],
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

def setup_database() -> None:
    """Sets up the database by creating tables and loading initial data."""
    try:
        print("Executing schema setup...")
        Base.metadata.create_all(bind=engine)
        print("Schema and triggers created successfully.")

        with SessionLocal() as session:
            print("Loading initial data...")
            load_data_from_csv(session, Ingredient, "data/ingredients.csv", _transform_common_types)
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