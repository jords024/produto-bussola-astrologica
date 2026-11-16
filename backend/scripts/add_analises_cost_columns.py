"""
Script de migração: Adição de colunas de consumo/custo de IA na tabela analises.
Executa DDL idempotente para armazenar prompt_tokens, completion_tokens, total_tokens e cost_usd.
"""
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import engine


def migrate():
    with engine.begin() as conn:
        conn.execute(text("""
            ALTER TABLE analises ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0;
            ALTER TABLE analises ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0;
            ALTER TABLE analises ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;
            ALTER TABLE analises ADD COLUMN IF NOT EXISTS cost_usd DOUBLE PRECISION DEFAULT 0.0;
        """))

        # Backfill para análises que já possuem openai_cost salvo dentro do JSONB contexto
        conn.execute(text("""
            UPDATE analises
            SET
                prompt_tokens = COALESCE(NULLIF(contexto->'openai_cost'->>'prompt_tokens', '')::INTEGER, 0),
                completion_tokens = COALESCE(NULLIF(contexto->'openai_cost'->>'completion_tokens', '')::INTEGER, 0),
                total_tokens = COALESCE(NULLIF(contexto->'openai_cost'->>'total_tokens', '')::INTEGER, 0),
                cost_usd = COALESCE(NULLIF(contexto->'openai_cost'->>'cost_usd', '')::DOUBLE PRECISION, 0.0)
            WHERE (cost_usd IS NULL OR cost_usd = 0)
              AND contexto IS NOT NULL
              AND contexto ? 'openai_cost';
        """))
    print("Migração concluída com sucesso: colunas de custo em analises verificadas/criadas.")


if __name__ == "__main__":
    migrate()
