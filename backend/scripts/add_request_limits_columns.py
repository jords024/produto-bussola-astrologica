"""
Script de migração: adiciona as colunas `daily_request_limit` e `max_total_requests`
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

    targets = [
        ("users", "daily_request_limit"),
        ("users", "max_total_requests"),
        ("user_invites", "daily_request_limit"),
        ("user_invites", "max_total_requests"),
    ]

    with engine.begin() as conn:
        for table_name, col_name in targets:
            if not inspector.has_table(table_name):
                print(f"[SKIP] Tabela '{table_name}' não encontrada.")
                continue
            existing = {c["name"] for c in inspector.get_columns(table_name)}
            if col_name in existing:
                print(f"[OK] Coluna '{table_name}.{col_name}' já existe.")
                continue
            conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN {if_not_exists}"{col_name}" INTEGER'))
            print(f"[ADDED] Coluna '{table_name}.{col_name}' adicionada com sucesso.")


if __name__ == "__main__":
    migrate()
