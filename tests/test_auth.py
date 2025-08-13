from fastapi.testclient import TestClient


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


