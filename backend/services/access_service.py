"""
Regras de negócio para tempo de acesso à plataforma e bloqueio de IA ao expirar.
- Admins e Super Admin nunca expiram.
- Alunos com access_expires_at == None possuem acesso vitalício.
- Alunos expirados mantêm visualização do mapa e histórico, mas não podem usar IA.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, status

from models.models import User

logger = logging.getLogger(__name__)


def is_user_access_expired(user: User) -> bool:
    """Retorna True se o usuário (não-admin) estiver com o tempo de acesso vencido."""
    if not user or user.role == "admin":
        return False
    exp = getattr(user, "access_expires_at", None)
    if exp is None:
        return False
    return datetime.utcnow() > exp


def require_active_ai_access(user: User) -> None:
    """Bloqueia chamadas de IA (403) se o tempo de acesso do aluno tiver expirado."""
    if is_user_access_expired(user):
        logger.warning(f"Uso de IA bloqueado por expiração de acesso para usuário '{user.email}'.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seu tempo de acesso expirou. Converse com o suporte para ativar novamente a sua conta.",
        )


def format_access_expires_at(user: User) -> Optional[str]:
    """Serializa access_expires_at em ISO UTC com sufixo Z (None para admins ou vitalício)."""
    if not user or user.role == "admin":
        return None
    exp = getattr(user, "access_expires_at", None)
    if exp is None:
        return None
    s = exp.isoformat()
    return s if s.endswith("Z") else f"{s}Z"


def resolve_access_expires_at(
    role: str,
    access_days: Optional[int] = None,
    access_expires_at_str: Optional[str] = None,
) -> Optional[datetime]:
    """Calcula a data de expiração em UTC a partir de dias ou data YYYY-MM-DD (admin sempre retorna None)."""
    if (role or "client").strip().lower() == "admin":
        return None

    if access_expires_at_str and access_expires_at_str.strip():
        raw = access_expires_at_str.strip()
        try:
            if len(raw) == 10:
                # Data YYYY-MM-DD: expira ao final do dia em Brasília (23:59:59 BRT = 02:59:59 UTC do dia seguinte)
                d = datetime.strptime(raw, "%Y-%m-%d")
                return d + timedelta(hours=26, minutes=59, seconds=59)
            clean = raw.replace("Z", "")
            return datetime.fromisoformat(clean)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data de expiração inválida. Use YYYY-MM-DD.",
            )

    if access_days is not None and access_days > 0:
        return datetime.utcnow() + timedelta(days=access_days)

    return None
