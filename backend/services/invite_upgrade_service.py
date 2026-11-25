"""
Regras de negócio para consulta, atualização e proteção upgrade-only de convites
e contas criadas a partir de convites (cenários de Order Bump e Upsell).
"""
import os
from datetime import datetime, timedelta
from typing import Optional, Set, Tuple

from models.models import UserInvite


def merge_benefit_limit(
    current: Optional[int],
    incoming: Optional[int],
    upgrade_only: bool,
) -> Optional[int]:
    """Mescla limites numéricos mantendo o maior benefício quando upgrade_only=True (None = ilimitado)."""
    if not upgrade_only:
        return incoming
    if current is None or incoming is None:
        return None
    return max(current, incoming)


def merge_limit_mode(
    current: Optional[str],
    incoming: str,
    upgrade_only: bool,
) -> str:
    """Impede rebaixar 'quota_then_daily' para 'strict' quando upgrade_only=True."""
    cur = (current or "strict").strip().lower()
    if upgrade_only and cur == "quota_then_daily" and incoming == "strict":
        return "quota_then_daily"
    return incoming


def merge_multiple_profiles(
    current_allow: bool,
    current_max: Optional[int],
    provided: Set[str],
    incoming_allow: Optional[bool],
    incoming_max: Optional[int],
    upgrade_only: bool,
) -> Tuple[bool, Optional[int]]:
    """Mescla permissão de múltiplos perfis sem tratar current_max=None (quando desabilitado) como ilimitado."""
    if "allow_multiple_profiles" in provided and incoming_allow is not None:
        next_allow = True if (upgrade_only and current_allow) else bool(incoming_allow)
    else:
        next_allow = bool(current_allow)

    if not next_allow:
        return False, None

    if not current_allow:
        next_max = incoming_max if "max_extra_profiles" in provided else None
        return True, next_max

    if upgrade_only and "allow_multiple_profiles" in provided and incoming_allow is False:
        return True, current_max

    if "max_extra_profiles" in provided:
        next_max = merge_benefit_limit(current_max, incoming_max, upgrade_only)
    else:
        next_max = current_max

    return True, next_max


def merge_user_access_expires_at(
    current_exp: Optional[datetime],
    incoming_days: Optional[int],
    upgrade_only: bool,
) -> Optional[datetime]:
    """Mescla prazo de acesso do usuário (None = vitalício prevalece quando upgrade_only=True)."""
    incoming_exp = (
        None if incoming_days is None else (datetime.utcnow() + timedelta(days=incoming_days))
    )
    if not upgrade_only:
        return incoming_exp
    if current_exp is None or incoming_exp is None:
        return None
    return max(current_exp, incoming_exp)


def get_invite_url(token: str) -> Tuple[str, str]:
    """Retorna (invite_path, invite_url) usando DASHBOARD_URL configurada."""
    base_url = (os.getenv("DASHBOARD_URL") or "https://bussolaastrologica.com.br").rstrip("/")
    invite_path = f"/cadastro?token={token}"
    return invite_path, f"{base_url}{invite_path}"


def serialize_invite_status(invite: UserInvite) -> dict:
    """Serializa o status completo de um UserInvite para consulta externa/admin."""
    now = datetime.utcnow()
    if invite.is_used:
        invite_status = "used"
    elif invite.expires_at and invite.expires_at < now:
        invite_status = "expired"
    else:
        invite_status = "active"

    invite_path, invite_url = get_invite_url(invite.token)

    return {
        "id": invite.id,
        "token": invite.token,
        "invite_path": invite_path,
        "invite_url": invite_url,
        "role": invite.role,
        "role_label": "Administrador" if invite.role == "admin" else "Aluno",
        "validity_type": invite.validity_type,
        "expires_at": invite.expires_at.isoformat() + "Z" if invite.expires_at else None,
        "status": invite_status,
        "is_used": bool(invite.is_used),
        "used_at": invite.used_at.isoformat() + "Z" if invite.used_at else None,
        "used_by_id": str(invite.used_by_id) if invite.used_by_id else None,
        "allow_multiple_profiles": bool(invite.allow_multiple_profiles),
        "max_extra_profiles": invite.max_extra_profiles,
        "access_days": invite.access_days,
        "request_limit_mode": invite.request_limit_mode or "strict",
        "max_total_requests": invite.max_total_requests,
        "daily_request_limit": invite.daily_request_limit,
        "created_at": invite.created_at.isoformat() + "Z" if invite.created_at else None,
    }
