from pydantic import BaseModel, ConfigDict
from models import RecipeMealType, ServingUnits, DaysOfWeek
from typing import List, Optional
import datetime


# --- Pydantic Schemas ---
# These classes define the shape of the API request/response data.
class IngredientItemSchema(BaseModel):
    name: str
    quantity: float
    serving_unit: ServingUnits

class RecipeSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True) # Replaces orm_mode=True
    
    id: int
    name: str
    ingredients: List[IngredientItemSchema]
    instructions: str
    meal_type: RecipeMealType
    is_vegetarian: bool
    protein: float
    carbs: float
    fat: float
    fiber: float
    energy: float

class RecipeCreateUpdateSchema(BaseModel):
    name: str
    ingredients: List[IngredientItemSchema]
    instructions: str
    meal_type: RecipeMealType
    is_vegetarian: bool

class PlanSlotSchema(BaseModel):
    day: DaysOfWeek
    meal_type: RecipeMealType
    recipe_ids: Optional[List[int]] = []

class IngredientSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    available: bool
    shelf_life: Optional[int]
    last_available: Optional[datetime.datetime]
    serving_unit: ServingUnits
    serving_size: float
    energy: float
    protein: float
    carbs: float
    fat: float
    fiber: float
    remaining_shelf_life: Optional[int] = None

class IngredientUpdateSchema(BaseModel):
    available: Optional[bool] = None
    shelf_life: Optional[int] = None
    name: Optional[str] = None
    serving_unit: Optional[ServingUnits] = None
    serving_size: Optional[float] = None
    energy: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    fiber: Optional[float] = None

class HealthCheckSchema(BaseModel):
    status: str = "OK"