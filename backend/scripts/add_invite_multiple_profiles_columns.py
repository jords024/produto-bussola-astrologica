"""
Script de migração: adiciona as colunas `allow_multiple_profiles` e `max_extra_profiles`
na tabela `user_invites`.
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
    table_name = "user_invites"

    if not inspector.has_table(table_name):
        print(f"[SKIP] Tabela '{table_name}' não encontrada.")
        return

    existing = {c["name"] for c in inspector.get_columns(table_name)}
    columns_to_add = [
        ("allow_multiple_profiles", "BOOLEAN DEFAULT FALSE"),
        ("max_extra_profiles", "INTEGER"),
    ]

    for col_name, col_def in columns_to_add:
        if col_name in existing:
            print(f"[OK] Coluna '{table_name}.{col_name}' já existe.")
            continue
        with engine.begin() as conn:
            conn.execute(
                text(f'ALTER TABLE "{table_name}" ADD COLUMN {if_not_exists}"{col_name}" {col_def}')
            )
        print(f"[ADDED] Coluna '{table_name}.{col_name}' adicionada com sucesso.")


if __name__ == "__main__":
    migrate()
