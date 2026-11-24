import os
import secrets
from datetime import datetime, timedelta
from typing import Optional, List
import jwt
from jwt.exceptions import PyJWTError as JWTError
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from database import get_db
from models.models import User, UserInvite, RegistrationVerification
from routes.auth import require_admin, get_admin_or_api_key, hash_password, create_token, JWT_SECRET, JWT_ALGORITHM
from services.brevo_service import send_brevo_verification_code, send_brevo_verification_link
from services.request_limit_service import validate_optional_limit, normalize_limit_mode
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["invites"])


class CreateInviteRequest(BaseModel):
    role: str = Field(..., description="'client' para Aluno ou 'admin' para Administrador")
    validity_type: str = Field("never", description="'never', '24h', '48h', '72h'")
    access_days: Optional[int] = Field(None, description="Dias de acesso à plataforma após o cadastro (None = vitalício)")
    daily_request_limit: Optional[int] = Field(None, description="Limite diário de leituras IA (None = ilimitado)")
    max_total_requests: Optional[int] = Field(None, description="Limite máximo total de leituras IA (None = ilimitado)")
    request_limit_mode: Optional[str] = Field("strict", description="'strict' ou 'quota_then_daily'")
    allow_multiple_profiles: Optional[bool] = Field(False, description="Permite cadastrar múltiplas pessoas (perfis extras)")
    max_extra_profiles: Optional[int] = Field(None, description="Máximo de perfis extras (None = ilimitado quando ativo)")


class RegisterWithInviteRequest(BaseModel):
    token: str
    name: str
    email: str
    password: str
    whatsapp: Optional[str] = None


@router.post("/admin/invites")
def create_invite(
    body: CreateInviteRequest,
    current_user: User = Depends(get_admin_or_api_key),
    db: Session = Depends(get_db),
):
    """Gera um novo link de convite para cadastro de Aluno ou Admin."""
    role = "admin" if body.role.lower() == "admin" else "client"
    validity = body.validity_type.lower()
    if validity not in ["never", "24h", "48h", "72h"]:
        validity = "never"

    now = datetime.utcnow()
    expires_at = None
    if validity == "24h":
        expires_at = now + timedelta(hours=24)
    elif validity == "48h":
        expires_at = now + timedelta(hours=48)
    elif validity == "72h":
        expires_at = now + timedelta(hours=72)

    token = secrets.token_urlsafe(32)

    access_days = body.access_days if (role == "client" and body.access_days and body.access_days > 0) else None
    daily_limit = validate_optional_limit(body.daily_request_limit, "Limite diário") if role != "admin" else None
    max_total = validate_optional_limit(body.max_total_requests, "Limite máximo total") if role != "admin" else None
    limit_mode = normalize_limit_mode(body.request_limit_mode) if role != "admin" else "strict"
    allow_multi = bool(body.allow_multiple_profiles) if role != "admin" else False
    max_extra = (
        validate_optional_limit(body.max_extra_profiles, "Limite de perfis extras")
        if (role != "admin" and allow_multi)
        else None
    )

    invite = UserInvite(
        token=token,
        role=role,
        validity_type=validity,
        expires_at=expires_at,
        access_days=access_days,
        daily_request_limit=daily_limit,
        max_total_requests=max_total,
        request_limit_mode=limit_mode,
        allow_multiple_profiles=allow_multi,
        max_extra_profiles=max_extra,
        created_at=now,
        created_by_id=current_user.id,
        is_used=False,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    logger.info(
        f"Convite gerado com sucesso pelo admin {current_user.email}: role={role}, validity={validity}, "
        f"daily_limit={daily_limit}, max_total={max_total}, mode={limit_mode}"
    )

    base_url = (os.getenv("DASHBOARD_URL") or "https://bussolaastrologica.com.br").rstrip("/")
    invite_path = f"/cadastro?token={invite.token}"

    return {
        "id": invite.id,
        "token": invite.token,
        "role": invite.role,
        "role_label": "Administrador" if invite.role == "admin" else "Aluno",
        "validity_type": invite.validity_type,
        "expires_at": invite.expires_at.isoformat() + "Z" if invite.expires_at else None,
        "access_days": invite.access_days,
        "daily_request_limit": invite.daily_request_limit,
        "max_total_requests": invite.max_total_requests,
        "request_limit_mode": invite.request_limit_mode or "strict",
        "allow_multiple_profiles": bool(invite.allow_multiple_profiles),
        "max_extra_profiles": invite.max_extra_profiles,
        "created_at": invite.created_at.isoformat() + "Z",
        "invite_path": invite_path,
        "invite_url": f"{base_url}{invite_path}",
    }


class BatchDeleteInvitesRequest(BaseModel):
    ids: List[str]


@router.delete("/admin/invites/batch")
@router.post("/admin/invites/batch-delete")
def delete_invites_batch(
    body: BatchDeleteInvitesRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Exclui múltiplos convites em lote."""
    if not body.ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum convite informado para exclusão.",
        )

    deleted = db.query(UserInvite).filter(UserInvite.id.in_(body.ids)).delete(synchronize_session=False)
    db.commit()
    logger.info(f"Admin {current_user.email} deletou {deleted} convites em lote.")
    return {"success": True, "deleted_count": deleted, "message": f"{deleted} convite(s) excluído(s) com sucesso."}


@router.get("/admin/invites")
def list_invites(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Lista todos os convites criados com status de uso e expiração."""
    invites = db.query(UserInvite).order_by(desc(UserInvite.created_at)).all()
    now = datetime.utcnow()

    items = []
    for inv in invites:
        if inv.is_used:
            invite_status = "used"
        elif inv.expires_at and inv.expires_at < now:
            invite_status = "expired"
        else:
            invite_status = "active"

        items.append({
            "id": inv.id,
            "token": inv.token,
            "role": inv.role,
            "role_label": "Administrador" if inv.role == "admin" else "Aluno",
            "validity_type": inv.validity_type,
            "expires_at": inv.expires_at.isoformat() + "Z" if inv.expires_at else None,
            "access_days": inv.access_days,
            "daily_request_limit": inv.daily_request_limit,
            "max_total_requests": inv.max_total_requests,
            "request_limit_mode": inv.request_limit_mode or "strict",
            "allow_multiple_profiles": bool(inv.allow_multiple_profiles),
            "max_extra_profiles": inv.max_extra_profiles,
            "created_at": inv.created_at.isoformat() + "Z",
            "is_used": inv.is_used,
            "used_at": inv.used_at.isoformat() + "Z" if inv.used_at else None,
            "status": invite_status,
            "invite_path": f"/cadastro?token={inv.token}",
        })

    return {"items": items, "total": len(items)}


@router.get("/auth/invite/{token}")
def validate_invite(token: str, db: Session = Depends(get_db)):
    """Valida se um token de convite existe e ainda é válido."""
    invite = db.query(UserInvite).filter(UserInvite.token == token).first()
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link de convite não encontrado ou inválido.",
        )

    if invite.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este link de convite já foi utilizado.",
        )

    if invite.expires_at and invite.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este link de convite expirou.",
        )

    return {
        "valid": True,
        "token": invite.token,
        "role": invite.role,
        "role_label": "Administrador" if invite.role == "admin" else "Aluno",
        "validity_type": invite.validity_type,
        "expires_at": invite.expires_at.isoformat() + "Z" if invite.expires_at else None,
    }


def validate_strong_password(password: str) -> None:
    """Valida se a senha atende aos requisitos de segurança: mínimo 12 caracteres, maiúscula, minúscula, número e símbolo especial."""
    if not password or len(password) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A senha deve conter no mínimo 12 caracteres.",
        )
    if not any(c.isupper() for c in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A senha deve conter pelo menos uma letra maiúscula.",
        )
    if not any(c.islower() for c in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A senha deve conter pelo menos uma letra minúscula.",
        )
    if not any(c.isdigit() for c in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A senha deve conter pelo menos um número.",
        )
    special_characters = "!@#$%^&*()_+-=[]{};':\"|,.<>/?~`\\ "
    if not any(c in special_characters for c in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A senha deve conter pelo menos um caractere especial (!@#$%^&*...).",
        )


class VerifyRegisterCodeRequest(BaseModel):
    token: str
    email: str
    code: str


class ResendRegisterCodeRequest(BaseModel):
    token: str
    email: str


class VerifyRegisterLinkRequest(BaseModel):
    token: str


def _build_email_verification_token(verification_id: str, email: str, invite_token: str) -> str:
    payload = {
        "purpose": "email_verification",
        "vid": str(verification_id),
        "email": email,
        "invite_token": invite_token,
        "exp": datetime.utcnow() + timedelta(minutes=15),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _build_confirm_url(verification_token: str) -> str:
    base_url = (
        os.getenv("FRONTEND_URL")
        or os.getenv("DASHBOARD_URL")
        or "http://localhost:3000"
    ).strip().rstrip("/")
    return f"{base_url}/cadastro/confirmar?token={verification_token}"


def _finalize_verified_registration(db: Session, invite: UserInvite, verification: RegistrationVerification) -> dict:
    now = datetime.utcnow()
    access_expires = (
        now + timedelta(days=invite.access_days)
        if invite.role == "client" and invite.access_days and invite.access_days > 0
        else None
    )

    new_user = User(
        name=verification.name,
        email=verification.email,
        whatsapp=verification.whatsapp,
        password_hash=verification.password_hash,
        role=invite.role,
        is_active=True,
        access_expires_at=access_expires,
        daily_request_limit=invite.daily_request_limit if invite.role != "admin" else None,
        max_total_requests=invite.max_total_requests if invite.role != "admin" else None,
        request_limit_mode=(invite.request_limit_mode or "strict") if invite.role != "admin" else "strict",
        allow_multiple_profiles=bool(invite.allow_multiple_profiles) if invite.role != "admin" else False,
        max_extra_profiles=invite.max_extra_profiles if (invite.role != "admin" and invite.allow_multiple_profiles) else None,
    )
    db.add(new_user)
    db.flush()

    invite.is_used = True
    invite.used_at = now
    invite.used_by_id = new_user.id

    clean_email = verification.email
    db.delete(verification)
    db.commit()

    logger.info(f"Conta verificada e criada com sucesso: {clean_email} com role {new_user.role}")
    jwt_token = create_token(new_user.id, new_user.role)

    return {
        "success": True,
        "token": jwt_token,
        "role": new_user.role,
        "name": new_user.name,
        "email": new_user.email,
        "message": "Conta verificada e criada com sucesso! Seja bem-vindo(a).",
    }


@router.post("/auth/request-register-code")
def request_register_code(
    body: RegisterWithInviteRequest,
    db: Session = Depends(get_db),
):
    """
    Inicia o processo de cadastro via convite.
    Valida os dados e a senha forte, gera um código OTP de 6 dígitos e envia por e-mail via Brevo.
    A conta NÃO é criada neste momento — apenas após a confirmação do código.
    """
    invite = db.query(UserInvite).filter(UserInvite.token == body.token).first()
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link de convite inválido.",
        )

    if invite.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este link de convite já foi utilizado.",
        )

    if invite.expires_at and invite.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este link de convite expirou.",
        )

    clean_email = (body.email or "").strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe um endereço de e-mail válido.",
        )

    clean_name = (body.name or "").strip()
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe o nome completo.",
        )

    # Validação de senha forte (mínimo 12 caracteres, maiúscula, minúscula, número e símbolo)
    validate_strong_password(body.password)

    # Verifica se já existe usuário cadastrado com este e-mail
    existing_user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este e-mail já está cadastrado no sistema.",
        )

    # Gera código numérico de 6 dígitos
    code = f"{secrets.randbelow(900000) + 100000}"

    # Remove qualquer código de verificação anterior deste e-mail
    db.query(RegistrationVerification).filter(RegistrationVerification.email == clean_email).delete()

    # Cria nova verificação com validade de 15 minutos
    verification = RegistrationVerification(
        email=clean_email,
        name=clean_name,
        whatsapp=(body.whatsapp or "").strip() or None,
        password_hash=hash_password(body.password),
        invite_token=body.token,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=15),
    )
    db.add(verification)
    db.commit()
    db.refresh(verification)

    # Gera link com botão de confirmação e dispara via API Brevo
    verif_token = _build_email_verification_token(verification.id, clean_email, body.token)
    confirm_url = _build_confirm_url(verif_token)
    send_brevo_verification_link(to_email=clean_email, name=clean_name, confirm_url=confirm_url)

    logger.info(f"E-mail de confirmação gerado para: {clean_email}")

    return {
        "success": True,
        "message": "E-mail de confirmação enviado! Clique no botão enviado para o seu e-mail.",
        "email": clean_email,
    }


@router.post("/auth/verify-register-code")
def verify_register_code(
    body: VerifyRegisterCodeRequest,
    db: Session = Depends(get_db),
):
    """
    Valida o código de 6 dígitos recebido por e-mail e cria efetivamente a conta do usuário.
    """
    invite = db.query(UserInvite).filter(UserInvite.token == body.token).first()
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link de convite inválido.",
        )

    if invite.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este link de convite já foi utilizado.",
        )

    if invite.expires_at and invite.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este link de convite expirou.",
        )

    clean_email = (body.email or "").strip().lower()
    clean_code = (body.code or "").strip()

    verification = (
        db.query(RegistrationVerification)
        .filter(RegistrationVerification.email == clean_email)
        .first()
    )

    if not verification or verification.code != clean_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de verificação incorreto ou não encontrado.",
        )

    if verification.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O código de verificação expirou. Por favor, solicite um novo código.",
        )

    return _finalize_verified_registration(db, invite, verification)


@router.post("/auth/verify-register-link")
def verify_register_link(
    body: VerifyRegisterLinkRequest,
    db: Session = Depends(get_db),
):
    """Valida o botão/link de confirmação recebido por e-mail e cria a conta do usuário."""
    try:
        payload = jwt.decode(body.token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link de confirmação inválido ou expirado. Solicite um novo e-mail.",
        )

    if payload.get("purpose") != "email_verification":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido.")

    vid = payload.get("vid")
    clean_email = (payload.get("email") or "").strip().lower()
    invite_token = payload.get("invite_token")

    invite = db.query(UserInvite).filter(UserInvite.token == invite_token).first()
    if not invite or invite.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este link de convite é inválido ou já foi utilizado.",
        )
    if invite.expires_at and invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este link de convite expirou.")

    verification = (
        db.query(RegistrationVerification)
        .filter(RegistrationVerification.id == vid, RegistrationVerification.email == clean_email)
        .first()
    )
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solicitação de confirmação não encontrada ou já utilizada.",
        )
    if verification.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O link de confirmação expirou. Solicite um novo e-mail.",
        )

    if db.query(User).filter(func.lower(User.email) == clean_email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este e-mail já foi confirmado e cadastrado.",
        )

    return _finalize_verified_registration(db, invite, verification)


@router.post("/auth/resend-register-code")
def resend_register_code(
    body: ResendRegisterCodeRequest,
    db: Session = Depends(get_db),
):
    """
    Reenvia um novo código de verificação para o e-mail informado caso o anterior tenha expirado ou não tenha chegado.
    """
    invite = db.query(UserInvite).filter(UserInvite.token == body.token).first()
    if not invite or invite.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Convite inválido ou já utilizado.",
        )

    clean_email = (body.email or "").strip().lower()
    verification = (
        db.query(RegistrationVerification)
        .filter(RegistrationVerification.email == clean_email)
        .first()
    )

    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum cadastro pendente encontrado para este e-mail. Preencha o formulário novamente.",
        )

    # Gera novo link de confirmação
    new_code = f"{secrets.randbelow(900000) + 100000}"
    verification.code = new_code
    verification.expires_at = datetime.utcnow() + timedelta(minutes=15)
    db.commit()

    verif_token = _build_email_verification_token(verification.id, clean_email, body.token)
    confirm_url = _build_confirm_url(verif_token)
    send_brevo_verification_link(to_email=clean_email, name=verification.name, confirm_url=confirm_url)

    return {
        "success": True,
        "message": "Um novo e-mail de confirmação foi enviado.",
        "email": clean_email,
    }


@router.post("/auth/register-with-invite")
def register_with_invite(
    body: RegisterWithInviteRequest,
    db: Session = Depends(get_db),
):
    """Cadastra um novo usuário consumindo um token de convite válido (com validação de senha forte)."""
    invite = db.query(UserInvite).filter(UserInvite.token == body.token).first()
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link de convite inválido.",
        )

    if invite.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este link de convite já foi utilizado.",
        )

    if invite.expires_at and invite.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este link de convite expirou.",
        )

    clean_email = (body.email or "").strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe um endereço de e-mail válido.",
        )

    clean_name = (body.name or "").strip()
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe o nome completo.",
        )

    validate_strong_password(body.password)

    existing_user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este e-mail já está cadastrado no sistema.",
        )

    # Cria o novo usuário respeitando o papel definido no convite
    access_expires = (
        datetime.utcnow() + timedelta(days=invite.access_days)
        if invite.role == "client" and invite.access_days and invite.access_days > 0
        else None
    )

    new_user = User(
        name=clean_name,
        email=clean_email,
        whatsapp=(body.whatsapp or "").strip() or None,
        password_hash=hash_password(body.password),
        role=invite.role,
        is_active=True,
        access_expires_at=access_expires,
        daily_request_limit=invite.daily_request_limit if invite.role != "admin" else None,
        max_total_requests=invite.max_total_requests if invite.role != "admin" else None,
        request_limit_mode=(invite.request_limit_mode or "strict") if invite.role != "admin" else "strict",
        allow_multiple_profiles=bool(invite.allow_multiple_profiles) if invite.role != "admin" else False,
        max_extra_profiles=invite.max_extra_profiles if (invite.role != "admin" and invite.allow_multiple_profiles) else None,
    )
    db.add(new_user)
    db.flush()

    # Marca o convite como utilizado
    invite.is_used = True
    invite.used_at = datetime.utcnow()
    invite.used_by_id = new_user.id
    db.commit()

    logger.info(f"Novo usuário cadastrado via convite: {clean_email} com role {new_user.role}")

    # Gera token JWT de autenticação
    jwt_token = create_token(new_user.id, new_user.role)

    return {
        "token": jwt_token,
        "role": new_user.role,
        "name": new_user.name,
        "email": new_user.email,
        "message": "Conta criada com sucesso!",
    }

