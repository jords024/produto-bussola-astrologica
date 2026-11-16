import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv(override=False)

from database import engine
from models.models import Base
from routes import auth, funnel, members, admin, geocoding, admin_chart, backups, docker_logs, invites, financeiro

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")

from sqlalchemy import func
from database import SessionLocal, engine
from models.models import Base, User, Chart
from routes.auth import hash_password
from services.schema_sync import ensure_schema

ensure_schema(engine, Base)

def seed_admin():
    db = SessionLocal()
    try:
        super_email = os.getenv("SUPER_ADMIN_EMAIL", "aryarajmarketing@gmail.com").strip().lower()
        super_pass = os.getenv("SUPER_ADMIN_PASSWORD", "123456")
        super_name = os.getenv("SUPER_ADMIN_NAME", "Aryaraj")

        admin_configs = [
            (super_email, super_pass, super_name),
            ("admin@bussola.com", "bussola123", "Crassus Gobbi"),
            ("admin@local.dev", "admin123", "Admin Bússola"),
        ]

        for email, pwd, name in admin_configs:
            user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
            if user:
                user.role = "admin"
                user.password_hash = hash_password(pwd)
                logging.info(f"🔑 Conta de Admin atualizada no banco: {email}")
            else:
                new_admin = User(
                    name=name,
                    email=email,
                    password_hash=hash_password(pwd),
                    role="admin",
                )
                db.add(new_admin)
                logging.info(f"🔑 Nova conta de Admin criada no banco: {email}")

        # Seed cliente de teste padrão com dados completos de nascimento
        client_email = "cliente@bussola.com"
        client_user = db.query(User).filter(func.lower(User.email) == client_email).first()
        from datetime import date as ddate, time as dtime
        if not client_user:
            client_user = User(
                name="Jordão Rodrigues",
                email=client_email,
                password_hash=hash_password("bussola123"),
                role="client",
                birth_date=ddate(2000, 12, 18),
                birth_time=dtime(9, 25),
                birth_city="Ribeirão Preto",
                birth_state="SP",
                birth_country="Brasil",
                lat=-21.1775,
                lng=-47.8103,
                tz_str="America/Sao_Paulo",
                sun_sign="Sagitário",
                moon_sign="Virgem",
                rising_sign="Capricórnio",
            )
            db.add(client_user)
            db.flush()
            logging.info(f"🧭 Cliente de teste criado no banco: {client_email}")

        # Garante que o cliente de teste tenha um Chart gerado
        test_chart = db.query(Chart).filter(Chart.user_id == client_user.id).first()
        if not test_chart:
            from services.astro_service import generate_birth_chart
            try:
                astro = generate_birth_chart(
                    name=client_user.name,
                    year=2000, month=12, day=18,
                    hour=9, minute=25,
                    lat=-21.1775, lng=-47.8103,
                    tz_str="America/Sao_Paulo",
                    city_name="Ribeirão Preto",
                    country_name="Brasil",
                )
                test_chart = Chart(
                    user_id=client_user.id,
                    chart_data=astro.get("chart_data", {}),
                    svg_content=astro.get("svg", ""),
                    sun_sign="Sagitário",
                    moon_sign="Virgem",
                    rising_sign="Capricórnio",
                    status="ready",
                )
                db.add(test_chart)
                logging.info("🧭 Mapa natal do cliente de teste gerado com sucesso!")
            except Exception as ex_chart:
                logging.warning(f"Não foi possível pré-gerar mapa do cliente de teste: {ex_chart}")

        db.commit()
    except Exception as e:
        logging.error(f"Erro ao atualizar conta de admin: {e}")
    finally:
        db.close()

seed_admin()

app = FastAPI(title="Bússola Astrológica API", version="1.0.0")

# Origens permitidas dinâmicas
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
dynamic_origins = [orig.strip() for orig in allowed_origins_env.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Produção
        "https://bussolaastrologica.com.br",
        "https://www.bussolaastrologica.com.br",
        "https://bussola-astrologica.vercel.app",
        "https://resonant-hummingbird-3ae859.netlify.app",
        # Desenvolvimento local
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        *dynamic_origins,
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(funnel.router)
app.include_router(members.router)
app.include_router(admin.router)
app.include_router(geocoding.router)
app.include_router(admin_chart.router)
app.include_router(backups.router)
app.include_router(docker_logs.router)
app.include_router(invites.router)
app.include_router(financeiro.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "Bússola Astrológica API"}
