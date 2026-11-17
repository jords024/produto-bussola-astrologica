import asyncio
import logging
import uuid
from datetime import date, datetime, time as dtime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.models import Analise, AstroProfile, GenerationLog, User
from routes.auth import get_current_user
from services.access_service import require_active_ai_access
from services.ai_service import generate_sections
from services.astro_service import generate_birth_chart
from services.geocoding_service import city_to_coordinates
from services.profile_service import (
    get_max_extra_profiles,
    serialize_profile,
    user_can_create_multiple_profiles,
)

router = APIRouter(prefix="/members", tags=["profiles"])
logger = logging.getLogger(__name__)


class AstroProfilePayload(BaseModel):
    name: str
    relationship_label: Optional[str] = ""
    birth_date: date
    birth_time: Optional[str] = "12:00"
    birth_city: str
    birth_state: Optional[str] = ""
    birth_country: Optional[str] = "Brasil"
    lat: Optional[float] = None
    lng: Optional[float] = None
    tz_str: Optional[str] = None
    is_dst: Optional[bool] = None
    focus_areas: Optional[List[str]] = []


async def _build_profile_chart(
    name: str,
    body: AstroProfilePayload,
    owner_email: str,
    db: Session,
) -> tuple[dict, str, str, str, str, dict, str]:
    """Calcula coordenadas, mapa natal astronômico e gera as seções completas via IA."""
    birth_city = (body.birth_city or "").strip()
    if body.lat is not None and body.lng is not None:
        coords = {
            "lat": float(body.lat),
            "lng": float(body.lng),
            "tz_str": body.tz_str or "America/Sao_Paulo",
        }
    else:
        try:
            coords = await asyncio.to_thread(
                city_to_coordinates,
                birth_city,
                body.birth_state or "",
                body.birth_country or "Brasil",
            )
        except Exception as exc:
            logger.warning(f"Geocoding fallback em perfil extra: {exc}")
            coords = {"lat": -23.5505, "lng": -46.6333, "tz_str": "America/Sao_Paulo"}

    tz_str = coords.get("tz_str") or "America/Sao_Paulo"
    try:
        hour, minute = [int(p) for p in (body.birth_time or "12:00").split(":")]
    except Exception:
        hour, minute = 12, 0

    astro = await asyncio.to_thread(
        generate_birth_chart,
        name=name,
        year=body.birth_date.year,
        month=body.birth_date.month,
        day=body.birth_date.day,
        hour=hour,
        minute=minute,
        lat=coords["lat"],
        lng=coords["lng"],
        tz_str=tz_str,
        is_dst=body.is_dst,
        city_name=birth_city,
        country_name=body.birth_country or "Brasil",
    )
    chart_data = astro.get("chart_data", {})
    svg_content = astro.get("svg", "")
    sun_sign = chart_data.get("sun", {}).get("sign", "")
    moon_sign = chart_data.get("moon", {}).get("sign", "")
    rising_sign = chart_data.get("rising", {}).get("sign", "")

    custo_info = None
    try:
        sections_dict, custo_info = await generate_sections(
            chart_data=chart_data,
            form_answers={"vida_agora": "", "carrega_tempo": "", "espera_descobrir": ""},
            focus_areas=body.focus_areas or [],
            name=name,
            return_cost=True,
        )
    except Exception as exc:
        logger.warning(f"Fallback de seções para perfil '{name}': {exc}")
        sections_dict = {
            "portal": f"Mapa astral astronômico calculado para {name} (Sol em {sun_sign or '—'}, Lua em {moon_sign or '—'}, Ascendente em {rising_sign or '—'})."
        }

    chart_data["sections"] = sections_dict

    if custo_info:
        gen_log = GenerationLog(
            id=str(uuid.uuid4()),
            name=name,
            email=owner_email,
            whatsapp="",
            birth_city=birth_city,
            birth_date=body.birth_date.isoformat(),
            birth_time=f"{hour:02d}:{minute:02d}",
            status="success",
            error_message="",
            model_used=custo_info.get("model", "gpt-4o"),
            prompt_tokens=int(custo_info.get("prompt_tokens", 0) or 0),
            completion_tokens=int(custo_info.get("completion_tokens", 0) or 0),
            total_tokens=int(custo_info.get("total_tokens", 0) or 0),
            cost_usd=float(custo_info.get("cost_usd", 0.0) or 0.0),
            cost_brl=float(custo_info.get("cost_brl", 0.0) or 0.0),
        )
        db.add(gen_log)

    return chart_data, svg_content, sun_sign, moon_sign, rising_sign, coords, tz_str


@router.get("/profiles")
def list_member_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista os perfis extras cadastrados pelo usuário e suas permissões/limites."""
    can_create = user_can_create_multiple_profiles(current_user)
    max_limit = get_max_extra_profiles(current_user)
    profiles = (
        db.query(AstroProfile)
        .filter(AstroProfile.owner_user_id == current_user.id)
        .order_by(AstroProfile.created_at.desc())
        .all()
    )
    used = len(profiles)
    remaining = None if (can_create and max_limit is None) else (max(0, max_limit - used) if can_create and max_limit is not None else 0)
    return {
        "allow_multiple_profiles": can_create,
        "max_extra_profiles": max_limit,
        "used_extra_profiles": used,
        "remaining_extra_profiles": remaining,
        "profiles": [serialize_profile(p) for p in profiles],
    }


@router.post("/profiles", status_code=status.HTTP_201_CREATED)
async def create_member_profile(
    body: AstroProfilePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cadastra uma nova pessoa vinculada ao usuário e gera seu Mapa Astral completo."""
    require_active_ai_access(current_user)
    if not user_can_create_multiple_profiles(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seu perfil não possui permissão para cadastrar múltiplas pessoas.",
        )

    max_limit = get_max_extra_profiles(current_user)
    current_count = db.query(AstroProfile).filter(AstroProfile.owner_user_id == current_user.id).count()
    if max_limit is not None and current_count >= max_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Limite máximo de {max_limit} pessoa(s) atingido.",
        )

    clean_name = (body.name or "").strip()
    if not clean_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Informe o nome completo da pessoa.")
    clean_city = (body.birth_city or "").strip()
    if not clean_city:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Informe a cidade de nascimento.")

    try:
        hour, minute = [int(p) for p in (body.birth_time or "12:00").split(":")]
    except Exception:
        hour, minute = 12, 0

    chart_data, svg_content, sun_sign, moon_sign, rising_sign, coords, tz_str = await _build_profile_chart(
        clean_name, body, current_user.email or "", db
    )

    profile = AstroProfile(
        id=str(uuid.uuid4()),
        owner_user_id=current_user.id,
        name=clean_name,
        relationship_label=(body.relationship_label or "").strip(),
        birth_date=body.birth_date,
        birth_time=dtime(hour, minute),
        birth_city=clean_city,
        birth_state=(body.birth_state or "").strip(),
        birth_country=(body.birth_country or "Brasil").strip(),
        tz_str=tz_str,
        lat=coords.get("lat"),
        lng=coords.get("lng"),
        sun_sign=sun_sign,
        moon_sign=moon_sign,
        rising_sign=rising_sign,
        svg_content=svg_content,
        chart_data=chart_data,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    logger.info(f"Perfil extra '{profile.name}' cadastrado por '{current_user.email}'.")
    return {
        "success": True,
        "message": f"Mapa Astral de {profile.name} gerado e salvo com sucesso!",
        "profile": serialize_profile(profile),
    }


@router.put("/profiles/{profile_id}")
async def update_member_profile(
    profile_id: str,
    body: AstroProfilePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Atualiza os dados de uma pessoa cadastrada e recalcula seu Mapa Astral completo."""
    require_active_ai_access(current_user)
    profile = (
        db.query(AstroProfile)
        .filter(AstroProfile.id == profile_id, AstroProfile.owner_user_id == current_user.id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil não encontrado.")

    clean_name = (body.name or "").strip()
    if not clean_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Informe o nome completo da pessoa.")
    clean_city = (body.birth_city or "").strip()
    if not clean_city:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Informe a cidade de nascimento.")

    try:
        hour, minute = [int(p) for p in (body.birth_time or "12:00").split(":")]
    except Exception:
        hour, minute = 12, 0

    chart_data, svg_content, sun_sign, moon_sign, rising_sign, coords, tz_str = await _build_profile_chart(
        clean_name, body, current_user.email or "", db
    )

    profile.name = clean_name
    profile.relationship_label = (body.relationship_label or "").strip()
    profile.birth_date = body.birth_date
    profile.birth_time = dtime(hour, minute)
    profile.birth_city = clean_city
    profile.birth_state = (body.birth_state or "").strip()
    profile.birth_country = (body.birth_country or "Brasil").strip()
    profile.tz_str = tz_str
    profile.lat = coords.get("lat")
    profile.lng = coords.get("lng")
    profile.sun_sign = sun_sign
    profile.moon_sign = moon_sign
    profile.rising_sign = rising_sign
    profile.svg_content = svg_content
    profile.chart_data = chart_data
    profile.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(profile)

    return {
        "success": True,
        "message": f"Dados e Mapa Astral de {profile.name} atualizados com sucesso!",
        "profile": serialize_profile(profile),
    }


@router.delete("/profiles/{profile_id}")
def delete_member_profile(
    profile_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove um perfil extra cadastrado pelo usuário (preservando histórico no diário)."""
    profile = (
        db.query(AstroProfile)
        .filter(AstroProfile.id == profile_id, AstroProfile.owner_user_id == current_user.id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil não encontrado.")

    db.query(Analise).filter(Analise.profile_id == profile.id).update(
        {"profile_id": None}, synchronize_session=False
    )
    db.delete(profile)
    db.commit()
    return {"success": True, "message": "Perfil removido com sucesso."}
