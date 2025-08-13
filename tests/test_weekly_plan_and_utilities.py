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


