from sqlalchemy import create_engine, Column, String, Integer, text, inspect
from sqlalchemy.orm import declarative_base
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
