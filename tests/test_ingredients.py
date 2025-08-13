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


