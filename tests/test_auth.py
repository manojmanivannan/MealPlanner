from fastapi.testclient import TestClient
from models import User, Recipe, Ingredient
from sqlalchemy.orm import Session

def test_signup_and_me(test_client: TestClient, auth_headers):
    # auth_headers fixture already signs up and logs in
    me = test_client.get("/auth/me", headers=auth_headers)
    assert me.status_code == 200
    data = me.json()
    assert data["email"] == "user@example.com"
    assert "id" in data


def test_login_wrong_password(test_client: TestClient):
    # Create a user
    test_client.post("/auth/signup", json={"email": "user2@example.com", "password": "goodpass"})
    # Try wrong password
    resp = test_client.post(
        "/auth/login",
        data={"username": "user2@example.com", "password": "bad"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 400

def test_signup_duplicates_demo_user_data(test_client: TestClient, db_session: Session):
    # 1. Create a demo user and some data
    demo_user_data = {"email": "demo@demo.com", "password": "demopass"}
    test_client.post("/auth/signup", json=demo_user_data)
    demo_user = db_session.query(User).filter(User.email == demo_user_data['email']).first()

    # Add ingredients and recipes for the demo user
    db_session.add(Ingredient(user_id=demo_user.id, name="Demo Ingredient", serving_unit="g", serving_size=100, available=True))
    db_session.add(Recipe(user_id=demo_user.id, name="Demo Recipe", serves=2, ingredients=[{"name": "Demo Ingredient", "quantity": 1, "serving_unit": "g"}], instructions="...", meal_type="lunch"))
    db_session.commit()

    # 2. Sign up a new user
    new_user_data = {"email": "newuser@example.com", "password": "newpass"}
    signup_resp = test_client.post("/auth/signup", json=new_user_data)
    assert signup_resp.status_code == 201
    new_user_id = signup_resp.json()["id"]

    # 3. Verify the data was duplicated
    demo_ingredients = db_session.query(Ingredient).filter(Ingredient.user_id == demo_user.id).all()
    new_user_ingredients = db_session.query(Ingredient).filter(Ingredient.user_id == new_user_id).all()
    assert len(new_user_ingredients) == len(demo_ingredients)
    assert {ing.name for ing in new_user_ingredients} == {ing.name for ing in demo_ingredients}
    assert all(ing.available == False for ing in new_user_ingredients)

    demo_recipes = db_session.query(Recipe).filter(Recipe.user_id == demo_user.id).all()
    new_user_recipes = db_session.query(Recipe).filter(Recipe.user_id == new_user_id).all()
    assert len(new_user_recipes) == len(demo_recipes)
    assert {rec.name for rec in new_user_recipes} == {rec.name for rec in demo_recipes}
def test_login_non_existent_user(test_client: TestClient):
    resp = test_client.post(
        "/auth/login",
        data={"username": "nouser@example.com", "password": "bad"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 400

def test_signup_existing_email(test_client: TestClient):
    # Create a user
    test_client.post("/auth/signup", json={"email": "user3@example.com", "password": "goodpass"})
    # Try to sign up again with the same email
    resp = test_client.post("/auth/signup", json={"email": "user3@example.com", "password": "anotherpass"})
    assert resp.status_code == 409

def test_signup_invalid_email(test_client: TestClient):
    resp = test_client.post("/auth/signup", json={"email": "not-an-email", "password": "goodpass"})
    assert resp.status_code == 422  # Unprocessable Entity for validation errors

def test_access_protected_route_without_token(test_client: TestClient):
    resp = test_client.get("/auth/me")
    assert resp.status_code == 401  # Unauthorized

def test_access_protected_route_with_invalid_token(test_client: TestClient):
    resp = test_client.get("/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert resp.status_code == 401  # Unauthorized

