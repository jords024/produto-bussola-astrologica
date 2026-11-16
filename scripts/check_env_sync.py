#!/usr/bin/env python3
"""
Verifica se todas as variáveis de ambiente usadas no backend (os.getenv / os.environ.get)
estão documentadas em backend/.env.example.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT / "backend"
ENV_EXAMPLE = BACKEND_DIR / ".env.example"

ENV_PATTERN = re.compile(r"""os\.(?:getenv|environ\.get)\(\s*["']([A-Z0-9_]+)["']""")
IGNORED_VARS = {"TESTING", "PATH", "HOME", "TZ", "HOSTNAME"}


def parse_env_example(path: Path) -> set[str]:
    if not path.exists():
        return set()
    keys = set()
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key = stripped.split("=", 1)[0].strip()
        if key:
            keys.add(key)
    return keys


def main() -> int:
    print("=== [2/6] SINCRONIA DE VARIÁVEIS DE AMBIENTE (.env.example) ===")
    if not ENV_EXAMPLE.exists():
        print(f"[ERRO] Arquivo não encontrado: {ENV_EXAMPLE}")
        return 1

    documented = parse_env_example(ENV_EXAMPLE)
    used_vars: dict[str, list[str]] = {}

    for py_file in BACKEND_DIR.rglob("*.py"):
        if "tests" in py_file.parts or "__pycache__" in py_file.parts:
            continue
        content = py_file.read_text(encoding="utf-8", errors="ignore")
        for match in ENV_PATTERN.finditer(content):
            var = match.group(1)
            if var in IGNORED_VARS:
                continue
            rel = str(py_file.relative_to(ROOT)).replace("\\", "/")
            used_vars.setdefault(var, [])
            if rel not in used_vars[var]:
                used_vars[var].append(rel)

    missing = sorted(v for v in used_vars if v not in documented)
    if missing:
        print("[ERRO] Variáveis usadas no backend que faltam em backend/.env.example:")
        for v in missing:
            print(f"  - {v} (usada em: {', '.join(used_vars[v])})")
        return 1

    print(f"[OK] Todas as {len(used_vars)} variáveis de ambiente do backend estão documentadas em backend/.env.example.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
