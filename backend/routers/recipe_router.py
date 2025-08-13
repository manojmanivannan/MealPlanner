from fastapi import APIRouter
from fastapi import Depends, HTTPException, Response, status, Query
from sqlalchemy.orm import Session
from typing import List
from models import Recipe, User
from schemas import RecipeSchema, RecipeCreateUpdateSchema
from database import SessionLocal

from database import get_db
import logging
logger = logging.getLogger("uvicorn")
logger.setLevel(logging.DEBUG)

rec_router = APIRouter(prefix="/recipes", tags=["Recipes"])

from routers.auth_router import get_current_user

## Recipes
@rec_router.get("", response_model=List[RecipeSchema])
def get_recipes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_recipes = (
        db.query(Recipe)
        .filter((Recipe.user_id == None) | (Recipe.user_id == current_user.id))
        .order_by(Recipe.name)
        .all()
    )
    return db_recipes

@rec_router.get("/{recipe_id}", response_model=RecipeSchema)
def get_recipe(recipe_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_recipe = (
        db.query(Recipe)
        .filter(Recipe.id == recipe_id)
        .filter((Recipe.user_id == None) | (Recipe.user_id == current_user.id))
        .first()
    )
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return db_recipe

@rec_router.post("",  status_code=status.HTTP_201_CREATED, response_model=RecipeSchema)
def add_recipe(recipe: RecipeCreateUpdateSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Pydantic's model_dump() replaces dict()
    data = recipe.model_dump()
    new_recipe = Recipe(**data, user_id=current_user.id)
    db.add(new_recipe)
    db.commit()
    db.refresh(new_recipe)
    return new_recipe

@rec_router.put("/{recipe_id}",  response_model=RecipeSchema)
def update_recipe(recipe_id: int, recipe: RecipeCreateUpdateSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_recipe = db.query(Recipe).filter(Recipe.id == recipe_id, Recipe.user_id == current_user.id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found or not owned by user")
    
    update_data = recipe.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_recipe, key, value)
        
    db.commit()
    db.refresh(db_recipe)
    return db_recipe

@rec_router.delete("/{recipe_id}",  status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(recipe_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_recipe = db.query(Recipe).filter(Recipe.id == recipe_id, Recipe.user_id == current_user.id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found or not owned by user")
    db.delete(db_recipe)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)