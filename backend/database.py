import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv(override=False)

if os.getenv("TESTING") == "1":
    DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql://postgres:sirius123@postgres:5432/bussolaapp_test")
else:
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:sirius123@localhost:5432/bussolaapp_db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
