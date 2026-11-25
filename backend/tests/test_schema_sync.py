import os
import pytest
from sqlalchemy import create_engine, Column, String, Integer, text, inspect
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import declarative_base
from models.models import Base as AppBase
from services.schema_sync import ensure_schema


def test_ensure_schema_adds_missing_column_idempotently(tmp_path):
    db_file = tmp_path / "schema_test.db"
    test_engine = create_engine(f"sqlite:///{db_file}")

    with test_engine.begin() as conn:
        conn.execute(text("CREATE TABLE demo_items (id VARCHAR PRIMARY KEY)"))

    TestBase = declarative_base()

    class DemoItem(TestBase):
        __tablename__ = "demo_items"
        id = Column(String, primary_key=True)
        total_tokens = Column(Integer, default=0)

    added = ensure_schema(test_engine, TestBase)
    assert "demo_items.total_tokens" in added

    cols = {c["name"] for c in inspect(test_engine).get_columns("demo_items")}
    assert "total_tokens" in cols

    # Segunda execução deve ser idempotente (nada a adicionar)
    added_again = ensure_schema(test_engine, TestBase)
    assert added_again == []


def test_ensure_schema_postgres_creates_tables_and_missing_columns():
    """Testa em banco PostgreSQL temporário a criação do zero e adição automática de colunas."""
    raw_url = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL") or ""
    if not raw_url.startswith("postgresql"):
        pytest.skip("PostgreSQL não configurado em TEST_DATABASE_URL/DATABASE_URL")

    temp_db_name = "bussolaapp_schema_sync_test"
    parsed_url = make_url(raw_url)
    admin_url = parsed_url.set(database="postgres")
    temp_url = parsed_url.set(database=temp_db_name)

    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        conn.execute(
            text(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                "WHERE datname = :db AND pid <> pg_backend_pid()"
            ),
            {"db": temp_db_name},
        )
        conn.execute(text(f'DROP DATABASE IF EXISTS "{temp_db_name}"'))
        conn.execute(text(f'CREATE DATABASE "{temp_db_name}"'))

    pg_engine = create_engine(temp_url)
    try:
        # 1. Criação de todas as tabelas do zero
        ensure_schema(pg_engine, AppBase)
        inspector = inspect(pg_engine)
        db_tables = set(inspector.get_table_names())
        expected_tables = set(AppBase.metadata.tables.keys())
        assert expected_tables.issubset(db_tables)

        for table_name, table in AppBase.metadata.tables.items():
            existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
            model_cols = {c.name for c in table.columns}
            assert model_cols.issubset(existing_cols)

        # 2. Remoção simulada de 4 colunas reais e reconstrução automática
        with pg_engine.begin() as conn:
            conn.execute(text('ALTER TABLE "user_invites" DROP COLUMN "allow_multiple_profiles"'))
            conn.execute(text('ALTER TABLE "user_invites" DROP COLUMN "max_extra_profiles"'))
            conn.execute(text('ALTER TABLE "users" DROP COLUMN "request_limit_mode"'))
            conn.execute(text('ALTER TABLE "users" DROP COLUMN "allow_multiple_profiles"'))

        added = ensure_schema(pg_engine, AppBase)
        expected_added = {
            "user_invites.allow_multiple_profiles",
            "user_invites.max_extra_profiles",
            "users.request_limit_mode",
            "users.allow_multiple_profiles",
        }
        assert expected_added.issubset(set(added))

        inspector_after = inspect(pg_engine)
        invite_cols = {c["name"] for c in inspector_after.get_columns("user_invites")}
        user_cols = {c["name"] for c in inspector_after.get_columns("users")}
        assert {"allow_multiple_profiles", "max_extra_profiles"}.issubset(invite_cols)
        assert {"request_limit_mode", "allow_multiple_profiles"}.issubset(user_cols)

        # 3. Idempotência: nenhuma coluna faltante na segunda execução
        assert ensure_schema(pg_engine, AppBase) == []
    finally:
        pg_engine.dispose()
        with admin_engine.connect() as conn:
            conn.execute(
                text(
                    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                    "WHERE datname = :db AND pid <> pg_backend_pid()"
                ),
                {"db": temp_db_name},
            )
            conn.execute(text(f'DROP DATABASE IF EXISTS "{temp_db_name}"'))
        admin_engine.dispose()
