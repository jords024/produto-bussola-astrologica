import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import engine  # noqa: E402
from models.models import Base  # noqa: E402


def run_migration():
    """Cria a tabela tutorial_lessons para a aba Comece Aqui."""
    Base.metadata.create_all(bind=engine)
    print("Tabela tutorial_lessons garantida com sucesso!")


if __name__ == "__main__":
    run_migration()
