"""Router: partners. Area del propio partner (Fase 5).

# Pendiente 0.4 — los tipos de documento son el catalogo provisional de
# `app/core/requisitos_partner.py`. Contactos y portales operativos: placeholders del cliente.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import DbSession, require_partner
from app.core.config import settings
from app.core.requisitos_partner import CONTACTOS, requisitos_de
from app.models import Usuario
from app.schemas.partner import DocumentoOut, EstadoPartnerOut
from app.services import documentos

router = APIRouter()

Partner = Annotated[Usuario, Depends(require_partner)]


def _estado(usuario: Usuario) -> EstadoPartnerOut:
    perfil = usuario.perfil_partner
    return EstadoPartnerOut.desde_modelo(
        perfil,
        requisitos_de(perfil.subtipo),
        CONTACTOS,
        limite_mb=settings.UPLOAD_MAX_MB,
        tipos_permitidos=sorted(documentos.TIPOS_PERMITIDOS),
    )


@router.get("/me", response_model=EstadoPartnerOut)
def estado(usuario: Partner) -> EstadoPartnerOut:
    """Estado de cuenta, requisitos con sus documentos y, si esta aprobado, contactos por empresa."""
    return _estado(usuario)


@router.post("/me/documentos", response_model=DocumentoOut, status_code=status.HTTP_201_CREATED)
async def subir_documento(
    usuario: Partner,
    db: DbSession,
    tipo: Annotated[str, Form(max_length=60)],
    archivo: Annotated[UploadFile, File()],
) -> DocumentoOut:
    doc = await documentos.guardar(db, usuario.perfil_partner, tipo, archivo)
    return DocumentoOut.desde_modelo(doc)


@router.get("/me/documentos/{doc_id}/archivo")
def descargar_documento(doc_id: uuid.UUID, usuario: Partner, db: DbSession) -> FileResponse:
    doc = documentos.documento_de(db, usuario.perfil_partner, doc_id)
    return FileResponse(documentos.ruta_absoluta(doc), media_type=doc.content_type, filename=doc.nombre_archivo)


@router.delete("/me/documentos/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_documento(doc_id: uuid.UUID, usuario: Partner, db: DbSession) -> None:
    documentos.eliminar(db, usuario.perfil_partner, doc_id)
