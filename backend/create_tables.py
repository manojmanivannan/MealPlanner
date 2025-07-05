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
                meal_type VARCHAR(50) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack','weekend prep','sides')) NOT NULL,
                is_vegetarian BOOLEAN DEFAULT TRUE
            );
        """)
        conn.commit()

        cur.execute("""
            CREATE TABLE IF NOT EXISTS weekly_plan (
                id SERIAL PRIMARY KEY,
                day VARCHAR(16) NOT NULL,
                meal_type VARCHAR(50) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')) NOT NULL,
                recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL
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
                    INSERT INTO ingredients (name, shelf_life, available)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (name) DO UPDATE SET
                        shelf_life = EXCLUDED.shelf_life
                """,
                    (row["name"], row["shelf_life"], row["available"]),
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
                cur.execute(
                    """
                    INSERT INTO weekly_plan (day, meal_type, recipe_id)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (day, meal_type) DO UPDATE SET recipe_id = EXCLUDED.recipe_id
                """,
                    (row["day"], row["meal_type"], row["recipe_id"]),
                )

        conn.commit()

        # Ensure the sequence is set correctly after inserting data
        cur.execute(
            """SELECT setval('recipes_id_seq', (SELECT MAX(id) FROM recipes));"""
        )
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
