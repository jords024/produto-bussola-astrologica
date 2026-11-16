#!/usr/bin/env python3
"""
Scanner de segredos e credenciais para evitar vazamentos no repositório Git.
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SECRET_PATTERNS = [
    ("OpenAI API Key", re.compile(r"sk-(?:proj-)?[A-Za-z0-9_-]{20,}")),
    ("GitHub Token", re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}")),
    ("Brevo API Key", re.compile(r"xkeysib-[A-Za-z0-9-]{20,}")),
    ("AWS Access Key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("Chave Privada RSA/PEM", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("Slack Webhook", re.compile(r"https://hooks\.slack\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[A-Za-z0-9]+")),
]

IGNORE_FILES = {
    "scripts/check_secrets.py",
    "backend/.env.example",
}

TEXT_EXTS = {".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".yml", ".yaml", ".md", ".env", ".toml", ".txt", ".sql"}


def mask_secret(val: str) -> str:
    if len(val) <= 10:
        return "****"
    return f"{val[:4]}****{val[-4:]}"


def get_tracked_and_staged_files() -> list[str]:
    res = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if res.returncode != 0:
        return []
    return [line.strip() for line in res.stdout.splitlines() if line.strip()]


def main() -> int:
    print("=== [1/6] SCANNER DE SEGREDOS E CREDENCIAIS ===")
    files = get_tracked_and_staged_files()
    issues = []

    # Bloquear .env real rastreado/staged
    staged = subprocess.run(["git", "diff", "--cached", "--name-only"], cwd=ROOT, capture_output=True, text=True)
    for f in staged.stdout.splitlines():
        if Path(f.strip()).name == ".env":
            issues.append(f"Arquivo .env real em staging: {f.strip()}")

    for rel in files:
        norm = rel.replace("\\", "/")
        if norm in IGNORE_FILES:
            continue
        p = ROOT / rel
        if not p.is_file():
            continue
        if p.name == ".env":
            issues.append(f"Arquivo .env real rastreado pelo Git: {norm}")
            continue
        if p.suffix.lower() not in TEXT_EXTS and not p.name.startswith(".env"):
            continue
        if p.stat().st_size > 1_000_000:
            continue
        try:
            content = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        for idx, line in enumerate(content.splitlines(), start=1):
            lower = line.lower()
            if "exemplo" in lower or "your_" in lower or "fake-" in lower or "dummy" in lower:
                continue
            for label, pattern in SECRET_PATTERNS:
                m = pattern.search(line)
                if m:
                    issues.append(f"{norm}:{idx} -> {label} ({mask_secret(m.group(0))})")

    if issues:
        print("[ERRO] Possíveis segredos detectados:")
        for item in issues:
            print(f"  - {item}")
        return 1

    print(f"[OK] Nenhum segredo exposto encontrado ({len(files)} arquivos verificados).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
