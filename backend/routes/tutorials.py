import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.models import TutorialLesson, User
from routes.auth import get_current_user, require_admin

router = APIRouter(prefix="/tutorials", tags=["tutorials"])
logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(os.getenv("TUTORIAL_UPLOAD_DIR", "/app/uploads/tutorials")).resolve()
ALLOWED_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v"}
MAX_UPLOAD_BYTES = 250 * 1024 * 1024  # 250 MB


class TutorialPayload(BaseModel):
    title: str
    description: Optional[str] = ""
    lesson_type: str = "video"          # video | text
    video_source: Optional[str] = "url" # upload | url
    video_url: Optional[str] = None
    text_content: Optional[str] = ""
    duration: Optional[str] = ""
    sort_order: Optional[int] = 0


def _serialize_lesson(lesson: TutorialLesson) -> dict:
    return {
        "id": str(lesson.id),
        "title": lesson.title,
        "description": lesson.description or "",
        "lesson_type": lesson.lesson_type or "video",
        "video_source": lesson.video_source or "url",
        "video_url": lesson.video_url or "",
        "text_content": lesson.text_content or "",
        "duration": lesson.duration or "",
        "sort_order": int(lesson.sort_order or 0),
        "created_at": lesson.created_at.isoformat() if lesson.created_at else None,
        "updated_at": lesson.updated_at.isoformat() if lesson.updated_at else None,
    }


def _validate_lesson_payload(body: TutorialPayload) -> tuple[str, str]:
    clean_title = (body.title or "").strip()
    if not clean_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe o título do tutorial.",
        )

    ltype = (body.lesson_type or "video").strip().lower()
    if ltype not in ("video", "text"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de tutorial inválido. Use 'video' ou 'text'.",
        )

    if ltype == "video" and not (body.video_url or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe o arquivo ou link do vídeo tutorial.",
        )
    if ltype == "text" and not (body.text_content or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe o conteúdo do tutorial em texto.",
        )
    return clean_title, ltype


def _remove_uploaded_file_if_local(video_url: Optional[str]) -> None:
    if not video_url or not video_url.startswith("/tutorials/media/"):
        return
    filename = os.path.basename(video_url)
    candidate = (UPLOAD_DIR / filename).resolve()
    if candidate.parent == UPLOAD_DIR and candidate.is_file():
        try:
            candidate.unlink()
        except OSError as exc:
            logger.warning(f"Falha ao remover arquivo de tutorial {candidate}: {exc}")


@router.get("")
def list_tutorials(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista todas as aulas de tutorial ordenadas para exibição na aba Comece Aqui."""
    lessons = (
        db.query(TutorialLesson)
        .order_by(TutorialLesson.sort_order.asc(), TutorialLesson.created_at.asc())
        .all()
    )
    return {"items": [_serialize_lesson(l) for l in lessons]}


@router.post("/upload")
async def upload_tutorial_video(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
):
    """Recebe upload de arquivo de vídeo para um tutorial e retorna a URL local de reprodução."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de vídeo não suportado. Envie .mp4, .webm, .mov ou .m4v.",
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest = (UPLOAD_DIR / safe_name).resolve()

    size = 0
    try:
        with open(dest, "wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    out.close()
                    dest.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Arquivo de vídeo excede o limite de 250 MB.",
                    )
                out.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Erro ao salvar upload de vídeo tutorial: {exc}", exc_info=True)
        dest.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao salvar o arquivo de vídeo.",
        )

    logger.info(f"Vídeo tutorial salvo por '{current_user.email}': {safe_name} ({size} bytes)")
    return {"video_url": f"/tutorials/media/{safe_name}", "filename": safe_name}


@router.get("/media/{filename}")
def get_tutorial_media(filename: str):
    """Serve arquivo de vídeo enviado pelo painel para reprodução no player."""
    safe_name = os.path.basename(filename)
    if safe_name != filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nome de arquivo inválido.")
    target = (UPLOAD_DIR / safe_name).resolve()
    if target.parent != UPLOAD_DIR or not target.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vídeo não encontrado.")
    return FileResponse(target)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_tutorial(
    body: TutorialPayload,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Cria uma nova aula de tutorial (vídeo ou texto)."""
    clean_title, ltype = _validate_lesson_payload(body)

    lesson = TutorialLesson(
        id=str(uuid.uuid4()),
        title=clean_title,
        description=(body.description or "").strip(),
        lesson_type=ltype,
        video_source=(body.video_source or "url").strip().lower() if ltype == "video" else "url",
        video_url=(body.video_url or "").strip() if ltype == "video" else "",
        text_content=(body.text_content or "").strip() if ltype == "text" else "",
        duration=(body.duration or "").strip(),
        sort_order=int(body.sort_order or 0),
        created_by_id=current_user.id,
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)

    logger.info(f"Tutorial '{lesson.title}' ({lesson.lesson_type}) criado por '{current_user.email}'.")
    return {"success": True, "item": _serialize_lesson(lesson)}


@router.put("/{lesson_id}")
def update_tutorial(
    lesson_id: str,
    body: TutorialPayload,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Atualiza uma aula de tutorial existente."""
    lesson = db.query(TutorialLesson).filter(TutorialLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutorial não encontrado.")

    clean_title, ltype = _validate_lesson_payload(body)

    old_video = lesson.video_url
    new_video = (body.video_url or "").strip() if ltype == "video" else ""
    if old_video and old_video != new_video:
        _remove_uploaded_file_if_local(old_video)

    lesson.title = clean_title
    lesson.description = (body.description or "").strip()
    lesson.lesson_type = ltype
    lesson.video_source = (body.video_source or "url").strip().lower() if ltype == "video" else "url"
    lesson.video_url = new_video
    lesson.text_content = (body.text_content or "").strip() if ltype == "text" else ""
    lesson.duration = (body.duration or "").strip()
    lesson.sort_order = int(body.sort_order or 0)
    lesson.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(lesson)

    logger.info(f"Tutorial '{lesson.title}' atualizado por '{current_user.email}'.")
    return {"success": True, "item": _serialize_lesson(lesson)}


@router.delete("/{lesson_id}")
def delete_tutorial(
    lesson_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Exclui uma aula de tutorial."""
    lesson = db.query(TutorialLesson).filter(TutorialLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutorial não encontrado.")

    _remove_uploaded_file_if_local(lesson.video_url)
    db.delete(lesson)
    db.commit()

    logger.info(f"Tutorial '{lesson.title}' removido por '{current_user.email}'.")
    return {"success": True, "message": "Tutorial removido com sucesso."}
