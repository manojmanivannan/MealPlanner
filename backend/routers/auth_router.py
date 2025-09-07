from datetime import datetime, timedelta, timezone
import os
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from models import User, Recipe, Ingredient
from schemas import UserCreateSchema, UserSchema, TokenSchema


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

SECRET_KEY = os.environ.get("MEALPLANNER_SECRET", "devsecret")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("MEALPLANNER_TOKEN_MINUTES", "1440"))


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt


def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
    x_forwarded_authorization: Optional[str] = Header(None, convert_underscores=False),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    # Determine token source: standard Authorization or X-Forwarded-Authorization
    raw_token = None
    if token:
        raw_token = token
    elif x_forwarded_authorization and x_forwarded_authorization.lower().startswith("bearer "):
        raw_token = x_forwarded_authorization.split(" ", 1)[1]
    else:
        raise credentials_exception

    try:
        payload = jwt.decode(raw_token, SECRET_KEY, algorithms=["HS256"])
        user_id_raw = payload.get("sub")
        user_id: Optional[int] = int(user_id_raw) if user_id_raw is not None else None
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


auth_router = APIRouter(prefix="/auth", tags=["Auth"])


@auth_router.post("/signup", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreateSchema, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=user_in.email, password_hash=get_password_hash(user_in.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    # Duplicate recipes and ingredients from demo user
    demo_user = db.query(User).filter(User.email == "demo@demo.com").first()
    if demo_user:
        # Duplicate ingredients
        for ingredient in db.query(Ingredient).filter(Ingredient.user_id == demo_user.id).all():
            new_ingredient = Ingredient(
                user_id=user.id,
                name=ingredient.name,
                shelf_life=ingredient.shelf_life,
                available=False,
                last_available=ingredient.last_available,
                serving_unit=ingredient.serving_unit,
                serving_size=ingredient.serving_size,
                protein=ingredient.protein,
                carbs=ingredient.carbs,
                fat=ingredient.fat,
                fiber=ingredient.fiber,
                energy=ingredient.energy,
                iron_mg=ingredient.iron_mg,
                magnesium_mg=ingredient.magnesium_mg,
                calcium_mg=ingredient.calcium_mg,
                potassium_mg=ingredient.potassium_mg,
                sodium_mg=ingredient.sodium_mg,
                vitamin_c_mg=ingredient.vitamin_c_mg,
            )
            db.add(new_ingredient)

        # Duplicate recipes
        for recipe in db.query(Recipe).filter(Recipe.user_id == demo_user.id).all():
            new_recipe = Recipe(
                user_id=user.id,
                name=recipe.name,
                serves=recipe.serves,
                ingredients=recipe.ingredients,
                instructions=recipe.instructions,
                meal_type=recipe.meal_type,
                is_vegetarian=recipe.is_vegetarian,
                protein=recipe.protein,
                carbs=recipe.carbs,
                fat=recipe.fat,
                fiber=recipe.fiber,
                energy=recipe.energy,
                iron_mg=recipe.iron_mg,
                magnesium_mg=recipe.magnesium_mg,
                calcium_mg=recipe.calcium_mg,
                potassium_mg=recipe.potassium_mg,
                sodium_mg=recipe.sodium_mg,
                vitamin_c_mg=recipe.vitamin_c_mg,
            )
            db.add(new_recipe)
        db.commit()

    return user


@auth_router.post("/login", response_model=TokenSchema)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    token = create_access_token({"sub": str(user.id)})
    return TokenSchema(access_token=token)


@auth_router.get("/me", response_model=UserSchema)
def me(current_user: User = Depends(get_current_user)):
    return current_user


