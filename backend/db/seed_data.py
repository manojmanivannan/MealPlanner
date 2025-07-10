
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import csv
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert 
from db.alembic.models import  Recipe, WeeklyPlan, Ingredient # Import your models


# --- Add this logic to dynamically set the database URL ---
# Get DB details from environment variables
db_user = os.getenv("POSTGRES_USER", "postgres")
db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
db_name = os.getenv("POSTGRES_DB", "recipes")
# Use POSTGRES_HOST if it's set (for local commands), otherwise default to 'db' (for inside Docker)
db_host = os.getenv("POSTGRES_HOST", "db")
# Add the port
db_port = os.getenv("POSTGRES_PORT", "5432") # Default to 5432


db_url = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

# --- Database Connection ---
try:
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except KeyError as e:
    print(f"Error: Environment variable not set: {e}", file=sys.stderr)
    sys.exit(1)


def transform_recipes_row(row):
    """
    Transforms a row from the recipes CSV for database insertion.
    Converts 'is_vegetarian' from '1'/'0' to a boolean.
    """
    # Convert the '1' or '0' string into a boolean
    row['is_vegetarian'] = row.get('is_vegetarian') == 't'

    # Ensure meal_type is one of the allowed values
    allowed_meal_types = ['pre-breakfast', 'breakfast', 'lunch', 'dinner', 'snack', 'weekend prep', 'sides']
    if row.get('meal_type') not in allowed_meal_types:
        raise ValueError(f"Invalid meal_type: {row.get('meal_type')}")

    return row

def transform_ingredient_row(row):
    """
    Transforms a row from the ingredients CSV for database insertion.
    Converts 'available' from '1'/'0' to a boolean.
    """
    # Convert the '1' or '0' string into a boolean
    row['available'] = row.get('available') == 't'

    # Ensure shelf_life is an integer, handling empty values
    if row.get('shelf_life') and row['shelf_life'].isdigit():
        row['shelf_life'] = int(row['shelf_life'])
    else:
        row['shelf_life'] = None # or a default value

    # The 'last_available' timestamp string is handled automatically
    # by SQLAlchemy, so no change is needed there.
    return row

def transform_weekly_plan_row(row):
    recipe_ids_str = row.get("recipe_ids", "")
    if recipe_ids_str and recipe_ids_str != "{}":
        row["recipe_ids"] = [int(x) for x in recipe_ids_str.strip("{}").split(",")]
    else:
        row["recipe_ids"] = []
    return row

# def seed_table(session, file_path, model, transform=None):
#     try:
#         print(f"-- Loading data from {file_path} into {model.__tablename__}...")
#         with open(file_path, "r", encoding="utf-8") as f:
#             reader = csv.DictReader(f)
#             objects = []
#             for row in reader:
#                 if transform:
#                     row = transform(row)
#                 objects.append(model(**row))
#             session.bulk_save_objects(objects)
#             session.commit()
#     except FileNotFoundError:
#         print(f"Warning: CSV file not found at {file_path}. Skipping...")
#     except Exception as e:
#         session.rollback()
#         print(f"Error loading data for {model.__tablename__}: {e}", file=sys.stderr)
# --- NEW Generic Seeding Function ---
def seed_table(
    session,
    file_path,
    model,
    conflict_columns,
    update_columns=None,
    transform=None,
):
    """
    Seeds a table from a CSV file with custom ON CONFLICT handling.
    """
    try:
        print(f"-- Loading data from {file_path} into {model.__tablename__}...")
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            # Apply transformation to all rows first
            data = [transform(row) if transform else row for row in reader]

        if not data:
            print(f"No data found in {file_path}, skipping.")
            return

        # Build the initial insert statement
        stmt = insert(model.__table__).values(data)

        if update_columns:
            # Create the ON CONFLICT DO UPDATE statement
            update_dict = {
                col.name: col
                for col in stmt.excluded
                if col.name in update_columns
            }
            stmt = stmt.on_conflict_do_update(
                index_elements=conflict_columns, set_=update_dict
            )
        else:
            # Create the ON CONFLICT DO NOTHING statement
            stmt = stmt.on_conflict_do_nothing(index_elements=conflict_columns)

        session.execute(stmt)
        session.commit()

    except FileNotFoundError:
        print(f"Warning: CSV file not found at {file_path}. Skipping...")
    except Exception as e:
        session.rollback()
        print(f"Error loading data for {model.__tablename__}: {e}", file=sys.stderr)

def main():
    db_session = SessionLocal()
    try:
        # Note: The order matters if you have foreign key relationships
        seed_table(db_session, "./db/ingredients.csv", Ingredient,["name"],["shelf_life"], transform_ingredient_row)
        seed_table(db_session, "./db/recipes.csv", Recipe, ['id'],[],transform_recipes_row)
        seed_table(db_session, "./db/weekly_plan.csv", WeeklyPlan,["day", "meal_type"],["recipe_ids"], transform_weekly_plan_row)

        # Your original script updated a sequence. This is generally not needed if
        # you use autoincrementing keys, but if required, you can do it here.
        print("Finalizing data seeding...")
        db_session.execute(text("SELECT setval('recipes_id_seq', (SELECT MAX(id) FROM recipes));"))
        db_session.commit()
        print("Data seeding completed successfully.")
    finally:
        db_session.close()

if __name__ == "__main__":
    main()
