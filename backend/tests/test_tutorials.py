import io
import os
import sys
import uuid
from datetime import date
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app, seed_admin  # noqa: E402
from database import SessionLocal  # noqa: E402
from models.models import User  # noqa: E402
from routes.auth import hash_password  # noqa: E402

client = TestClient(app)


def _get_admin_token() -> str:
    seed_admin()
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com")
    super_admin_pass = os.getenv("SUPER_ADMIN_PASSWORD", "sirius123")
    res = client.post("/auth/login", json={"email": super_admin_email, "password": super_admin_pass})
    assert res.status_code == 200
    return res.json()["token"]


def _get_client_token() -> str:
    db = SessionLocal()
    email = f"tut_client_{uuid.uuid4().hex[:6]}@exemplo.com"
    try:
        u = User(
            id=str(uuid.uuid4()),
            name="Aluno Tutorial",
            email=email,
            password_hash=hash_password("SenhaForte@123"),
            role="client",
            is_active=True,
            birth_date=date(1995, 5, 10),
        )
        db.add(u)
        db.commit()
    finally:
        db.close()
    res = client.post("/auth/login", json={"email": email, "password": "SenhaForte@123"})
    assert res.status_code == 200
    return res.json()["token"]


def test_tutorials_crud_upload_and_permissions():
    admin_token = _get_admin_token()
    client_token = _get_client_token()

    # Aluno não pode criar nem fazer upload
    res_forb = client.post(
        "/tutorials",
        json={"title": "Não permitido", "lesson_type": "text", "text_content": "abc"},
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert res_forb.status_code == 403

    # Admin faz upload de arquivo .mp4
    fake_mp4 = io.BytesIO(b"\x00\x00\x00\x18ftypmp42fakevideo")
    res_up = client.post(
        "/tutorials/upload",
        files={"file": ("aula1.mp4", fake_mp4, "video/mp4")},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_up.status_code == 200
    media_url = res_up.json()["video_url"]
    assert media_url.startswith("/tutorials/media/")

    # Arquivo é servido com HTTP 200
    res_media = client.get(media_url)
    assert res_media.status_code == 200

    # Admin cria vídeo tutorial e tutorial em texto
    res_vid = client.post(
        "/tutorials",
        json={
            "title": "Bem vindos à Bússola",
            "description": "Apresentação inicial",
            "lesson_type": "video",
            "video_source": "upload",
            "video_url": media_url,
            "duration": "01:19",
            "sort_order": 1,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_vid.status_code == 201
    vid_id = res_vid.json()["item"]["id"]

    res_txt = client.post(
        "/tutorials",
        json={
            "title": "Guia Rápido em Texto",
            "description": "Passo a passo escrito",
            "lesson_type": "text",
            "text_content": "1. Calibre sua bússola.\n2. Faça sua leitura do dia.",
            "sort_order": 2,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_txt.status_code == 201
    txt_id = res_txt.json()["item"]["id"]

    # Aluno consegue listar ambos
    res_list = client.get("/tutorials", headers={"Authorization": f"Bearer {client_token}"})
    assert res_list.status_code == 200
    titles = [item["title"] for item in res_list.json()["items"]]
    assert "Bem vindos à Bússola" in titles
    assert "Guia Rápido em Texto" in titles

    # Admin atualiza tutorial em texto
    res_upd = client.put(
        f"/tutorials/{txt_id}",
        json={
            "title": "Guia Rápido Atualizado",
            "description": "Resumo",
            "lesson_type": "text",
            "text_content": "Conteúdo atualizado.",
            "sort_order": 2,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_upd.status_code == 200
    assert res_upd.json()["item"]["title"] == "Guia Rápido Atualizado"

    # Admin exclui os tutoriais criados
    assert client.delete(f"/tutorials/{vid_id}", headers={"Authorization": f"Bearer {admin_token}"}).status_code == 200
    assert client.delete(f"/tutorials/{txt_id}", headers={"Authorization": f"Bearer {admin_token}"}).status_code == 200
    assert client.get(media_url).status_code == 404
