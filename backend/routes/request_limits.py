"""
Rotas para consultar e atualizar limites de requisições de IA (diário e máximo total)
por usuário — acessível tanto pelo Painel Admin (Bearer JWT) quanto por integrações
externas via X-API-Key.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.models import User
from routes.auth import get_admin_or_api_key
from services.request_limit_service import (
    apply_request_limits_config,
    count_user_ai_requests,
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

    apply_request_limits_config(
        user=target,
        role=target.role,
        daily_request_limit=body.daily_request_limit,
        max_total_requests=body.max_total_requests,
        unlimited_daily_requests=bool(body.unlimited_daily_requests),
        unlimited_total_requests=bool(body.unlimited_total_requests),
        provided_fields=set(body.model_fields_set),
        request_limit_mode=body.request_limit_mode,
    )

    db.commit()
    db.refresh(target)
    usage = count_user_ai_requests(target, db)

    logger.info(
        f"Limites de requisições atualizados para '{target.email}' por '{current_user.email}': "
        f"daily={target.daily_request_limit}, max_total={target.max_total_requests}"
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
    }
