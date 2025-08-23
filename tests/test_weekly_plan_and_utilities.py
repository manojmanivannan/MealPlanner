from fastapi.testclient import TestClient


def test_weekly_plan_and_nutrition(test_client: TestClient, auth_headers):
    # Create two recipes
    test_client.post(
        "/ingredients",
        params={"name": "Tomato", "shelf_life": 5, "serving_unit": "g"},
        headers=auth_headers,
    )
    r1 = test_client.post(
        "/recipes",
        json={
            "name": "Tomato Salad",
            "serves": 2,
            "ingredients": [{"name": "Tomato", "quantity": 100, "serving_unit": "g"}],
            "instructions": "Mix",
            "meal_type": "lunch",
            "is_vegetarian": True,
        },
        headers=auth_headers,
    ).json()

    r2 = test_client.post(
        "/recipes",
        json={
            "name": "Tomato Soup",
            "serves": 2,
            "ingredients": [{"name": "Tomato", "quantity": 150, "serving_unit": "g"}],
            "instructions": "Boil",
            "meal_type": "dinner",
            "is_vegetarian": True,
        },
        headers=auth_headers,
    ).json()

    # Set weekly plan slots
    resp = test_client.put(
        "/weekly-plan",
        json={"day": "Monday", "meal_type": "lunch", "recipe_ids": [r1["id"]]},
        headers=auth_headers,
    )
    assert resp.status_code == 201

    resp = test_client.put(
        "/weekly-plan",
        json={"day": "Monday", "meal_type": "dinner", "recipe_ids": [r2["id"]]},
        headers=auth_headers,
    )
    assert resp.status_code == 201

    # Fetch plan
    plan = test_client.get("/weekly-plan", headers=auth_headers).json()
    assert plan["Monday"]["lunch"] == [r1["id"]]
    assert plan["Monday"]["dinner"] == [r2["id"]]

    # Utilities endpoints
    units = test_client.get("/utilities/list-serving-units", headers=auth_headers)
    assert units.status_code == 200
    assert "g" in units.json()

    nutrition = test_client.get("/utilities/nutrition/Monday", headers=auth_headers)
    assert nutrition.status_code == 200
    # Values depend on ingredients table nutrition; ensure keys exist
    body = nutrition.json()
    for k in ["protein", "carbs", "fat", "fiber", "energy"]:
        assert k in body


def test_set_plan_with_non_existent_recipe(test_client: TestClient, auth_headers):
    resp = test_client.put(
        "/weekly-plan",
        json={"day": "Tuesday", "meal_type": "lunch", "recipe_ids": [9999]},
        headers=auth_headers,
    )
    assert resp.status_code == 400

def test_clear_plan_for_day_meal_type(test_client: TestClient, auth_headers):
    # First, set a plan
    r1 = test_client.post(
        "/recipes",
        json={
            "name": "A Recipe", "serves": 1, "ingredients": [], "instructions": "...", "meal_type": "lunch", "is_vegetarian": False
        },
        headers=auth_headers,
    ).json()
    test_client.put(
        "/weekly-plan",
        json={"day": "Wednesday", "meal_type": "lunch", "recipe_ids": [r1["id"]]},
        headers=auth_headers,
    )

    # Now, clear it
    resp = test_client.put(
        "/weekly-plan",
        json={"day": "Wednesday", "meal_type": "lunch", "recipe_ids": []},
        headers=auth_headers,
    )
    assert resp.status_code == 201

    plan = test_client.get("/weekly-plan", headers=auth_headers).json()
    assert plan["Wednesday"]["lunch"] == []

def test_get_empty_weekly_plan(test_client: TestClient, auth_headers):
    plan = test_client.get("/weekly-plan", headers=auth_headers).json()
    for day in plan.values():
        for meal in day.values():
            assert meal == []

def test_get_nutrition_for_day_with_no_meals(test_client: TestClient, auth_headers):
    nutrition = test_client.get("/utilities/nutrition/Friday", headers=auth_headers).json()
    for k in ["protein", "carbs", "fat", "fiber", "energy"]:
        assert nutrition[k] == 0

def test_get_shopping_list(test_client: TestClient, auth_headers):
    # Add ingredients and mark them as unavailable
    carrot = test_client.post("/ingredients", params={"name": "Carrot", "serving_unit": "g", "shelf_life": 7}, headers=auth_headers).json()
    test_client.put(f"/ingredients/{carrot['id']}", params={"available": False}, headers=auth_headers)
    potato = test_client.post("/ingredients", params={"name": "Potato", "serving_unit": "g", "shelf_life": 14}, headers=auth_headers).json()
    test_client.put(f"/ingredients/{potato['id']}", params={"available": False}, headers=auth_headers)

    # Create a recipe
    r1 = test_client.post(
        "/recipes",
        json={
            "name": "Veggie Stew", "serves": 2, "meal_type": "dinner",
            "ingredients": [
                {"name": "Carrot", "quantity": 100, "serving_unit": "g"},
                {"name": "Potato", "quantity": 200, "serving_unit": "g"},
            ],
            "instructions": "...",
            "is_vegetarian": True,
        },
        headers=auth_headers,
    ).json()

    # Add to weekly plan
    test_client.put(
        "/weekly-plan",
        json={"day": "Thursday", "meal_type": "dinner", "recipe_ids": [r1["id"]]},
        headers=auth_headers,
    )

    # Get shopping list
    shopping_list = test_client.get("/utilities/shopping-list", headers=auth_headers).json()
    assert "carrot" in shopping_list
    assert shopping_list["carrot"]["quantity"] == 100
    assert "potato" in shopping_list
    assert shopping_list["potato"]["quantity"] == 200

def test_plan_and_utilities_unauthorized(test_client: TestClient):
    resp = test_client.get("/weekly-plan")
    assert resp.status_code == 401
    resp = test_client.get("/utilities/nutrition/Monday")
    assert resp.status_code == 401
    resp = test_client.get("/utilities/shopping-list")
    assert resp.status_code == 401


