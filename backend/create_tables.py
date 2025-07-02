import psycopg2
import os
import csv

def create_tables():
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(
            dbname=os.environ['POSTGRES_DB'],
            user=os.environ['POSTGRES_USER'],
            password=os.environ['POSTGRES_PASSWORD'],
            host='db'
        )
        cur = conn.cursor()
        cur.execute('''
            CREATE TABLE IF NOT EXISTS recipes (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                ingredients TEXT NOT NULL,
                instructions TEXT NOT NULL,
                meal_type VARCHAR(50) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack','weekend prep')) NOT NULL
            );
        ''')
        conn.commit()

        with open('recipes.csv', 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                cur.execute('''
                    INSERT INTO recipes (name, ingredients, instructions, meal_type)
                    VALUES (%s, %s, %s, %s)
                ''', (row['name'], row['ingredients'], row['instructions'], row['meal_type']))

        conn.commit()

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


if __name__ == '__main__':
    create_tables()
