"""
brevo_service.py — Bússola Astrológica
Envio de e-mails transacionais e códigos OTP via API REST do Brevo (Sendinblue).
"""
import os
import logging
import requests

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def _html_verification_code(name: str, code: str) -> str:
    first_name = name.split()[0] if name else "Membro"
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação ✨</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#18181b;border:1px solid rgba(255,255,255,0.1);border-radius:24px;overflow:hidden;box-shadow:0 25px 60px -15px rgba(0,0,0,0.8);">
          <!-- Cabeçalho Tático Editorial -->
          <tr>
            <td style="padding:36px 40px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
              <div style="font-size:32px;margin-bottom:8px;">🧭</div>
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;color:#d4af37;text-transform:uppercase;font-weight:600;">Bússola Astrológica</p>
              <h1 style="margin:0;font-size:24px;color:#f4f4f5;font-weight:700;">Confirmação de Acesso</h1>
            </td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#f4f4f5;">
                Olá, <strong style="color:#d4af37;">{first_name}</strong> ✨
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">
                Você iniciou a validação de acesso na <strong>Bússola Astrológica</strong>. Para garantir a segurança da sua conta, utilize o código de verificação abaixo:
              </p>

              <!-- Bloco do Código OTP -->
              <div style="text-align:center;margin:32px 0;">
                <div style="display:inline-block;padding:18px 36px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.4);border-radius:16px;">
                  <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:bold;letter-spacing:10px;color:#d4af37;">{code}</span>
                </div>
                <p style="margin:12px 0 0;font-size:12px;color:#71717a;">
                  ⏱️ Este código é válido por <strong>15 minutos</strong>.
                </p>
              </div>

              <div style="padding:14px 18px;background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.2);border-radius:12px;margin-bottom:24px;">
                <p style="margin:0;font-size:12px;color:#e4d18c;line-height:1.5;">
                  🔒 <strong>Dica de Segurança:</strong> Nunca compartilhe este código com terceiros. A equipe da Bússola Astrológica nunca solicitará sua senha ou código fora da plataforma.
                </p>
              </div>

              <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">
                Se você não solicitou este acesso, por favor desconsidere este e-mail.
              </p>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background-color:#121215;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0;font-size:11px;color:#71717a;">
                Bússola Astrológica · Navegação Tática Pessoal
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _html_verification_link(name: str, confirm_url: str) -> str:
    first_name = name.split()[0] if name else "Membro"
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme seu E-mail ✨</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#18181b;border:1px solid rgba(255,255,255,0.1);border-radius:24px;overflow:hidden;box-shadow:0 25px 60px -15px rgba(0,0,0,0.8);">
          <tr>
            <td style="padding:36px 40px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#a78bfa;font-weight:700;">
                Bússola Astrológica
              </p>
              <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:700;">
                Confirme seu e-mail para ativar sua conta
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;text-align:center;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#d4d4d8;">
                Olá, <strong style="color:#ffffff;">{first_name}</strong>! Falta apenas um clique para validar o seu e-mail e liberar seu acesso à plataforma.
              </p>
              <a href="{confirm_url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7F77DD,#534ab3);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:12px;margin:12px 0 24px;">
                Confirmar Meu E-mail e Ativar Conta
              </a>
              <p style="margin:0 0 12px;font-size:12px;color:#a1a1aa;">
                Este botão é válido por 15 minutos. Se preferir, copie e cole o link abaixo no navegador:
              </p>
              <p style="margin:0;font-size:11px;color:#818cf8;word-break:break-all;">
                {confirm_url}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#121215;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0;font-size:11px;color:#71717a;">
                Bússola Astrológica · Navegação Tática Pessoal
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _send_brevo_email(to_email: str, name: str, subject: str, html_content: str, log_hint: str) -> bool:
    api_key = os.getenv("BREVO_API_KEY", "").strip()
    sender_name = os.getenv("BREVO_SENDER_NAME", "Bússola Astrológica").strip().strip('"')
    sender_email = os.getenv("BREVO_SENDER_EMAIL", "contato@bussolaastrologica.com.br").strip()

    if not api_key:
        logger.warning(f"[Brevo] BREVO_API_KEY não configurada. {log_hint} (Modo Simulação/Dev)")
        return False

    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email, "name": name}],
        "subject": subject,
        "htmlContent": html_content,
    }

    try:
        response = requests.post(BREVO_API_URL, headers=headers, json=payload, timeout=10)
        if response.status_code in [200, 201, 202]:
            logger.info(f"[Brevo] E-mail enviado com sucesso para {to_email}.")
            return True
        logger.error(f"[Brevo] Falha ao enviar e-mail para {to_email}. Status HTTP {response.status_code}: {response.text}")
        return False
    except Exception as exc:
        logger.error(f"[Brevo] Exceção ao conectar na API do Brevo para {to_email}: {exc}")
        return False


def send_brevo_verification_code(to_email: str, name: str, code: str) -> bool:
    """Envia o código de verificação de cadastro para o usuário utilizando a API REST do Brevo."""
    return _send_brevo_email(
        to_email=to_email,
        name=name,
        subject=f"🧭 Seu Código de Acesso — Bússola Astrológica: {code}",
        html_content=_html_verification_code(name, code),
        log_hint=f"Código de verificação para {to_email}: {code}",
    )


def send_brevo_verification_link(to_email: str, name: str, confirm_url: str) -> bool:
    """Envia botão/link de confirmação de e-mail para ativação da conta via API REST do Brevo."""
    return _send_brevo_email(
        to_email=to_email,
        name=name,
        subject="🧭 Confirme seu E-mail — Bússola Astrológica",
        html_content=_html_verification_link(name, confirm_url),
        log_hint=f"Link de confirmação para {to_email}: {confirm_url}",
    )
