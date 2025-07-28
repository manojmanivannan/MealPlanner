# models.py
import enum
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    Boolean,
    Numeric,
    Enum,
    TIMESTAMP,
    DDL,
    event,
    ForeignKeyConstraint,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, ARRAY, insert
from sqlalchemy.sql import func
from database import Base

# --- Enums for Meal Types ---
# Using Python's Enum class makes choices explicit and type-safe
class RecipeMealType(enum.Enum):
    pre_breakfast = "pre-breakfast"
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    snack = "snack"
    weekend_prep = "weekend prep"
    sides = "sides"


class ServingUnits(str, enum.Enum):
    GRAMS = "g"
    MILLILITERS = "ml"
    CUP = "cup"
    TABLESPOON = "tbsp"
    TEASPOON = "tsp"
    NOS = "nos"

class DaysOfWeek(str, enum.Enum):
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"
    
# --- ORM Models ---

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    shelf_life = Column(Integer, default=None)
    available = Column(Boolean, default=False)
    last_available = Column(TIMESTAMP, default=func.now())
    serving_unit = Column(String(10), default=None)
    serving_size = Column(Numeric, default=100)
    protein = Column(Numeric(10, 2), default=0.0)
    carbs = Column(Numeric(10, 2), default=0.0)
    fat = Column(Numeric(10, 2), default=0.0)
    fiber = Column(Numeric(10, 2), default=0.0)
    energy = Column(Numeric(10, 2), default=0.0)

    def __repr__(self):
        return f"<Ingredient(name='{self.name}')>"


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    ingredients = Column(JSONB, nullable=False)
    instructions = Column(Text, nullable=False)
    meal_type = Column(Enum(RecipeMealType, name="recipe_meal_type_enum"), nullable=False)
    is_vegetarian = Column(Boolean, default=True)
    protein = Column(Numeric(10, 2), default=0.0)
    carbs = Column(Numeric(10, 2), default=0.0)
    fat = Column(Numeric(10, 2), default=0.0)
    fiber = Column(Numeric(10, 2), default=0.0)
    energy = Column(Numeric(10, 2), default=0.0)

    def __repr__(self):
        return f"<Recipe(name='{self.name}')>"


class WeeklyPlan(Base):
    __tablename__ = "weekly_plan"

    id = Column(Integer, primary_key=True)
    day = Column(String(16), nullable=False)
    meal_type = Column(Enum(RecipeMealType, name="plan_meal_type_enum"), nullable=False)
    recipe_ids = Column(ARRAY(Integer))

    # Define the unique constraint directly in the model
    __table_args__ = (
        UniqueConstraint('day', 'meal_type', name='unique_day_meal'),
    )

    def __repr__(self):
        return f"<WeeklyPlan(day='{self.day}', meal_type='{self.meal_type.value}')>"

# --- DDL for Triggers (Advanced SQLAlchemy) ---
# This is the modern way to handle raw SQL triggers.
# The trigger logic is attached to the table metadata.

# 1. Nutrition Calculation Trigger for Recipes
calculate_nutrition_func = DDL("""
    CREATE OR REPLACE FUNCTION calculate_recipe_nutrients()
    RETURNS TRIGGER AS $$
    DECLARE
        ing_record RECORD;
        nutrient_data RECORD;
        total_protein FLOAT := 0.0; total_carbs FLOAT := 0.0;
        total_fat FLOAT := 0.0; total_fiber FLOAT := 0.0;
        total_energy FLOAT := 0.0;
    BEGIN
        FOR ing_record IN SELECT * FROM jsonb_to_recordset(NEW.ingredients) AS x(name text, quantity float, unit text)
        LOOP
            SELECT * INTO nutrient_data FROM ingredients WHERE name = ing_record.name;
            IF FOUND THEN
                total_protein := total_protein + (nutrient_data.protein * ing_record.quantity / nutrient_data.serving_size);
                total_carbs := total_carbs + (nutrient_data.carbs * ing_record.quantity/ nutrient_data.serving_size);
                total_fat := total_fat + (nutrient_data.fat * ing_record.quantity/ nutrient_data.serving_size);
                total_fiber := total_fiber + (nutrient_data.fiber * ing_record.quantity/ nutrient_data.serving_size);
                total_energy := total_energy + (nutrient_data.energy * ing_record.quantity/ nutrient_data.serving_size);
            END IF;
        END LOOP;
        NEW.protein := total_protein; NEW.carbs := total_carbs;
        NEW.fat := total_fat; NEW.fiber := total_fiber;
        NEW.energy := total_energy;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
""")

create_nutrition_trigger = DDL("""
    CREATE TRIGGER trg_update_recipe_nutrients
    BEFORE INSERT OR UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION calculate_recipe_nutrients();
""")

# Associate the function and trigger with the Recipe table
event.listen(Recipe.__table__, 'before_create', calculate_nutrition_func)
event.listen(Recipe.__table__, 'after_create', create_nutrition_trigger)


# 2. Foreign Key Check Trigger for WeeklyPlan
# NOTE: A many-to-many table is often a better design than ARRAY of foreign keys,
# but this preserves your original structure.
check_recipe_ids_func = DDL("""
    CREATE OR REPLACE FUNCTION check_recipe_ids_exist()
    RETURNS trigger AS $$
    DECLARE
        rid integer;
    BEGIN
        IF NEW.recipe_ids IS NOT NULL THEN
            FOREACH rid IN ARRAY NEW.recipe_ids LOOP
                IF NOT EXISTS (SELECT 1 FROM recipes WHERE id = rid) THEN
                    RAISE EXCEPTION 'Recipe id %% does not exist', rid;
                END IF;
            END LOOP;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
""")

create_recipe_ids_trigger = DDL("""
    CREATE CONSTRAINT TRIGGER trg_check_recipe_ids_exist
    AFTER INSERT OR UPDATE ON weekly_plan
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION check_recipe_ids_exist();
""")

event.listen(WeeklyPlan.__table__, 'before_create', check_recipe_ids_func)
event.listen(WeeklyPlan.__table__, 'after_create', create_recipe_ids_trigger)