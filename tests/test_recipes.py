from fastapi.testclient import TestClient


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


