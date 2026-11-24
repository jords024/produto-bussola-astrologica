"""
Rotas para consultar e atualizar limites de requisições de IA (diário e máximo total)
por usuário — acessível tanto pelo Painel Admin (Bearer JWT) quanto por integrações
externas via X-API-Key.
"""
import logging
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.models import User
from routes.auth import get_admin_or_api_key, require_admin
from services.request_limit_service import (
    apply_request_limits_config,
    count_user_ai_requests,
)
from services.ai_model_config_service import (
    normalize_optional_model_id,
    resolve_reading_model_for_user,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/users", tags=["request-limits"])


class UpdateUserRequestLimitsBody(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None
    daily_request_limit: Optional[int] = None
    max_total_requests: Optional[int] = None
    unlimited_daily_requests: Optional[bool] = False
    unlimited_total_requests: Optional[bool] = False
    request_limit_mode: Optional[str] = None
    ai_model_max_limit: Optional[str] = None
    ai_model_daily_limit: Optional[str] = None


class BatchUpdateUserRequestLimitsBody(BaseModel):
    ids: List[str]
    daily_request_limit: Optional[int] = None
    max_total_requests: Optional[int] = None
    unlimited_daily_requests: Optional[bool] = False
    unlimited_total_requests: Optional[bool] = False
    request_limit_mode: Optional[str] = None


@router.put("/batch-limits")
def batch_update_user_request_limits(
    body: BatchUpdateUserRequestLimitsBody,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Atualiza os limites de leituras com IA para múltiplos usuários selecionados."""
    clean_ids = [str(uid).strip() for uid in (body.ids or []) if str(uid).strip()]
    if not clean_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selecione ao menos um usuário para atualizar os limites.",
        )

    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@bussola.com").strip().lower()
    targets = db.query(User).filter(User.id.in_(clean_ids)).all()
    if not targets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum usuário encontrado para os IDs informados.",
        )

    provided_fields = set(getattr(body, "model_fields_set", getattr(body, "__fields_set__", set())))
    updated_count = 0
    skipped_admin_count = 0

    for target in targets:
        is_super = (target.email or "").strip().lower() == super_admin_email
        if is_super or target.role == "admin":
            skipped_admin_count += 1
            continue

        apply_request_limits_config(
            user=target,
            role=target.role,
            daily_request_limit=body.daily_request_limit,
            max_total_requests=body.max_total_requests,
            unlimited_daily_requests=bool(body.unlimited_daily_requests),
            unlimited_total_requests=bool(body.unlimited_total_requests),
            provided_fields=provided_fields,
            request_limit_mode=body.request_limit_mode,
        )
        updated_count += 1

    db.commit()
    logger.info(
        f"Limites em lote atualizados por '{current_user.email}': "
        f"atualizados={updated_count}, ignorados_admin={skipped_admin_count}"
    )

    return {
        "success": True,
        "updated_count": updated_count,
        "skipped_admin_count": skipped_admin_count,
        "message": f"Limites de IA atualizados para {updated_count} usuário(s).",
    }


def _resolve_target_user(
    db: Session,
    email: Optional[str] = None,
    user_id: Optional[str] = None,
) -> User:
    clean_id = (user_id or "").strip()
    clean_email = (email or "").strip().lower()

    if not clean_id and not clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe 'email' ou 'user_id' do usuário.",
        )

    user = None
    if clean_id:
        user = db.query(User).filter(User.id == clean_id).first()
    elif clean_email:
        user = db.query(User).filter(func.lower(User.email) == clean_email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )
    return user


@router.get("/limits")
def get_user_request_limits(
    email: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    current_user: User = Depends(get_admin_or_api_key),
    db: Session = Depends(get_db),
):
    """Consulta os limites e o consumo atual (hoje em BRT e total) de um usuário."""
    target = _resolve_target_user(db, email=email, user_id=user_id)
    usage = count_user_ai_requests(target, db)
    model_info = resolve_reading_model_for_user(target, db)
    return {
        "user_id": str(target.id),
        "email": target.email,
        "name": target.name,
        "role": target.role,
        "daily_request_limit": target.daily_request_limit,
        "max_total_requests": target.max_total_requests,
        "request_limit_mode": getattr(target, "request_limit_mode", None) or "strict",
        "daily_used": usage["daily_used"],
        "total_used": usage["total_used"],
        "ai_model_max_limit": model_info["user_override_max"],
        "ai_model_daily_limit": model_info["user_override_daily"],
        "active_ai_model": model_info["model"],
        "active_ai_phase": model_info["phase"],
        "effective_max_model": model_info["effective_max_model"],
        "effective_daily_model": model_info["effective_daily_model"],
        "global_max_model": model_info["global_max_model"],
        "global_daily_model": model_info["global_daily_model"],
    }


@router.patch("/limits")
@router.put("/limits")
def update_user_request_limits(
    body: UpdateUserRequestLimitsBody,
    current_user: User = Depends(get_admin_or_api_key),
    db: Session = Depends(get_db),
):
    """
    Atualiza limite diário e/ou limite máximo total de requisições de IA de um usuário.
    Aceita Bearer JWT de Admin ou header X-API-Key.
    Passar null (ou unlimited_* = true) libera uso ilimitado.
    """
    target = _resolve_target_user(db, email=body.email, user_id=body.user_id)

    provided_fields = set(body.model_fields_set)
    apply_request_limits_config(
        user=target,
        role=target.role,
        daily_request_limit=body.daily_request_limit,
        max_total_requests=body.max_total_requests,
        unlimited_daily_requests=bool(body.unlimited_daily_requests),
        unlimited_total_requests=bool(body.unlimited_total_requests),
        provided_fields=provided_fields,
        request_limit_mode=body.request_limit_mode,
    )

    if "ai_model_max_limit" in provided_fields:
        target.ai_model_max_limit = normalize_optional_model_id(
            body.ai_model_max_limit, "modelo do limite máximo"
        )
    if "ai_model_daily_limit" in provided_fields:
        target.ai_model_daily_limit = normalize_optional_model_id(
            body.ai_model_daily_limit, "modelo do limite por dia"
        )

    db.commit()
    db.refresh(target)
    usage = count_user_ai_requests(target, db)
    model_info = resolve_reading_model_for_user(target, db)

    logger.info(
        f"Limites de requisições atualizados para '{target.email}' por '{current_user.email}': "
        f"daily={target.daily_request_limit}, max_total={target.max_total_requests}, "
        f"ai_max={target.ai_model_max_limit}, ai_daily={target.ai_model_daily_limit}"
    )

    return {
        "success": True,
        "message": "Limites de requisições atualizados com sucesso.",
        "user_id": str(target.id),
        "email": target.email,
        "name": target.name,
        "role": target.role,
        "daily_request_limit": target.daily_request_limit,
        "max_total_requests": target.max_total_requests,
        "request_limit_mode": getattr(target, "request_limit_mode", None) or "strict",
        "daily_used": usage["daily_used"],
        "total_used": usage["total_used"],
        "ai_model_max_limit": model_info["user_override_max"],
        "ai_model_daily_limit": model_info["user_override_daily"],
        "active_ai_model": model_info["model"],
        "active_ai_phase": model_info["phase"],
        "effective_max_model": model_info["effective_max_model"],
        "effective_daily_model": model_info["effective_daily_model"],
        "global_max_model": model_info["global_max_model"],
        "global_daily_model": model_info["global_daily_model"],
    }
