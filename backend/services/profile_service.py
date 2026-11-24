from __future__ import annotations

from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.models import Analise, AstroProfile, Chart, ChartSection, User, UserInvite
from services.access_service import format_access_expires_at, is_user_access_expired


def user_can_create_multiple_profiles(user: User) -> bool:
    """Admins têm acesso liberado automaticamente; alunos dependem da permissão configurada."""
    role = (getattr(user, "role", "") or "").strip().lower()
    if role in ("admin", "super_admin"):
        return True
    return bool(getattr(user, "allow_multiple_profiles", False))


def get_max_extra_profiles(user: User) -> Optional[int]:
    """Retorna o limite máximo de perfis extras (None = ilimitado para admins ou alunos sem teto)."""
    role = (getattr(user, "role", "") or "").strip().lower()
    if role in ("admin", "super_admin"):
        return None
    if not getattr(user, "allow_multiple_profiles", False):
        return 0
    val = getattr(user, "max_extra_profiles", None)
    return int(val) if val is not None else None


def resolve_birth_target(
    user: User,
    db: Session,
    profile_id: Optional[str] = None,
) -> Tuple[object, Optional[AstroProfile]]:
    """Resolve se o cálculo usa os dados do próprio usuário ou de um perfil extra."""
    clean_pid = (profile_id or "").strip()
    if not clean_pid:
        return user, None

    profile = (
        db.query(AstroProfile)
        .filter(AstroProfile.id == clean_pid, AstroProfile.owner_user_id == user.id)
        .first()
    )
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil astrológico não encontrado.",
        )
    return profile, profile


def serialize_profile(p: AstroProfile) -> dict:
    """Serializa um perfil extra para a API."""
    chart_data = p.chart_data if isinstance(p.chart_data, dict) else {}
    return {
        "id": str(p.id),
        "name": p.name,
        "relationship_label": p.relationship_label or "",
        "birth_date": p.birth_date.isoformat() if p.birth_date else None,
        "birth_time": p.birth_time.strftime("%H:%M") if p.birth_time else "12:00",
        "birth_city": p.birth_city or "",
        "birth_state": p.birth_state or "",
        "birth_country": p.birth_country or "Brasil",
        "sun_sign": p.sun_sign or "",
        "moon_sign": p.moon_sign or "",
        "rising_sign": p.rising_sign or "",
        "has_chart": bool(p.svg_content),
        "has_sections": bool(chart_data.get("sections")),
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def apply_multiple_profiles_config(
    user: User,
    role: str,
    allow_multiple: Optional[bool],
    max_extra: Optional[int],
    unlimited: bool = False,
) -> None:
    """Aplica configuração de múltiplos perfis no usuário (admins têm acesso total)."""
    if (role or "").strip().lower() in ("admin", "super_admin"):
        user.allow_multiple_profiles = True
        user.max_extra_profiles = None
        return
    if allow_multiple is not None:
        user.allow_multiple_profiles = bool(allow_multiple)
    if not user.allow_multiple_profiles:
        user.max_extra_profiles = None
    elif unlimited or max_extra == 0:
        user.max_extra_profiles = None
    elif max_extra is not None and max_extra > 0:
        user.max_extra_profiles = int(max_extra)


def serialize_panel_user(
    u: User,
    is_super: bool = False,
    is_current: bool = False,
    include_birth_summary: bool = False,
    daily_used: int = 0,
    total_used: int = 0,
) -> dict:
    """Serializa usuário do painel administrativo de forma padronizada."""
    payload = {
        "id": str(u.id),
        "name": u.name,
        "email": u.email,
        "whatsapp": u.whatsapp,
        "role": u.role,
        "is_active": u.is_active,
        "is_super_admin": is_super,
        "is_current_user": is_current,
        "access_expires_at": format_access_expires_at(u),
        "access_expired": is_user_access_expired(u),
        "allow_multiple_profiles": user_can_create_multiple_profiles(u),
        "max_extra_profiles": get_max_extra_profiles(u),
        "daily_request_limit": None if u.role == "admin" else getattr(u, "daily_request_limit", None),
        "max_total_requests": None if u.role == "admin" else getattr(u, "max_total_requests", None),
        "request_limit_mode": "strict" if u.role == "admin" else (getattr(u, "request_limit_mode", None) or "strict"),
        "daily_requests_used": 0 if u.role == "admin" else int(daily_used or 0),
        "total_requests_used": 0 if u.role == "admin" else int(total_used or 0),
    }
    if include_birth_summary:
        payload["created_at"] = u.created_at.isoformat() if u.created_at else None
        payload["sun_sign"] = u.sun_sign
        payload["birth_city"] = u.birth_city
    return payload


def delete_user_with_relations(db: Session, target_user: User) -> None:
    """Remove mapas, seções, análises, perfis extras e desvincula convites antes de excluir o usuário."""
    charts = db.query(Chart).filter(Chart.user_id == target_user.id).all()
    for ch in charts:
        db.query(ChartSection).filter(ChartSection.chart_id == ch.id).delete(synchronize_session=False)
        db.delete(ch)
    delete_user_profiles(db, target_user.id)
    db.query(Analise).filter(Analise.user_id == target_user.id).delete(synchronize_session=False)
    db.query(UserInvite).filter(UserInvite.used_by_id == target_user.id).update(
        {"used_by_id": None}, synchronize_session=False
    )
    db.query(UserInvite).filter(UserInvite.created_by_id == target_user.id).update(
        {"created_by_id": None}, synchronize_session=False
    )
    db.delete(target_user)


def delete_user_profiles(db: Session, user_id: str) -> None:
    """Desvincula análises e remove perfis extras antes de excluir um usuário."""
    db.query(Analise).filter(Analise.user_id == user_id).update(
        {"profile_id": None}, synchronize_session=False
    )
    db.query(AstroProfile).filter(AstroProfile.owner_user_id == user_id).delete(
        synchronize_session=False
    )
