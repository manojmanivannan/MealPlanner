from fastapi.testclient import TestClient

from models import Ingredient


def test_recipe_crud(test_client: TestClient, auth_headers):
    # Seed one ingredient referenced in recipe nutritional trigger (optional; trigger tolerates missing)
    test_client.post(
        "/ingredients",
        params={"name": "Tomato", "shelf_life": 5, "serving_unit": "g"},
        headers=auth_headers,
    )

    recipe_payload = {
        "name": "Tomato Salad",
        "serves": 2,
        "ingredients": [
            {"name": "Tomato", "quantity": 100, "serving_unit": "g"},
        ],
        "instructions": "Mix and serve",
        "meal_type": "lunch",
        "is_vegetarian": True,
    }

    # Create
    resp = test_client.post("/recipes", json=recipe_payload, headers=auth_headers)
    assert resp.status_code == 201
    recipe = resp.json()

    # Get
    get_resp = test_client.get(f"/recipes/{recipe['id']}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Tomato Salad"

    # List
    list_resp = test_client.get("/recipes", headers=auth_headers)
    assert list_resp.status_code == 200
    assert any(r["id"] == recipe["id"] for r in list_resp.json())

    # Update
    update_payload = dict(recipe_payload, name="Tomato Salad 2")
    put_resp = test_client.put(f"/recipes/{recipe['id']}", json=update_payload, headers=auth_headers)
    assert put_resp.status_code == 200
    assert put_resp.json()["name"] == "Tomato Salad 2"

    # Delete
    del_resp = test_client.delete(f"/recipes/{recipe['id']}", headers=auth_headers)
    assert del_resp.status_code == 204


def test_create_recipe_with_non_existent_ingredient(test_client: TestClient, auth_headers):
    recipe_payload = {
        "name": "Carrot Soup",
        "serves": 1,
        "ingredients": [
            {"name": "NonExistentIngredient", "quantity": 1, "serving_unit": "g"},
        ],
        "instructions": "Boil it",
        "meal_type": "dinner",
    }
    resp = test_client.post("/recipes", json=recipe_payload, headers=auth_headers)
    assert resp.status_code == 422

def test_update_non_existent_recipe(test_client: TestClient, auth_headers):
    recipe_payload = {
        "name": "Tomato Salad",
        "serves": 2,
        "ingredients": [],
        "instructions": "Mix and serve",
        "meal_type": "lunch",
    }
    resp = test_client.put("/recipes/9999", json=recipe_payload, headers=auth_headers)
    assert resp.status_code == 422

def test_delete_non_existent_recipe(test_client: TestClient, auth_headers):
    resp = test_client.delete("/recipes/9999", headers=auth_headers)
    assert resp.status_code == 404

def test_create_recipe_missing_fields(test_client: TestClient, auth_headers):
    # Missing 'name'
    recipe_payload = {
        "serves": 2,
        "ingredients": [],
        "instructions": "Mix and serve",
        "meal_type": "lunch",
    }
    resp = test_client.post("/recipes", json=recipe_payload, headers=auth_headers)
    assert resp.status_code == 422

def test_recipe_unauthorized(test_client: TestClient):
    resp = test_client.get("/recipes")
    assert resp.status_code == 401


def test_recipes_by_availability(test_client: TestClient, auth_headers):
    # 1. Create two ingredients: Tomato (available) and Spinach (unavailable)
    r_tom = test_client.post(
        "/ingredients",
        params={"name": "Tomato", "shelf_life": 5, "serving_unit": "g"},
        headers=auth_headers,
    )
    assert r_tom.status_code == 201
    tom_id = r_tom.json()["id"]

    # Mark Tomato as available
    test_client.put(
        f"/ingredients/{tom_id}",
        params={"available": True},
        headers=auth_headers,
    )

    # Spinach is by default available=False
    r_spin = test_client.post(
        "/ingredients",
        params={"name": "Spinach", "shelf_life": 5, "serving_unit": "g"},
        headers=auth_headers,
    )
    assert r_spin.status_code == 201
    spin_id = r_spin.json()["id"]
    test_client.put(
        f"/ingredients/{spin_id}",
        params={"available": False},
        headers=auth_headers,
    )

    # 2. Create recipe: "Tomato Soup" (only uses Tomato)
    recipe_payload_tom = {
        "name": "Tomato Soup",
        "serves": 2,
        "ingredients": [
            {"name": "Tomato", "quantity": 100, "serving_unit": "g"},
        ],
        "instructions": "Mix Tomato and boil",
        "meal_type": "lunch",
        "is_vegetarian": True,
    }
    resp1 = test_client.post("/recipes", json=recipe_payload_tom, headers=auth_headers)
    assert resp1.status_code == 201

    # 3. Create recipe: "Spinach Salad" (uses Spinach and Tomato)
    recipe_payload_spin = {
        "name": "Spinach Salad",
        "serves": 2,
        "ingredients": [
            {"name": "Tomato", "quantity": 50, "serving_unit": "g"},
            {"name": "Spinach", "quantity": 100, "serving_unit": "g"},
        ],
        "instructions": "Mix Spinach and Tomato",
        "meal_type": "lunch",
        "is_vegetarian": True,
    }
    resp2 = test_client.post("/recipes", json=recipe_payload_spin, headers=auth_headers)
    assert resp2.status_code == 201

    # 4. List recipes: default should return both Tomato Soup and Spinach Salad
    list_all = test_client.get("/recipes", headers=auth_headers)
    assert list_all.status_code == 200
    all_names = [r["name"] for r in list_all.json()]
    assert "Tomato Soup" in all_names
    assert "Spinach Salad" in all_names

    # 5. List recipes with only_available=True: should only return Tomato Soup
    list_avail = test_client.get("/recipes?only_available=true", headers=auth_headers)
    assert list_avail.status_code == 200
    avail_names = [r["name"] for r in list_avail.json()]
    assert "Tomato Soup" in avail_names
    assert "Spinach Salad" not in avail_names





def _login_headers(test_client: TestClient, email: str, password: str):
    resp = test_client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_nutrition_fallback_uses_global_stock_only(test_client: TestClient, auth_headers, db_session):
    # Two users. User B owns ingredients user A's recipes also name; the
    # trigger must fall back to global stock only, never to another user's
    # row (#47). B signs up before A has any ingredients, so the signup
    # starter-pack clone copies nothing.
    b_signup = test_client.post("/auth/signup", json={"email": "b@example.com", "password": "pass1234"})
    assert b_signup.status_code == 201
    b_headers = _login_headers(test_client, "b@example.com", "pass1234")

    # B's "Paprika": 99 g protein per 100 g — must never feed A's recipe.
    resp = test_client.post(
        "/ingredients",
        params={"name": "Paprika", "shelf_life": 5, "serving_unit": "g"},
        headers=b_headers,
    )
    assert resp.status_code == 201
    b_paprika_id = resp.json()["id"]
    resp = test_client.put(f"/ingredients/{b_paprika_id}", params={"protein": "99"}, headers=b_headers)
    assert resp.status_code == 200

    # Global stock "Paprika" (user_id NULL): 5 g protein per 100 g. Inserted
    # directly — the API has no global-ingredient route.
    db_session.add(Ingredient(user_id=None, name="Paprika", shelf_life=5, serving_unit="g", serving_size=100, protein=5))
    db_session.commit()

    # A's recipe row matches the global basis: 5 * 100 / 100 = 5, not 99.
    resp = test_client.post(
        "/recipes",
        json={
            "name": "A Paprika Salad",
            "serves": 1,
            "ingredients": [{"name": "Paprika", "quantity": 100, "serving_unit": "g"}],
            "instructions": "Mix",
            "meal_type": "lunch",
            "is_vegetarian": True,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["protein"] == 5

    # "Nutmeg" exists only in B's pantry (99 g protein per 100 g): no global
    # row, so A's row contributes zero instead of inheriting B's values.
    resp = test_client.post(
        "/ingredients",
        params={"name": "Nutmeg", "shelf_life": 5, "serving_unit": "g"},
        headers=b_headers,
    )
    assert resp.status_code == 201
    b_nutmeg_id = resp.json()["id"]
    resp = test_client.put(f"/ingredients/{b_nutmeg_id}", params={"protein": "99"}, headers=b_headers)
    assert resp.status_code == 200

    resp = test_client.post(
        "/recipes",
        json={
            "name": "A Nutmeg Cake",
            "serves": 1,
            "ingredients": [{"name": "Nutmeg", "quantity": 100, "serving_unit": "g"}],
            "instructions": "Bake",
            "meal_type": "dinner",
            "is_vegetarian": True,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["protein"] == 0
