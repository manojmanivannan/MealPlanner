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



