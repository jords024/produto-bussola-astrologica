import os
from fastapi.testclient import TestClient
from main import app, seed_admin

client = TestClient(app)


def _get_token():
    seed_admin()
    email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com")
    password = os.getenv("SUPER_ADMIN_PASSWORD", "sirius123")
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["token"]


def test_members_areas_and_podcast_engine_require_auth():
    assert client.get("/members/areas").status_code == 401
    assert client.get("/members/podcast/engine").status_code == 401

    token = _get_token()
    headers = {"Authorization": f"Bearer {token}"}

    res_areas = client.get("/members/areas", headers=headers)
    assert res_areas.status_code == 200
    assert isinstance(res_areas.json(), list)

    res_engine = client.get("/members/podcast/engine", headers=headers)
    assert res_engine.status_code == 200
    assert res_engine.json()["engine"] in ("notebooklm", "openai-tts")
