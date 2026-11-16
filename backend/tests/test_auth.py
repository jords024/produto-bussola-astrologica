import os
from fastapi.testclient import TestClient
from main import app, seed_admin

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data

def test_super_admin_login():
    # Garante que o seed executou
    seed_admin()
    
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com")
    super_admin_pass = os.getenv("SUPER_ADMIN_PASSWORD", "sirius123")

    response = client.post("/auth/login", json={
        "email": super_admin_email,
        "password": super_admin_pass
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["role"] == "admin"

def test_login_invalid_credentials():
    response = client.post("/auth/login", json={
        "email": "usuario_inexistente_12345@sirius.com",
        "password": "senha_incorreta"
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciais inválidas"

def test_admin_login_rejects_default_backdoors():
    """Garante que senhas mestres antigas/padrão como 123456 ou bussola123 são rejeitadas se não forem a senha real."""
    seed_admin()
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com")

    # Tentativa com 123456 (não configurada como senha)
    res_123 = client.post("/auth/login", json={
        "email": super_admin_email,
        "password": "123456"
    })
    assert res_123.status_code == 401
    assert res_123.json()["detail"] == "Credenciais inválidas"

    # Tentativa com bussola123
    res_bussola = client.post("/auth/login", json={
        "email": super_admin_email,
        "password": "bussola123"
    })
    assert res_bussola.status_code == 401
    assert res_bussola.json()["detail"] == "Credenciais inválidas"

