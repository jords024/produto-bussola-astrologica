"""A geração de uma leitura de trânsitos (dia único ou previsão de período).

Mora fora das rotas porque DUAS rotas precisam dela: o aluno pedindo a própria
leitura (/members/analise) e o Crassus pedindo a leitura de um cliente
(/admin/clients/{id}/analise). Mesma conta, mesmo texto, mesma síntese — muda
só quem pergunta.
"""
from __future__ import annotations

import re
import html
import logging
from datetime import date, datetime, timedelta

from fastapi import HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from models.models import Analise, User
from services.transit_service import (
    calcular_transitos,
    calcular_movimentos_periodo,
    gerar_svg,
    aplicar_contexto,
)
from services.interpretacoes import interpretacao
from services.ai_service import generate_transit_synthesis, _parse_transit_output

logger = logging.getLogger(__name__)

LIMITE_PASSADO = 365 * 2    # dois anos para trás: histórico já vivido
LIMITE_FUTURO = 365         # um ano para frente: além disso não é leitura, é adivinhação
LIMITE_PERIODO_DIAS = 90    # até 90 dias de janela para previsão de período

# Expressões que tentam quebrar contexto da IA
_PADROES_INJECAO_PROMPT = re.compile(
    r"(?i)\b(ignore (all )?previous instructions|system:|assistant:|prompt injection|desconsidere as instrucoes|esquece o que foi dito|delete all|drop table|curl |bash |sudo |rm -rf)\b"
)

def sanitizar_pergunta(texto: str | None) -> str | None:
    """Sanitiza o texto da pergunta do usuário removendo tags HTML, scripts e caracteres de código."""
    if not texto:
        return None
    # 1. Unescape caso venha codificado
    t = html.unescape(texto)
    # 2. Remove tags HTML/XML (<script>, <style>, <img>, etc)
    t = re.sub(r"<[^>]*>", " ", t)
    # 3. Remove blocos com chaves de template/código ${...} ou {{...}}
    t = re.sub(r"[{}\[\]<>\$]", "", t)
    # 4. Remove tentativas de injeção de prompt críticas
    t = _PADROES_INJECAO_PROMPT.sub("", t)
    # 5. Normaliza espaços múltiplos
    t = re.sub(r"\s+", " ", t).strip()
    return t[:300] if t else None


def dados_de_nascimento(user: User) -> tuple:
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


def serializar(a: Analise, hora_conhecida: bool = True) -> dict:
    ctx = a.contexto or {}
    sintese_limpa = a.sintese or ""
    textos_atualizados = dict(a.textos or {})

    # Proteção definitiva contra vazamento de delimitadores (=== ou --- ou CARTÕES)
    if sintese_limpa and ("===" in sintese_limpa or "---" in sintese_limpa or "CARTOES" in sintese_limpa or "CARTÕES" in sintese_limpa):
        s_extraida, cards_extraidos = _parse_transit_output(sintese_limpa)
        if s_extraida:
            sintese_limpa = s_extraida
        for pl, custom_t in cards_extraidos.items():
            if custom_t and len(custom_t.strip()) > 15:
                textos_atualizados[pl] = custom_t.strip()

    return {
        "id": a.id,
        "data": a.data_alvo.isoformat(),
        "data_fim": ctx.get("data_fim"),
        "movimentos_periodo": ctx.get("movimentos_periodo") or [],
        "posicoes": [
            {**p, "texto": textos_atualizados.get(p.get("planeta"), "")}
            for p in (a.posicoes or [])
        ],
        "contexto": {
            "area": ctx.get("area"),
            "pergunta": ctx.get("pergunta"),
            "data_fim": ctx.get("data_fim"),
        },
        "sintese": sintese_limpa,
        "svg": a.svg_content or "",
        "status": a.status,
        "openai_cost": ctx.get("openai_cost"),
        "hora_de_nascimento_conhecida": hora_conhecida,
        "created_at": a.created_at,
    }


async def gerar_analise(
    user: User,
    db: Session,
    data_alvo: date,
    data_fim: date | None = None,
    area: str | None = None,
    pergunta: str | None = None,
    forcar: bool = False,
) -> dict:
    """Calcula (ou devolve do cache) a leitura de trânsitos de uma data ou período."""
    hoje = date.today()
    if not (hoje - timedelta(days=LIMITE_PASSADO) <= data_alvo <= hoje + timedelta(days=LIMITE_FUTURO)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Escolha uma data entre dois anos atrás e um ano à frente.",
        )

    fim_valido: date | None = None
    if data_fim and data_fim > data_alvo:
        if (data_fim - data_alvo).days > LIMITE_PERIODO_DIAS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"O período máximo para previsão detalhada é de {LIMITE_PERIODO_DIAS} dias.",
            )
        if data_fim > hoje + timedelta(days=LIMITE_FUTURO):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A data final do período não pode passar de um ano à frente.",
            )
        fim_valido = data_fim

    nascimento, lat, lng, hora_conhecida = dados_de_nascimento(user)

    existente = (
        db.query(Analise)
        .filter(Analise.user_id == user.id, Analise.data_alvo == data_alvo)
        .order_by(Analise.created_at.desc())
        .first()
    )

    area_limpa = (area or "").strip().lower() or None
    pergunta_limpa = sanitizar_pergunta(pergunta)
    fim_iso = fim_valido.isoformat() if fim_valido else None

    ctx_existente = (existente.contexto or {}) if existente else {}
    tem_delimitador = bool(
        existente and existente.sintese and (
            "===" in existente.sintese or "---" in existente.sintese or "[Moon]" in existente.sintese or "[Lua]" in existente.sintese
        )
    )
    mesmo_contexto = (
        existente is not None
        and not tem_delimitador
        and ctx_existente.get("area") == area_limpa
        and ctx_existente.get("pergunta") == pergunta_limpa
        and ctx_existente.get("data_fim") == fim_iso
        and len((existente.sintese or "").split()) >= 150
    )

    if existente and not forcar and existente.status != "erro" and mesmo_contexto:
        logger.info("Análise em cache: user='%s' data=%s fim=%s", user.name, data_alvo, fim_iso)
        return serializar(existente, hora_conhecida)

    tz_str = user.tz_str or "America/Sao_Paulo"
    try:
        calculo = await run_in_threadpool(
            calcular_transitos,
            nome=user.name, nascimento=nascimento, lat=lat, lng=lng,
            tz_str=tz_str, data_alvo=data_alvo,
            cidade=user.birth_city or "", pais=user.birth_country or "BR",
        )
    except Exception as exc:
        logger.error("Cálculo de trânsitos falhou para '%s' em %s: %s",
                     user.name, data_alvo, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível calcular essa data. Tente novamente em alguns instantes.",
        )

    posicoes = calculo.get("posicoes") or []
    if not posicoes:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível calcular essa data. Tente novamente em alguns instantes.",
        )

    movimentos_periodo = []
    if fim_valido:
        try:
            movimentos_periodo = await run_in_threadpool(
                calcular_movimentos_periodo,
                nome=user.name, nascimento=nascimento, lat=lat, lng=lng,
                tz_str=tz_str, data_inicio=data_alvo, data_fim=fim_valido,
                cidade=user.birth_city or "", pais=user.birth_country or "BR",
            )
        except Exception as exc:
            logger.warning("Cálculo de movimentos do período falhou: %s", exc)

    if area_limpa:
        posicoes = aplicar_contexto(posicoes, area_limpa)

    textos = {}
    for p in posicoes:
        texto = interpretacao(p["planeta"], p["casa"])
        if texto:
            textos[p["planeta"]] = texto
        else:
            logger.warning("Sem interpretação para %s casa %s", p["planeta"], p["casa"])

    contexto = {
        "area": area_limpa,
        "pergunta": pergunta_limpa,
        "data_fim": fim_iso,
        "tipo": "periodo" if fim_valido else "dia",
        "movimentos_periodo": movimentos_periodo,
    }

    perfil_usuario = {
        "vida_agora": getattr(user, "form_vida_agora", "") or "",
        "carrega_tempo": getattr(user, "form_carrega_tempo", "") or "",
        "espera_descobrir": getattr(user, "form_espera_descobrir", "") or "",
    }

    sintese, cartoes, custo_info = await generate_transit_synthesis(
        nome=user.name,
        data_alvo=data_alvo.strftime("%d/%m/%Y"),
        posicoes=posicoes,
        textos=textos,
        contexto=contexto,
        movimentos_periodo=movimentos_periodo,
        perfil_usuario=perfil_usuario,
    )
    if cartoes:
        for pl, custom_txt in cartoes.items():
            if custom_txt and len(custom_txt.strip()) > 15:
                textos[pl] = custom_txt.strip()
                logger.info("Cartão de %s personalizado para '%s'", pl, user.name)

    if custo_info:
        contexto["openai_cost"] = custo_info

    svg = await run_in_threadpool(
        gerar_svg,
        nome=user.name, nascimento=nascimento, lat=lat, lng=lng,
        tz_str=tz_str, data_alvo=data_alvo,
        cidade=user.birth_city or "", pais=user.birth_country or "BR",
    )

    # Cria uma nova entrada no histórico para registrar a busca do usuário,
    # preservando pesquisas anteriores do mesmo dia que tiveram outras dúvidas/contextos.
    analise = Analise(user_id=user.id, data_alvo=data_alvo)
    analise.posicoes = posicoes
    analise.contexto = contexto
    analise.textos = textos
    analise.sintese = sintese
    analise.svg_content = svg
    analise.prompt_tokens = int(custo_info.get("prompt_tokens", 0) or 0) if custo_info else 0
    analise.completion_tokens = int(custo_info.get("completion_tokens", 0) or 0) if custo_info else 0
    analise.total_tokens = int(custo_info.get("total_tokens", 0) or 0) if custo_info else 0
    analise.cost_usd = float(custo_info.get("cost_usd", 0.0) or 0.0) if custo_info else 0.0
    analise.status = "ok" if sintese else "sem_ia"
    analise.created_at = datetime.utcnow()
    db.add(analise)
    db.commit()
    db.refresh(analise)

    logger.info("Análise gerada: user='%s' data=%s fim=%s | posições=%d | síntese=%s",
                user.name, data_alvo, fim_iso, len(posicoes), bool(sintese))
    return serializar(analise, hora_conhecida)
