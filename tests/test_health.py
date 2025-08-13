from fastapi.testclient import TestClient


def test_healthcheck(test_client: TestClient):
    resp = test_client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "OK"}


