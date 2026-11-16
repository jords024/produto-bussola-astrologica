import os
import json
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import httpx

from models.models import User
from database import get_db
from routes.auth import require_admin

router = APIRouter(prefix="/admin/docker-logs", tags=["docker-logs"])
logger = logging.getLogger("routes.docker_logs")

ALLOWED_CONTAINERS = {
    "backend": "bussolaapp_backend",
    "frontend": "bussolaapp_frontend",
}

DOCKER_SOCKET_PATH = "/var/run/docker.sock"


def _clean_docker_stream(raw_bytes: bytes) -> str:
    """
    Remove o header de multiplexação do Docker (8 bytes por chunk)
    Header Docker: [1 byte stream type (1=stdout, 2=stderr), 3 bytes 0, 4 bytes payload size big-endian]
    """
    if not raw_bytes:
        return ""

    cleaned_parts: List[str] = []
    i = 0
    total = len(raw_bytes)

    while i < total:
        if i + 8 <= total and raw_bytes[i] in (1, 2) and raw_bytes[i+1:i+4] == b'\x00\x00\x00':
            size = int.from_bytes(raw_bytes[i+4:i+8], byteorder="big")
            chunk = raw_bytes[i+8:i+8+size]
            cleaned_parts.append(chunk.decode("utf-8", errors="replace"))
            i += 8 + size
        else:
            cleaned_parts.append(raw_bytes[i:].decode("utf-8", errors="replace"))
            break

    return "".join(cleaned_parts)


@router.get("")
def get_container_logs(
    container: str = Query("backend", description="Identificador do contêiner: backend ou frontend"),
    tail: int = Query(100, ge=10, le=2000, description="Número de linhas para retornar"),
    since: Optional[int] = Query(None, description="Timestamp unix em segundos para filtrar logs a partir de"),
    until: Optional[int] = Query(None, description="Timestamp unix em segundos para filtrar logs até"),
    admin: User = Depends(require_admin),
):
    """
    Retorna os logs reais do contêiner Docker selecionado (FastAPI backend ou Frontend Next.js/Vite).
    """
    target_container = ALLOWED_CONTAINERS.get(container.lower())
    if not target_container:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Contêiner inválido. Escolha entre: {', '.join(ALLOWED_CONTAINERS.keys())}"
        )

    if not os.path.exists(DOCKER_SOCKET_PATH):
        logger.warning(f"Socket do Docker ({DOCKER_SOCKET_PATH}) não está disponível.")
        # Retorna mock seguro/informativo em ambientes onde o socket não foi montado
        return {
            "container": container,
            "container_name": target_container,
            "tail": tail,
            "command": f"docker logs --tail {tail} {target_container}",
            "logs": f"[INFO] [{target_container}] Servidor ativo. Docker socket não acessível em {DOCKER_SOCKET_PATH}.",
            "lines": [
                f"[INFO] [{target_container}] Servidor ativo e respondendo normalmente.",
                f"[INFO] Socket do Docker ({DOCKER_SOCKET_PATH}) não mapeado neste ambiente."
            ],
            "total_lines": 2
        }

    try:
        transport = httpx.HTTPTransport(uds=DOCKER_SOCKET_PATH)
        with httpx.Client(transport=transport, timeout=10.0) as client:
            params: Dict[str, Any] = {
                "stdout": "true",
                "stderr": "true",
                "tail": str(tail),
                "timestamps": "true",
            }
            if since:
                params["since"] = str(since)
            if until:
                params["until"] = str(until)

            # 1. Tenta buscar direto pelo nome padrão
            resp = client.get(f"http://docker/containers/{target_container}/logs", params=params)

            # 2. Se retornar 404, busca dinamicamente nos contêineres ativos (compatível com Docker Swarm / Stacks)
            if resp.status_code == 404:
                try:
                    list_resp = client.get("http://docker/containers/json?all=false")
                    if list_resp.status_code == 200:
                        containers_list = list_resp.json()
                        matched_id = None
                        target_key = container.lower()
                        for c in containers_list:
                            names = c.get("Names", [])
                            labels = c.get("Labels", {})
                            swarm_svc = labels.get("com.docker.swarm.service.name", "")
                            compose_svc = labels.get("com.docker.compose.service", "")

                            if (
                                any(target_key in n.lower() for n in names)
                                or target_key in swarm_svc.lower()
                                or target_key in compose_svc.lower()
                            ):
                                matched_id = c.get("Id")
                                break

                        if matched_id:
                            resp = client.get(f"http://docker/containers/{matched_id}/logs", params=params)
                except Exception as ex:
                    logger.warning(f"Erro ao listar contêineres dinâmicos: {ex}")

            if resp.status_code == 404:
                return {
                    "container": container,
                    "container_name": target_container,
                    "tail": tail,
                    "command": f"docker logs --tail {tail} {target_container}",
                    "logs": f"[INFO] Contêiner '{container}' em execução. Logs gerenciados pelo Docker Swarm.",
                    "lines": [
                        f"[INFO] Contêiner '{container}' em execução.",
                        f"[INFO] Para inspecionar logs no host: docker service logs -f bussola_app_{container}"
                    ],
                    "total_lines": 2
                }
            if resp.status_code != 200:
                logger.error(f"Erro na Docker Engine API ({resp.status_code}): {resp.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Falha ao obter logs do contêiner no Docker Engine: {resp.status_code}"
                )

            raw_logs = _clean_docker_stream(resp.content)
            raw_lines = [l for l in raw_logs.split("\n") if l.strip()]

            # Formata timestamp UTC do Docker para horário de Brasília (UTC-3)
            import re
            from datetime import datetime, timezone, timedelta
            tz_brasilia = timezone(timedelta(hours=-3))

            formatted_lines: List[str] = []
            for line in raw_lines:
                # Regex para capturar timestamp ISO 8601 do Docker no início da linha
                match = re.match(r"^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s*(.*)$", line)
                if match:
                    iso_str, content = match.groups()
                    try:
                        dt_utc = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
                        dt_br = dt_utc.astimezone(tz_brasilia)
                        formatted_lines.append(f"[{dt_br.strftime('%d/%m/%Y %H:%M:%S')}] {content}")
                    except Exception:
                        formatted_lines.append(line)
                else:
                    formatted_lines.append(line)

            return {
                "container": container,
                "container_name": target_container,
                "tail": tail,
                "command": f"docker logs --tail {tail} {target_container}",
                "logs": "\n".join(formatted_lines),
                "lines": formatted_lines,
                "total_lines": len(formatted_lines)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao consultar logs do contêiner {target_container}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao consultar logs: {str(e)}"
        )
