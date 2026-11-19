"""
Script para popular (ou limpar) massa de dados fakes no Financeiro para testes de performance.
Cria clientes fakes (role='client') com leituras aleatórias (Analise) SEM chamar IA/OpenAI.

Uso:
  python scripts/seed_fake_financeiro.py                 # cria 120 clientes fakes (3 a 15 leituras cada)
  python scripts/seed_fake_financeiro.py --users 150     # cria 150 clientes fakes
  python scripts/seed_fake_financeiro.py --clean         # remove TODOS os clientes/leituras fakes criados
"""
import argparse
import os
import random
import sys
import uuid
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.models import Analise, User
from routes.auth import hash_password

FAKE_EMAIL_PREFIX = "fake_perf_"
FAKE_EMAIL_DOMAIN = "@teste.local"

FIRST_NAMES = [
    "Ana", "Bruno", "Camila", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique",
    "Isabela", "João", "Karina", "Lucas", "Mariana", "Nathan", "Olívia", "Pedro",
    "Rafaela", "Samuel", "Tatiana", "Vinícius", "Yasmin", "Thiago", "Larissa", "Mateus",
]
LAST_NAMES = [
    "Silva", "Santos", "Oliveira", "Souza", "Pereira", "Costa", "Rodrigues", "Almeida",
    "Nascimento", "Lima", "Araújo", "Fernandes", "Carvalho", "Gomes", "Martins", "Rocha",
]
AREAS = ["amor", "carreira", "financas", "saude", "proposito", None]
PERGUNTAS = [
    "Como aproveitar melhor a energia desta semana no trabalho?",
    "É um bom momento para iniciar um novo projeto financeiro?",
    "O que devo observar nos meus relacionamentos hoje?",
    "Quais pontos de atenção tenho para tomar uma decisão importante?",
    None,
]


def clean_fake_data() -> dict:
    db = SessionLocal()
    try:
        fake_users = (
            db.query(User)
            .filter(User.email.like(f"{FAKE_EMAIL_PREFIX}%{FAKE_EMAIL_DOMAIN}"))
            .all()
        )
        fake_ids = [u.id for u in fake_users]
        deleted_readings = 0
        if fake_ids:
            deleted_readings = (
                db.query(Analise)
                .filter(Analise.user_id.in_(fake_ids))
                .delete(synchronize_session=False)
            )
            db.query(User).filter(User.id.in_(fake_ids)).delete(synchronize_session=False)
            db.commit()
        print(f"[CLEAN] Removidos {len(fake_ids)} clientes fakes e {deleted_readings} leituras fakes.")
        return {"deleted_users": len(fake_ids), "deleted_readings": deleted_readings}
    finally:
        db.close()


def seed_fake_data(num_users: int = 120, min_readings: int = 3, max_readings: int = 15) -> dict:
    clean_fake_data()
    db = SessionLocal()
    now_utc = datetime.utcnow()
    today = date.today()
    pw_hash = hash_password("FakePerf@2026!")

    users_to_add = []
    analises_to_add = []

    try:
        for i in range(1, num_users + 1):
            uid = str(uuid.uuid4())
            full_name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} (Teste #{i:03d})"
            email = f"{FAKE_EMAIL_PREFIX}{i:03d}{FAKE_EMAIL_DOMAIN}"
            created_days_ago = random.randint(1, 60)

            users_to_add.append(
                User(
                    id=uid,
                    name=full_name,
                    email=email,
                    password_hash=pw_hash,
                    role="client",
                    is_active=True,
                    created_at=now_utc - timedelta(days=created_days_ago),
                )
            )

            qty = random.randint(min_readings, max_readings)
            for _ in range(qty):
                days_ago = random.randint(0, 45)
                mins_ago = random.randint(0, 1400)
                created_at = now_utc - timedelta(days=days_ago, minutes=mins_ago)
                prompt_tok = random.randint(1400, 4200)
                comp_tok = random.randint(600, 2200)
                total_tok = prompt_tok + comp_tok
                # Estimativa realista de custo em USD
                cost_usd = round((prompt_tok * 0.0000025) + (comp_tok * 0.00001), 5)
                area = random.choice(AREAS)
                pergunta = random.choice(PERGUNTAS)

                analises_to_add.append(
                    Analise(
                        id=str(uuid.uuid4()),
                        user_id=uid,
                        data_alvo=today - timedelta(days=random.randint(0, 30)),
                        sintese=(
                            f"Leitura simulada de performance para {full_name}. "
                            "Este texto foi gerado aleatoriamente sem uso de IA apenas para validar "
                            "velocidade de ordenação, paginação e relatórios no painel Financeiro."
                        ),
                        textos={
                            "Sun": "Energia solar simulada para teste de visualização no relatório.",
                            "Moon": "Trânsito lunar simulado para teste de carregamento rápido.",
                        },
                        posicoes=[],
                        contexto={"area": area, "pergunta": pergunta, "tipo": "dia"},
                        prompt_tokens=prompt_tok,
                        completion_tokens=comp_tok,
                        total_tokens=total_tok,
                        cost_usd=cost_usd,
                        status="ok",
                        created_at=created_at,
                    )
                )

        db.bulk_save_objects(users_to_add)
        db.bulk_save_objects(analises_to_add)
        db.commit()
        print(
            f"[SEED] Criados {len(users_to_add)} clientes fakes com {len(analises_to_add)} leituras aleatórias (sem IA)."
        )
        return {"created_users": len(users_to_add), "created_readings": len(analises_to_add)}
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Popula ou limpa clientes e leituras fakes no Financeiro.")
    parser.add_argument("--users", type=int, default=120, help="Quantidade de clientes fakes (padrão: 120)")
    parser.add_argument("--min-readings", type=int, default=3, help="Mínimo de leituras por cliente (padrão: 3)")
    parser.add_argument("--max-readings", type=int, default=15, help="Máximo de leituras por cliente (padrão: 15)")
    parser.add_argument("--clean", action="store_true", help="Remove todos os clientes e leituras fakes")
    args = parser.parse_args()

    if args.clean:
        clean_fake_data()
    else:
        seed_fake_data(args.users, args.min_readings, args.max_readings)
