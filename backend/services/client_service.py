import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.models import User, Chart, ChartSection, GenerationLog

logger = logging.getLogger("bussola")


def resolve_client_user(client_id: str, db: Session) -> Optional[User]:
    """
    Localiza um usuário a partir do ID do usuário, ID de um Chart
    ou ID de um GenerationLog (buscando pelo email do log).
    """
    if not client_id:
        return None

    # 1. Busca direta por User.id
    user = db.query(User).filter(User.id == client_id).first()
    if user:
        return user

    # 2. Busca via Chart.id -> user_id
    chart = db.query(Chart).filter(Chart.id == client_id).first()
    if chart and chart.user_id:
        user = db.query(User).filter(User.id == chart.user_id).first()
        if user:
            return user

    # 3. Busca via GenerationLog.id -> email
    gen_log = db.query(GenerationLog).filter(GenerationLog.id == client_id).first()
    if gen_log and gen_log.email:
        user = db.query(User).filter(func.lower(User.email) == gen_log.email.strip().lower()).first()
        if user:
            return user

    return None


def get_client_detail_polymorphic(client_id: str, db: Session) -> Optional[Dict[str, Any]]:
    """
    Retorna a estrutura completa de detalhes do cliente/mapa de forma polimórfica:
    - Se encontrar o User (ou através de Chart ou GenerationLog com conta), retorna o perfil completo e o chart.
    - Se o ID for de um GenerationLog sem User cadastrado, monta os dados informativos a partir do log.
    - Se nada for encontrado, retorna None.
    """
    # 1. Tenta resolver usuário
    user = resolve_client_user(client_id, db)
    if user:
        chart = (
            db.query(Chart)
            .filter(Chart.user_id == user.id)
            .order_by(Chart.created_at.desc())
            .first()
        )
        sections = []
        if chart:
            sections = (
                db.query(ChartSection)
                .filter(ChartSection.chart_id == chart.id)
                .order_by(ChartSection.section_order)
                .all()
            )

        openai_cost = None
        if chart and isinstance(chart.chart_data, dict) and "openai_cost" in chart.chart_data:
            openai_cost = chart.chart_data["openai_cost"]
        else:
            g_log = db.query(GenerationLog).filter(
                GenerationLog.email == user.email
            ).order_by(GenerationLog.created_at.desc()).first()
            if g_log and g_log.cost_usd:
                openai_cost = {
                    "model": g_log.model_used or "gpt-5.6-sol",
                    "prompt_tokens": g_log.prompt_tokens or 0,
                    "completion_tokens": g_log.completion_tokens or 0,
                    "total_tokens": g_log.total_tokens or 0,
                    "cost_usd": g_log.cost_usd,
                    "cost_brl": g_log.cost_brl,
                    "cost_formatted_usd": f"${g_log.cost_usd:.4f}",
                    "cost_formatted_brl": f"R$ {g_log.cost_brl:.4f}" if g_log.cost_brl else None,
                }

        return {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "whatsapp": user.whatsapp,
            "birth_date": user.birth_date,
            "birth_time": str(user.birth_time) if user.birth_time else None,
            "birth_city": user.birth_city,
            "birth_state": user.birth_state,
            "lat": user.lat,
            "lng": user.lng,
            "sun_sign": user.sun_sign,
            "moon_sign": user.moon_sign,
            "rising_sign": user.rising_sign,
            "focus_areas": user.focus_areas or [],
            "form_vida_agora": user.form_vida_agora or "",
            "form_carrega_tempo": user.form_carrega_tempo or "",
            "form_espera_descobrir": user.form_espera_descobrir or "",
            "role": user.role,
            "created_at": user.created_at,
            "email_status": user.email_status or "not_sent",
            "email_sent_at": user.email_sent_at,
            "openai_cost": openai_cost,
            "chart": {
                "id": str(chart.id) if chart else None,
                "svg_content": chart.svg_content if chart else None,
                "chart_data": chart.chart_data if chart else None,
                "status": chart.status if chart else None,
                "created_at": chart.created_at if chart else None,
                "openai_cost": openai_cost,
            } if chart else None,
            "sections": [
                {"section_key": s.section_key, "section_order": s.section_order, "content": s.content}
                for s in sections
            ],
        }

    # 2. Se não encontrou User, verifica se é um GenerationLog avulso
    gen_log = db.query(GenerationLog).filter(GenerationLog.id == client_id).first()
    if gen_log:
        status_label = {
            "success": "Concluído com Sucesso",
            "ready": "Mapa Pronto",
            "in_progress": "Em Processamento",
            "failed": "Falha na Geração",
        }.get(gen_log.status, gen_log.status or "Registrado")

        audit_content = (
            f"📋 Registro do Histórico de Pesquisas e Gerações\n\n"
            f"• Nome: {gen_log.name or 'Não informado'}\n"
            f"• E-mail: {gen_log.email or 'Não informado'}\n"
            f"• WhatsApp: {gen_log.whatsapp or 'Não informado'}\n"
            f"• Cidade: {gen_log.birth_city or 'Não informado'}\n"
            f"• Data de Nascimento: {gen_log.birth_date or 'Não informada'}\n"
            f"• Horário: {gen_log.birth_time or 'Não informado'}\n"
            f"• Status: {status_label}\n"
            f"• Motor IA: {gen_log.model_used or 'Não especificado'}\n"
        )
        if gen_log.error_message:
            audit_content += f"\n⚠️ Detalhes do Erro Registrado:\n{gen_log.error_message}\n"
        else:
            audit_content += "\nℹ️ Este registro foi efetuado na auditoria de pesquisas e gerações."

        return {
            "id": str(gen_log.id),
            "name": gen_log.name or "Lead Astrológico",
            "email": gen_log.email or "",
            "whatsapp": gen_log.whatsapp or "",
            "birth_date": gen_log.birth_date or "",
            "birth_time": gen_log.birth_time or "",
            "birth_city": gen_log.birth_city or "",
            "birth_state": "",
            "lat": None,
            "lng": None,
            "sun_sign": "",
            "moon_sign": "",
            "rising_sign": "",
            "focus_areas": [],
            "form_vida_agora": "",
            "form_carrega_tempo": "",
            "form_espera_descobrir": "",
            "role": "lead",
            "created_at": gen_log.created_at,
            "email_status": "not_sent",
            "email_sent_at": None,
            "openai_cost": {
                "model": gen_log.model_used or "gpt-5.6-sol",
                "prompt_tokens": gen_log.prompt_tokens or 0,
                "completion_tokens": gen_log.completion_tokens or 0,
                "total_tokens": gen_log.total_tokens or 0,
                "cost_usd": gen_log.cost_usd,
                "cost_brl": gen_log.cost_brl,
                "cost_formatted_usd": f"${gen_log.cost_usd:.4f}" if gen_log.cost_usd is not None else None,
                "cost_formatted_brl": f"R$ {gen_log.cost_brl:.4f}" if gen_log.cost_brl is not None else None,
            } if gen_log.cost_usd else None,
            "chart": None,
            "sections": [
                {
                    "section_key": "portal",
                    "section_order": 0,
                    "content": audit_content,
                }
            ],
        }

    return None
