import os
import sys
import uuid
from datetime import date
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app, seed_admin  # noqa: E402
from database import SessionLocal  # noqa: E402
from models.models import User  # noqa: E402
from routes.auth import hash_password  # noqa: E402

client = TestClient(app)


def _get_admin_token() -> str:
    seed_admin()
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com")
    super_admin_pass = os.getenv("SUPER_ADMIN_PASSWORD", "sirius123")
    res = client.post("/auth/login", json={"email": super_admin_email, "password": super_admin_pass})
    assert res.status_code == 200
    return res.json()["token"]


def _create_client_user(allow_multiple: bool = False, max_extra=None):
    db = SessionLocal()
    email = f"multi_prof_{uuid.uuid4().hex[:6]}@exemplo.com"
    uid = str(uuid.uuid4())
    try:
        u = User(
            id=uid,
            name="Aluno Multi",
            email=email,
            password_hash=hash_password("SenhaForte@123"),
            role="client",
            is_active=True,
            allow_multiple_profiles=allow_multiple,
            max_extra_profiles=max_extra,
            birth_date=date(1995, 5, 10),
            lat=-23.55,
            lng=-46.63,
            birth_city="São Paulo",
        )
        db.add(u)
        db.commit()
    finally:
        db.close()
    login_res = client.post("/auth/login", json={"email": email, "password": "SenhaForte@123"})
    assert login_res.status_code == 200
    token = login_res.json()["token"]
    return uid, email, token


def test_admin_has_unlimited_multiple_profiles_by_default():
    token = _get_admin_token()
    res = client.get("/members/profiles", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["allow_multiple_profiles"] is True
    assert data["max_extra_profiles"] is None


def test_multiple_profiles_disabled_by_default_and_configurable_limit():
    admin_token = _get_admin_token()
    uid, _, client_token = _create_client_user(allow_multiple=False)

    # Por padrão vem desativado
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {client_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["allow_multiple_profiles"] is False

    # Tentar cadastrar sem permissão -> 403
    payload = {
        "name": "Filho Teste",
        "relationship_label": "Filho",
        "birth_date": "2015-03-10",
        "birth_time": "10:00",
        "birth_city": "Curitiba",
        "lat": -25.4284,
        "lng": -49.2733,
    }
    res_forbidden = client.post(
        "/members/profiles",
        json=payload,
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert res_forbidden.status_code == 403

    # Admin libera com limite = 1
    res_upd = client.put(
        f"/admin/users/{uid}",
        json={"allow_multiple_profiles": True, "max_extra_profiles": 1},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_upd.status_code == 200
    assert res_upd.json()["user"]["allow_multiple_profiles"] is True
    assert res_upd.json()["user"]["max_extra_profiles"] == 1

    mock_sections = (
        {"portal": "Texto portal", "essencia": "Texto essência"},
        {"model": "gpt-4o", "prompt_tokens": 100, "completion_tokens": 200, "total_tokens": 300, "cost_usd": 0.01, "cost_brl": 0.056},
    )
    with patch("routes.profiles.generate_sections", new=AsyncMock(return_value=mock_sections)):
        res_1 = client.post(
            "/members/profiles",
            json=payload,
            headers={"Authorization": f"Bearer {client_token}"},
        )
        assert res_1.status_code == 201
        assert res_1.json()["profile"]["name"] == "Filho Teste"
        assert res_1.json()["profile"]["has_chart"] is True
        assert res_1.json()["profile"]["has_sections"] is True

        # 2ª tentativa deve bater no limite 1 -> 403
        res_2 = client.post(
            "/members/profiles",
            json={**payload, "name": "Esposa Teste"},
            headers={"Authorization": f"Bearer {client_token}"},
        )
        assert res_2.status_code == 403

        # Admin muda para ilimitado
        res_unlim = client.put(
            f"/admin/users/{uid}",
            json={"allow_multiple_profiles": True, "unlimited_extra_profiles": True},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_unlim.status_code == 200
        assert res_unlim.json()["user"]["max_extra_profiles"] is None

        res_3 = client.post(
            "/members/profiles",
            json={**payload, "name": "Esposa Teste"},
            headers={"Authorization": f"Bearer {client_token}"},
        )
        assert res_3.status_code == 201


def test_multiple_profiles_chart_sections_and_analise_selection():
    _, _, client_token = _create_client_user(allow_multiple=True, max_extra=5)
    payload = {
        "name": "Maria Extra",
        "relationship_label": "Esposa",
        "birth_date": "1992-07-20",
        "birth_time": "14:30",
        "birth_city": "Fortaleza",
        "lat": -3.7319,
        "lng": -38.5267,
    }
    mock_sections = (
        {"portal": "Portal Maria", "essencia": "Essência Maria"},
        {"model": "gpt-4o", "prompt_tokens": 50, "completion_tokens": 100, "total_tokens": 150, "cost_usd": 0.005, "cost_brl": 0.028},
    )
    with patch("routes.profiles.generate_sections", new=AsyncMock(return_value=mock_sections)):
        res_create = client.post(
            "/members/profiles",
            json=payload,
            headers={"Authorization": f"Bearer {client_token}"},
        )
    assert res_create.status_code == 201
    profile_id = res_create.json()["profile"]["id"]

    # Buscar chart & sections do perfil extra
    res_chart = client.get(
        f"/members/chart?profile_id={profile_id}",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert res_chart.status_code == 200
    assert res_chart.json()["profile_name"] == "Maria Extra"
    assert res_chart.json()["svg"]

    res_secs = client.get(
        f"/members/sections?profile_id={profile_id}",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert res_secs.status_code == 200
    assert any(s["section_key"] == "portal" for s in res_secs.json())

    res_sec_one = client.get(
        f"/members/sections/portal?profile_id={profile_id}",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert res_sec_one.status_code == 200
    assert res_sec_one.json()["content"] == "Portal Maria"

    # Gerar leitura do dia para o perfil extra
    with patch(
        "services.analise_service.generate_transit_synthesis",
        new=AsyncMock(return_value=("Síntese para Maria", {}, {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30, "cost_usd": 0.001})),
    ):
        res_analise = client.post(
            "/members/analise",
            json={"data": date.today().isoformat(), "profile_id": profile_id, "area": "carreira"},
            headers={"Authorization": f"Bearer {client_token}"},
        )
    assert res_analise.status_code == 200
    assert res_analise.json()["profile_id"] == profile_id
    assert res_analise.json()["profile_name"] == "Maria Extra"

    # Excluir perfil preserva análise no histórico
    res_del = client.delete(
        f"/members/profiles/{profile_id}",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert res_del.status_code == 200

    res_hist = client.get("/members/analises", headers={"Authorization": f"Bearer {client_token}"})
    assert res_hist.status_code == 200
    assert any(item.get("profile_name") == "Maria Extra" for item in res_hist.json())
