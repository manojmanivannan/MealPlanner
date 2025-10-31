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

# OTP and email utility
import random
from utils import send_email
from fastapi import Request
from sqlalchemy.exc import SQLAlchemyError

# --- Schemas for request bodies ---
from pydantic import BaseModel, EmailStr

# In-memory OTP store (for demo; use Redis or DB for production)
otp_store = {}


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
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
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
    elif x_forwarded_authorization and x_forwarded_authorization.lower().startswith(
        "bearer "
    ):
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


@auth_router.post(
    "/signup", response_model=UserSchema, status_code=status.HTTP_201_CREATED
)
class EmailSchema(BaseModel):
    email: EmailStr


class OTPEmailSchema(BaseModel):
    email: EmailStr
    otp: str


class PasswordResetSchema(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


# Step 1: Request OTP
@auth_router.post("/request-otp")
async def request_otp(body: EmailSchema, db: Session = Depends(get_db)):
    import logging

    email = body.email
    logging.debug(f"OTP request for email: {email}")
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        logging.info(f"Email already registered: {email}")
        raise HTTPException(status_code=409, detail="Email already registered")
    otp = str(random.randint(100000, 999999))
    otp_store[email] = otp
    logging.debug(f"Generated OTP {otp} for {email}")
    await send_email(email, "Your MealPlanner OTP", f"Your OTP is: {otp}")
    logging.info(f"OTP sent to {email}")
    return {"message": "OTP sent to email."}


# Step 2: Signup with OTP
@auth_router.post(
    "/signup", response_model=UserSchema, status_code=status.HTTP_201_CREATED
)
async def signup(
    user_in: UserCreateSchema, otp: str = None, db: Session = Depends(get_db)
):
    # Accept OTP from query param for compatibility, but prefer body in future
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    if not otp or otp_store.get(user_in.email) != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    try:
        user = User(
            email=user_in.email, password_hash=get_password_hash(user_in.password)
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        demo_user = db.query(User).filter(User.email == "demo@demo.com").first()
        if demo_user:
            for ingredient in (
                db.query(Ingredient).filter(Ingredient.user_id == demo_user.id).all()
            ):
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
        otp_store.pop(user_in.email, None)
        return user
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Registration failed.")


# Password recovery: request OTP
@auth_router.post("/request-password-reset")
async def request_password_reset(body: EmailSchema, db: Session = Depends(get_db)):
    import logging

    email = body.email
    logging.debug(f"Password reset OTP request for email: {email}")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        logging.info(f"Email not found for password reset: {email}")
        raise HTTPException(status_code=404, detail="Email not found")
    otp = str(random.randint(100000, 999999))
    otp_store[email] = otp
    logging.debug(f"Generated password reset OTP {otp} for {email}")
    await send_email(
        email, "MealPlanner Password Reset OTP", f"Your password reset OTP is: {otp}"
    )
    logging.info(f"Password reset OTP sent to {email}")
    return {"message": "Password reset OTP sent to email."}


# Password reset: verify OTP and set new password
@auth_router.post("/reset-password")
def reset_password(body: PasswordResetSchema, db: Session = Depends(get_db)):
    email = body.email
    otp = body.otp
    new_password = body.new_password
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
    if otp_store.get(email) != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    user.password_hash = get_password_hash(new_password)
    db.commit()
    otp_store.pop(email, None)
    return {"message": "Password reset successful."}


@auth_router.post("/login", response_model=TokenSchema)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(
        form_data.password, getattr(user, "password_hash", "")
    ):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    token = create_access_token({"sub": str(user.id)})
    return TokenSchema(access_token=token)


@auth_router.get("/me", response_model=UserSchema)
def me(current_user: User = Depends(get_current_user)):
    return current_user
