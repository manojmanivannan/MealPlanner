import sqlalchemy
from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Column,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Recipe(Base):
    __tablename__ = 'recipes'
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    ingredients = Column(Text, nullable=False)
    instructions = Column(Text, nullable=False)
    meal_type = Column(String(50), nullable=False)
    is_vegetarian = Column(Boolean, default=True)

    __table_args__ = (
        CheckConstraint(
            meal_type.in_(['pre-breakfast', 'breakfast', 'lunch', 'dinner', 'snack', 'weekend prep', 'sides']),
            name='recipes_meal_type_check'
        ),
    )


class WeeklyPlan(Base):
    __tablename__ = 'weekly_plan'
    id = Column(Integer, primary_key=True, autoincrement=True)
    day = Column(String(16), nullable=False)
    meal_type = Column(String(50), nullable=False)
    recipe_ids = Column(ARRAY(Integer))

    __table_args__ = (
        CheckConstraint(
            meal_type.in_(['pre-breakfast', 'breakfast', 'lunch', 'dinner', 'snack']),
            name='weekly_plan_meal_type_check'
        ),
        UniqueConstraint('day', 'meal_type', name='unique_day_meal'),
    )


class Ingredient(Base):
    __tablename__ = 'ingredients'
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False)
    shelf_life = Column(Integer, CheckConstraint('shelf_life >= 0'))
    available = Column(Boolean, default=False)
    last_available = Column(
        sqlalchemy.TIMESTAMP,
        server_default=text('CURRENT_TIMESTAMP')
    )
