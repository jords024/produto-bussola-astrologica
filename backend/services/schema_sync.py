"""
Sincronização automática e idempotente de colunas faltantes no startup.
Evita erros de UndefinedColumn em produção quando novas colunas são adicionadas em models.py.
"""
import logging
from sqlalchemy import inspect, text

logger = logging.getLogger(__name__)


def _default_sql_clause(col) -> str:
    """Gera cláusula DEFAULT segura para valores escalares simples."""
    if col.default is None or not col.default.is_scalar:
        return ""
    val = col.default.arg
    if isinstance(val, bool):
        return f" DEFAULT {'TRUE' if val else 'FALSE'}"
    if isinstance(val, (int, float)):
        return f" DEFAULT {val}"
    if isinstance(val, str):
        safe = val.replace("'", "''")
        return f" DEFAULT '{safe}'"
    return ""


def ensure_schema(engine, base) -> list[str]:
    """Cria tabelas novas e adiciona colunas faltantes em tabelas existentes."""
    base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    db_tables = set(inspector.get_table_names())
    added: list[str] = []

    with engine.begin() as conn:
        for table_name, table in base.metadata.tables.items():
            if table_name not in db_tables:
                continue
            existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
            for col in table.columns:
                if col.name in existing_cols:
                    continue
                col_type = col.type.compile(dialect=engine.dialect)
                default_clause = _default_sql_clause(col)
                if_not_exists = "IF NOT EXISTS " if engine.dialect.name == "postgresql" else ""
                sql = f'ALTER TABLE "{table_name}" ADD COLUMN {if_not_exists}"{col.name}" {col_type}{default_clause}'
                conn.execute(text(sql))
                added.append(f"{table_name}.{col.name}")
                logger.info(f"🔧 Coluna adicionada automaticamente ao banco: {table_name}.{col.name} ({col_type})")

    return added
