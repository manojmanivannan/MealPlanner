import csv
import os

import psycopg2


def create_tables():
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(
            dbname=os.environ["POSTGRES_DB"],
            user=os.environ["POSTGRES_USER"],
            password=os.environ["POSTGRES_PASSWORD"],
            host="db",
        )
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS recipes (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                ingredients TEXT NOT NULL,
                instructions TEXT NOT NULL,
                meal_type VARCHAR(50) CHECK (meal_type IN ('pre-breakfast','breakfast', 'lunch', 'dinner', 'snack','weekend prep','sides')) NOT NULL,
                is_vegetarian BOOLEAN DEFAULT TRUE
            );
        """)
        conn.commit()

        cur.execute("""
            CREATE TABLE IF NOT EXISTS weekly_plan (
                id SERIAL PRIMARY KEY,
                day VARCHAR(16) NOT NULL,
                meal_type VARCHAR(50) CHECK (meal_type IN ('pre-breakfast','breakfast', 'lunch', 'dinner', 'snack')) NOT NULL,
                recipe_ids INTEGER[]
            );
        """)
        conn.commit()

        # drop the unique constraint if it exists
        cur.execute(
            """ALTER TABLE weekly_plan DROP CONSTRAINT IF EXISTS unique_day_meal;"""
        )
        conn.commit()

        # add the unique constraint back
        cur.execute(
            """ALTER TABLE weekly_plan ADD CONSTRAINT unique_day_meal UNIQUE(day, meal_type);"""
        )
        conn.commit()

        cur.execute("""
            CREATE TABLE IF NOT EXISTS ingredients (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                shelf_life INTEGER CHECK (shelf_life >= 0) DEFAULT NULL,
                available BOOLEAN DEFAULT FALSE,
                last_available TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()

        # Load initial data for ingredients from CSV file
        with open("ingredients.csv", "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cur.execute(
                    """
                    INSERT INTO ingredients (name, shelf_life, available,last_available)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (name) DO UPDATE SET
                        shelf_life = EXCLUDED.shelf_life
                """,
                    (
                        row["name"],
                        row["shelf_life"],
                        row["available"],
                        row["last_available"],
                    ),
                )
        conn.commit()

        # Load initial data for recipes from CSV files
        with open("recipes.csv", "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cur.execute(
                    """
                    INSERT INTO recipes (id, name, ingredients, instructions, meal_type, is_vegetarian)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """,
                    (
                        row["id"],
                        row["name"],
                        row["ingredients"],
                        row["instructions"],
                        row["meal_type"],
                        row["is_vegetarian"],
                    ),
                )
        conn.commit()

        with open("weekly_plan.csv", "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                recipe_ids_str = row["recipe_ids"]
                recipe_ids = []  # Default to an empty list

                if recipe_ids_str:
                    # Strip the curly braces, then split by comma
                    cleaned_str = recipe_ids_str.strip("{}")
                    if cleaned_str:  # Ensure it's not empty after stripping
                        recipe_ids = [int(x.strip()) for x in cleaned_str.split(",")]

                cur.execute(
                    """
                    INSERT INTO weekly_plan (id, day, meal_type, recipe_ids)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (day, meal_type) DO UPDATE SET recipe_ids = EXCLUDED.recipe_ids
                """,
                    (row["id"], row["day"], row["meal_type"], recipe_ids),
                )

        conn.commit()

        # Ensure the sequence is set correctly after inserting data
        cur.execute(
            """SELECT setval('recipes_id_seq', (SELECT MAX(id) FROM recipes));"""
        )
        conn.commit()

        # Add trigger to check all recipe_ids exist in recipes
        cur.execute("""
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
        """)
        conn.commit()
        cur.execute("""
            DROP TRIGGER IF EXISTS trg_check_recipe_ids_exist ON weekly_plan;
        """)
        conn.commit()
        cur.execute("""
            CREATE CONSTRAINT TRIGGER trg_check_recipe_ids_exist
            AFTER INSERT OR UPDATE ON weekly_plan
            DEFERRABLE INITIALLY DEFERRED
            FOR EACH ROW EXECUTE FUNCTION check_recipe_ids_exist();
        """)
        conn.commit()

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    create_tables()
