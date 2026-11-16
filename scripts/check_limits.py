#!/usr/bin/env python3
"""
Validador de limites de tamanho de arquivo (Clean Code):
- Backend (.py): máximo 1.000 linhas
- Frontend (.tsx, .ts, .jsx, .js, .css): máximo 500 linhas
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND_LIMIT = 1000
FRONTEND_LIMIT = 500

FRONTEND_EXTS = {".tsx", ".ts", ".jsx", ".js", ".css"}
SKIP_DIRS = {"node_modules", ".next", "__pycache__", ".git", ".venv", "venv", "tests", "__tests__", "backup"}


def count_lines(path: Path) -> int:
    with path.open("r", encoding="utf-8", errors="ignore") as f:
        return sum(1 for _ in f)


def scan_dir(base: Path, exts: set[str], limit: int) -> list[tuple[str, int]]:
    violations = []
    if not base.exists():
        return violations
    for p in base.rglob("*"):
        if not p.is_file():
            continue
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        if p.suffix.lower() not in exts:
            continue
        lines = count_lines(p)
        if lines > limit:
            violations.append((str(p.relative_to(ROOT)).replace("\\", "/"), lines))
    return sorted(violations, key=lambda x: x[1], reverse=True)


def main() -> int:
    print("=== [3/6] VALIDADOR DE LIMITES DE CÓDIGO (CLEAN CODE) ===")
    be_violations = scan_dir(ROOT / "backend", {".py"}, BACKEND_LIMIT)
    fe_violations = scan_dir(ROOT / "frontend", FRONTEND_EXTS, FRONTEND_LIMIT)

    if be_violations or fe_violations:
        for path, lines in be_violations:
            print(f"[ERRO] Backend > {BACKEND_LIMIT} linhas: {path} ({lines} linhas)")
        for path, lines in fe_violations:
            print(f"[ERRO] Frontend > {FRONTEND_LIMIT} linhas: {path} ({lines} linhas)")
        return 1

    print(f"[OK] Todos os arquivos respeitam os limites (Backend <= {BACKEND_LIMIT}, Frontend <= {FRONTEND_LIMIT}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
