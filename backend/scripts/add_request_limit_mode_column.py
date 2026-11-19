"""
Script de migração: adiciona a coluna `request_limit_mode` ('strict' | 'quota_then_daily')
nas tabelas `users` e `user_invites`.
Idempotente e compatível com PostgreSQL e SQLite.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect, text
from database import engine


def migrate():
    inspector = inspect(engine)
    dialect = engine.dialect.name
    if_not_exists = "IF NOT EXISTS " if dialect == "postgresql" else ""

    for table_name in ("users", "user_invites"):
        if not inspector.has_table(table_name):
            print(f"[SKIP] Tabela '{table_name}' não encontrada.")
            continue
        existing = {c["name"] for c in inspector.get_columns(table_name)}
        if "request_limit_mode" in existing:
            print(f"[OK] Coluna '{table_name}.request_limit_mode' já existe.")
            continue
        with engine.begin() as conn:
            conn.execute(
                text(
                    f'ALTER TABLE "{table_name}" ADD COLUMN {if_not_exists}"request_limit_mode" VARCHAR DEFAULT \'strict\''
                )
            )
        print(f"[ADDED] Coluna '{table_name}.request_limit_mode' adicionada com sucesso.")


if __name__ == "__main__":
    migrate()
