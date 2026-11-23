"""
Script de migração: cria a tabela `ai_model_configs` e adiciona as colunas
`ai_model_max_limit` e `ai_model_daily_limit` na tabela `users`.
Idempotente — seguro para rodar múltiplas vezes em SQLite ou PostgreSQL.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect, text
from database import engine
from models.models import Base


def run_migration() -> None:
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    existing_users = {c["name"] for c in inspector.get_columns("users")}
    existing_cfg = {c["name"] for c in inspector.get_columns("ai_model_configs")}

    with engine.begin() as conn:
        if "ai_model_max_limit" not in existing_users:
            conn.execute(text('ALTER TABLE "users" ADD COLUMN "ai_model_max_limit" VARCHAR'))
            print("Coluna users.ai_model_max_limit adicionada.")
        if "ai_model_daily_limit" not in existing_users:
            conn.execute(text('ALTER TABLE "users" ADD COLUMN "ai_model_daily_limit" VARCHAR'))
            print("Coluna users.ai_model_daily_limit adicionada.")
        if "max_limit_fallback_model" not in existing_cfg:
            conn.execute(text('ALTER TABLE "ai_model_configs" ADD COLUMN "max_limit_fallback_model" VARCHAR DEFAULT \'gpt-5.6-luna\''))
            print("Coluna ai_model_configs.max_limit_fallback_model adicionada.")
        if "daily_limit_fallback_model" not in existing_cfg:
            conn.execute(text('ALTER TABLE "ai_model_configs" ADD COLUMN "daily_limit_fallback_model" VARCHAR DEFAULT \'gpt-4o-mini\''))
            print("Coluna ai_model_configs.daily_limit_fallback_model adicionada.")

    print("Migração de modelos de IA concluída com sucesso.")


if __name__ == "__main__":
    run_migration()
