import os
import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from main import app, seed_admin
import pytest

from database import SessionLocal
from models.models import User, UserInvite

client = TestClient(app)


def get_admin_token():
    seed_admin()
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com")
    super_admin_pass = os.getenv("SUPER_ADMIN_PASSWORD", "sirius123")
    res = client.post("/auth/login", json={
        "email": super_admin_email,
        "password": super_admin_pass
    })
    assert res.status_code == 200
    return res.json()["token"]


@pytest.fixture(autouse=True)
def cleanup_test_data():
    yield
    db = SessionLocal()
    try:
        from sqlalchemy import text
        db.execute(text("UPDATE user_invites SET used_by_id = NULL WHERE used_by_id IN (SELECT id FROM users WHERE email LIKE :p)"), {"p": "%testinvite%"})
        db.execute(text("DELETE FROM user_invites WHERE created_by_id IN (SELECT id FROM users WHERE email LIKE :p)"), {"p": "%testinvite%"})
        db.execute(text("DELETE FROM users WHERE email LIKE :p"), {"p": "%testinvite%"})
        db.execute(text("DELETE FROM user_invites WHERE token LIKE :p2"), {"p2": "test-%"})
        db.commit()
    finally:
        db.close()


def test_create_invite_aluno_never_expires():
    token = get_admin_token()
    res = client.post(
        "/admin/invites",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "client", "validity_type": "never"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["role"] == "client"
    assert data["role_label"] == "Aluno"
    assert data["validity_type"] == "never"
    assert data["expires_at"] is None
    assert "/cadastro?token=" in data["invite_path"]


def test_create_invite_admin_with_24h_validity():
    token = get_admin_token()
    res = client.post(
        "/admin/invites",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "admin", "validity_type": "24h"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["role"] == "admin"
    assert data["role_label"] == "Administrador"
    assert data["validity_type"] == "24h"
    assert data["expires_at"] is not None


def test_list_invites():
    token = get_admin_token()
    # Cria um convite primeiro
    client.post(
        "/admin/invites",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "client", "validity_type": "48h"},
    )

    res = client.get(
        "/admin/invites",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1
    assert any(inv["validity_type"] == "48h" for inv in data["items"])


def test_validate_and_register_with_invite():
    token = get_admin_token()
    # 1. Gerar convite
    invite_res = client.post(
        "/admin/invites",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "client", "validity_type": "72h"},
    )
    assert invite_res.status_code == 200
    invite_token = invite_res.json()["token"]

    # 2. Validar token público
    val_res = client.get(f"/auth/invite/{invite_token}")
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["valid"] is True
    assert val_data["role"] == "client"
    assert val_data["role_label"] == "Aluno"

    # 3. Registrar novo usuário usando o convite
    unique_email = f"testinvite_{uuid.uuid4().hex[:8]}@example.com"
    reg_res = client.post(
        "/auth/register-with-invite",
        json={
            "token": invite_token,
            "name": "Aluno Convidado Teste",
            "email": unique_email,
            "password": "Sirius@2026Strong",
            "whatsapp": "11988887777",
        }
    )
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert "token" in reg_data
    assert reg_data["role"] == "client"
    assert reg_data["email"] == unique_email

    # 4. Tentar registrar novamente com o mesmo convite deve falhar
    dup_res = client.post(
        "/auth/register-with-invite",
        json={
            "token": invite_token,
            "name": "Outro Aluno",
            "email": f"outro_{unique_email}",
            "password": "Sirius@2026Strong",
        }
    )
    assert dup_res.status_code == 400
    assert "já foi utilizado" in dup_res.json()["detail"]


def test_validate_expired_invite_fails():
    db = SessionLocal()
    expired_token = f"test-expired-{uuid.uuid4().hex}"
    invite = UserInvite(
        token=expired_token,
        role="client",
        validity_type="24h",
        expires_at=datetime.utcnow() - timedelta(hours=5),
        created_at=datetime.utcnow() - timedelta(hours=29),
        is_used=False,
    )
    db.add(invite)
    db.commit()
    db.close()

    # Validação pública deve falhar com 400
    val_res = client.get(f"/auth/invite/{expired_token}")
    assert val_res.status_code == 400
    assert "expirou" in val_res.json()["detail"]

    # Tentativa de cadastro deve falhar com 400
    reg_res = client.post(
        "/auth/register-with-invite",
        json={
            "token": expired_token,
            "name": "Aluno Expirado",
            "email": f"testinvite_exp_{uuid.uuid4().hex[:6]}@example.com",
            "password": "Sirius@2026Strong",
        }
    )
    assert reg_res.status_code == 400
    assert "expirou" in reg_res.json()["detail"]

def test_non_admin_cannot_create_invites():
    res = client.post(
        "/admin/invites",
        json={"role": "admin", "validity_type": "never"},
    )
    assert res.status_code in (401, 403)


def test_batch_delete_invites():
    token = get_admin_token()
    # Cria dois convites
    r1 = client.post(
        "/admin/invites",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "client", "validity_type": "24h"},
    )
    r2 = client.post(
        "/admin/invites",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "admin", "validity_type": "48h"},
    )
    assert r1.status_code == 200
    assert r2.status_code == 200
    inv1_id = r1.json()["id"]
    inv2_id = r2.json()["id"]

    # Deleta em lote
    del_res = client.request(
        "DELETE",
        "/admin/invites/batch",
        headers={"Authorization": f"Bearer {token}"},
        json={"ids": [inv1_id, inv2_id]},
    )
    assert del_res.status_code == 200
    data = del_res.json()
    assert data["success"] is True
    assert data["deleted_count"] == 2

    # Verifica que não estão mais na listagem
    db = SessionLocal()
    try:
        invites = db.query(UserInvite).filter(UserInvite.id.in_([inv1_id, inv2_id])).all()
        assert len(invites) == 0
    finally:
        db.close()


def test_batch_delete_invites_empty_rejected():
    token = get_admin_token()
    del_res = client.request(
        "DELETE",
        "/admin/invites/batch",
        headers={"Authorization": f"Bearer {token}"},
        json={"ids": []},
    )
    assert del_res.status_code == 400


def test_weak_password_rejected_on_registration():
    admin_token = get_admin_token()
    invite_res = client.post(
        "/admin/invites",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "client", "validity_type": "24h"},
    )
    invite_token = invite_res.json()["token"]

    weak_passwords = [
        "curta123",             # menos de 12 caracteres
        "senhasemnumeroemaiuscula!", # sem maiúscula e sem número
        "SENHASEMMINUSCULA123!", # sem minúscula
        "SenhaSemNumeroNemSimbolo", # sem número e sem caractere especial
        "SenhaSemSimbolo123456", # sem caractere especial
    ]

    for wp in weak_passwords:
        res = client.post(
            "/auth/request-register-code",
            json={
                "token": invite_token,
                "name": "Teste Senha Fraca",
                "email": f"teste_{uuid.uuid4().hex[:6]}@example.com",
                "password": wp,
            }
        )
        assert res.status_code == 400
        assert "A senha deve conter" in res.json()["detail"]


def test_full_brevo_otp_verification_flow():
    from models.models import RegistrationVerification

    admin_token = get_admin_token()
    invite_res = client.post(
        "/admin/invites",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "client", "validity_type": "24h"},
    )
    invite_token = invite_res.json()["token"]
    user_email = f"testotp_{uuid.uuid4().hex[:8]}@example.com"

    # 1. Solicitar código de verificação
    req_res = client.post(
        "/auth/request-register-code",
        json={
            "token": invite_token,
            "name": "Aluno Verificado Brevo",
            "email": user_email,
            "password": "Sirius@2026StrongPassword",
            "whatsapp": "11977776666",
        }
    )
    assert req_res.status_code == 200
    assert req_res.json()["success"] is True

    # Usuário AINDA NÃO deve existir na tabela users
    db = SessionLocal()
    try:
        assert db.query(User).filter(User.email == user_email).first() is None

        # O código de verificação deve estar salvo no banco
        verif = db.query(RegistrationVerification).filter(RegistrationVerification.email == user_email).first()
        assert verif is not None
        saved_code = verif.code
        assert len(saved_code) == 6
    finally:
        db.close()

    # 2. Tentar validar com código errado
    wrong_res = client.post(
        "/auth/verify-register-code",
        json={
            "token": invite_token,
            "email": user_email,
            "code": "000000",
        }
    )
    assert wrong_res.status_code == 400
    assert "incorreto" in wrong_res.json()["detail"]

    # 3. Validar com o código correto
    correct_res = client.post(
        "/auth/verify-register-code",
        json={
            "token": invite_token,
            "email": user_email,
            "code": saved_code,
        }
    )
    assert correct_res.status_code == 200
    data = correct_res.json()
    assert data["success"] is True
    assert "token" in data
    assert data["email"] == user_email

    # Usuário AGORA deve existir e o convite deve estar marcado como utilizado
    db = SessionLocal()
    try:
        created_user = db.query(User).filter(User.email == user_email).first()
        assert created_user is not None
        assert created_user.name == "Aluno Verificado Brevo"

        invite = db.query(UserInvite).filter(UserInvite.token == invite_token).first()
        assert invite.is_used is True
        assert invite.used_by_id == created_user.id
    finally:
        db.close()


def test_resend_verification_code_flow():
    from models.models import RegistrationVerification

    admin_token = get_admin_token()
    invite_res = client.post(
        "/admin/invites",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "client", "validity_type": "24h"},
    )
    invite_token = invite_res.json()["token"]
    user_email = f"testresend_{uuid.uuid4().hex[:8]}@example.com"

    # Solicita primeiro código
    client.post(
        "/auth/request-register-code",
        json={
            "token": invite_token,
            "name": "Aluno Reenvio",
            "email": user_email,
            "password": "Sirius@2026StrongPassword",
        }
    )

    # Reenvia código
    resend_res = client.post(
        "/auth/resend-register-code",
        json={
            "token": invite_token,
            "email": user_email,
        }
    )
    assert resend_res.status_code == 200
    assert resend_res.json()["success"] is True

    # Pega novo código e valida
    db = SessionLocal()
    try:
        verif = db.query(RegistrationVerification).filter(RegistrationVerification.email == user_email).first()
        assert verif is not None
        new_code = verif.code
    finally:
        db.close()

    verify_res = client.post(
        "/auth/verify-register-code",
        json={
            "token": invite_token,
            "email": user_email,
            "code": new_code,
        }
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["success"] is True


def test_verify_register_link_flow():
    from unittest.mock import patch
    token = get_admin_token()
    res_inv = client.post(
        "/admin/invites",
        json={"role": "client", "validity_type": "24h"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_inv.status_code == 200
    invite_token = res_inv.json()["token"]

    user_email = f"link_verify_{uuid.uuid4().hex[:8]}@sirius.com"
    captured_urls = []

    def _fake_send_link(to_email: str, name: str, confirm_url: str) -> bool:
        captured_urls.append(confirm_url)
        return True

    with patch("routes.invites.send_brevo_verification_link", side_effect=_fake_send_link):
        req_res = client.post(
            "/auth/request-register-code",
            json={
                "token": invite_token,
                "name": "Aluno Botão Email",
                "email": user_email,
                "password": "Sirius@2026StrongPassword",
            },
        )
    assert req_res.status_code == 200
    assert len(captured_urls) == 1
    assert "/cadastro/confirmar?token=" in captured_urls[0]

    verif_token = captured_urls[0].split("token=")[1]
    verify_res = client.post("/auth/verify-register-link", json={"token": verif_token})
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["success"] is True
    assert data["email"] == user_email
    assert data["token"]


def test_invite_with_allow_multiple_profiles_via_api_key(monkeypatch):
    seed_admin()
    monkeypatch.setenv("EXTERNAL_API_KEY", "test_multi_profile_api_key")
    headers = {"X-API-Key": "test_multi_profile_api_key"}

    res_inv = client.post(
        "/admin/invites",
        headers=headers,
        json={
            "role": "client",
            "validity_type": "never",
            "allow_multiple_profiles": True,
            "max_extra_profiles": 5,
        },
    )
    assert res_inv.status_code == 200
    inv = res_inv.json()
    assert inv["allow_multiple_profiles"] is True
    assert inv["max_extra_profiles"] == 5

    # Cadastro via convite deve herdar allow_multiple_profiles e max_extra_profiles
    email = f"multi_inv_{uuid.uuid4().hex[:8]}@example.com"
    res_reg = client.post(
        "/auth/register-with-invite",
        json={
            "token": inv["token"],
            "name": "Aluno Multi Perfil",
            "email": email,
            "password": "Sirius@2026StrongPassword",
        },
    )
    assert res_reg.status_code == 200

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        assert user is not None
        assert user.allow_multiple_profiles is True
        assert user.max_extra_profiles == 5
    finally:
        if user:
            db.query(UserInvite).filter(UserInvite.used_by_id == user.id).update(
                {"used_by_id": None}, synchronize_session=False
            )
            db.delete(user)
            db.commit()
        db.close()


def test_get_invite_status_by_token_active_used_and_404(monkeypatch):
    seed_admin()
    monkeypatch.setenv("EXTERNAL_API_KEY", "test_get_invite_key_123")
    headers = {"X-API-Key": "test_get_invite_key_123"}

    # Token inexistente -> 404
    res_404 = client.get("/admin/invites/token_inexistente_xyz", headers=headers)
    assert res_404.status_code == 404

    res_inv = client.post(
        "/admin/invites",
        headers=headers,
        json={
            "role": "client",
            "validity_type": "never",
            "access_days": 90,
            "request_limit_mode": "quota_then_daily",
            "max_total_requests": 100,
            "daily_request_limit": 3,
            "allow_multiple_profiles": True,
            "max_extra_profiles": 4,
        },
    )
    assert res_inv.status_code == 200
    token = res_inv.json()["token"]

    # Consulta convite ativo
    res_get_active = client.get(f"/admin/invites/{token}", headers=headers)
    assert res_get_active.status_code == 200
    d1 = res_get_active.json()
    assert d1["token"] == token
    assert d1["status"] == "active"
    assert d1["is_used"] is False
    assert d1["used_by_id"] is None
    assert d1["allow_multiple_profiles"] is True
    assert d1["max_extra_profiles"] == 4
    assert d1["access_days"] == 90
    assert d1["request_limit_mode"] == "quota_then_daily"
    assert d1["max_total_requests"] == 100
    assert d1["daily_request_limit"] == 3
    assert token in d1["invite_url"]

    # Aluno se cadastra -> status deve virar "used" com used_by_id preenchido
    email = f"get_inv_{uuid.uuid4().hex[:8]}@example.com"
    res_reg = client.post(
        "/auth/register-with-invite",
        json={
            "token": token,
            "name": "Aluno Status Convite",
            "email": email,
            "password": "Sirius@2026StrongPassword",
        },
    )
    assert res_reg.status_code == 200

    res_get_used = client.get(f"/admin/invites/{token}", headers=headers)
    assert res_get_used.status_code == 200
    d2 = res_get_used.json()
    assert d2["status"] == "used"
    assert d2["is_used"] is True
    assert d2["used_at"] is not None
    assert d2["used_by_id"] is not None

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            db.query(UserInvite).filter(UserInvite.used_by_id == user.id).update(
                {"used_by_id": None}, synchronize_session=False
            )
            db.delete(user)
            db.commit()
    finally:
        db.close()


def test_patch_unused_invite_updates_invite_and_applies_on_register(monkeypatch):
    seed_admin()
    monkeypatch.setenv("EXTERNAL_API_KEY", "test_patch_unused_key_123")
    headers = {"X-API-Key": "test_patch_unused_key_123"}

    res_inv = client.post(
        "/admin/invites",
        headers=headers,
        json={
            "role": "client",
            "validity_type": "never",
            "access_days": 30,
            "max_total_requests": 100,
            "daily_request_limit": 3,
        },
    )
    assert res_inv.status_code == 200
    token = res_inv.json()["token"]

    res_patch = client.patch(
        f"/admin/invites/{token}",
        headers=headers,
        json={
            "allow_multiple_profiles": True,
            "max_extra_profiles": 5,
            "access_days": 365,
            "request_limit_mode": "quota_then_daily",
            "max_total_requests": 300,
            "daily_request_limit": 5,
        },
    )
    assert res_patch.status_code == 200
    patched = res_patch.json()
    assert patched["applied_to"] == "invite"
    assert patched["is_used"] is False
    assert patched["allow_multiple_profiles"] is True
    assert patched["max_extra_profiles"] == 5
    assert patched["access_days"] == 365
    assert patched["request_limit_mode"] == "quota_then_daily"
    assert patched["max_total_requests"] == 300
    assert patched["daily_request_limit"] == 5

    # Ao cadastrar pelo mesmo link, usuário herda todas as permissões atualizadas
    email = f"patch_unused_{uuid.uuid4().hex[:8]}@example.com"
    res_reg = client.post(
        "/auth/register-with-invite",
        json={
            "token": token,
            "name": "Aluno Order Bump Antes",
            "email": email,
            "password": "Sirius@2026StrongPassword",
        },
    )
    assert res_reg.status_code == 200

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        assert user is not None
        assert user.allow_multiple_profiles is True
        assert user.max_extra_profiles == 5
        assert user.request_limit_mode == "quota_then_daily"
        assert user.max_total_requests == 300
        assert user.daily_request_limit == 5
        assert user.access_expires_at is not None
    finally:
        if user:
            db.query(UserInvite).filter(UserInvite.used_by_id == user.id).update(
                {"used_by_id": None}, synchronize_session=False
            )
            db.delete(user)
            db.commit()
        db.close()


def test_patch_used_invite_updates_user_via_used_by_id_even_with_different_email(monkeypatch):
    seed_admin()
    monkeypatch.setenv("EXTERNAL_API_KEY", "test_patch_used_key_123")
    headers = {"X-API-Key": "test_patch_used_key_123"}

    res_inv = client.post(
        "/admin/invites",
        headers=headers,
        json={
            "role": "client",
            "validity_type": "never",
            "access_days": 30,
            "max_total_requests": 100,
            "daily_request_limit": 3,
        },
    )
    token = res_inv.json()["token"]

    # Aluno se cadastra com e-mail diferente do checkout da Hotmart
    email_cadastro = f"cadastro_diff_{uuid.uuid4().hex[:8]}@example.com"
    res_reg = client.post(
        "/auth/register-with-invite",
        json={
            "token": token,
            "name": "Aluno Email Diferente",
            "email": email_cadastro,
            "password": "Sirius@2026StrongPassword",
        },
    )
    assert res_reg.status_code == 200

    # Upsell envia o email do checkout (diferente do usado no cadastro), mas o token resolve via used_by_id
    res_patch = client.patch(
        f"/admin/invites/{token}",
        headers=headers,
        json={
            "allow_multiple_profiles": True,
            "max_extra_profiles": 8,
            "access_days": 365,
            "request_limit_mode": "quota_then_daily",
            "max_total_requests": 400,
            "daily_request_limit": 10,
            "email": "outro_email_checkout@hotmart.com",
            "upgrade_only": True,
        },
    )
    assert res_patch.status_code == 200
    data = res_patch.json()
    assert data["applied_to"] == "user"
    assert data["is_used"] is True
    assert data["used_by_id"] is not None
    assert data["allow_multiple_profiles"] is True
    assert data["max_extra_profiles"] == 8
    assert data["request_limit_mode"] == "quota_then_daily"
    assert data["max_total_requests"] == 400
    assert data["daily_request_limit"] == 10

    db = SessionLocal()
    user = None
    user_fb = None
    try:
        user = db.query(User).filter(User.email == email_cadastro).first()
        assert user is not None
        assert str(user.id) == data["used_by_id"]
        assert user.allow_multiple_profiles is True
        assert user.max_extra_profiles == 8
        assert user.request_limit_mode == "quota_then_daily"
        assert user.max_total_requests == 400
        assert user.daily_request_limit == 10

        # Testa fallback por email quando used_by_id for nulo
        from routes.auth import hash_password
        email_fb = f"fallback_{uuid.uuid4().hex[:8]}@example.com"
        user_fb = User(
            id=str(uuid.uuid4()),
            name="Fallback Email",
            email=email_fb,
            password_hash=hash_password("Sirius@2026StrongPassword"),
            role="client",
            is_active=True,
        )
        db.add(user_fb)
        inv_fb = UserInvite(
            token=f"fb_tok_{uuid.uuid4().hex[:10]}",
            role="client",
            validity_type="never",
            is_used=True,
            used_by_id=None,
        )
        db.add(inv_fb)
        db.commit()

        res_fb = client.put(
            f"/admin/invites/{inv_fb.token}",
            headers=headers,
            json={"email": email_fb, "allow_multiple_profiles": True, "max_extra_profiles": 3},
        )
        assert res_fb.status_code == 200
        assert res_fb.json()["applied_to"] == "user"
        db.expire_all()
        refreshed_fb = db.query(User).filter(User.email == email_fb).first()
        assert refreshed_fb.allow_multiple_profiles is True
        assert refreshed_fb.max_extra_profiles == 3
    finally:
        if user:
            db.query(UserInvite).filter(UserInvite.used_by_id == user.id).update(
                {"used_by_id": None}, synchronize_session=False
            )
            db.delete(user)
        if user_fb:
            db.delete(user_fb)
        db.commit()
        db.close()


def test_patch_invite_upgrade_only_prevents_downgrade(monkeypatch):
    seed_admin()
    monkeypatch.setenv("EXTERNAL_API_KEY", "test_upgrade_only_key_123")
    headers = {"X-API-Key": "test_upgrade_only_key_123"}

    # Cria convite inicial com limites do plano básico antes do Order Bump
    res_inv = client.post(
        "/admin/invites",
        headers=headers,
        json={
            "role": "client",
            "validity_type": "never",
            "access_days": 30,
            "max_total_requests": 100,
            "daily_request_limit": 2,
            "allow_multiple_profiles": False,
        },
    )
    token = res_inv.json()["token"]

    # 1. Order Bump chega primeiro e ativa múltiplos perfis (5) e limites altos
    res_bump = client.patch(
        f"/admin/invites/{token}",
        headers=headers,
        json={
            "allow_multiple_profiles": True,
            "max_extra_profiles": 5,
            "access_days": 365,
            "request_limit_mode": "quota_then_daily",
            "max_total_requests": 300,
            "daily_request_limit": 5,
            "upgrade_only": True,
        },
    )
    assert res_bump.status_code == 200
    assert res_bump.json()["allow_multiple_profiles"] is True
    assert res_bump.json()["max_extra_profiles"] == 5

    # 2. Webhook do Produto Principal chega atrasado tentando enviar limites menores e allow=False
    res_main_late = client.patch(
        f"/admin/invites/{token}",
        headers=headers,
        json={
            "allow_multiple_profiles": False,
            "max_extra_profiles": 2,
            "access_days": 30,
            "request_limit_mode": "strict",
            "max_total_requests": 100,
            "daily_request_limit": 2,
            "upgrade_only": True,
        },
    )
    assert res_main_late.status_code == 200
    d_late = res_main_late.json()
    assert d_late["allow_multiple_profiles"] is True
    assert d_late["max_extra_profiles"] == 5
    assert d_late["access_days"] == 365
    assert d_late["request_limit_mode"] == "quota_then_daily"
    assert d_late["max_total_requests"] == 300
    assert d_late["daily_request_limit"] == 5

    # 3. Upgrade para ilimitado (None) prevalece sobre qualquer valor numérico futuro
    res_unlim = client.patch(
        f"/admin/invites/{token}",
        headers=headers,
        json={"max_total_requests": None, "upgrade_only": True},
    )
    assert res_unlim.status_code == 200
    assert res_unlim.json()["max_total_requests"] is None

    res_cap_after = client.patch(
        f"/admin/invites/{token}",
        headers=headers,
        json={"max_total_requests": 500, "upgrade_only": True},
    )
    assert res_cap_after.status_code == 200
    assert res_cap_after.json()["max_total_requests"] is None


