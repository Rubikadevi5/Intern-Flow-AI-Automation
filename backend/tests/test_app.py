from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_and_seeded_candidates():
    assert client.get("/api/health").json()["mode"] == "demo"
    response = client.get("/api/candidates")
    assert response.status_code == 200
    assert response.json()["total"] >= 8
    assert {item["candidate_id"] for item in response.json()["items"]}.issuperset({"INT001", "INT008"})


def test_dashboard_is_database_driven():
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    assert response.json()["total_candidates"] >= 8
