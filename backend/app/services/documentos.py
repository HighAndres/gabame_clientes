"""Documentos de partners: almacenamiento en disco local, validaciones y revision.

Los archivos viven fuera del repo (UPLOADS_DIR, gitignored) con nombre aleatorio; el nombre
original solo se guarda como metadato. Aqui no hay contenido clinico: son documentos de alta
comercial (fiscal, identificacion, domicilio).
"""

import re
import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import EstadoValidacion
from app.core.errores import ErrorNegocio
from app.models import BitacoraValidacion, DocumentoPartner, PerfilPartner, Usuario
from app.services import requisitos

# Tipos aceptados: solo lo que un admin puede abrir sin riesgo.
TIPOS_PERMITIDOS: dict[str, str] = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
}


class ArchivoInvalido(ErrorNegocio):
    status = 422
    codigo = "archivo_invalido"
    mensaje_por_defecto = "Archivo no permitido."


class DocumentoNoEncontrado(ErrorNegocio):
    status = 404
    codigo = "documento_no_encontrado"
    mensaje_por_defecto = "No existe ese documento."


class DocumentoBloqueado(ErrorNegocio):
    status = 409
    codigo = "documento_bloqueado"
    mensaje_por_defecto = "Un documento ya revisado no se puede eliminar."


class TransicionInvalida(ErrorNegocio):
    status = 409
    codigo = "transicion_invalida"
    mensaje_por_defecto = "El documento ya está en ese estado."


class MotivoRequerido(ErrorNegocio):
    status = 422
    codigo = "motivo_requerido"
    mensaje_por_defecto = "Un rechazo necesita motivo."


def _raiz() -> Path:
    raiz = Path(settings.UPLOADS_DIR)
    raiz.mkdir(parents=True, exist_ok=True)
    return raiz


def ruta_absoluta(doc: DocumentoPartner) -> Path:
    return _raiz() / doc.ruta


def _nombre_seguro(nombre: str) -> str:
    """Solo metadato para mostrar: sin rutas, sin caracteres raros, con la extension original."""
    ruta = Path(nombre or "documento")
    stem = re.sub(r"[^\w\-]+", "_", ruta.stem, flags=re.UNICODE).strip("_") or "documento"
    sufijo = re.sub(r"[^\w]", "", ruta.suffix)[:10]
    return (stem[:200] + (f".{sufijo}" if sufijo else "")).lower()


async def guardar(db: Session, usuario: Usuario, tipo: str, archivo: UploadFile) -> DocumentoPartner:
    partner = usuario.perfil_partner
    # La clave debe ser un requisito activo de alguna empresa vinculada (ADR-0008, corte 3)
    if partner is None or not requisitos.clave_valida(db, usuario, tipo):
        raise ArchivoInvalido("Tipo de documento no reconocido para tu tipo de partner.")
    content_type = (archivo.content_type or "").split(";")[0].strip().lower()
    if content_type not in TIPOS_PERMITIDOS:
        raise ArchivoInvalido("Solo se aceptan PDF, JPG o PNG.")

    limite = settings.UPLOAD_MAX_MB * 1024 * 1024
    contenido = await archivo.read(limite + 1)
    if len(contenido) == 0:
        raise ArchivoInvalido("El archivo esta vacio.")
    if len(contenido) > limite:
        raise ArchivoInvalido(f"El archivo supera {settings.UPLOAD_MAX_MB} MB.")

    doc_id = uuid.uuid4()
    relativa = Path("partners") / str(partner.usuario_id) / f"{doc_id}{TIPOS_PERMITIDOS[content_type]}"
    destino = _raiz() / relativa
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(contenido)

    doc = DocumentoPartner(
        id=doc_id,
        partner_id=partner.usuario_id,
        tipo=tipo,
        nombre_archivo=_nombre_seguro(archivo.filename or ""),
        ruta=relativa.as_posix(),
        content_type=content_type,
        tamano_bytes=len(contenido),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def documento_de(db: Session, partner: PerfilPartner, doc_id: uuid.UUID) -> DocumentoPartner:
    doc = db.get(DocumentoPartner, doc_id)
    if doc is None or doc.partner_id != partner.usuario_id:
        raise DocumentoNoEncontrado()
    return doc


def eliminar(db: Session, partner: PerfilPartner, doc_id: uuid.UUID) -> None:
    """El partner solo puede retirar documentos que nadie ha revisado todavia."""
    doc = documento_de(db, partner, doc_id)
    if doc.estado != EstadoValidacion.PENDIENTE:
        raise DocumentoBloqueado()
    ruta = ruta_absoluta(doc)
    db.delete(doc)
    db.commit()
    if ruta.exists():
        ruta.unlink()


def decidir(
    db: Session, actor: Usuario, doc: DocumentoPartner, nuevo: EstadoValidacion, motivo: str | None
) -> DocumentoPartner:
    if doc.estado == nuevo:
        raise TransicionInvalida()
    if nuevo == EstadoValidacion.RECHAZADO and not (motivo and motivo.strip()):
        raise MotivoRequerido()
    anterior = doc.estado
    doc.estado = nuevo
    doc.revisado_por_id = actor.id
    doc.revisado_en = datetime.now(UTC)
    doc.motivo_rechazo = motivo.strip() if (nuevo == EstadoValidacion.RECHAZADO and motivo) else None
    db.add(
        BitacoraValidacion(
            actor_id=actor.id,
            objetivo_id=doc.partner_id,
            accion=f"documento_{nuevo.value}",
            detalle={"documento_id": str(doc.id), "tipo": doc.tipo, "de": anterior.value, "a": nuevo.value, "motivo": motivo},
        )
    )
    db.commit()
    db.refresh(doc)
    return doc
