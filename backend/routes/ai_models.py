"""
Rotas administrativas para consultar e configurar os modelos de IA globais
(Limite Máximo/Franquia e Limite por Dia) e sincronizar o catálogo com a OpenAI.
Acessível para Admin e Super Admin.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.models import User
from routes.auth import require_admin
from services.ai_model_config_service import (
    DEFAULT_AI_MODELS,
    fetch_available_openai_models,
    get_global_ai_model_config,
    update_global_ai_model_config,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/ai-models", tags=["ai-models"])


class UpdateGlobalAiModelsBody(BaseModel):
    max_limit_model: Optional[str] = None
    max_limit_fallback_model: Optional[str] = None
    daily_limit_model: Optional[str] = None
    daily_limit_fallback_model: Optional[str] = None


@router.get("/config")
def get_ai_models_config(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Retorna a configuração global de modelos de IA e a lista padrão de modelos."""
    cfg = get_global_ai_model_config(db)
    return {
        "max_limit_model": cfg.max_limit_model,
        "max_limit_fallback_model": cfg.max_limit_fallback_model,
        "daily_limit_model": cfg.daily_limit_model,
        "daily_limit_fallback_model": cfg.daily_limit_fallback_model,
        "updated_by": cfg.updated_by,
        "updated_at": cfg.updated_at.isoformat() + "Z" if cfg.updated_at else None,
        "catalog": DEFAULT_AI_MODELS,
    }


@router.put("/config")
def update_ai_models_config(
    body: UpdateGlobalAiModelsBody,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Atualiza os modelos globais (principais e fallbacks) de Limite Máximo e Limite por Dia."""
    cfg = update_global_ai_model_config(
        db=db,
        max_limit_model=body.max_limit_model,
        max_limit_fallback_model=body.max_limit_fallback_model,
        daily_limit_model=body.daily_limit_model,
        daily_limit_fallback_model=body.daily_limit_fallback_model,
        updated_by=current_user.email,
    )
    return {
        "success": True,
        "message": "Configuração de modelos de IA atualizada com sucesso.",
        "max_limit_model": cfg.max_limit_model,
        "max_limit_fallback_model": cfg.max_limit_fallback_model,
        "daily_limit_model": cfg.daily_limit_model,
        "daily_limit_fallback_model": cfg.daily_limit_fallback_model,
        "updated_by": cfg.updated_by,
        "updated_at": cfg.updated_at.isoformat() + "Z" if cfg.updated_at else None,
    }


@router.get("/catalog")
async def get_ai_models_catalog(
    sync: bool = Query(True, description="Se true, consulta os modelos reais da OpenAI"),
    current_user: User = Depends(require_admin),
):
    """Retorna o catálogo de modelos (GPT-5, frações 5.x, GPT-6 e GPT-4), sincronizando com a OpenAI."""
    if not sync:
        return {
            "models": [{**m, "available_in_openai": False} for m in DEFAULT_AI_MODELS],
            "synced_from_openai": False,
            "sync_error": None,
        }
    return await fetch_available_openai_models()
