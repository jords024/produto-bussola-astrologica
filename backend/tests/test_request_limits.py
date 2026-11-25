import os
import sys
import uuid
from datetime import date, datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, seed_admin  # noqa: E402
from database import SessionLocal  # noqa: E402
from models.models import Analise, User  # noqa: E402
from routes.auth import create_token, hash_password  # noqa: E402
from services.request_limit_service import (  # noqa: E402
    get_brasilia_day_utc_bounds,
    require_within_request_limits,
)

client = TestClient(app)


def get_admin_token() -> str:
    seed_admin()
    email = os.getenv("SUPER_ADMIN_EMAIL", "admin@bussola.com")
    password = os.getenv("SUPER_ADMIN_PASSWORD", "123456")
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["token"]


def test_brasilia_midnight_bounds():
    # 2026-11-19 02:30 UTC == 2026-11-18 23:30 BRT (ainda dia 18 em Brasília)
    start_utc, end_utc = get_brasilia_day_utc_bounds(datetime(2026, 11, 19, 2, 30, 0))
    assert start_utc == datetime(2026, 11, 18, 3, 0, 0)
    assert end_utc == datetime(2026, 11, 19, 3, 0, 0)

    # 2026-11-19 03:05 UTC == 2026-11-19 00:05 BRT (já virou dia 19 em Brasília)
    start_utc2, end_utc2 = get_brasilia_day_utc_bounds(datetime(2026, 11, 19, 3, 5, 0))
    assert start_utc2 == datetime(2026, 11, 19, 3, 0, 0)
    assert end_utc2 == datetime(2026, 11, 20, 3, 0, 0)


def test_daily_and_total_request_limits_enforcement_and_cache_bypass():
    db = SessionLocal()
    tag = uuid.uuid4().hex[:8]
    uid = str(uuid.uuid4())
    email = f"limit_aluno_{tag}@teste.com"
    now_utc = datetime.utcnow()
    # Garantir que "ontem em BRT" esteja antes do início do dia atual em BRT
    start_utc, _ = get_brasilia_day_utc_bounds(now_utc)
    yesterday_utc = start_utc - timedelta(hours=2)

    try:
        user = User(
            id=uid,
            name=f"Aluno Limite {tag}",
            email=email,
            password_hash=hash_password("SenhaForte@123"),
            role="client",
            is_active=True,
            birth_date=date(1995, 5, 10),
            lat=-23.5505,
            lng=-46.6333,
            tz_str="America/Sao_Paulo",
            daily_request_limit=2,
            max_total_requests=5,
        )
        db.add(user)
        # 1 análise de ontem (não conta no limite diário, mas conta no total)
        db.add(Analise(
            id=str(uuid.uuid4()),
            user_id=uid,
            data_alvo=date.today() - timedelta(days=2),
            sintese=" ".join(["palavra"] * 160),
            status="ok",
            created_at=yesterday_utc,
        ))
        # 2 análises de hoje (atinge limite diário = 2)
        cached_date = date.today()
        db.add(Analise(
            id=str(uuid.uuid4()),
            user_id=uid,
            data_alvo=cached_date,
            sintese=" ".join(["sintese"] * 160),
            contexto={"area": None, "pergunta": None, "data_fim": None},
            posicoes=[],
            textos={},
            svg_content="<svg/>",
            status="ok",
            created_at=start_utc + timedelta(minutes=10),
        ))
        db.add(Analise(
            id=str(uuid.uuid4()),
            user_id=uid,
            data_alvo=date.today() - timedelta(days=1),
            sintese=" ".join(["leitura"] * 160),
            status="ok",
            created_at=start_utc + timedelta(minutes=20),
        ))
        db.commit()
    finally:
        db.close()

    user_token = create_token(uid, "client")

    # 1. Abrir a data já salva em cache NÃO bloqueia nem chama IA
    res_cache = client.post(
        "/members/analise",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"data": cached_date.isoformat()},
    )
    assert res_cache.status_code == 200

    # 2. Tentar gerar uma nova data com IA deve retornar 429 (limite diário)
    nova_data = (date.today() + timedelta(days=3)).isoformat()
    res_blocked = client.post(
        "/members/analise",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"data": nova_data},
    )
    assert res_blocked.status_code == 429
    assert "limite diário de 2 leituras" in res_blocked.json()["detail"].lower()

    # 3. Se aumentar limite diário para 10 mas limite máximo total = 3 (já tem 3 no total), bloqueia pelo total
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.id == uid).first()
        u.daily_request_limit = 10
        u.max_total_requests = 3
        db.commit()
    finally:
        db.close()

    res_total_blocked = client.post(
        "/members/analise",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"data": nova_data},
    )
    assert res_total_blocked.status_code == 429
    assert "limite máximo de 3 leituras" in res_total_blocked.json()["detail"].lower()


def test_internal_client_respects_limits_and_admin_is_unlimited():
    db = SessionLocal()
    tag = uuid.uuid4().hex[:8]
    uid_int = str(uuid.uuid4())
    uid_adm = str(uuid.uuid4())
    start_utc, _ = get_brasilia_day_utc_bounds()

    try:
        u_int = User(
            id=uid_int,
            name=f"Interno {tag}",
            email=f"int_{tag}@teste.com",
            password_hash="x",
            role="internal_client",
            daily_request_limit=1,
        )
        u_adm = User(
            id=uid_adm,
            name=f"Admin {tag}",
            email=f"adm_{tag}@teste.com",
            password_hash="x",
            role="admin",
            daily_request_limit=1,
        )
        db.add(u_int)
        db.add(u_adm)
        db.add(Analise(id=str(uuid.uuid4()), user_id=uid_int, data_alvo=date.today(), status="ok", created_at=start_utc + timedelta(minutes=5)))
        db.add(Analise(id=str(uuid.uuid4()), user_id=uid_adm, data_alvo=date.today(), status="ok", created_at=start_utc + timedelta(minutes=5)))
        db.commit()

        # Admin nunca bloqueia
        require_within_request_limits(u_adm, db)

        # Aluno Interno bloqueia com 429
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            require_within_request_limits(u_int, db)
        assert exc_info.value.status_code == 429
    finally:
        db.close()


def test_external_api_key_invite_and_limits_update(monkeypatch):
    seed_admin()
    monkeypatch.setenv("EXTERNAL_API_KEY", "test_limits_api_key_123")
    headers = {"X-API-Key": "test_limits_api_key_123"}

    # 1. Criar convite via X-API-Key já com limites configurados
    res_inv = client.post(
        "/admin/invites",
        headers=headers,
        json={
            "role": "client",
            "validity_type": "never",
            "daily_request_limit": 8,
            "max_total_requests": 100,
        },
    )
    assert res_inv.status_code == 200
    inv_data = res_inv.json()
    assert inv_data["daily_request_limit"] == 8
    assert inv_data["max_total_requests"] == 100

    # 2. Cadastrar aluno usando o convite -> deve nascer com os limites 8 e 100
    tag = uuid.uuid4().hex[:8]
    aluno_email = f"api_limit_{tag}@teste.com"
    res_reg = client.post(
        "/auth/register-with-invite",
        json={
            "token": inv_data["token"],
            "name": "Aluno Via API",
            "email": aluno_email,
            "password": "SenhaForte@123",
        },
    )
    assert res_reg.status_code == 200

    # 3. Consultar limites via GET /admin/users/limits com X-API-Key
    res_get = client.get(f"/admin/users/limits?email={aluno_email}", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["daily_request_limit"] == 8
    assert res_get.json()["max_total_requests"] == 100
    assert res_get.json()["daily_used"] == 0
    assert res_get.json()["total_used"] == 0

    # 4. Atualizar apenas limite diário via PATCH /admin/users/limits (mantém total=100)
    res_patch1 = client.patch(
        "/admin/users/limits",
        headers=headers,
        json={"email": aluno_email, "daily_request_limit": 15},
    )
    assert res_patch1.status_code == 200
    assert res_patch1.json()["daily_request_limit"] == 15
    assert res_patch1.json()["max_total_requests"] == 100

    # 5. Liberar ilimitado passando null explicitamente
    res_patch2 = client.patch(
        "/admin/users/limits",
        headers=headers,
        json={"email": aluno_email, "daily_request_limit": None, "max_total_requests": None},
    )
    assert res_patch2.status_code == 200
    assert res_patch2.json()["daily_request_limit"] is None
    assert res_patch2.json()["max_total_requests"] is None

    # 6. Valor inválido (0) retorna 400
    res_bad = client.patch(
        "/admin/users/limits",
        headers=headers,
        json={"email": aluno_email, "daily_request_limit": 0},
    )
    assert res_bad.status_code == 400


def test_quota_then_daily_mode_phase1_and_phase2():
    """
    Fase 1: uso livre sem trava diária enquanto total_used < max_total_requests.
    Fase 2: ao atingir max_total_requests, passa a aplicar daily_request_limit por dia (sem travar para sempre).
    """
    from fastapi import HTTPException

    db = SessionLocal()
    tag = uuid.uuid4().hex[:8]
    uid = str(uuid.uuid4())
    day1_utc = datetime(2026, 11, 19, 15, 0, 0)  # 12:00 BRT do dia 19
    day2_utc = datetime(2026, 11, 20, 15, 0, 0)  # 12:00 BRT do dia 20

    try:
        user = User(
            id=uid,
            name=f"Aluno Franquia {tag}",
            email=f"franquia_{tag}@teste.com",
            password_hash="x",
            role="client",
            request_limit_mode="quota_then_daily",
            max_total_requests=3,
            daily_request_limit=1,
        )
        db.add(user)
        # 2 leituras feitas hoje (já acima de daily_limit=1, mas abaixo da franquia=3)
        db.add(Analise(id=str(uuid.uuid4()), user_id=uid, data_alvo=date(2026, 11, 19), status="ok", created_at=day1_utc))
        db.add(Analise(id=str(uuid.uuid4()), user_id=uid, data_alvo=date(2026, 11, 18), status="ok", created_at=day1_utc + timedelta(minutes=1)))
        db.commit()

        # Fase 1: total_used=2 < 3 -> NÃO bloqueia mesmo já tendo 2 leituras hoje
        require_within_request_limits(user, db, now_utc=day1_utc + timedelta(minutes=5))

        # Completa a franquia inicial (3ª leitura no dia 1)
        db.add(Analise(id=str(uuid.uuid4()), user_id=uid, data_alvo=date(2026, 11, 17), status="ok", created_at=day1_utc + timedelta(minutes=10)))
        db.commit()

        # Fase 2 (mesmo dia 1): total_used=3 >= 3 e daily_used=3 >= 1 -> bloqueia com 429
        with pytest.raises(HTTPException) as exc1:
            require_within_request_limits(user, db, now_utc=day1_utc + timedelta(minutes=15))
        assert exc1.value.status_code == 429
        assert "limite diário de 1 leituras" in exc1.value.detail.lower()

        # Fase 2 (dia seguinte 2): total_used=3 >= 3, mas daily_used=0 < 1 -> LIBERADO!
        require_within_request_limits(user, db, now_utc=day2_utc)

        # Usa 1 leitura no dia 2 -> atinge daily_limit=1 -> bloqueia no dia 2
        db.add(Analise(id=str(uuid.uuid4()), user_id=uid, data_alvo=date(2026, 11, 20), status="ok", created_at=day2_utc + timedelta(minutes=2)))
        db.commit()
        with pytest.raises(HTTPException) as exc2:
            require_within_request_limits(user, db, now_utc=day2_utc + timedelta(minutes=5))
        assert exc2.value.status_code == 429
    finally:
        db.close()


def test_quota_then_daily_via_external_api(monkeypatch):
    seed_admin()
    monkeypatch.setenv("EXTERNAL_API_KEY", "test_quota_mode_key_456")
    headers = {"X-API-Key": "test_quota_mode_key_456"}

    res_inv = client.post(
        "/admin/invites",
        headers=headers,
        json={
            "role": "client",
            "validity_type": "never",
            "request_limit_mode": "quota_then_daily",
            "max_total_requests": 100,
            "daily_request_limit": 3,
        },
    )
    assert res_inv.status_code == 200
    inv = res_inv.json()
    assert inv["request_limit_mode"] == "quota_then_daily"

    tag = uuid.uuid4().hex[:8]
    aluno_email = f"api_quota_{tag}@teste.com"
    res_reg = client.post(
        "/auth/register-with-invite",
        json={
            "token": inv["token"],
            "name": "Aluno Franquia API",
            "email": aluno_email,
            "password": "SenhaForte@123",
        },
    )
    assert res_reg.status_code == 200

    res_get = client.get(f"/admin/users/limits?email={aluno_email}", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["request_limit_mode"] == "quota_then_daily"
    assert res_get.json()["max_total_requests"] == 100
    assert res_get.json()["daily_request_limit"] == 3

    # Altera via PATCH para modo strict
    res_patch = client.patch(
        "/admin/users/limits",
        headers=headers,
        json={"email": aluno_email, "request_limit_mode": "strict"},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["request_limit_mode"] == "strict"


def test_batch_update_user_request_limits():
    token = get_admin_token()
    tag = uuid.uuid4().hex[:8]
    db = SessionLocal()
    created_ids = []
    try:
        u1 = User(
            id=str(uuid.uuid4()),
            name="Aluno Lote 1",
            email=f"batch_limit_1_{tag}@teste.com",
            password_hash=hash_password("SenhaForte@123"),
            role="client",
            is_active=True,
        )
        u2 = User(
            id=str(uuid.uuid4()),
            name="Aluno Interno Lote 2",
            email=f"batch_limit_2_{tag}@teste.com",
            password_hash=hash_password("SenhaForte@123"),
            role="internal_client",
            is_active=True,
        )
        u_admin = User(
            id=str(uuid.uuid4()),
            name="Admin Lote Ignorado",
            email=f"batch_limit_adm_{tag}@teste.com",
            password_hash=hash_password("SenhaForte@123"),
            role="admin",
            is_active=True,
        )
        db.add_all([u1, u2, u_admin])
        db.commit()
        created_ids = [str(u1.id), str(u2.id), str(u_admin.id)]

        # Lista vazia deve retornar 400
        res_empty = client.put(
            "/admin/users/batch-limits",
            headers={"Authorization": f"Bearer {token}"},
            json={"ids": [], "request_limit_mode": "quota_then_daily", "max_total_requests": 300, "daily_request_limit": 5},
        )
        assert res_empty.status_code == 400

        res = client.put(
            "/admin/users/batch-limits",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "ids": created_ids,
                "request_limit_mode": "quota_then_daily",
                "max_total_requests": 300,
                "daily_request_limit": 5,
                "unlimited_total_requests": False,
                "unlimited_daily_requests": False,
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["updated_count"] == 2
        assert data["skipped_admin_count"] == 1

        db.expire_all()
        for uid in (created_ids[0], created_ids[1]):
            refreshed = db.query(User).filter(User.id == uid).first()
            assert refreshed.request_limit_mode == "quota_then_daily"
            assert refreshed.max_total_requests == 300
            assert refreshed.daily_request_limit == 5

        adm_refreshed = db.query(User).filter(User.id == created_ids[2]).first()
        assert adm_refreshed.max_total_requests is None
        assert adm_refreshed.daily_request_limit is None
    finally:
        if created_ids:
            db.query(User).filter(User.id.in_(created_ids)).delete(synchronize_session=False)
            db.commit()
        db.close()


def test_batch_update_access_and_multiple_profiles():
    token = get_admin_token()
    tag = uuid.uuid4().hex[:8]
    db = SessionLocal()
    created_ids = []
    try:
        u1 = User(
            id=str(uuid.uuid4()),
            name="Aluno Acesso 1",
            email=f"batch_acc_1_{tag}@teste.com",
            password_hash=hash_password("SenhaForte@123"),
            role="client",
            is_active=True,
        )
        u2 = User(
            id=str(uuid.uuid4()),
            name="Aluno Interno Acesso 2",
            email=f"batch_acc_2_{tag}@teste.com",
            password_hash=hash_password("SenhaForte@123"),
            role="internal_client",
            is_active=True,
        )
        u_admin = User(
            id=str(uuid.uuid4()),
            name="Admin Acesso Ignorado",
            email=f"batch_acc_adm_{tag}@teste.com",
            password_hash=hash_password("SenhaForte@123"),
            role="admin",
            is_active=True,
        )
        db.add_all([u1, u2, u_admin])
        db.commit()
        created_ids = [str(u1.id), str(u2.id), str(u_admin.id)]

        # Sem IDs -> 400
        res_empty = client.put(
            "/admin/users/batch-access-profiles",
            headers={"Authorization": f"Bearer {token}"},
            json={"ids": [], "update_access": True, "access_days": 30},
        )
        assert res_empty.status_code == 400

        # Nenhuma opção marcada -> 400
        res_no_opt = client.put(
            "/admin/users/batch-access-profiles",
            headers={"Authorization": f"Bearer {token}"},
            json={"ids": created_ids, "update_access": False, "update_multiple_profiles": False},
        )
        assert res_no_opt.status_code == 400

        # Atualiza tempo de acesso (30 dias) e múltiplos perfis (máx 4)
        res = client.put(
            "/admin/users/batch-access-profiles",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "ids": created_ids,
                "update_access": True,
                "access_days": 30,
                "update_multiple_profiles": True,
                "allow_multiple_profiles": True,
                "unlimited_extra_profiles": False,
                "max_extra_profiles": 4,
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["updated_count"] == 2
        assert data["skipped_admin_count"] == 1

        db.expire_all()
        for uid in (created_ids[0], created_ids[1]):
            refreshed = db.query(User).filter(User.id == uid).first()
            assert refreshed.access_expires_at is not None
            assert refreshed.allow_multiple_profiles is True
            assert refreshed.max_extra_profiles == 4

        adm_refreshed = db.query(User).filter(User.id == created_ids[2]).first()
        assert adm_refreshed.access_expires_at is None

        # Atualiza apenas expiração para vitalício, mantendo múltiplos perfis intacto
        res_clear = client.put(
            "/admin/users/batch-access-profiles",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "ids": [created_ids[0]],
                "update_access": True,
                "clear_expiration": True,
                "update_multiple_profiles": False,
            },
        )
        assert res_clear.status_code == 200
        db.expire_all()
        u1_refreshed = db.query(User).filter(User.id == created_ids[0]).first()
        assert u1_refreshed.access_expires_at is None
        assert u1_refreshed.allow_multiple_profiles is True
        assert u1_refreshed.max_extra_profiles == 4
    finally:
        if created_ids:
            db.query(User).filter(User.id.in_(created_ids)).delete(synchronize_session=False)
            db.commit()
        db.close()
