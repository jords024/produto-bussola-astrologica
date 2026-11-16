import os
from unittest.mock import patch, MagicMock
from services.brevo_service import send_brevo_verification_code, _html_verification_code


def test_html_verification_code_contains_code_and_name():
    html = _html_verification_code("Aryaraj Alves", "847291")
    assert "Aryaraj" in html
    assert "847291" in html
    assert "Bússola Astrológica" in html
    assert "15 minutos" in html


def test_send_brevo_code_without_api_key_returns_false():
    with patch.dict(os.environ, {"BREVO_API_KEY": ""}):
        result = send_brevo_verification_code("teste@exemplo.com", "Aryaraj", "123456")
        assert result is False


@patch("requests.post")
def test_send_brevo_code_success(mock_post):
    mock_response = MagicMock()
    mock_response.status_code = 201
    mock_post.return_value = mock_response

    with patch.dict(os.environ, {"BREVO_API_KEY": "xkeysib-mock-key"}):
        result = send_brevo_verification_code("cliente@bussola.com", "Crassus Gobbi", "654321")
        assert result is True
        assert mock_post.called
        args, kwargs = mock_post.call_args
        assert kwargs["json"]["to"][0]["email"] == "cliente@bussola.com"
        assert "654321" in kwargs["json"]["subject"]


@patch("requests.post")
def test_send_brevo_code_handles_api_error(mock_post):
    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_response.text = "Bad Request"
    mock_post.return_value = mock_response

    with patch.dict(os.environ, {"BREVO_API_KEY": "xkeysib-mock-key"}):
        result = send_brevo_verification_code("aluno@sirius.com", "Aluno", "999999")
        assert result is False
