import os
import uuid
import pytest
from fastapi.testclient import TestClient
from main import app, seed_admin
from database import SessionLocal
from models.models import User, UserInvite, Analise
from routes.auth import hash_password

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
def cleanup_test_users():
    yield
    db = SessionLocal()
    try:
        from sqlalchemy import text
        db.execute(text("UPDATE user_invites SET used_by_id = NULL, created_by_id = NULL WHERE used_by_id IN (SELECT id FROM users WHERE email LIKE :p) OR created_by_id IN (SELECT id FROM users WHERE email LIKE :p)"), {"p": "%testpaneluser%"})
        db.execute(text("DELETE FROM user_invites WHERE token LIKE :p"), {"p": "%testtoken%"})
        db.execute(text("DELETE FROM users WHERE email LIKE :p"), {"p": "%testpaneluser%"})
        db.commit()
    finally:
        db.close()


def test_list_panel_users_identifies_super_admin():
    token = get_admin_token()
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com").strip().lower()

    res = client.get("/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data

    # Deve encontrar o super admin com is_super_admin == True
    super_admin_found = [u for u in data["items"] if u["email"].lower() == super_admin_email]
    assert len(super_admin_found) == 1
    assert super_admin_found[0]["is_super_admin"] is True


def test_update_super_admin_is_blocked():
    token = get_admin_token()
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com").strip().lower()

    db = SessionLocal()
    try:
        super_admin = db.query(User).filter(User.email == super_admin_email).first()
        super_admin_id = str(super_admin.id)
    finally:
        db.close()

    res = client.put(
        f"/admin/users/{super_admin_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Tentativa de Alterar Super Admin", "role": "client"},
    )
    assert res.status_code == 400
    assert "Super Admin" in res.json()["detail"]


def test_update_regular_user_succeeds():
    token = get_admin_token()
    db = SessionLocal()
    try:
        test_user = User(
            id=str(uuid.uuid4()),
            name="Aluno Teste Painel",
            email="testpaneluser1@exemplo.com",
            password_hash=hash_password("senha123"),
            role="client",
            is_active=True,
        )
        db.add(test_user)
        db.commit()
        user_id = test_user.id
    finally:
        db.close()

    # Atualizar dados
    res = client.put(
        f"/admin/users/{user_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Aluno Teste Alterado",
            "whatsapp": "5511988887777",
            "role": "admin",
            "is_active": False,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["user"]["name"] == "Aluno Teste Alterado"
    assert data["user"]["whatsapp"] == "5511988887777"
    assert data["user"]["role"] == "admin"
    assert data["user"]["is_active"] is False
    assert data["user"]["is_super_admin"] is False


def test_update_user_duplicate_email_rejected():
    token = get_admin_token()
    db = SessionLocal()
    try:
        user_a = User(
            id=str(uuid.uuid4()),
            name="Usuario A",
            email="testpaneluser_a@exemplo.com",
            password_hash=hash_password("senha123"),
            role="client",
        )
        user_b = User(
            id=str(uuid.uuid4()),
            name="Usuario B",
            email="testpaneluser_b@exemplo.com",
            password_hash=hash_password("senha123"),
            role="client",
        )
        db.add(user_a)
        db.add(user_b)
        db.commit()
        user_b_id = user_b.id
    finally:
        db.close()

    # Tentar mudar email do user B para o email do user A
    res = client.put(
        f"/admin/users/{user_b_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"email": "testpaneluser_a@exemplo.com"},
    )
    assert res.status_code == 400
    assert "já está sendo utilizado" in res.json()["detail"]


def test_batch_delete_users_protects_super_admin():
    token = get_admin_token()
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com").strip().lower()

    db = SessionLocal()
    try:
        super_admin = db.query(User).filter(User.email == super_admin_email).first()
        super_admin_id = str(super_admin.id)

        user_del = User(
            id=str(uuid.uuid4()),
            name="Usuario Para Deletar",
            email="testpaneluser_todelete@exemplo.com",
            password_hash=hash_password("senha123"),
            role="client",
        )
        db.add(user_del)
        db.commit()
        user_del_id = user_del.id
    finally:
        db.close()

    # Tenta deletar tanto o super admin quanto o usuário regular
    res = client.request(
        "DELETE",
        "/admin/users/batch",
        headers={"Authorization": f"Bearer {token}"},
        json={"ids": [super_admin_id, user_del_id]},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["deleted_count"] == 1
    assert data["super_admin_protected"] is True

    # Verifica que super admin continua existindo e regular user foi deletado
    db = SessionLocal()
    try:
        assert db.query(User).filter(User.id == super_admin_id).first() is not None
        assert db.query(User).filter(User.id == user_del_id).first() is None
    finally:
        db.close()


def test_batch_delete_users_empty_rejected():
    token = get_admin_token()
    res = client.request(
        "DELETE",
        "/admin/users/batch",
        headers={"Authorization": f"Bearer {token}"},
        json={"ids": []},
    )
    assert res.status_code == 400


def test_batch_delete_protects_current_logged_in_admin():
    # Cria um admin comum
    db = SessionLocal()
    try:
        regular_admin = User(
            id=str(uuid.uuid4()),
            name="Admin Secundario",
            email="testpaneluser_regadmin@exemplo.com",
            password_hash=hash_password("senha123"),
            role="admin",
            is_active=True,
        )
        user_del = User(
            id=str(uuid.uuid4()),
            name="Aluno Para Deletar",
            email="testpaneluser_alunodel@exemplo.com",
            password_hash=hash_password("senha123"),
            role="client",
            is_active=True,
        )
        db.add(regular_admin)
        db.add(user_del)
        db.commit()
        reg_admin_id = regular_admin.id
        user_del_id = user_del.id
    finally:
        db.close()

    # Logar com o admin secundário
    login_res = client.post("/auth/login", json={
        "email": "testpaneluser_regadmin@exemplo.com",
        "password": "senha123",
    })
    assert login_res.status_code == 200
    reg_token = login_res.json()["token"]

    # O admin secundário tenta deletar a si próprio + o aluno
    del_res = client.request(
        "DELETE",
        "/admin/users/batch",
        headers={"Authorization": f"Bearer {reg_token}"},
        json={"ids": [reg_admin_id, user_del_id]},
    )
    assert del_res.status_code == 200
    data = del_res.json()
    assert data["success"] is True
    assert data["deleted_count"] == 1
    assert data["super_admin_protected"] is True

    # Verifica que o admin secundário continua vivo e o aluno foi deletado
    db = SessionLocal()
    try:
        assert db.query(User).filter(User.id == reg_admin_id).first() is not None
        assert db.query(User).filter(User.id == user_del_id).first() is None
    finally:
        db.close()


def test_super_admin_always_at_the_top():
    token = get_admin_token()
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com").strip().lower()

    # Cria alunos com datas recentes
    db = SessionLocal()
    try:
        u1 = User(
            name="Novo Aluno Recente",
            email="testpaneluser_recente@exemplo.com",
            password_hash=hash_password("senha123"),
            role="client",
            is_active=True,
        )
        db.add(u1)
        db.commit()
    finally:
        db.close()

    res = client.get("/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    items = data["items"]
    assert len(items) >= 2
    # O primeiro item da lista DEVE SEMPRE ser o Super Admin
    assert items[0]["email"].lower() == super_admin_email
    assert items[0]["is_super_admin"] is True


def test_batch_delete_user_with_linked_invites_succeeds():
    token = get_admin_token()
    db = SessionLocal()
    try:
        user_to_del = User(
            id=str(uuid.uuid4()),
            name="Aluno Com Convite Vinculado",
            email="testpaneluser_with_invite@exemplo.com",
            password_hash=hash_password("senha123"),
            role="client",
            is_active=True,
        )
        db.add(user_to_del)
        db.commit()
        uid = str(user_to_del.id)

        # Convite que este usuário usou
        inv_used = UserInvite(
            token="testtoken_used_" + uuid.uuid4().hex[:8],
            role="client",
            is_used=True,
            used_by_id=uid,
        )
        # Convite que este usuário criou
        inv_created = UserInvite(
            token="testtoken_created_" + uuid.uuid4().hex[:8],
            role="client",
            is_used=False,
            created_by_id=uid,
        )
        db.add(inv_used)
        db.add(inv_created)
        db.commit()
        inv_used_id = inv_used.id
        inv_created_id = inv_created.id
    finally:
        db.close()

    # Executa a exclusão em lote
    del_res = client.request(
        "DELETE",
        "/admin/users/batch",
        headers={"Authorization": f"Bearer {token}"},
        json={"ids": [uid]},
    )
    assert del_res.status_code == 200
    data = del_res.json()
    assert data["success"] is True
    assert data["deleted_count"] == 1

    # Valida integridade no banco: usuário foi excluído e convites foram desvinculados
    db = SessionLocal()
    try:
        assert db.query(User).filter(User.id == uid).first() is None
        i_u = db.query(UserInvite).filter(UserInvite.id == inv_used_id).first()
        assert i_u is not None
        assert i_u.used_by_id is None
        i_c = db.query(UserInvite).filter(UserInvite.id == inv_created_id).first()
        assert i_c is not None
        assert i_c.created_by_id is None
    finally:
        db.close()


def test_delete_client_with_linked_invites_succeeds():
    token = get_admin_token()
    db = SessionLocal()
    try:
        client_user = User(
            id=str(uuid.uuid4()),
            name="Cliente Com Convite",
            email="testpaneluser_client_invite@exemplo.com",
            password_hash=hash_password("senha123"),
            role="client",
            is_active=True,
        )
        db.add(client_user)
        db.commit()
        cid = str(client_user.id)

        inv = UserInvite(
            token="testtoken_client_" + uuid.uuid4().hex[:8],
            role="client",
            is_used=True,
            used_by_id=cid,
        )
        db.add(inv)
        db.commit()
        inv_id = inv.id
    finally:
        db.close()

    del_res = client.delete(
        f"/admin/clients/{cid}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 204

    db = SessionLocal()
    try:
        assert db.query(User).filter(User.id == cid).first() is None
        i = db.query(UserInvite).filter(UserInvite.id == inv_id).first()
        assert i is not None
        assert i.used_by_id is None
    finally:
        db.close()


def test_create_panel_user_client_and_login():
    token = get_admin_token()
    email = f"testpaneluser_create_{uuid.uuid4().hex[:6]}@exemplo.com"
    res = client.post(
        "/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Aluno Criado Manual",
            "email": email,
            "whatsapp": "+55 11999990000",
            "password": "MinhaSenha@123",
            "role": "client",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["user"]["email"] == email.lower()
    assert data["user"]["role"] == "client"
    assert data["user"]["is_active"] is True

    # Verificar que o usuário criado já consegue fazer login imediatamente
    login_res = client.post("/auth/login", json={"email": email, "password": "MinhaSenha@123"})
    assert login_res.status_code == 200
    assert "token" in login_res.json()


def test_create_panel_user_admin_succeeds():
    token = get_admin_token()
    email = f"testpaneluser_admin_{uuid.uuid4().hex[:6]}@exemplo.com"
    res = client.post(
        "/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Admin Criado Manual",
            "email": email,
            "password": "AdminSenha@123",
            "role": "admin",
        },
    )
    assert res.status_code == 201
    assert res.json()["user"]["role"] == "admin"


def test_create_panel_user_duplicate_email_and_weak_passwords():
    token = get_admin_token()
    email = f"testpaneluser_dup_{uuid.uuid4().hex[:6]}@exemplo.com"

    weak_passwords = [
        "Curta@12",                 # menos de 12 caracteres
        "senhasemmaiuscula@12",     # sem maiúscula
        "SENHASEMMINUSCULA@12",     # sem minúscula
        "SenhaSemNumero@abc",       # sem número
        "SenhaSemEspecial1234",     # sem caractere especial
    ]
    for weak in weak_passwords:
        weak_res = client.post(
            "/admin/users",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "Teste", "email": email, "password": weak, "role": "client"},
        )
        assert weak_res.status_code == 400

    # Criação válida
    ok_res = client.post(
        "/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Teste", "email": email, "password": "SenhaForte@123", "role": "client"},
    )
    assert ok_res.status_code == 201

    # Duplicado
    dup_res = client.post(
        "/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Teste 2", "email": email, "password": "SenhaForte@123", "role": "client"},
    )
    assert dup_res.status_code == 400
    assert "e-mail" in dup_res.json()["detail"].lower()


def test_create_panel_user_requires_admin():
    token = get_admin_token()
    email = f"testpaneluser_nonadmin_{uuid.uuid4().hex[:6]}@exemplo.com"
    create_res = client.post(
        "/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Aluno Comum", "email": email, "password": "SenhaForte@123", "role": "client"},
    )
    assert create_res.status_code == 201

    login_res = client.post("/auth/login", json={"email": email, "password": "SenhaForte@123"})
    client_token = login_res.json()["token"]

    forbidden_res = client.post(
        "/admin/users",
        headers={"Authorization": f"Bearer {client_token}"},
        json={"name": "Outro", "email": f"testpaneluser_other_{uuid.uuid4().hex[:6]}@exemplo.com", "password": "SenhaForte@123", "role": "client"},
    )
    assert forbidden_res.status_code in (401, 403)


def test_batch_delete_user_with_analises_succeeds():
    from datetime import date
    token = get_admin_token()
    db = SessionLocal()
    try:
        user = User(
            id=str(uuid.uuid4()),
            name="Aluno Com Análise",
            email=f"testpaneluser_analise_{uuid.uuid4().hex[:6]}@exemplo.com",
            password_hash=hash_password("SenhaForte@123"),
            role="client",
            is_active=True,
        )
        db.add(user)
        db.commit()
        uid = str(user.id)

        analise = Analise(
            id=str(uuid.uuid4()),
            user_id=uid,
            data_alvo=date.today(),
            sintese="Leitura de teste",
            status="ok",
        )
        db.add(analise)
        db.commit()
        aid = str(analise.id)
    finally:
        db.close()

    res = client.request(
        "DELETE",
        "/admin/users/batch",
        headers={"Authorization": f"Bearer {token}"},
        json={"ids": [uid]},
    )
    assert res.status_code == 200
    assert res.json()["deleted_count"] == 1

    db = SessionLocal()
    try:
        assert db.query(User).filter(User.id == uid).first() is None
        assert db.query(Analise).filter(Analise.id == aid).first() is None
    finally:
        db.close()


def test_create_and_update_internal_client_user():
    token = get_admin_token()
    tag = uuid.uuid4().hex[:8]
    email = f"testpaneluser_internal_{tag}@exemplo.com"

    res_create = client.post(
        "/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Admin Visão Aluno",
            "email": email,
            "password": "SenhaForte@123",
            "role": "internal_client",
        },
    )
    assert res_create.status_code == 201
    created_user = res_create.json()["user"]
    assert created_user["role"] == "internal_client"
    uid = created_user["id"]

    res_update = client.put(
        f"/admin/users/{uid}",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "client"},
    )
    assert res_update.status_code == 200
    assert res_update.json()["user"]["role"] == "client"

    res_update_back = client.put(
        f"/admin/users/{uid}",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "internal_client"},
    )
    assert res_update_back.status_code == 200
    assert res_update_back.json()["user"]["role"] == "internal_client"




