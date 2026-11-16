import os
import uuid
from datetime import date, datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from main import app, seed_admin
from database import SessionLocal
from models.models import User, GenerationLog, Analise
from routes.auth import hash_password

client = TestClient(app)


def get_admin_token():
    seed_admin()
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com")
    super_admin_pass = os.getenv("SUPER_ADMIN_PASSWORD", "sirius123")
    res = client.post("/auth/login", json={
        "email": super_admin_email,
        "password": super_admin_pass,
    })
    assert res.status_code == 200
    return res.json()["token"]


@pytest.fixture(autouse=True)
def cleanup_financeiro_test_data():
    yield
    db = SessionLocal()
    try:
        from sqlalchemy import text
        db.execute(text("DELETE FROM analises WHERE user_id IN (SELECT id FROM users WHERE email LIKE :p)"), {"p": "%testfin%"})
        db.execute(text("DELETE FROM generation_logs WHERE email LIKE :p"), {"p": "%testfin%"})
        db.execute(text("DELETE FROM users WHERE email LIKE :p"), {"p": "%testfin%"})
        db.commit()
    finally:
        db.close()


def test_financeiro_requires_admin():
    token = get_admin_token()
    email = f"testfin_client_{uuid.uuid4().hex[:6]}@exemplo.com"

    db = SessionLocal()
    try:
        u = User(
            id=str(uuid.uuid4()),
            name="Cliente Sem Acesso",
            email=email,
            password_hash=hash_password("SenhaForte@123"),
            role="client",
            is_active=True,
        )
        db.add(u)
        db.commit()
    finally:
        db.close()

    login_res = client.post("/auth/login", json={"email": email, "password": "SenhaForte@123"})
    assert login_res.status_code == 200
    client_token = login_res.json()["token"]

    res = client.get("/admin/financeiro", headers={"Authorization": f"Bearer {client_token}"})
    assert res.status_code in (401, 403)

    # Admin consegue acessar
    admin_res = client.get("/admin/financeiro", headers={"Authorization": f"Bearer {token}"})
    assert admin_res.status_code == 200
    assert admin_res.json()["exchange_rate"] == 5.60


def test_financeiro_aggregates_maps_and_readings_per_user():
    token = get_admin_token()
    email = f"testfin_user_{uuid.uuid4().hex[:6]}@exemplo.com"

    db = SessionLocal()
    try:
        u = User(
            id=str(uuid.uuid4()),
            name="Usuário Consumo Teste",
            email=email,
            password_hash=hash_password("SenhaForte@123"),
            role="client",
            is_active=True,
        )
        db.add(u)
        db.commit()
        uid = str(u.id)

        # 1 Mapa (GenerationLog)
        log = GenerationLog(
            id=str(uuid.uuid4()),
            name="Usuário Consumo Teste",
            email=email,
            birth_date=date(1995, 5, 10),
            birth_time="10:00",
            birth_city="São Paulo",
            status="success",
            prompt_tokens=1000,
            completion_tokens=2000,
            total_tokens=3000,
            cost_usd=0.05,
        )
        db.add(log)

        # 1 Leitura do Dia (Analise)
        analise = Analise(
            id=str(uuid.uuid4()),
            user_id=uid,
            data_alvo=date.today(),
            sintese="Leitura teste",
            prompt_tokens=500,
            completion_tokens=1500,
            total_tokens=2000,
            cost_usd=0.03,
            status="ok",
        )
        db.add(analise)
        db.commit()
    finally:
        db.close()

    res = client.get(
        f"/admin/financeiro?period=all&search={email}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["exchange_rate"] == 5.60
    assert len(data["users"]) == 1

    user_row = data["users"][0]
    assert user_row["email"] == email
    assert user_row["maps_count"] == 1
    assert user_row["readings_count"] == 1
    assert user_row["total_tokens"] == 5000
    assert user_row["cost_usd"] == pytest.approx(0.08, rel=1e-4)
    assert user_row["cost_brl"] == pytest.approx(0.08 * 5.60, rel=1e-4)

    summary = data["summary"]
    assert summary["total_cost_usd"] == pytest.approx(0.08, rel=1e-4)
    assert summary["total_tokens"] == 5000
    assert summary["maps_count"] == 1
    assert summary["readings_count"] == 1


def test_financeiro_period_filter_and_invalid_period():
    token = get_admin_token()
    res_bad = client.get("/admin/financeiro?period=invalido", headers={"Authorization": f"Bearer {token}"})
    assert res_bad.status_code == 400

    res_today = client.get("/admin/financeiro?period=today", headers={"Authorization": f"Bearer {token}"})
    assert res_today.status_code == 200
    assert res_today.json()["period"] == "today"
