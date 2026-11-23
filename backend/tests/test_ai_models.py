"""
Testes unitários para configuração de modelos de IA (Global e por Aluno),
sincronização com catálogo OpenAI e resolução de modelo por fase de limite.
"""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from database import SessionLocal
from main import app
from models.models import AiModelConfig, Analise, User
from routes.auth import create_token, hash_password
from services.ai_model_config_service import (
    resolve_reading_model_for_user,
    resolve_financeiro_users_ai_status,
)

client = TestClient(app)


def _create_user(db, role="client", email_prefix="aluno", **kwargs):
    uid = str(uuid.uuid4())
    user = User(
        id=uid,
        name=kwargs.pop("name", "Teste Usuário"),
        email=f"{email_prefix}_{uid[:6]}@bussola.local",
        password_hash=hash_password("SenhaForte123!"),
        role=role,
        is_active=True,
        **kwargs,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _admin_headers(admin_user: User) -> dict:
    token = create_token(str(admin_user.id), admin_user.role)
    return {"Authorization": f"Bearer {token}"}


def test_resolve_reading_model_for_user_phases_and_overrides():
    db = SessionLocal()
    try:
        # Garante config global conhecida
        cfg = db.query(AiModelConfig).filter(AiModelConfig.id == "default").first()
        if not cfg:
            cfg = AiModelConfig(
                id="default",
                max_limit_model="gpt-5.6-sol",
                daily_limit_model="gpt-4o-mini",
            )
            db.add(cfg)
        else:
            cfg.max_limit_model = "gpt-5.6-sol"
            cfg.daily_limit_model = "gpt-4o-mini"
        db.commit()

        # 1. Modo strict com max_total=10 e daily=5 -> usa modelo do limite máximo
        u_strict_max = _create_user(
            db,
            request_limit_mode="strict",
            max_total_requests=10,
            daily_request_limit=5,
        )
        res1 = resolve_reading_model_for_user(u_strict_max, db)
        assert res1["phase"] == "max_limit"
        assert res1["model"] == "gpt-5.6-sol"

        # 2. Modo strict apenas com daily_request_limit (sem max_total) -> usa modelo diário
        u_strict_daily = _create_user(
            db,
            request_limit_mode="strict",
            max_total_requests=None,
            daily_request_limit=5,
        )
        res2 = resolve_reading_model_for_user(u_strict_daily, db)
        assert res2["phase"] == "daily_limit"
        assert res2["model"] == "gpt-4o-mini"

        # 3. Modo quota_then_daily: antes da franquia -> max_limit; após franquia -> daily_limit
        u_quota = _create_user(
            db,
            request_limit_mode="quota_then_daily",
            max_total_requests=1,
            daily_request_limit=3,
            ai_model_max_limit="gpt-6",
            ai_model_daily_limit="gpt-5-mini",
        )
        res3_before = resolve_reading_model_for_user(u_quota, db)
        assert res3_before["phase"] == "max_limit"
        assert res3_before["model"] == "gpt-6"

        # Registra 1 leitura concluída atingindo a franquia
        db.add(
            Analise(
                id=str(uuid.uuid4()),
                user_id=u_quota.id,
                data_alvo="2026-11-20",
                status="ok",
            )
        )
        db.commit()

        res3_after = resolve_reading_model_for_user(u_quota, db)
        assert res3_after["phase"] == "daily_limit"
        assert res3_after["model"] == "gpt-5-mini"
    finally:
        db.close()


def test_admin_ai_models_config_and_catalog_routes():
    db = SessionLocal()
    try:
        admin = _create_user(db, role="admin", email_prefix="adm_ai")
        aluno = _create_user(db, role="client", email_prefix="cli_ai")
        headers = _admin_headers(admin)
        aluno_headers = _admin_headers(aluno)

        # Aluno comum não acessa configuração de IA
        res_forbidden = client.get("/admin/ai-models/config", headers=aluno_headers)
        assert res_forbidden.status_code == 403

        # Admin lê configuração global e catálogo padrão (contém GPT-5, 5.1, 5.5 e GPT-6)
        res_get = client.get("/admin/ai-models/config", headers=headers)
        assert res_get.status_code == 200
        body = res_get.json()
        catalog_ids = {m["id"]: m for m in body["catalog"]}
        assert "gpt-5.6-sol" in catalog_ids
        assert catalog_ids["gpt-5.6-sol"]["input_price_usd"] == 4.00
        assert catalog_ids["gpt-5.6-sol"]["output_price_usd"] == 20.00
        assert "gpt-5.1" in catalog_ids
        assert "gpt-5.5" in catalog_ids
        assert "gpt-6.1-sol" in catalog_ids
        assert "gpt-6.2-sol" in catalog_ids
        assert "gpt-6-luna" in catalog_ids
        assert catalog_ids["gpt-6-luna"]["input_price_usd"] == 0.10
        assert catalog_ids["gpt-6-luna"]["output_price_usd"] == 0.50

        # Admin atualiza modelos globais e fallbacks
        res_put = client.put(
            "/admin/ai-models/config",
            headers=headers,
            json={
                "max_limit_model": "gpt-6",
                "max_limit_fallback_model": "gpt-5.6-luna",
                "daily_limit_model": "gpt-5-mini",
                "daily_limit_fallback_model": "gpt-6-luna",
            },
        )
        assert res_put.status_code == 200
        assert res_put.json()["max_limit_model"] == "gpt-6"
        assert res_put.json()["max_limit_fallback_model"] == "gpt-5.6-luna"
        assert res_put.json()["daily_limit_model"] == "gpt-5-mini"
        assert res_put.json()["daily_limit_fallback_model"] == "gpt-6-luna"

        res_check = resolve_reading_model_for_user(aluno, db)
        assert res_check["fallback_model"] == "gpt-5.6-luna"

        # Valida sincronização mockada com a OpenAI
        fake_model_1 = MagicMock()
        fake_model_1.id = "gpt-5.5"
        fake_model_2 = MagicMock()
        fake_model_2.id = "gpt-6-turbo"
        fake_resp = MagicMock()
        fake_resp.data = [fake_model_1, fake_model_2]

        mock_openai = MagicMock()
        mock_openai.models.list = AsyncMock(return_value=fake_resp)

        with patch("services.ai_service.get_client", return_value=mock_openai):
            res_sync = client.get("/admin/ai-models/catalog?sync=true", headers=headers)
        assert res_sync.status_code == 200
        sync_data = res_sync.json()
        assert sync_data["synced_from_openai"] is True
        synced_ids = {m["id"]: m for m in sync_data["models"]}
        assert synced_ids["gpt-5.5"]["available_in_openai"] is True
        assert "gpt-6-turbo" in synced_ids
        assert synced_ids["gpt-6-turbo"]["family"] == "GPT-6"

        # Personalização por aluno via /admin/users/limits
        res_patch = client.patch(
            "/admin/users/limits",
            headers=headers,
            json={
                "user_id": aluno.id,
                "ai_model_max_limit": "gpt-5.5",
                "ai_model_daily_limit": "gpt-5-nano",
            },
        )
        assert res_patch.status_code == 200
        pdata = res_patch.json()
        assert pdata["ai_model_max_limit"] == "gpt-5.5"
        assert pdata["ai_model_daily_limit"] == "gpt-5-nano"
        assert pdata["active_ai_model"] == "gpt-5.5"

        # Limpa sobrescrita voltando para o padrão global
        res_clear = client.patch(
            "/admin/users/limits",
            headers=headers,
            json={
                "user_id": aluno.id,
                "ai_model_max_limit": "",
                "ai_model_daily_limit": None,
            },
        )
        assert res_clear.status_code == 200
        assert res_clear.json()["ai_model_max_limit"] is None
        assert res_clear.json()["effective_max_model"] == "gpt-6"
    finally:
        db.close()


def test_financeiro_users_ai_status_and_admin_only_access():
    db = SessionLocal()
    try:
        admin = _create_user(db, role="admin", email_prefix="adm_fin")
        aluno_quota = _create_user(
            db,
            role="client",
            email_prefix="fin_q",
            request_limit_mode="quota_then_daily",
            max_total_requests=10,
            daily_request_limit=5,
        )
        aluno_daily = _create_user(
            db,
            role="client",
            email_prefix="fin_d",
            request_limit_mode="strict",
            max_total_requests=None,
            daily_request_limit=8,
        )
        db.add(
            Analise(
                id=str(uuid.uuid4()),
                user_id=aluno_quota.id,
                data_alvo="2026-11-21",
                status="ok",
                total_tokens=1500,
                cost_usd=0.015,
            )
        )
        db.add(
            Analise(
                id=str(uuid.uuid4()),
                user_id=aluno_daily.id,
                data_alvo="2026-11-21",
                status="ok",
                total_tokens=1200,
                cost_usd=0.005,
            )
        )
        db.commit()

        status_map = resolve_financeiro_users_ai_status(
            {
                str(admin.id): admin,
                str(aluno_quota.id): aluno_quota,
                str(aluno_daily.id): aluno_daily,
            },
            db,
        )
        assert status_map[str(admin.id)]["limit_phase"] == "unlimited"
        assert status_map[str(aluno_quota.id)]["limit_phase"] == "max_limit"
        assert status_map[str(aluno_quota.id)]["total_used"] == 1
        assert status_map[str(aluno_quota.id)]["max_total_requests"] == 10
        assert status_map[str(aluno_daily.id)]["limit_phase"] == "daily_limit"
        assert status_map[str(aluno_daily.id)]["daily_request_limit"] == 8

        # Apenas Admin / Super Admin acessa /admin/financeiro
        res_forbidden = client.get(
            "/admin/financeiro",
            headers=_admin_headers(aluno_quota),
        )
        assert res_forbidden.status_code == 403

        res_ok = client.get(
            "/admin/financeiro",
            headers=_admin_headers(admin),
        )
        assert res_ok.status_code == 200
        by_id = {u["user_id"]: u for u in res_ok.json()["users"]}
        assert by_id[str(aluno_quota.id)]["limit_phase"] == "max_limit"
        assert by_id[str(aluno_quota.id)]["active_ai_model"]
        assert by_id[str(aluno_daily.id)]["limit_phase"] == "daily_limit"
    finally:
        db.close()
