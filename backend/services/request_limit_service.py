"""
Regras de negócio para limites diário e máximo total de requisições de IA (Leitura do Dia).
- Admins nunca sofrem limite (sempre ilimitados).
- Alunos (`client`) e Alunos Internos (`internal_client`) respeitam `daily_request_limit`,
  `max_total_requests` e `request_limit_mode`:
  * 'strict' (padrão): aplica limite diário (se definido) E bloqueia definitivamente ao atingir `max_total_requests`.
  * 'quota_then_daily': Fase 1 livre sem trava diária enquanto `total_used < max_total_requests`;
    Fase 2 (após atingir `max_total_requests`) passa a aplicar `daily_request_limit` por dia.
- Valores `None` representam uso ilimitado.
- O limite diário reseta à meia-noite no horário de Brasília (America/Sao_Paulo, UTC-3).
- Apenas novas gerações de IA (`Analise.status == "ok"`) consomem cota; abrir leituras salvas não consome.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Set, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.models import Analise, User

logger = logging.getLogger(__name__)

BRT_OFFSET = timedelta(hours=-3)
VALID_LIMIT_MODES = ("strict", "quota_then_daily")


def normalize_limit_mode(mode: Optional[str]) -> str:
    """Valida e normaliza o modo de limite ('strict' ou 'quota_then_daily')."""
    clean = (mode or "strict").strip().lower()
    if clean not in VALID_LIMIT_MODES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Modo de limite inválido. Use 'strict' ou 'quota_then_daily'.",
        )
    return clean


def get_brasilia_day_utc_bounds(now_utc: Optional[datetime] = None) -> Tuple[datetime, datetime]:
    """Retorna (início_utc, fim_utc) do dia civil corrente no horário de Brasília (UTC-3)."""
    ref = now_utc or datetime.utcnow()
    now_brt = ref + BRT_OFFSET
    start_brt = datetime(now_brt.year, now_brt.month, now_brt.day, 0, 0, 0)
    start_utc = start_brt - BRT_OFFSET
    end_utc = start_utc + timedelta(days=1)
    return start_utc, end_utc


def count_user_ai_requests(
    user: User,
    db: Session,
    now_utc: Optional[datetime] = None,
) -> dict:
    """Conta quantas gerações de Leitura do Dia com IA o usuário já fez hoje (BRT) e no total."""
    start_utc, end_utc = get_brasilia_day_utc_bounds(now_utc)

    daily_used = (
        db.query(func.count(Analise.id))
        .filter(
            Analise.user_id == user.id,
            Analise.status == "ok",
            Analise.created_at >= start_utc,
            Analise.created_at < end_utc,
        )
        .scalar()
        or 0
    )

    total_used = (
        db.query(func.count(Analise.id))
        .filter(
            Analise.user_id == user.id,
            Analise.status == "ok",
        )
        .scalar()
        or 0
    )

    return {
        "daily_used": int(daily_used),
        "total_used": int(total_used),
    }


def require_within_request_limits(
    user: User,
    db: Session,
    now_utc: Optional[datetime] = None,
) -> None:
    """Bloqueia nova geração de IA (HTTP 429) se o aluno atingiu o limite configurado."""
    if not user or user.role == "admin":
        return

    daily_limit = getattr(user, "daily_request_limit", None)
    max_total = getattr(user, "max_total_requests", None)
    mode = (getattr(user, "request_limit_mode", None) or "strict").strip().lower()

    if daily_limit is None and max_total is None:
        return

    usage = count_user_ai_requests(user, db, now_utc=now_utc)

    if mode == "quota_then_daily":
        # Fase 1: enquanto não atingiu a franquia inicial (max_total), uso livre sem bloqueio diário
        if max_total is not None and max_total > 0 and usage["total_used"] < max_total:
            return
        # Fase 2: após concluir a franquia inicial, passa a respeitar o limite diário
        if daily_limit is not None and daily_limit > 0 and usage["daily_used"] >= daily_limit:
            logger.warning(
                f"Limite diário pós-franquia atingido para '{user.email}': "
                f"hoje={usage['daily_used']}/{daily_limit}, total={usage['total_used']}/{max_total}."
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Você atingiu seu limite diário de {daily_limit} leituras hoje. "
                    "O limite renova automaticamente à meia-noite (horário de Brasília)."
                ),
            )
        return

    # Modo padrão ('strict'): bloqueia no teto total e no limite diário
    if max_total is not None and max_total > 0 and usage["total_used"] >= max_total:
        logger.warning(
            f"Limite máximo total de leituras atingido para '{user.email}': {usage['total_used']}/{max_total}."
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Você atingiu o limite máximo de {max_total} leituras da sua conta. "
                "Converse com o suporte para liberar mais leituras."
            ),
        )

    if daily_limit is not None and daily_limit > 0 and usage["daily_used"] >= daily_limit:
        logger.warning(
            f"Limite diário de leituras atingido para '{user.email}': {usage['daily_used']}/{daily_limit}."
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Você atingiu seu limite diário de {daily_limit} leituras hoje. "
                "O limite renova automaticamente à meia-noite (horário de Brasília)."
            ),
        )


def validate_optional_limit(value: Optional[int], field_label: str) -> Optional[int]:
    """Valida um valor de limite opcional (None = ilimitado; inteiro >= 1)."""
    if value is None:
        return None
    if value < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_label} deve ser um número maior ou igual a 1 (ou nulo para ilimitado).",
        )
    return int(value)


def apply_request_limits_config(
    user: User,
    role: str,
    daily_request_limit: Optional[int] = None,
    max_total_requests: Optional[int] = None,
    unlimited_daily_requests: bool = False,
    unlimited_total_requests: bool = False,
    provided_fields: Optional[Set[str]] = None,
    request_limit_mode: Optional[str] = None,
) -> None:
    """Aplica configuração de limites diário, total e modo no usuário (admins sempre ficam ilimitados)."""
    if (role or "client").strip().lower() == "admin":
        user.daily_request_limit = None
        user.max_total_requests = None
        user.request_limit_mode = "strict"
        return

    if provided_fields is None or "request_limit_mode" in provided_fields:
        if request_limit_mode is not None:
            user.request_limit_mode = normalize_limit_mode(request_limit_mode)

    if unlimited_daily_requests:
        user.daily_request_limit = None
    elif provided_fields is None or "daily_request_limit" in provided_fields:
        if daily_request_limit is not None or provided_fields is not None:
            user.daily_request_limit = validate_optional_limit(daily_request_limit, "Limite diário")

    if unlimited_total_requests:
        user.max_total_requests = None
    elif provided_fields is None or "max_total_requests" in provided_fields:
        if max_total_requests is not None or provided_fields is not None:
            user.max_total_requests = validate_optional_limit(max_total_requests, "Limite máximo total")
