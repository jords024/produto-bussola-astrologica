import os
import sys
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import engine  # noqa: E402
from models.models import Base  # noqa: E402


def run_migration():
    """Adiciona colunas e tabela para suporte a múltiplos perfis astrológicos."""
    Base.metadata.create_all(bind=engine)
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if dialect == "postgresql":
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_multiple_profiles BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS max_extra_profiles INTEGER"))
            conn.execute(text("ALTER TABLE analises ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES astro_profiles(id)"))
        else:
            # SQLite fallback
            cols_users = [r[1] for r in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
            if "allow_multiple_profiles" not in cols_users:
                conn.execute(text("ALTER TABLE users ADD COLUMN allow_multiple_profiles BOOLEAN DEFAULT 0"))
            if "max_extra_profiles" not in cols_users:
                conn.execute(text("ALTER TABLE users ADD COLUMN max_extra_profiles INTEGER"))

            cols_analises = [r[1] for r in conn.execute(text("PRAGMA table_info(analises)")).fetchall()]
            if "profile_id" not in cols_analises:
                conn.execute(text("ALTER TABLE analises ADD COLUMN profile_id TEXT"))

    print("Migração de múltiplos perfis aplicada com sucesso!")


if __name__ == "__main__":
    run_migration()
