from fastapi.testclient import TestClient


def test_add_list_update_delete_ingredient(test_client: TestClient, auth_headers):
    # Initially empty
    resp = test_client.get("/ingredients", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []

    # Add
    resp = test_client.post(
        "/ingredients",
        params={"name": "Tomato", "shelf_life": 5, "serving_unit": "g"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    ing = resp.json()

    # List
    resp = test_client.get("/ingredients", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "Tomato"

    # Update availability
    resp = test_client.put(f"/ingredients/{ing['id']}", params={"available": True}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["available"] is True

    # Delete
    resp = test_client.delete(f"/ingredients/{ing['id']}", headers=auth_headers)
    assert resp.status_code == 204


def test_add_existing_ingredient(test_client: TestClient, auth_headers):
    # Add an ingredient
    test_client.post(
        "/ingredients",
        params={"name": "Onion", "shelf_life": 10, "serving_unit": "g"},
        headers=auth_headers,
    )
    # Try to add it again
    resp = test_client.post(
        "/ingredients",
        params={"name": "Onion", "shelf_life": 10, "serving_unit": "g"},
        headers=auth_headers,
    )
    assert resp.status_code == 409  # Bad Request or Conflict

def test_update_non_existent_ingredient(test_client: TestClient, auth_headers):
    resp = test_client.put("/ingredients/9999", params={"available": True}, headers=auth_headers)
    assert resp.status_code == 404

def test_delete_non_existent_ingredient(test_client: TestClient, auth_headers):
    resp = test_client.delete("/ingredients/9999", headers=auth_headers)
    assert resp.status_code == 404



def test_get_ingredient_unauthorized(test_client: TestClient):
    resp = test_client.get("/ingredients")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Recipe sync on ingredient update (name / serving_unit / serving_size)
# ---------------------------------------------------------------------------

def _create_ingredient(client, headers, name, serving_unit, serving_size=None):
    params = {"name": name, "shelf_life": 5, "serving_unit": serving_unit}
    if serving_size is not None:
        params["serving_size"] = serving_size
    resp = client.post("/ingredients", params=params, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _create_recipe(client, headers, name, ingredients):
    payload = {
        "name": name,
        "serves": 2,
        "ingredients": ingredients,
        "instructions": "mix and cook",
        "meal_type": "lunch",
        "is_vegetarian": True,
    }
    resp = client.post("/recipes", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _get_recipe_rows(client, headers, recipe_id):
    resp = client.get(f"/recipes/{recipe_id}", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()["ingredients"]


def test_rename_updates_recipe_rows_and_preserves_quantity(test_client, auth_headers):
    ing = _create_ingredient(test_client, auth_headers, "Almonds", "g")
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Almond Mix",
        [{"name": "almonds", "quantity": 80, "serving_unit": "g"}],  # lowercase name on purpose
    )

    resp = test_client.put(f"/ingredients/{ing['id']}", params={"name": "Almond Flakes"}, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["name"] == "Almond Flakes"

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows == [{"name": "Almond Flakes", "quantity": 80, "serving_unit": "g"}]


def test_unit_change_volume_to_volume_converts_exactly(test_client, auth_headers):
    ing = _create_ingredient(test_client, auth_headers, "Olive Oil", "tbsp")
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Dressing",
        [{"name": "Olive Oil", "quantity": 2, "serving_unit": "tbsp"}],
    )

    resp = test_client.put(f"/ingredients/{ing['id']}", params={"serving_unit": "ml"}, headers=auth_headers)
    assert resp.status_code == 200, resp.text

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows[0]["serving_unit"] == "ml"
    assert rows[0]["quantity"] == 30  # 2 tbsp = 30 ml, exact


def test_unit_change_to_nos_does_not_rescale_quantity(test_client, auth_headers):
    ing = _create_ingredient(test_client, auth_headers, "Almonds", "g")
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Almond Mix",
        [{"name": "Almonds", "quantity": 80, "serving_unit": "g"}],
    )

    resp = test_client.put(f"/ingredients/{ing['id']}", params={"serving_unit": "nos"}, headers=auth_headers)
    assert resp.status_code == 200, resp.text

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    # No generic g -> nos conversion exists: unit is updated, quantity is NOT
    # multiplied by a blind factor (the old code scaled it x0.01 or x100).
    assert rows[0]["quantity"] == 80
    assert rows[0]["serving_unit"] == "nos"


def test_serving_size_change_does_not_touch_recipes(test_client, auth_headers):
    ing = _create_ingredient(test_client, auth_headers, "Sugar", "g", serving_size=100)
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Cake",
        [{"name": "Sugar", "quantity": 50, "serving_unit": "g"}],
    )

    resp = test_client.put(f"/ingredients/{ing['id']}", params={"serving_size": 250}, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["serving_size"] == 250

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows == [{"name": "Sugar", "quantity": 50, "serving_unit": "g"}]


def test_noop_resave_does_not_rescale_recipe_quantities(test_client, auth_headers):
    # The edit UI re-sends the current name/unit on every save; a no-op save
    # must leave recipe quantities untouched (old code multiplied x100 here).
    ing = _create_ingredient(test_client, auth_headers, "Honey", "g")
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Granola",
        [{"name": "Honey", "quantity": 30, "serving_unit": "g"}],
    )

    resp = test_client.put(
        f"/ingredients/{ing['id']}",
        params={"name": "Honey", "serving_unit": "g", "serving_size": 100},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows == [{"name": "Honey", "quantity": 30, "serving_unit": "g"}]


def test_rename_and_unit_change_together(test_client, auth_headers):
    ing = _create_ingredient(test_client, auth_headers, "Wheat Flour", "cup")
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Bread",
        [{"name": "Wheat Flour", "quantity": 1, "serving_unit": "cup"}],
    )

    resp = test_client.put(
        f"/ingredients/{ing['id']}",
        params={"name": "Whole Wheat Flour", "serving_unit": "tbsp"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows[0]["name"] == "Whole Wheat Flour"
    assert rows[0]["serving_unit"] == "tbsp"
    assert rows[0]["quantity"] == 16  # 1 cup = 16 tbsp, exact


def test_automatic_ingredient_expiration(test_client: TestClient, auth_headers, db_session):
    import datetime
    from models import Ingredient

    # 1. Add ingredient
    resp = test_client.post(
        "/ingredients",
        params={"name": "Lettuce", "shelf_life": 2, "serving_unit": "g"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    ing = resp.json()
    ing_id = ing["id"]

    # 2. Update to available (this sets last_available to utcnow)
    resp = test_client.put(
        f"/ingredients/{ing_id}",
        params={"available": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["available"] is True

    # 3. Modify last_available in database to be 3 days in the past (expired)
    db_ing = db_session.query(Ingredient).filter(Ingredient.id == ing_id).first()
    assert db_ing is not None
    # We use timezone-aware or naive based on how it's defined. Let's make sure it works with database.
    # Postgres uses TIMESTAMP (without tz) or TIMESTAMPTZ. 
    # Let's set db_ing.last_available to a naive datetime since database column is TIMESTAMP.
    db_ing.last_available = datetime.datetime.utcnow() - datetime.timedelta(days=3)
    db_session.commit()

    # 4. Access endpoint (which triggers get_current_user and thus our expiration logic)
    resp = test_client.get("/ingredients", headers=auth_headers)
    assert resp.status_code == 200

    # 5. Check response to verify it's marked unavailable
    ingredients = resp.json()
    lettuce = next(i for i in ingredients if i["id"] == ing_id)
    assert lettuce["available"] is False



