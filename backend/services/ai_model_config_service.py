"""
Serviço de configuração e resolução de modelos de IA (Global e por Aluno).
Permite definir qual modelo OpenAI é usado na fase de Limite Máximo/Franquia
e qual modelo é usado na fase de Limite por Dia (mais econômico).
"""
import os
import re
import logging
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.models import AiModelConfig, Analise, User
from services.request_limit_service import count_user_ai_requests, get_brasilia_day_utc_bounds

logger = logging.getLogger(__name__)

_SAFE_MODEL_RE = re.compile(r"^[a-zA-Z0-9._:-]{2,120}$")

DEFAULT_AI_MODELS = [
    # Família GPT-6.2
    {"id": "gpt-6.2-astra", "label": "GPT-6.2 Astra", "family": "GPT-6", "tier": "Ultra", "input_price_usd": 8.00, "output_price_usd": 40.00},
    {"id": "gpt-6.2-sol", "label": "GPT-6.2 Sol", "family": "GPT-6", "tier": "Avançado", "input_price_usd": 2.00, "output_price_usd": 10.00},
    # Família GPT-6.1
    {"id": "gpt-6.1-sol", "label": "GPT-6.1 Sol", "family": "GPT-6", "tier": "Avançado", "input_price_usd": 2.00, "output_price_usd": 10.00},
    {"id": "gpt-6.1-terra", "label": "GPT-6.1 Terra", "family": "GPT-6", "tier": "Equilibrado", "input_price_usd": 1.00, "output_price_usd": 5.00},
    # Família GPT-6
    {"id": "gpt-6-astra", "label": "GPT-6 Astra", "family": "GPT-6", "tier": "Ultra", "input_price_usd": 10.00, "output_price_usd": 50.00},
    {"id": "gpt-6-sol", "label": "GPT-6 Sol", "family": "GPT-6", "tier": "Avançado", "input_price_usd": 2.00, "output_price_usd": 10.00},
    {"id": "gpt-6-luna", "label": "GPT-6 Luna", "family": "GPT-6", "tier": "Econômico", "input_price_usd": 0.10, "output_price_usd": 0.50},
    {"id": "gpt-6", "label": "GPT-6", "family": "GPT-6", "tier": "Avançado", "input_price_usd": 2.00, "output_price_usd": 10.00},
    {"id": "gpt-6-mini", "label": "GPT-6 Mini", "family": "GPT-6", "tier": "Econômico", "input_price_usd": 0.10, "output_price_usd": 0.50},
    # Família GPT-5 (5.0 a 5.6)
    {"id": "gpt-5.6-sol", "label": "GPT-5.6 Sol", "family": "GPT-5", "tier": "Avançado", "input_price_usd": 4.00, "output_price_usd": 20.00},
    {"id": "gpt-5.6-terra", "label": "GPT-5.6 Terra", "family": "GPT-5", "tier": "Equilibrado", "input_price_usd": 2.00, "output_price_usd": 12.00},
    {"id": "gpt-5.6-luna", "label": "GPT-5.6 Luna", "family": "GPT-5", "tier": "Econômico", "input_price_usd": 0.20, "output_price_usd": 1.20},
    {"id": "gpt-5.5-pro", "label": "GPT-5.5 Pro", "family": "GPT-5", "tier": "Ultra", "input_price_usd": 30.00, "output_price_usd": 180.00},
    {"id": "gpt-5.5", "label": "GPT-5.5", "family": "GPT-5", "tier": "Avançado", "input_price_usd": 5.00, "output_price_usd": 30.00},
    {"id": "gpt-5.4", "label": "GPT-5.4", "family": "GPT-5", "tier": "Avançado", "input_price_usd": 2.50, "output_price_usd": 15.00},
    {"id": "gpt-5.3", "label": "GPT-5.3", "family": "GPT-5", "tier": "Avançado", "input_price_usd": 2.50, "output_price_usd": 15.00},
    {"id": "gpt-5.2", "label": "GPT-5.2", "family": "GPT-5", "tier": "Avançado", "input_price_usd": 2.50, "output_price_usd": 15.00},
    {"id": "gpt-5.1", "label": "GPT-5.1", "family": "GPT-5", "tier": "Avançado", "input_price_usd": 2.00, "output_price_usd": 10.00},
    {"id": "gpt-5", "label": "GPT-5", "family": "GPT-5", "tier": "Avançado", "input_price_usd": 1.25, "output_price_usd": 10.00},
    {"id": "gpt-5-mini", "label": "GPT-5 Mini", "family": "GPT-5", "tier": "Econômico", "input_price_usd": 0.25, "output_price_usd": 2.00},
    {"id": "gpt-5-nano", "label": "GPT-5 Nano", "family": "GPT-5", "tier": "Ultra Econômico", "input_price_usd": 0.05, "output_price_usd": 0.40},
    # Família GPT-4
    {"id": "gpt-4.1", "label": "GPT-4.1", "family": "GPT-4", "tier": "Equilibrado", "input_price_usd": 2.00, "output_price_usd": 8.00},
    {"id": "gpt-4.1-mini", "label": "GPT-4.1 Mini", "family": "GPT-4", "tier": "Econômico", "input_price_usd": 0.40, "output_price_usd": 1.60},
    {"id": "gpt-4o", "label": "GPT-4o", "family": "GPT-4", "tier": "Equilibrado", "input_price_usd": 2.50, "output_price_usd": 10.00},
    {"id": "gpt-4o-mini", "label": "GPT-4o Mini", "family": "GPT-4", "tier": "Econômico", "input_price_usd": 0.15, "output_price_usd": 0.60},
]

_PRICING_MAP = {
    m["id"].lower(): (m["input_price_usd"], m["output_price_usd"])
    for m in DEFAULT_AI_MODELS
}


def get_model_pricing_per_million(model_name: str) -> tuple[float, float]:
    """Retorna (input_usd_per_1M, output_usd_per_1M) para o modelo informado."""
    lower = (model_name or "").strip().lower()
    if lower in _PRICING_MAP:
        return _PRICING_MAP[lower]
    if "nano" in lower:
        return (0.05, 0.40)
    if "luna" in lower:
        return (0.20, 1.20)
    if "mini" in lower:
        return (0.15, 0.60)
    return (2.50, 10.00)


def _default_max_model() -> str:
    return (os.getenv("MODELO_LEITURA", "gpt-5.6-sol") or "gpt-5.6-sol").strip()


def _default_max_fallback_model() -> str:
    return (os.getenv("MODELO_LEITURA_FALLBACK", "gpt-5.6-luna") or "gpt-5.6-luna").strip()


def _default_daily_model() -> str:
    return (os.getenv("MODELO_LEITURA_DIARIO", "gpt-4o-mini") or "gpt-4o-mini").strip()


def _default_daily_fallback_model() -> str:
    return (os.getenv("MODELO_LEITURA_DIARIO_FALLBACK", "gpt-4o-mini") or "gpt-4o-mini").strip()


def validate_model_id(model_id: str, field_label: str = "modelo de IA") -> str:
    """Valida e normaliza um identificador de modelo OpenAI."""
    clean = (model_id or "").strip()
    if not clean or not _SAFE_MODEL_RE.match(clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Identificador inválido para {field_label}. Use apenas letras, números, '.', '-', '_' ou ':'.",
        )
    return clean


def normalize_optional_model_id(
    value: Optional[str], field_label: str = "modelo de IA"
) -> Optional[str]:
    """Normaliza sobrescrita opcional de modelo por usuário (vazio/None -> None)."""
    if value is None:
        return None
    clean = value.strip()
    if not clean:
        return None
    return validate_model_id(clean, field_label=field_label)


def get_global_ai_model_config(db: Session) -> AiModelConfig:
    """Obtém (ou cria com defaults) a configuração global de modelos de IA."""
    cfg = db.query(AiModelConfig).filter(AiModelConfig.id == "default").first()
    if cfg:
        if not getattr(cfg, "max_limit_fallback_model", None):
            cfg.max_limit_fallback_model = _default_max_fallback_model()
        if not getattr(cfg, "daily_limit_fallback_model", None):
            cfg.daily_limit_fallback_model = _default_daily_fallback_model()
        return cfg

    cfg = AiModelConfig(
        id="default",
        max_limit_model=_default_max_model(),
        max_limit_fallback_model=_default_max_fallback_model(),
        daily_limit_model=_default_daily_model(),
        daily_limit_fallback_model=_default_daily_fallback_model(),
    )
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


def update_global_ai_model_config(
    db: Session,
    max_limit_model: Optional[str] = None,
    max_limit_fallback_model: Optional[str] = None,
    daily_limit_model: Optional[str] = None,
    daily_limit_fallback_model: Optional[str] = None,
    updated_by: Optional[str] = None,
) -> AiModelConfig:
    """Atualiza os modelos globais (principais e fallbacks) de Limite Máximo e Limite por Dia."""
    cfg = get_global_ai_model_config(db)

    if max_limit_model is not None:
        cfg.max_limit_model = validate_model_id(max_limit_model, "modelo do limite máximo")
    if max_limit_fallback_model is not None:
        cfg.max_limit_fallback_model = validate_model_id(
            max_limit_fallback_model, "fallback do limite máximo"
        )
    if daily_limit_model is not None:
        cfg.daily_limit_model = validate_model_id(daily_limit_model, "modelo do limite por dia")
    if daily_limit_fallback_model is not None:
        cfg.daily_limit_fallback_model = validate_model_id(
            daily_limit_fallback_model, "fallback do limite por dia"
        )
    if updated_by is not None:
        cfg.updated_by = updated_by
    cfg.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(cfg)
    logger.info(
        "Configuração global de modelos de IA atualizada por '%s': max=%s (fb=%s), daily=%s (fb=%s)",
        updated_by or "sistema",
        cfg.max_limit_model,
        cfg.max_limit_fallback_model,
        cfg.daily_limit_model,
        cfg.daily_limit_fallback_model,
    )
    return cfg


def resolve_reading_model_for_user(
    user: Optional[User],
    db: Session,
    now_utc: Optional[datetime] = None,
) -> dict:
    """
    Resolve qual modelo de IA deve ser usado agora para o usuário:
    - 'max_limit': usado quando há limite máximo total/franquia ativo (ou usuário ilimitado/admin).
    - 'daily_limit': usado no modo 'quota_then_daily' após esgotar a franquia,
      ou no modo 'strict' quando apenas o limite diário está definido (sem máximo total).
    """
    cfg = get_global_ai_model_config(db)
    global_max = cfg.max_limit_model
    global_max_fallback = cfg.max_limit_fallback_model
    global_daily = cfg.daily_limit_model
    global_daily_fallback = cfg.daily_limit_fallback_model

    user_override_max = (getattr(user, "ai_model_max_limit", None) or "").strip() or None
    user_override_daily = (getattr(user, "ai_model_daily_limit", None) or "").strip() or None

    effective_max = user_override_max or global_max
    effective_daily = user_override_daily or global_daily

    if not user or getattr(user, "role", None) == "admin":
        return {
            "model": effective_max,
            "fallback_model": global_max_fallback,
            "phase": "max_limit",
            "effective_max_model": effective_max,
            "effective_daily_model": effective_daily,
            "global_max_model": global_max,
            "global_max_fallback_model": global_max_fallback,
            "global_daily_model": global_daily,
            "global_daily_fallback_model": global_daily_fallback,
            "user_override_max": user_override_max,
            "user_override_daily": user_override_daily,
        }

    daily_limit = getattr(user, "daily_request_limit", None)
    max_total = getattr(user, "max_total_requests", None)
    mode = (getattr(user, "request_limit_mode", None) or "strict").strip().lower()

    phase = "max_limit"
    if mode == "quota_then_daily":
        if max_total is not None and max_total > 0:
            usage = count_user_ai_requests(user, db, now_utc=now_utc)
            if usage["total_used"] >= max_total:
                phase = "daily_limit"
        elif daily_limit is not None and daily_limit > 0:
            phase = "daily_limit"
    else:
        # Modo 'strict': usa modelo do limite máximo sempre que houver máximo total;
        # usa modelo do limite diário quando só existe limite por dia configurado.
        if (max_total is None or max_total <= 0) and daily_limit is not None and daily_limit > 0:
            phase = "daily_limit"

    chosen_model = effective_daily if phase == "daily_limit" else effective_max
    chosen_fallback = global_daily_fallback if phase == "daily_limit" else global_max_fallback

    return {
        "model": chosen_model,
        "fallback_model": chosen_fallback,
        "phase": phase,
        "effective_max_model": effective_max,
        "effective_daily_model": effective_daily,
        "global_max_model": global_max,
        "global_max_fallback_model": global_max_fallback,
        "global_daily_model": global_daily,
        "global_daily_fallback_model": global_daily_fallback,
        "user_override_max": user_override_max,
        "user_override_daily": user_override_daily,
    }


def resolve_financeiro_users_ai_status(
    users_by_id: dict[str, User],
    db: Session,
    now_utc: Optional[datetime] = None,
) -> dict[str, dict]:
    """
    Resolve em lote (apenas 2 queries agregadas) a fase de limite, contagem de uso
    e modelo de IA ativo para cada usuário exibido no Financeiro.
    """
    cfg = get_global_ai_model_config(db)
    global_max = cfg.max_limit_model
    global_daily = cfg.daily_limit_model

    start_utc, end_utc = get_brasilia_day_utc_bounds(now_utc)

    total_rows = (
        db.query(Analise.user_id, func.count(Analise.id))
        .filter(Analise.status == "ok", Analise.user_id.isnot(None))
        .group_by(Analise.user_id)
        .all()
    )
    total_map = {str(uid): int(cnt or 0) for uid, cnt in total_rows}

    daily_rows = (
        db.query(Analise.user_id, func.count(Analise.id))
        .filter(
            Analise.status == "ok",
            Analise.user_id.isnot(None),
            Analise.created_at >= start_utc,
            Analise.created_at < end_utc,
        )
        .group_by(Analise.user_id)
        .all()
    )
    daily_map = {str(uid): int(cnt or 0) for uid, cnt in daily_rows}

    result: dict[str, dict] = {}
    for uid, user in users_by_id.items():
        total_used = total_map.get(uid, 0)
        daily_used = daily_map.get(uid, 0)

        effective_max = (getattr(user, "ai_model_max_limit", None) or "").strip() or global_max
        effective_daily = (getattr(user, "ai_model_daily_limit", None) or "").strip() or global_daily

        daily_limit = getattr(user, "daily_request_limit", None)
        max_total = getattr(user, "max_total_requests", None)
        mode = (getattr(user, "request_limit_mode", None) or "strict").strip().lower()
        role = (getattr(user, "role", None) or "").strip().lower()

        if role == "admin" or (daily_limit is None and max_total is None):
            phase = "unlimited"
            active_model = effective_max
        elif mode == "quota_then_daily":
            if max_total is not None and max_total > 0 and total_used < max_total:
                phase = "max_limit"
                active_model = effective_max
            else:
                phase = "daily_limit"
                active_model = effective_daily
        else:
            if max_total is not None and max_total > 0:
                phase = "max_limit"
                active_model = effective_max
            else:
                phase = "daily_limit"
                active_model = effective_daily

        result[uid] = {
            "limit_phase": phase,
            "limit_mode": mode,
            "active_ai_model": active_model,
            "total_used": total_used,
            "max_total_requests": max_total,
            "daily_used": daily_used,
            "daily_request_limit": daily_limit,
        }

    return result


def _infer_family_and_tier(model_id: str) -> tuple[str, str]:
    lower = model_id.lower()
    if "gpt-6" in lower:
        family = "GPT-6"
    elif "gpt-5" in lower:
        family = "GPT-5"
    elif "gpt-4" in lower:
        family = "GPT-4"
    else:
        family = "Outros"

    if "nano" in lower:
        tier = "Ultra Econômico"
    elif "mini" in lower or "luna" in lower:
        tier = "Econômico"
    elif "astra" in lower or "pro" in lower:
        tier = "Ultra"
    elif "terra" in lower:
        tier = "Equilibrado"
    else:
        tier = "Avançado"
    return family, tier


async def fetch_available_openai_models() -> dict:
    """
    Consulta os modelos disponíveis na API da OpenAI (gpt-4*, gpt-5*, gpt-6*, o3*, o4*)
    e mescla com o catálogo padrão do sistema.
    """
    from services.ai_service import get_client

    catalog_map = {item["id"]: {**item, "available_in_openai": False} for item in DEFAULT_AI_MODELS}
    synced = False
    sync_error: Optional[str] = None

    try:
        client = get_client()
        response = await client.models.list(timeout=8.0)
        raw_ids = [
            m.id
            for m in getattr(response, "data", []) or []
            if getattr(m, "id", "")
            and any(
                m.id.lower().startswith(prefix)
                for prefix in ("gpt-4", "gpt-5", "gpt-6", "o3", "o4")
            )
            and not any(
                skip in m.id.lower()
                for skip in ("audio", "realtime", "transcribe", "tts", "search", "image")
            )
        ]

        for model_id in sorted(set(raw_ids)):
            if model_id in catalog_map:
                catalog_map[model_id]["available_in_openai"] = True
            else:
                family, tier = _infer_family_and_tier(model_id)
                in_p, out_p = get_model_pricing_per_million(model_id)
                catalog_map[model_id] = {
                    "id": model_id,
                    "label": model_id,
                    "family": family,
                    "tier": tier,
                    "input_price_usd": in_p,
                    "output_price_usd": out_p,
                    "available_in_openai": True,
                }
        synced = True
        logger.info("Catálogo de modelos OpenAI sincronizado (%d modelos encontrados).", len(raw_ids))
    except Exception as exc:
        sync_error = str(exc)
        logger.warning("Não foi possível sincronizar modelos com a OpenAI: %s", exc)

    return {
        "models": list(catalog_map.values()),
        "synced_from_openai": synced,
        "sync_error": sync_error,
    }
