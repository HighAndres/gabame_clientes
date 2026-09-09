"""Router: partners. Area del propio partner (Fase 5, vinculos por empresa en ADR-0008).

# Pendiente 0.4 — los requisitos documentales son dato por empresa (`requisitos_documentales`),
# sembrados con el catalogo generico hasta que cada empresa capture los suyos. Contactos y
# portales: los captura cada admin en su espacio; hasta entonces aparecen "por confirmar".
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import DbSession, require_partner
from app.core.config import settings
from app.core.enums import Empresa, EstadoValidacion, Modulo
from app.models import Usuario
from app.schemas.partner import DocumentoOut, EstadoPartnerOut, SolicitarVinculoIn, VinculoOut
from app.services import documentos, espacios, requisitos, vinculos

router = APIRouter()

Partner = Annotated[Usuario, Depends(require_partner)]


def _estado(db, usuario: Usuario) -> EstadoPartnerOut:
    perfil = usuario.perfil_partner
    salida: list[VinculoOut] = []
    for v in usuario.vinculos:
        espacio = espacios.obtener(db, v.empresa)
        con_contacto = v.estado == EstadoValidacion.VALIDADO and espacio.tiene(Modulo.CONTACTOS.value)
        salida.append(VinculoOut.desde_modelo(v, espacio, con_contacto))

    ya = {v.empresa for v in usuario.vinculos}
    disponibles = [e for e in Empresa if e not in ya and espacios.obtener(db, e).tiene(Modulo.CUENTAS.value)]

    return EstadoPartnerOut.desde_modelo(
        perfil,
        salida,
        vinculos.estado_agregado(usuario.vinculos),
        requisitos.para_usuario(db, usuario),
        limite_mb=settings.UPLOAD_MAX_MB,
        tipos_permitidos=sorted(documentos.TIPOS_PERMITIDOS),
        empresas_disponibles=disponibles,
    )


@router.get("/me", response_model=EstadoPartnerOut)
def estado(usuario: Partner, db: DbSession) -> EstadoPartnerOut:
    """Razon social, vinculos por empresa (con contacto si estan aprobados), requisitos y documentos."""
    return _estado(db, usuario)


@router.post("/me/vinculos", response_model=EstadoPartnerOut, status_code=status.HTTP_201_CREATED)
def solicitar_vinculo(datos: SolicitarVinculoIn, usuario: Partner, db: DbSession) -> EstadoPartnerOut:
    """Pide relacion con otra empresa del grupo. Nace en `pendiente`; la aprueba el admin de esa empresa."""
    vinculos.solicitar(db, usuario, datos.empresa, datos.tipo)
    return _estado(db, usuario)


@router.post("/me/documentos", response_model=DocumentoOut, status_code=status.HTTP_201_CREATED)
async def subir_documento(
    usuario: Partner,
    db: DbSession,
    tipo: Annotated[str, Form(max_length=60)],
    archivo: Annotated[UploadFile, File()],
) -> DocumentoOut:
    doc = await documentos.guardar(db, usuario, tipo, archivo)
    return DocumentoOut.desde_modelo(doc)


@router.get("/me/documentos/{doc_id}/archivo")
def descargar_documento(doc_id: uuid.UUID, usuario: Partner, db: DbSession) -> FileResponse:
    doc = documentos.documento_de(db, usuario.perfil_partner, doc_id)
    return FileResponse(documentos.ruta_absoluta(doc), media_type=doc.content_type, filename=doc.nombre_archivo)


@router.delete("/me/documentos/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_documento(doc_id: uuid.UUID, usuario: Partner, db: DbSession) -> None:
    documentos.eliminar(db, usuario.perfil_partner, doc_id)
