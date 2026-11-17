import logging
from datetime import date, datetime, timedelta
from typing import Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import cast, Date, func
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


def _to_utc_iso(dt: Optional[datetime]) -> Optional[str]:
    """Formata datetime em ISO-8601 com sufixo Z quando naive (UTC)."""
    if not dt:
        return None
    iso = dt.isoformat()
    if dt.tzinfo is None and not iso.endswith("Z"):
        return f"{iso}Z"
    return iso


def _matches_role(item_role: Optional[str], role_filter: str) -> bool:
    """Verifica se o papel do item corresponde ao filtro selecionado."""
    if role_filter == "all":
        return True
    normalized = (item_role or "").strip().lower()
    if role_filter == "admin":
        return normalized in ("admin", "super_admin")
    return normalized == role_filter


def _sort_financeiro_items(items: list, sort_by: str) -> list:
    """Ordena lista agregada de usuários conforme critério escolhido."""
    if sort_by == "lowest_cost":
        return sorted(items, key=lambda x: x["cost_usd"], reverse=False)
    if sort_by == "newest":
        return sorted(items, key=lambda x: x.get("last_activity_at") or "", reverse=True)
    if sort_by == "oldest":
        return sorted(items, key=lambda x: x.get("last_activity_at") or "", reverse=False)
    return sorted(items, key=lambda x: x["cost_usd"], reverse=True)


def _sort_report_entries(entries: list, sort_by: str) -> list:
    """Ordena relatórios individuais (leituras ou mapas) conforme critério escolhido."""
    if sort_by == "oldest":
        return sorted(entries, key=lambda x: x.get("created_at") or "", reverse=False)
    if sort_by == "highest_cost":
        return sorted(entries, key=lambda x: x["cost_usd"], reverse=True)
    if sort_by == "lowest_cost":
        return sorted(entries, key=lambda x: x["cost_usd"], reverse=False)
    return sorted(entries, key=lambda x: x.get("created_at") or "", reverse=True)


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
    model_used = (getattr(log, "model_used", "") or "").strip().lower()
    if model_used == "salvo no painel":
        return 0, 0, 0, 0.0

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
                "last_activity_at": None,
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
        log_ts = _to_utc_iso(log.created_at)
        if log_ts and (not bucket["last_activity_at"] or log_ts > bucket["last_activity_at"]):
            bucket["last_activity_at"] = log_ts
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
        a_ts = _to_utc_iso(a.created_at)
        if a_ts and (not bucket["last_activity_at"] or a_ts > bucket["last_activity_at"]):
            bucket["last_activity_at"] = a_ts
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
    role: str = Query("all"),
    sort: str = Query("highest_cost"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Retorna o consolidado financeiro de consumo de IA (Mapas + Leituras do Dia) por usuário."""
    role_filter = (role or "all").strip().lower()
    if role_filter not in ("all", "client", "admin", "lead"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filtro de papel inválido. Use all, client, admin ou lead.",
        )

    sort_by = (sort or "highest_cost").strip().lower()
    if sort_by not in ("highest_cost", "lowest_cost", "newest", "oldest"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ordenação inválida. Use highest_cost, lowest_cost, newest ou oldest.",
        )

    d_start, d_end = _resolve_date_range(period, start_date, end_date)

    try:
        items, total_maps, total_readings = _aggregate_costs(db, d_start, d_end)

        # Gasto do mês atual (recalculado conforme papel selecionado)
        today = (datetime.utcnow() - timedelta(hours=3)).date()
        month_items, _, _ = _aggregate_costs(db, today.replace(day=1), today)
        if role_filter != "all":
            month_items = [i for i in month_items if _matches_role(i.get("role"), role_filter)]
        month_cost_usd = round(sum(i["cost_usd"] for i in month_items), 5)
        month_cost_brl = round(month_cost_usd * USD_TO_BRL, 4)

        role_filtered_items = (
            [i for i in items if _matches_role(i.get("role"), role_filter)]
            if role_filter != "all"
            else items
        )

        if search and search.strip():
            term = search.strip().lower()
            filtered_items = [
                i for i in role_filtered_items
                if term in (i["name"] or "").lower() or term in (i["email"] or "").lower()
            ]
        else:
            filtered_items = role_filtered_items

        filtered_items = _sort_financeiro_items(filtered_items, sort_by)

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

        has_filter = bool(search and search.strip()) or role_filter != "all"

        logger.info(
            f"Consulta financeira realizada por '{current_user.email}' | período={period} | papel={role_filter} | sort={sort_by} | usuários={users_count} | total=${total_cost_usd:.4f}"
        )

        return {
            "exchange_rate": USD_TO_BRL,
            "period": period,
            "role": role_filter,
            "sort": sort_by,
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
                "maps_count": filtered_maps if has_filter else total_maps,
                "readings_count": filtered_readings if has_filter else total_readings,
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


@router.get("/financeiro/user-reports")
def get_financeiro_user_reports(
    user_id: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    period: str = Query("all"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    sort: str = Query("newest"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Retorna os relatórios individuais de Leituras do Dia e Mapas Astrais de um usuário."""
    sort_by = (sort or "newest").strip().lower()
    if sort_by not in ("newest", "oldest", "highest_cost", "lowest_cost"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ordenação inválida. Use newest, oldest, highest_cost ou lowest_cost.",
        )

    clean_user_id = (user_id or "").strip() or None
    clean_email = (email or "").strip().lower() or None
    if not clean_user_id and not clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe user_id ou email para consultar relatórios.",
        )

    d_start, d_end = _resolve_date_range(period, start_date, end_date)

    try:
        target_user: Optional[User] = None
        if clean_user_id:
            target_user = db.query(User).filter(User.id == clean_user_id).first()
            if not target_user:
                # Fallback caso id venha como string e UUID exija busca linear em SQLite/tipos mistos
                for candidate in db.query(User).all():
                    if str(candidate.id) == clean_user_id:
                        target_user = candidate
                        break
        elif clean_email:
            target_user = db.query(User).filter(func.lower(User.email) == clean_email).first()

        lookup_email = (target_user.email.strip().lower() if target_user and target_user.email else clean_email)

        readings = []
        if target_user or clean_user_id:
            uid_val = target_user.id if target_user else clean_user_id
            q_analises = db.query(Analise).filter(Analise.user_id == uid_val)
            if d_start:
                q_analises = q_analises.filter(cast(Analise.created_at, Date) >= d_start)
            if d_end:
                q_analises = q_analises.filter(cast(Analise.created_at, Date) <= d_end)

            for a in q_analises.all():
                p_tok, c_tok, t_tok, cost = _extract_analise_cost(a)
                if cost == 0.0 and t_tok == 0:
                    continue
                ctx = a.contexto if isinstance(a.contexto, dict) else {}
                readings.append({
                    "id": str(a.id),
                    "data_alvo": a.data_alvo.isoformat() if a.data_alvo else None,
                    "data_fim": ctx.get("data_fim"),
                    "area": ctx.get("area"),
                    "pergunta": ctx.get("pergunta"),
                    "sintese": a.sintese or "",
                    "textos": a.textos if isinstance(a.textos, dict) else {},
                    "posicoes": a.posicoes if isinstance(a.posicoes, dict) else {},
                    "status": a.status or "concluido",
                    "prompt_tokens": p_tok,
                    "completion_tokens": c_tok,
                    "total_tokens": t_tok,
                    "cost_usd": round(cost, 5),
                    "cost_brl": round(cost * USD_TO_BRL, 4),
                    "created_at": _to_utc_iso(a.created_at),
                })

        maps = []
        if lookup_email:
            q_logs = db.query(GenerationLog).filter(func.lower(GenerationLog.email) == lookup_email)
            if d_start:
                q_logs = q_logs.filter(cast(GenerationLog.created_at, Date) >= d_start)
            if d_end:
                q_logs = q_logs.filter(cast(GenerationLog.created_at, Date) <= d_end)

            for log in q_logs.all():
                p_tok, c_tok, t_tok, cost = _extract_gen_log_cost(log)
                if cost == 0.0 and t_tok == 0:
                    continue
                maps.append({
                    "id": str(log.id),
                    "name": log.name or "—",
                    "email": log.email or lookup_email,
                    "birth_city": log.birth_city or "—",
                    "birth_date": log.birth_date or "—",
                    "birth_time": log.birth_time or "—",
                    "model_used": log.model_used or "—",
                    "status": log.status or "success",
                    "prompt_tokens": p_tok,
                    "completion_tokens": c_tok,
                    "total_tokens": t_tok,
                    "cost_usd": round(cost, 5),
                    "cost_brl": round(cost * USD_TO_BRL, 4),
                    "created_at": _to_utc_iso(log.created_at),
                })

        readings = _sort_report_entries(readings, sort_by)
        maps = _sort_report_entries(maps, sort_by)

        logger.info(
            f"Relatórios financeiros consultados por '{current_user.email}' | alvo={lookup_email or clean_user_id} | leituras={len(readings)} | mapas={len(maps)}"
        )

        return {
            "user": {
                "user_id": str(target_user.id) if target_user else clean_user_id,
                "name": target_user.name if target_user else (maps[0]["name"] if maps else "Usuário"),
                "email": target_user.email if target_user else (lookup_email or "—"),
                "role": target_user.role if target_user else "lead",
            },
            "period": period,
            "sort": sort_by,
            "readings": readings,
            "maps": maps,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Erro ao buscar relatórios financeiros do usuário: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao buscar relatórios financeiros do usuário.",
        )
