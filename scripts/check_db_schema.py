#!/usr/bin/env python3
"""
Verificador de sincronia do esquema do banco de dados:
Compara as tabelas e colunas dos modelos SQLAlchemy (backend/models/models.py)
com as tabelas e colunas reais do PostgreSQL no contêiner bussolaapp_backend.
"""
import subprocess
import sys

CHECK_SCRIPT = """
import sys
from sqlalchemy import inspect
from database import engine
from models.models import Base

inspector = inspect(engine)
db_tables = set(inspector.get_table_names())
missing = []

for table_name, table in Base.metadata.tables.items():
    if table_name not in db_tables:
        missing.append(f"Tabela ausente no banco: {table_name}")
        continue
    db_cols = {c["name"] for c in inspector.get_columns(table_name)}
    for col in table.columns:
        if col.name not in db_cols:
            missing.append(f"Coluna ausente: {table_name}.{col.name}")

if missing:
    for m in missing:
        print("MISSING:", m)
    sys.exit(1)
print(f"OK: {len(Base.metadata.tables)} tabelas sincronizadas com o banco.")
"""


def main() -> int:
    print("=== [4/6] VERIFICADOR DE SCHEMA DO BANCO DE DADOS ===")
    res = subprocess.run(
        ["docker", "exec", "bussolaapp_backend", "python", "-c", CHECK_SCRIPT],
        capture_output=True,
        text=True,
    )
    if res.stdout.strip():
        print(res.stdout.strip())
    if res.returncode != 0:
        if res.stderr.strip():
            print(res.stderr.strip())
        print("[ERRO] Divergência de schema detectada entre models.py e PostgreSQL.")
        return 1
    print("[OK] Schema do banco 100% sincronizado com models.py.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
