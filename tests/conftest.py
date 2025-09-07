import os
import sys
from typing import Iterator, Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from testcontainers.postgres import PostgresContainer


# Ensure project root is on sys.path so `import backend.*` works
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
for p in [PROJECT_ROOT, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)


# Set required env vars so importing `backend.database` does not exit
os.environ.setdefault("POSTGRES_USER", "testuser")
os.environ.setdefault("POSTGRES_PASSWORD", "testpass")
os.environ.setdefault("POSTGRES_DB", "mealplanner_test")
# Host won't be used thanks to dependency override, but set to avoid surprises
os.environ.setdefault("POSTGRES_HOST", "localhost")
os.environ.setdefault("SECRET_KEY", "testsecret")
os.environ.setdefault("MEALPLANNER_SECRET", "testsecret")  # Backward compatibility
os.environ.setdefault("MEALPLANNER_TOKEN_MINUTES", "60")
os.environ.setdefault("ENVIRONMENT", "test")


TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")


# Import after env vars are set
from app import app  # type: ignore  # noqa: E402
from database import get_db, Base  # type: ignore  # noqa: E402


@pytest.fixture(scope="session")
def pg_container() -> Iterator[str]:
    # Spin up an ephemeral PostgreSQL container for the whole test session
    with PostgresContainer("postgres:15-alpine") as postgres:
        url = postgres.get_connection_url()
        # Expose connection details for any code that relies on env vars (optional)
        os.environ["TEST_DATABASE_URL"] = url
        yield url


@pytest.fixture(scope="session")
def db_setup(pg_container: str):
    engine = create_engine(pg_container)
    # Create all tables once for the test session (includes triggers via SQLAlchemy DDL events)
    Base.metadata.create_all(bind=engine)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture(scope="session")
def engine(db_setup):
    return db_setup


@pytest.fixture(scope="session")
def SessionTesting(engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _truncate_all_tables(engine) -> None:
    # Use TRUNCATE to quickly clean data and reset identities
    with engine.begin() as connection:
        # Order matters due to FKs and triggers
        connection.execute(text("TRUNCATE TABLE weekly_plan RESTART IDENTITY CASCADE"))
        connection.execute(text("TRUNCATE TABLE recipes RESTART IDENTITY CASCADE"))
        connection.execute(text("TRUNCATE TABLE ingredients RESTART IDENTITY CASCADE"))
        connection.execute(text("TRUNCATE TABLE users RESTART IDENTITY CASCADE"))


@pytest.fixture(autouse=True)
def clean_db(engine):
    _truncate_all_tables(engine)
    yield


@pytest.fixture()
def db_session(SessionTesting) -> Iterator:
    session = SessionTesting()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def test_client(SessionTesting) -> Iterator[TestClient]:
    # Override app DB dependency to use our test sessionmaker
    def override_get_db() -> Iterator:
        session = SessionTesting()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    try:
        yield client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers(test_client: TestClient) -> Dict[str, str]:
    # Create a user and obtain a bearer token
    email = "user@example.com"
    password = "pass1234"
    # Signup (idempotent across cleaned DBs)
    test_client.post("/auth/signup", json={"email": email, "password": password})
    # Login
    resp = test_client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


