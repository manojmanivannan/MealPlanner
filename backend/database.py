# database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Fetch database credentials from environment variables

# Use generic env vars for GCP compatibility, with sensible defaults for local/dev
DB_USER = os.getenv("DB_USER", os.getenv("POSTGRES_USER", "mealplanner"))
DB_PASSWORD = os.getenv("DB_PASSWORD", os.getenv("POSTGRES_PASSWORD", "password"))
DB_NAME = os.getenv("DB_NAME", os.getenv("POSTGRES_DB", "mealplanner"))
DB_HOST = os.getenv("DB_HOST", "localhost")

# Database connection URL
DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

# The engine is the core interface to the database
engine = create_engine(DATABASE_URL)

# A sessionmaker provides a factory for Session objects
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our declarative models
Base = declarative_base()


# --- Database Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()