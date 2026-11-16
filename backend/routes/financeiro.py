import logging
from datetime import date, datetime, timedelta
from typing import Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import cast, Date
from sqlalchemy.orm import Session

from database import get_db
from models.models import User, GenerationLog, Analise
from routes.auth import require_admin

router = APIRouter(prefix="/admin", tags=["financeiro"])
logger = logging.getLogger(__name__)

USD_TO_BRL = 5.60
LEGACY_MAP_COST_USD = 0.0245
LEGACY_MAP_PROMPT_TOKENS = 1800
LEGACY_MAP_COMPLETION_TOKENS = 2000


def _resolve_date_range(
    period: str,
    start_date: Optional[str],
    end_date: Optional[str],
) -> Tuple[Optional[date], Optional[date]]:
    """Resolve o intervalo de datas (inclusivo) de acordo com o filtro selecionado."""
    today = (datetime.utcnow() - timedelta(hours=3)).date()
    p = (period or "all").strip().lower()

    if p == "all":
        return None, None
    if p == "today":
        return today, today
    if p == "7d":
        return today - timedelta(days=6), today
    if p == "month":
        return today.replace(day=1), today
    if p == "last_month":
        first_this_month = today.replace(day=1)
        last_prev = first_this_month - timedelta(days=1)
        return last_prev.replace(day=1), last_prev
    if p == "custom":
        try:
            d_start = date.fromisoformat(start_date) if start_date else None
            d_end = date.fromisoformat(end_date) if end_date else None
            return d_start, d_end
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de data inválido. Use YYYY-MM-DD.",
            )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Período inválido. Use: all, today, 7d, month, last_month ou custom.",
    )


def _extract_analise_cost(a: Analise) -> Tuple[int, int, int, float]:
    """Obtém tokens e custo em USD de uma análise, com fallback para contexto['openai_cost']."""
    p_tok = int(getattr(a, "prompt_tokens", 0) or 0)
    c_tok = int(getattr(a, "completion_tokens", 0) or 0)
    t_tok = int(getattr(a, "total_tokens", 0) or (p_tok + c_tok))
    cost = float(getattr(a, "cost_usd", 0.0) or 0.0)

    if cost == 0.0 and isinstance(a.contexto, dict):
        legacy_cost = a.contexto.get("openai_cost")
        if isinstance(legacy_cost, dict):
            p_tok = int(legacy_cost.get("prompt_tokens", 0) or 0)
            c_tok = int(legacy_cost.get("completion_tokens", 0) or 0)
            t_tok = int(legacy_cost.get("total_tokens", 0) or (p_tok + c_tok))
            cost = float(legacy_cost.get("cost_usd", 0.0) or 0.0)

    return p_tok, c_tok, t_tok, cost


def _extract_gen_log_cost(log: GenerationLog) -> Tuple[int, int, int, float]:
    """Obtém tokens e custo em USD de um log de geração de mapa, incluindo estimativa legada."""
    p_tok = int(getattr(log, "prompt_tokens", 0) or 0)
    c_tok = int(getattr(log, "completion_tokens", 0) or 0)
    t_tok = int(getattr(log, "total_tokens", 0) or (p_tok + c_tok))
    cost = float(getattr(log, "cost_usd", 0.0) or 0.0)

    if cost == 0.0 and log.status in ("success", "ready"):
        cost = LEGACY_MAP_COST_USD
        p_tok = LEGACY_MAP_PROMPT_TOKENS
        c_tok = LEGACY_MAP_COMPLETION_TOKENS
        t_tok = p_tok + c_tok

    return p_tok, c_tok, t_tok, cost


def _aggregate_costs(
    db: Session,
    d_start: Optional[date],
    d_end: Optional[date],
):
    """Agrega consumo de Mapas (GenerationLog) e Leituras do Dia (Analise) por usuário."""
    users_by_email = {}
    users_by_id = {}
    for u in db.query(User).all():
        users_by_id[str(u.id)] = u
        if u.email:
            users_by_email[u.email.strip().lower()] = u

    per_user = {}

    def _get_bucket(key: str, user_obj: Optional[User], fallback_name: str, fallback_email: str):
        if key not in per_user:
            per_user[key] = {
                "user_id": str(user_obj.id) if user_obj else None,
                "name": user_obj.name if user_obj else (fallback_name or "Usuário"),
                "email": user_obj.email if user_obj else (fallback_email or "—"),
                "role": user_obj.role if user_obj else "lead",
                "maps_count": 0,
                "readings_count": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
                "cost_usd": 0.0,
            }
        return per_user[key]

    # 1. Mapas (GenerationLog)
    q_logs = db.query(GenerationLog)
    if d_start:
        q_logs = q_logs.filter(cast(GenerationLog.created_at, Date) >= d_start)
    if d_end:
        q_logs = q_logs.filter(cast(GenerationLog.created_at, Date) <= d_end)

    total_maps = 0
    for log in q_logs.all():
        p_tok, c_tok, t_tok, cost = _extract_gen_log_cost(log)
        if cost == 0.0 and t_tok == 0:
            continue
        clean_email = (log.email or "").strip().lower()
        u_obj = users_by_email.get(clean_email)
        key = f"user:{u_obj.id}" if u_obj else f"email:{clean_email or log.id}"
        bucket = _get_bucket(key, u_obj, log.name, log.email)
        bucket["maps_count"] += 1
        bucket["prompt_tokens"] += p_tok
        bucket["completion_tokens"] += c_tok
        bucket["total_tokens"] += t_tok
        bucket["cost_usd"] += cost
        total_maps += 1

    # 2. Leituras do Dia (Analise)
    q_analises = db.query(Analise)
    if d_start:
        q_analises = q_analises.filter(cast(Analise.created_at, Date) >= d_start)
    if d_end:
        q_analises = q_analises.filter(cast(Analise.created_at, Date) <= d_end)

    total_readings = 0
    for a in q_analises.all():
        p_tok, c_tok, t_tok, cost = _extract_analise_cost(a)
        if cost == 0.0 and t_tok == 0:
            continue
        uid = str(a.user_id)
        u_obj = users_by_id.get(uid)
        key = f"user:{uid}"
        bucket = _get_bucket(key, u_obj, "Usuário Removido", "—")
        bucket["readings_count"] += 1
        bucket["prompt_tokens"] += p_tok
        bucket["completion_tokens"] += c_tok
        bucket["total_tokens"] += t_tok
        bucket["cost_usd"] += cost
        total_readings += 1

    items = []
    for entry in per_user.values():
        entry["cost_brl"] = round(entry["cost_usd"] * USD_TO_BRL, 4)
        entry["cost_usd"] = round(entry["cost_usd"], 5)
        items.append(entry)

    items.sort(key=lambda x: x["cost_usd"], reverse=True)
    return items, total_maps, total_readings


@router.get("/financeiro")
def get_financeiro_summary(
    period: str = Query("all"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Retorna o consolidado financeiro de consumo de IA (Mapas + Leituras do Dia) por usuário."""
    d_start, d_end = _resolve_date_range(period, start_date, end_date)

    try:
        items, total_maps, total_readings = _aggregate_costs(db, d_start, d_end)

        # Gasto do mês atual (sempre calculado para o card de referência mensal)
        today = (datetime.utcnow() - timedelta(hours=3)).date()
        month_items, _, _ = _aggregate_costs(db, today.replace(day=1), today)
        month_cost_usd = round(sum(i["cost_usd"] for i in month_items), 5)
        month_cost_brl = round(month_cost_usd * USD_TO_BRL, 4)

        if search and search.strip():
            term = search.strip().lower()
            filtered_items = [
                i for i in items
                if term in (i["name"] or "").lower() or term in (i["email"] or "").lower()
            ]
        else:
            filtered_items = items

        total_cost_usd = round(sum(i["cost_usd"] for i in filtered_items), 5)
        total_cost_brl = round(total_cost_usd * USD_TO_BRL, 4)
        total_prompt_tokens = sum(i["prompt_tokens"] for i in filtered_items)
        total_completion_tokens = sum(i["completion_tokens"] for i in filtered_items)
        total_tokens = sum(i["total_tokens"] for i in filtered_items)
        filtered_maps = sum(i["maps_count"] for i in filtered_items)
        filtered_readings = sum(i["readings_count"] for i in filtered_items)

        users_count = len(filtered_items)
        avg_cost_usd = round(total_cost_usd / users_count, 5) if users_count > 0 else 0.0
        avg_cost_brl = round(avg_cost_usd * USD_TO_BRL, 4)

        logger.info(
            f"Consulta financeira realizada por '{current_user.email}' | período={period} | usuários={users_count} | total=${total_cost_usd:.4f}"
        )

        return {
            "exchange_rate": USD_TO_BRL,
            "period": period,
            "summary": {
                "total_cost_usd": total_cost_usd,
                "total_cost_brl": total_cost_brl,
                "month_cost_usd": month_cost_usd,
                "month_cost_brl": month_cost_brl,
                "total_prompt_tokens": total_prompt_tokens,
                "total_completion_tokens": total_completion_tokens,
                "total_tokens": total_tokens,
                "avg_cost_per_user_usd": avg_cost_usd,
                "avg_cost_per_user_brl": avg_cost_brl,
                "users_count": users_count,
                "maps_count": filtered_maps if search else total_maps,
                "readings_count": filtered_readings if search else total_readings,
            },
            "users": filtered_items,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Erro ao calcular resumo financeiro: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao calcular dados financeiros.",
        )
