#!/usr/bin/env python3
"""
Auditoria de endpoints FastAPI em backend/routes/*.py:
- Verifica se rotas administrativas (/admin/*) e de membros (/members/*) exigem autenticação.
- Verifica se os endpoints possuem docstring.
"""
import ast
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROUTES_DIR = ROOT / "backend" / "routes"

AUTH_DEPS = {"require_admin", "get_current_user", "get_admin_or_api_key"}
PROTECTED_FILES = {"admin.py", "admin_chart.py", "backups.py", "docker_logs.py", "financeiro.py", "members.py"}
HTTP_METHODS = {"get", "post", "put", "patch", "delete"}


def main() -> int:
    print("=== [5/6] AUDITORIA DE ENDPOINTS E AUTENTICAÇÃO ===")
    warnings = []
    errors = []
    total_routes = 0

    for py_file in sorted(ROUTES_DIR.glob("*.py")):
        if py_file.name == "__init__.py":
            continue
        source = py_file.read_text(encoding="utf-8", errors="ignore")
        tree = ast.parse(source, filename=str(py_file))

        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            route_decorators = [
                d for d in node.decorator_list
                if isinstance(d, ast.Call)
                and isinstance(d.func, ast.Attribute)
                and d.func.attr in HTTP_METHODS
            ]
            if not route_decorators:
                continue

            total_routes += 1
            if not ast.get_docstring(node):
                warnings.append(f"{py_file.name}:{node.lineno} -> {node.name}() sem docstring")

            if py_file.name in PROTECTED_FILES:
                fn_src = ast.get_source_segment(source, node) or ""
                if not any(dep in fn_src for dep in AUTH_DEPS):
                    errors.append(f"{py_file.name}:{node.lineno} -> {node.name}() sem dependência de autenticação!")

    for w in warnings:
        print(f"[AVISO] {w}")
    if errors:
        for e in errors:
            print(f"[ERRO] {e}")
        return 1

    print(f"[OK] {total_routes} rotas auditadas. Todas as rotas protegidas exigem autenticação.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
