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


def test_financeiro_role_filter_recalculates_summary_and_sorting():
    from datetime import datetime, timedelta
    token = get_admin_token()
    db = SessionLocal()
    tag = uuid.uuid4().hex[:6]
    client_email = f"role_client_{tag}@exemplo.com"
    admin_email = f"role_admin_{tag}@exemplo.com"
    try:
        uid_c = str(uuid.uuid4())
        uid_a = str(uuid.uuid4())
        db.add(User(
            id=uid_c,
            name=f"Aluno Filtro {tag}",
            email=client_email,
            password_hash="x",
            role="client",
        ))
        db.add(User(
            id=uid_a,
            name=f"Admin Filtro {tag}",
            email=admin_email,
            password_hash="x",
            role="admin",
        ))
        now = datetime.utcnow()
        db.add(Analise(
            id=str(uuid.uuid4()),
            user_id=uid_c,
            data_alvo=date.today(),
            sintese="Leitura aluno",
            prompt_tokens=100,
            completion_tokens=200,
            total_tokens=300,
            cost_usd=0.05,
            status="ok",
            created_at=now - timedelta(hours=2),
        ))
        db.add(Analise(
            id=str(uuid.uuid4()),
            user_id=uid_a,
            data_alvo=date.today(),
            sintese="Leitura admin",
            prompt_tokens=200,
            completion_tokens=400,
            total_tokens=600,
            cost_usd=0.12,
            status="ok",
            created_at=now - timedelta(hours=1),
        ))
        db.commit()
    finally:
        db.close()

    # Filtra apenas alunos -> resumo deve considerar apenas o aluno
    res_client = client.get(
        f"/admin/financeiro?period=all&role=client&search={tag}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_client.status_code == 200
    d_client = res_client.json()
    assert d_client["role"] == "client"
    assert len(d_client["users"]) == 1
    assert d_client["users"][0]["email"] == client_email
    assert d_client["summary"]["total_cost_usd"] == pytest.approx(0.05, rel=1e-4)
    assert d_client["summary"]["readings_count"] == 1

    # Ordena por lowest_cost e newest
    res_lowest = client.get(
        f"/admin/financeiro?period=all&search={tag}&sort=lowest_cost",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_lowest.status_code == 200
    assert res_lowest.json()["users"][0]["email"] == client_email

    res_newest = client.get(
        f"/admin/financeiro?period=all&search={tag}&sort=newest",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_newest.status_code == 200
    assert res_newest.json()["users"][0]["email"] == admin_email

    res_oldest = client.get(
        f"/admin/financeiro?period=all&search={tag}&sort=oldest",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_oldest.status_code == 200
    assert res_oldest.json()["users"][0]["email"] == client_email


def test_financeiro_user_reports_endpoint_and_sorting():
    from datetime import datetime, timedelta
    token = get_admin_token()
    db = SessionLocal()
    email = f"reports_{uuid.uuid4().hex[:6]}@exemplo.com"
    uid = str(uuid.uuid4())
    try:
        db.add(User(
            id=uid,
            name="Usuario Relatorios",
            email=email,
            password_hash="x",
            role="client",
        ))
        now = datetime.utcnow()
        db.add(Analise(
            id=str(uuid.uuid4()),
            user_id=uid,
            data_alvo=date.today(),
            sintese="Síntese antiga barata",
            contexto={"area": "Carreira", "pergunta": "Devo mudar?"},
            textos={"Sol": "Texto do Sol"},
            prompt_tokens=100,
            completion_tokens=100,
            total_tokens=200,
            cost_usd=0.01,
            status="ok",
            created_at=now - timedelta(days=2),
        ))
        db.add(Analise(
            id=str(uuid.uuid4()),
            user_id=uid,
            data_alvo=date.today(),
            sintese="Síntese recente cara",
            contexto={"area": "Amor", "pergunta": "Como fica?"},
            textos={"Lua": "Texto da Lua"},
            prompt_tokens=500,
            completion_tokens=500,
            total_tokens=1000,
            cost_usd=0.09,
            status="ok",
            created_at=now - timedelta(minutes=10),
        ))
        db.add(GenerationLog(
            id=str(uuid.uuid4()),
            name="Usuario Relatorios",
            email=email,
            birth_city="São Paulo",
            birth_date="1995-05-10",
            birth_time="10:30",
            model_used="gpt-4o",
            status="success",
            prompt_tokens=1000,
            completion_tokens=2000,
            total_tokens=3000,
            cost_usd=0.04,
            created_at=now - timedelta(hours=5),
        ))
        db.commit()
    finally:
        db.close()

    # Default sort: newest
    res = client.get(
        f"/admin/financeiro/user-reports?user_id={uid}&period=all",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["email"] == email
    assert len(data["readings"]) == 2
    assert len(data["maps"]) == 1
    assert data["readings"][0]["sintese"] == "Síntese recente cara"
    assert data["readings"][0]["area"] == "Amor"
    assert data["readings"][0]["textos"]["Lua"] == "Texto da Lua"
    assert data["readings"][0]["created_at"].endswith("Z")
    assert data["maps"][0]["birth_city"] == "São Paulo"

    # Sort oldest
    res_old = client.get(
        f"/admin/financeiro/user-reports?user_id={uid}&sort=oldest",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_old.status_code == 200
    assert res_old.json()["readings"][0]["sintese"] == "Síntese antiga barata"

    # Sort lowest_cost
    res_low = client.get(
        f"/admin/financeiro/user-reports?user_id={uid}&sort=lowest_cost",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_low.status_code == 200
    assert res_low.json()["readings"][0]["cost_usd"] == pytest.approx(0.01, rel=1e-4)

    # Missing user_id and email -> 400
    res_missing = client.get(
        "/admin/financeiro/user-reports",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_missing.status_code == 400


def test_financeiro_ignores_salvo_no_painel_logs():
    token = get_admin_token()
    db = SessionLocal()
    email = f"salvo_painel_{uuid.uuid4().hex[:6]}@exemplo.com"
    try:
        db.add(GenerationLog(
            id=str(uuid.uuid4()),
            name="Apenas Salvo",
            email=email,
            birth_city="Recife",
            birth_date="1990-01-01",
            birth_time="12:00",
            model_used="salvo no painel",
            status="success",
            prompt_tokens=0,
            completion_tokens=0,
            total_tokens=0,
            cost_usd=0.0,
        ))
        db.commit()
    finally:
        db.close()

    res_sum = client.get(
        f"/admin/financeiro?period=all&search={email}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_sum.status_code == 200
    assert res_sum.json()["users"] == []
    assert res_sum.json()["summary"]["total_cost_usd"] == 0.0

    res_rep = client.get(
        f"/admin/financeiro/user-reports?email={email}&period=all",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_rep.status_code == 200
    assert res_rep.json()["maps"] == []


def test_financeiro_isola_aluno_interno_dos_gastos_reais():
    token = get_admin_token()
    db = SessionLocal()
    tag = uuid.uuid4().hex[:8]
    real_email = f"fin_real_{tag}@teste.com"
    internal_email = f"fin_internal_{tag}@teste.com"

    try:
        uid_real = str(uuid.uuid4())
        uid_int = str(uuid.uuid4())
        db.add(User(
            id=uid_real,
            name=f"Aluno Real {tag}",
            email=real_email,
            password_hash="x",
            role="client",
        ))
        db.add(User(
            id=uid_int,
            name=f"Aluno Interno {tag}",
            email=internal_email,
            password_hash="x",
            role="internal_client",
        ))
        db.add(Analise(
            id=str(uuid.uuid4()),
            user_id=uid_real,
            data_alvo=date.today(),
            sintese="Leitura real",
            prompt_tokens=100,
            completion_tokens=200,
            total_tokens=300,
            cost_usd=0.10,
            status="ok",
        ))
        db.add(Analise(
            id=str(uuid.uuid4()),
            user_id=uid_int,
            data_alvo=date.today(),
            sintese="Leitura interna",
            prompt_tokens=500,
            completion_tokens=500,
            total_tokens=1000,
            cost_usd=0.50,
            status="ok",
        ))
        db.commit()
    finally:
        db.close()

    # Em role=all e role=client, Aluno Interno NÃO aparece nem suja os totais
    for role_param in ("all", "client"):
        res = client.get(
            f"/admin/financeiro?period=all&role={role_param}&search={tag}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data["users"]) == 1
        assert data["users"][0]["email"] == real_email
        assert data["summary"]["total_cost_usd"] == pytest.approx(0.10, rel=1e-4)
        assert data["summary"]["readings_count"] == 1

    # Em role=internal_client, mostra somente o Aluno Interno
    res_int = client.get(
        f"/admin/financeiro?period=all&role=internal_client&search={tag}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_int.status_code == 200
    data_int = res_int.json()
    assert data_int["role"] == "internal_client"
    assert len(data_int["users"]) == 1
    assert data_int["users"][0]["email"] == internal_email
    assert data_int["summary"]["total_cost_usd"] == pytest.approx(0.50, rel=1e-4)
    assert data_int["summary"]["readings_count"] == 1
