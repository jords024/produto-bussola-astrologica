#!/usr/bin/env python3
"""
Esteira completa de validação pré-push para o Bússola Astrológica:
1. Scanner de segredos e credenciais (check_secrets.py)
2. Sincronia de variáveis de ambiente (check_env_sync.py)
3. Limites de tamanho de arquivo / Clean Code (check_limits.py)
4. Sincronia do schema do banco de dados (check_db_schema.py)
5. Auditoria de endpoints e autenticação (audit_endpoints.py)
6. Auditoria de segurança de dependências (audit_security.py)
7. Testes unitários Backend (Pytest) e Frontend (Vitest)
8. Build de produção do Frontend (opcional com --with-build)
"""
import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run_step(title: str, cmd: list[str], cwd: Path | None = None) -> bool:
    print(f"\n>>> {title}")
    res = subprocess.run(cmd, cwd=cwd or ROOT)
    if res.returncode != 0:
        print(f"[FALHA] Etapa interrompida: {title}")
        return False
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Validação pré-push do Bússola APP")
    parser.add_argument("--skip-tests", action="store_true", help="Pula Pytest e Vitest")
    parser.add_argument("--skip-audit", action="store_true", help="Pula pip-audit e npm audit")
    parser.add_argument("--with-build", action="store_true", help="Executa npm run build no frontend")
    args = parser.parse_args()

    py = sys.executable
    steps: list[tuple[str, list[str], Path | None]] = [
        ("1. Scanner de Segredos", [py, "scripts/check_secrets.py"], ROOT),
        ("2. Sincronia de .env.example", [py, "scripts/check_env_sync.py"], ROOT),
        ("3. Limites de Código (Clean Code)", [py, "scripts/check_limits.py"], ROOT),
        ("4. Schema do Banco de Dados", [py, "scripts/check_db_schema.py"], ROOT),
        ("5. Auditoria de Endpoints", [py, "scripts/audit_endpoints.py"], ROOT),
    ]

    if not args.skip_audit:
        steps.append(("6. Auditoria de Dependências", [py, "scripts/audit_security.py"], ROOT))

    if not args.skip_tests:
        steps.append(("7a. Testes Backend (Pytest)", ["docker", "exec", "bussolaapp_backend", "python", "-m", "pytest", "-q", "--tb=short", "tests/"], ROOT))
        steps.append(("7b. Testes Frontend (Vitest)", ["npm.cmd" if sys.platform == "win32" else "npm", "test", "--", "--run"], ROOT / "frontend"))

    if args.with_build:
        steps.append(("8. Build de Produção Frontend", ["npm.cmd" if sys.platform == "win32" else "npm", "run", "build"], ROOT / "frontend"))

    for title, cmd, cwd in steps:
        if not run_step(title, cmd, cwd):
            print("\n[BLOQUEADO] Corrija os erros acima antes de realizar git push.")
            return 1

    print("\n[SUCESSO] Todas as validações pré-push passaram! Pronto para commit/push.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
