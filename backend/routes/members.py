import io
import logging
from datetime import date, datetime, timedelta, time as dtime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from models.models import User, Chart, ChartSection, Analise
from database import get_db
from routes.auth import get_current_user
from services.pdf_service import generate_pdf
from services.podcast_service import generate_podcast
from services.notebooklm_service import generate_notebooklm_podcast, _is_available as notebooklm_available
from services.transit_service import AREAS
from services.analise_service import gerar_analise, sanitizar_pergunta
from services.interpretacoes import interpretacao
from services.ai_service import generate_transit_synthesis
from services.astro_service import generate_birth_chart
from services.geocoding_service import city_to_coordinates

router = APIRouter(prefix="/members", tags=["members"])
logger = logging.getLogger(__name__)


def _get_chart(user: User, db: Session) -> Chart:
    chart = (
        db.query(Chart)
        .filter(Chart.user_id == user.id)
        .order_by(Chart.created_at.desc())
        .first()
    )
    if not chart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mapa não encontrado.")
    return chart


@router.get("/chart")
def get_chart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chart = (
        db.query(Chart)
        .filter(Chart.user_id == current_user.id)
        .order_by(Chart.created_at.desc())
        .first()
    )
    if not chart:
        return None
    return {
        "svg": chart.svg_content,
        "sun_sign": chart.sun_sign,
        "moon_sign": chart.moon_sign,
        "rising_sign": chart.rising_sign,
        "status": chart.status,
        "created_at": chart.created_at,
    }


class MemberBirthDataRequest(BaseModel):
    name: Optional[str] = None
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


@router.get("/birth-data")
def get_member_birth_data(current_user: User = Depends(get_current_user)):
    """Retorna os dados cadastrais e de nascimento do usuário logado."""
    has_data = bool(current_user.birth_date and current_user.lat is not None and current_user.lng is not None)
    return {
        "has_data": has_data,
        "name": current_user.name or "",
        "email": current_user.email or "",
        "birth_date": current_user.birth_date.isoformat() if current_user.birth_date else None,
        "birth_time": current_user.birth_time.strftime("%H:%M") if current_user.birth_time else "12:00",
        "birth_city": current_user.birth_city or "",
        "birth_state": current_user.birth_state or "",
        "birth_country": current_user.birth_country or "Brasil",
        "sun_sign": current_user.sun_sign or "",
        "moon_sign": current_user.moon_sign or "",
        "rising_sign": current_user.rising_sign or "",
        "focus_areas": current_user.focus_areas or [],
    }


@router.post("/birth-data")
async def save_member_birth_data(
    body: MemberBirthDataRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Coleta e salva os dados de nascimento do usuário logado, calcula as coordenadas,
    gera o mapa natal astronômico (SVG e signos) e salva no banco.
    """
    import asyncio

    if body.name and body.name.strip():
        current_user.name = body.name.strip()

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
        except Exception as e:
            logger.warning(f"Geocoding fallback em save_member_birth_data: {e}")
            coords = {"lat": -23.5505, "lng": -46.6333, "tz_str": "America/Sao_Paulo"}

    tz_str = coords.get("tz_str") or "America/Sao_Paulo"

    try:
        hour, minute = [int(p) for p in (body.birth_time or "12:00").split(":")]
    except Exception:
        hour, minute = 12, 0

    try:
        astro = await asyncio.to_thread(
            generate_birth_chart,
            name=current_user.name,
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
    except Exception as e:
        logger.error(f"Erro ao calcular mapa natal do membro: {e}", exc_info=True)
        chart_data = {}
        svg_content = ""
        sun_sign = ""
        moon_sign = ""
        rising_sign = ""

    current_user.birth_date = body.birth_date
    current_user.birth_time = dtime(hour, minute)
    current_user.birth_city = birth_city
    current_user.birth_state = body.birth_state or ""
    current_user.birth_country = body.birth_country or "Brasil"
    current_user.tz_str = tz_str
    current_user.lat = coords.get("lat")
    current_user.lng = coords.get("lng")
    if sun_sign:
        current_user.sun_sign = sun_sign
    if moon_sign:
        current_user.moon_sign = moon_sign
    if rising_sign:
        current_user.rising_sign = rising_sign
    if body.focus_areas:
        current_user.focus_areas = body.focus_areas

    # Atualiza ou cria o Chart do usuário
    chart = (
        db.query(Chart)
        .filter(Chart.user_id == current_user.id)
        .order_by(Chart.created_at.desc())
        .first()
    )
    if not chart:
        chart = Chart(user_id=current_user.id)
        db.add(chart)

    chart.chart_data = chart_data
    chart.svg_content = svg_content
    chart.sun_sign = sun_sign
    chart.moon_sign = moon_sign
    chart.rising_sign = rising_sign
    chart.status = "ready"
    chart.created_at = datetime.utcnow()

    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "message": "Dados de nascimento atualizados e Bússola calibrada com sucesso!",
        "user": {
            "name": current_user.name,
            "birth_date": current_user.birth_date.isoformat(),
            "birth_time": current_user.birth_time.strftime("%H:%M") if current_user.birth_time else "12:00",
            "birth_city": current_user.birth_city,
            "birth_state": current_user.birth_state,
            "birth_country": current_user.birth_country,
            "sun_sign": current_user.sun_sign,
            "moon_sign": current_user.moon_sign,
            "rising_sign": current_user.rising_sign,
        },
        "has_chart": bool(svg_content),
    }


@router.get("/sections")
def list_sections(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chart = _get_chart(current_user, db)
    sections = (
        db.query(ChartSection)
        .filter(ChartSection.chart_id == chart.id)
        .order_by(ChartSection.section_order)
        .all()
    )
    return [{"section_key": s.section_key, "section_order": s.section_order} for s in sections]


# Retrocompatibilidade: mapeia chaves novas → legadas e legadas → novas
_NEW_TO_OLD_KEY = {
    "portal":          "introducao",
    "essencia":        "primeiro_portal",
    "ferida_e_dom":    "segundo_portal",
    "dons_esquecidos": "terceiro_portal",
    "luz_e_sombra":    "quarto_portal",
    "reencontro":      "quinto_portal",
}
# Inverso: chave legada → chave nova
_OLD_TO_NEW_KEY = {v: k for k, v in _NEW_TO_OLD_KEY.items()}


@router.get("/sections/{section_key}")
def get_section(
    section_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chart = _get_chart(current_user, db)

    # Tenta primeiro com a chave nova, depois com a chave legada (clientes antigos)
    candidate_keys = [section_key]
    legacy_key = _NEW_TO_OLD_KEY.get(section_key)
    if legacy_key:
        candidate_keys.append(legacy_key)

    section = (
        db.query(ChartSection)
        .filter(
            ChartSection.chart_id == chart.id,
            ChartSection.section_key.in_(candidate_keys),
        )
        .first()
    )
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Seção '{section_key}' não encontrada.",
        )
    # Retorna sempre com a chave nova (seção solicitada) para o frontend
    return {"section_key": section_key, "content": section.content}


@router.get("/chart/pdf")
def download_pdf(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chart = _get_chart(current_user, db)
    sections = (
        db.query(ChartSection)
        .filter(ChartSection.chart_id == chart.id)
        .order_by(ChartSection.section_order)
        .all()
    )
    sections_dict = {s.section_key: s.content for s in sections}
    logger.info(
        "PDF request: user='%s' | chart_id=%s | sections_keys=%s | has_svg=%s",
        current_user.name,
        chart.id,
        sorted(sections_dict.keys()),
        bool(chart.svg_content),
    )

    # Formata data de nascimento
    birth_date_str = ""
    if current_user.birth_date:
        try:
            birth_date_str = current_user.birth_date.strftime("%d/%m/%Y")
        except Exception:
            birth_date_str = str(current_user.birth_date)

    pdf_bytes = generate_pdf(
        name=current_user.name,
        sun_sign=current_user.sun_sign or "",
        moon_sign=current_user.moon_sign or "",
        rising_sign=current_user.rising_sign or "",
        birth_date=birth_date_str,
        birth_city=current_user.birth_city or "",
        birth_country=getattr(current_user, "birth_country", "Brasil") or "Brasil",
        sections=sections_dict,
        svg_content=chart.svg_content or "",
    )

    filename = f"mapa-{current_user.name.lower().replace(' ', '-')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/podcast/engine")
def podcast_engine(current_user: User = Depends(get_current_user)):
    """Informa qual engine de podcast está ativa."""
    return {"engine": "notebooklm" if notebooklm_available() else "openai-tts"}


@router.post("/podcast")
async def generate_user_podcast(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Gera o podcast da alma do usuário — roteiro via GPT-4o + áudio via TTS dual-voice.
    Retorna MP3 pronto para reprodução/download.
    """
    chart = _get_chart(current_user, db)
    sections = (
        db.query(ChartSection)
        .filter(ChartSection.chart_id == chart.id)
        .order_by(ChartSection.section_order)
        .all()
    )
    # Normaliza chaves legadas → novas para que o podcast service encontre o conteúdo
    # (clientes antigos têm "introducao", "primeiro_portal", etc.)
    sections_dict = {
        _OLD_TO_NEW_KEY.get(s.section_key, s.section_key): s.content
        for s in sections
    }

    sections_with_content = [k for k, v in sections_dict.items() if v and v.strip()]
    logger.info(
        "🎙️ Podcast request: user='%s' | chart_id=%s | total_sections=%d | com_conteudo=%d | signos=%s/%s/%s",
        current_user.name,
        chart.id,
        len(sections),
        len(sections_with_content),
        current_user.sun_sign or "N/A",
        current_user.moon_sign or "N/A",
        current_user.rising_sign or "N/A",
    )

    form_answers = {
        "vida_agora":       getattr(current_user, "form_vida_agora",       "") or "",
        "carrega_tempo":    getattr(current_user, "form_carrega_tempo",    "") or "",
        "espera_descobrir": getattr(current_user, "form_espera_descobrir", "") or "",
    }

    try:
        # Usa NotebookLM se configurado, senão OpenAI TTS
        if notebooklm_available():
            logger.info("Gerando podcast via NotebookLM para '%s'", current_user.name)
            mp3_bytes = await generate_notebooklm_podcast(
                name=current_user.name,
                sun_sign=current_user.sun_sign or "",
                moon_sign=current_user.moon_sign or "",
                rising_sign=current_user.rising_sign or "",
                sections=sections_dict,
                form_answers=form_answers,
            )
        else:
            logger.info("Gerando podcast via OpenAI TTS para '%s'", current_user.name)
            mp3_bytes = await generate_podcast(
                name=current_user.name,
                sun_sign=current_user.sun_sign or "",
                moon_sign=current_user.moon_sign or "",
                rising_sign=current_user.rising_sign or "",
                sections=sections_dict,
                form_answers=form_answers,
            )
    except ValueError as e:
        # Erros de validação (mapa vazio, etc.) — 422 com mensagem amigável
        logger.warning("Podcast bloqueado para '%s': %s", current_user.name, e)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        logger.error("Erro ao gerar podcast para '%s': %s", current_user.name, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao gerar o podcast. Tente novamente em alguns instantes.",
        )

    safe_name = current_user.name.lower().replace(" ", "-")
    return StreamingResponse(
        io.BytesIO(mp3_bytes),
        media_type="audio/mpeg",
        headers={"Content-Disposition": f'attachment; filename="podcast-{safe_name}.mp3"'},
    )


# =============================================================================
# ANÁLISE DO DIA
#
# A pessoa escolhe uma data, o sistema diz onde os cinco planetas rápidos estão
# pisando no mapa DELA e o que isso abre. É o que ela volta para usar: o mapa
# natal se lê uma vez, isto se consulta sempre.
#
# Guardamos cada análise por (usuário, data) e reaproveitamos: o mesmo dia dá o
# mesmo céu, então recalcular é pagar IA duas vezes pela mesma resposta.
# `forcar=true` ignora o cache, para quando o Crassus revisar os 60 textos.
# =============================================================================

_LIMITE_PASSADO = 365 * 2    # dois anos para trás: histórico já vivido
_LIMITE_FUTURO = 365         # um ano para frente: além disso não é leitura, é adivinhação


class AnaliseRequest(BaseModel):
    data: date
    data_fim: Optional[date] = None
    forcar: bool = False
    # O que está em jogo para a pessoa nesta leitura. Vem junto com a data, e
    # não do cadastro: pergunta guardada no perfil envelhece em duas semanas.
    area: Optional[str] = None
    pergunta: Optional[str] = None

    @field_validator("pergunta")
    @classmethod
    def validar_pergunta(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        return sanitizar_pergunta(v)

    @field_validator("area")
    @classmethod
    def validar_area(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        limpa = v.strip().lower()
        return limpa if limpa in AREAS else None


def _dados_de_nascimento(user: User) -> tuple:
    """Confere o que o cálculo exige e devolve pronto. 422 quando falta."""
    faltando = [
        campo for campo, valor in (
            ("data de nascimento", user.birth_date),
            ("latitude", user.lat),
            ("longitude", user.lng),
        ) if valor in (None, "")
    ]
    if faltando:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Faltam dados de nascimento para calcular: {', '.join(faltando)}.",
        )

    hora = user.birth_time
    nascimento = datetime(
        user.birth_date.year, user.birth_date.month, user.birth_date.day,
        hora.hour if hora else 12, hora.minute if hora else 0,
    )
    return nascimento, float(user.lat), float(user.lng), bool(hora)


def _serializar(a: Analise, hora_conhecida: bool = True) -> dict:
    ctx = a.contexto or {}
    return {
        "id": a.id,
        "data": a.data_alvo.isoformat(),
        "data_fim": ctx.get("data_fim"),
        "movimentos_periodo": ctx.get("movimentos_periodo") or [],
        "posicoes": [
            {**p, "texto": (a.textos or {}).get(p.get("planeta"), "")}
            for p in (a.posicoes or [])
        ],
        "contexto": ctx,
        "sintese": a.sintese or "",
        "svg": a.svg_content or "",
        "status": a.status,
        "openai_cost": ctx.get("openai_cost"),
        "hora_de_nascimento_conhecida": hora_conhecida,
        "created_at": a.created_at,
    }


@router.post("/analise")
async def criar_analise(
    body: AnaliseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """A leitura da própria pessoa. A conta mora no serviço, que o painel usa também."""
    return await gerar_analise(
        user=current_user, db=db, data_alvo=body.data, data_fim=body.data_fim,
        area=body.area, pergunta=body.pergunta, forcar=body.forcar,
    )


@router.get("/analises")
def listar_analises(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Histórico de buscas e leituras do usuário, da mais recente para trás."""
    analises = (
        db.query(Analise)
        .filter(Analise.user_id == current_user.id)
        .order_by(Analise.created_at.desc())
        .limit(100)
        .all()
    )
    itens = []
    for a in analises:
        ctx = a.contexto or {}
        destaque = None
        for p in (a.posicoes or []):
            if p.get("destaque"):
                destaque = p.get("planeta_pt") or p.get("planeta")
                break
        sintese_txt = (a.sintese or "").strip()
        preview = (sintese_txt[:180] + "...") if len(sintese_txt) > 180 else sintese_txt

        itens.append({
            "id": str(a.id),
            "data": a.data_alvo.isoformat(),
            "data_fim": ctx.get("data_fim"),
            "tipo": ctx.get("tipo") or ("periodo" if ctx.get("data_fim") else "dia"),
            "pergunta": ctx.get("pergunta"),
            "area": ctx.get("area"),
            "sintese_preview": preview,
            "planeta_destaque": destaque,
            "status": a.status,
            "tem_sintese": bool(a.sintese),
            "contexto": ctx,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })
    return itens


@router.get("/analises/{analise_id}")
def obter_analise_por_id(
    analise_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retorna uma leitura específica do histórico de buscas pelo ID."""
    analise = (
        db.query(Analise)
        .filter(Analise.id == analise_id, Analise.user_id == current_user.id)
        .first()
    )
    if not analise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leitura não encontrada.")
    hora_conhecida = bool(current_user.birth_time)
    return _serializar(analise, hora_conhecida)


@router.delete("/analises/{analise_id}")
def deletar_analise(
    analise_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove uma pesquisa do histórico de buscas do usuário."""
    analise = (
        db.query(Analise)
        .filter(Analise.id == analise_id, Analise.user_id == current_user.id)
        .first()
    )
    if not analise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leitura não encontrada.")
    db.delete(analise)
    db.commit()
    return {"ok": True, "message": "Pesquisa removida do histórico."}


@router.get("/areas")
def listar_areas(current_user: User = Depends(get_current_user)):
    """As áreas que a pessoa pode apontar como em jogo na leitura.

    Sai do backend e não do frontend porque é o mesmo mapa que decide a
    reordenação: duas listas separadas sairiam do ar uma da outra.
    """
    return [{"id": k, "rotulo": v["rotulo"]} for k, v in AREAS.items()]
