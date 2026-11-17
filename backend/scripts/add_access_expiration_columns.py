"""
Script de migração: Adição de colunas de tempo de acesso (access_expires_at em users e access_days em user_invites).
Executa DDL idempotente para controle de expiração de acesso à IA.
"""
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import engine


def migrate():
    with engine.begin() as conn:
        conn.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMP NULL;
            ALTER TABLE user_invites ADD COLUMN IF NOT EXISTS access_days INTEGER NULL;
        """))
    print("Migração concluída com sucesso: colunas de tempo de acesso verificadas/criadas.")


if __name__ == "__main__":
    migrate()
