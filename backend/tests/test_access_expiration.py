import os
import uuid
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from main import app, seed_admin
from database import SessionLocal
from models.models import User, UserInvite
from routes.auth import hash_password

client = TestClient(app)


def _get_admin_token():
    seed_admin()
    email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com")
    password = os.getenv("SUPER_ADMIN_PASSWORD", "sirius123")
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["token"]


@pytest.fixture(autouse=True)
def cleanup_access_test_data():
    yield
    db = SessionLocal()
    try:
        from sqlalchemy import text
        db.execute(text("UPDATE user_invites SET used_by_id = NULL, created_by_id = NULL WHERE used_by_id IN (SELECT id FROM users WHERE email LIKE :p) OR created_by_id IN (SELECT id FROM users WHERE email LIKE :p)"), {"p": "%testaccess%"})
        db.execute(text("DELETE FROM user_invites WHERE token LIKE :p"), {"p": "%testaccess%"})
        db.execute(text("DELETE FROM users WHERE email LIKE :p"), {"p": "%testaccess%"})
        db.commit()
    finally:
        db.close()


def test_expired_client_blocked_from_ai_but_keeps_login_and_history():
    email = f"testaccess_exp_{uuid.uuid4().hex[:6]}@exemplo.com"
    db = SessionLocal()
    try:
        u = User(
            id=str(uuid.uuid4()),
            name="Aluno Expirado",
            email=email,
            password_hash=hash_password("SenhaForte@123"),
            role="client",
            is_active=True,
            access_expires_at=datetime.utcnow() - timedelta(days=1),
        )
        db.add(u)
        db.commit()
    finally:
        db.close()

    login_res = client.post("/auth/login", json={"email": email, "password": "SenhaForte@123"})
    assert login_res.status_code == 200
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_res = client.get("/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["access_expired"] is True

    # Histórico continua acessível
    hist_res = client.get("/members/analises", headers=headers)
    assert hist_res.status_code == 200

    # IA bloqueada (403) com orientação para falar com o suporte
    ai_res = client.post("/members/analise", headers=headers, json={"data": "2026-11-17"})
    assert ai_res.status_code == 403
    assert "expirou" in ai_res.json()["detail"].lower()
    assert "suporte" in ai_res.json()["detail"].lower()

    pod_res = client.post("/members/podcast", headers=headers)
    assert pod_res.status_code == 403


def test_admin_never_expires_even_if_access_days_sent():
    admin_token = _get_admin_token()
    email = f"testaccess_adm_{uuid.uuid4().hex[:6]}@exemplo.com"
    res = client.post(
        "/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Admin Sem Expiração",
            "email": email,
            "password": "SenhaForte@123",
            "role": "admin",
            "access_days": 7,
        },
    )
    assert res.status_code == 201
    user_data = res.json()["user"]
    assert user_data["access_expires_at"] is None
    assert user_data["access_expired"] is False


def test_create_and_extend_client_access_via_admin():
    admin_token = _get_admin_token()
    email = f"testaccess_cli_{uuid.uuid4().hex[:6]}@exemplo.com"
    res = client.post(
        "/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Aluno Prazo",
            "email": email,
            "password": "SenhaForte@123",
            "role": "client",
            "access_days": 30,
        },
    )
    assert res.status_code == 201
    uid = res.json()["user"]["id"]
    assert res.json()["user"]["access_expires_at"] is not None
    assert res.json()["user"]["access_expired"] is False

    # Limpar expiração (tornar vitalício)
    upd = client.put(
        f"/admin/users/{uid}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"clear_expiration": True},
    )
    assert upd.status_code == 200
    assert upd.json()["user"]["access_expires_at"] is None


def test_invite_with_access_days_sets_user_expiration():
    admin_token = _get_admin_token()
    inv_res = client.post(
        "/admin/invites",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "client", "validity_type": "24h", "access_days": 15},
    )
    assert inv_res.status_code == 200
    inv_token = inv_res.json()["token"]
    assert inv_res.json()["access_days"] == 15

    email = f"testaccess_inv_{uuid.uuid4().hex[:6]}@exemplo.com"
    reg_res = client.post(
        "/auth/register-with-invite",
        json={
            "token": inv_token,
            "name": "Aluno Convidado",
            "email": email,
            "password": "SenhaForte@123",
        },
    )
    assert reg_res.status_code == 200
    user_jwt = reg_res.json()["token"]

    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {user_jwt}"})
    assert me_res.status_code == 200
    assert me_res.json()["access_expires_at"] is not None
    assert me_res.json()["access_expired"] is False
