"""Area Partners: estado de cuenta, requisitos, documentos y contactos por empresa."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.core.enums import Empresa, EstadoValidacion, SubtipoPartner
from app.core.requisitos_partner import ContactoEmpresa, Requisito
from app.models import DocumentoPartner, PerfilPartner


class DocumentoOut(BaseModel):
    id: uuid.UUID
    tipo: str
    nombre_archivo: str
    content_type: str
    tamano_bytes: int
    estado: EstadoValidacion
    motivo_rechazo: str | None
    revisado_en: datetime | None
    subido_en: datetime

    @classmethod
    def desde_modelo(cls, d: DocumentoPartner) -> "DocumentoOut":
        return cls(
            id=d.id,
            tipo=d.tipo,
            nombre_archivo=d.nombre_archivo,
            content_type=d.content_type,
            tamano_bytes=d.tamano_bytes,
            estado=d.estado,
            motivo_rechazo=d.motivo_rechazo,
            revisado_en=d.revisado_en,
            subido_en=d.subido_en,
        )


class RequisitoOut(BaseModel):
    tipo: str
    nombre: str
    descripcion: str
    obligatorio: bool
    documentos: list[DocumentoOut]

    @classmethod
    def desde(cls, r: Requisito, documentos: list[DocumentoPartner]) -> "RequisitoOut":
        return cls(
            tipo=r.tipo,
            nombre=r.nombre,
            descripcion=r.descripcion,
            obligatorio=r.obligatorio,
            documentos=[DocumentoOut.desde_modelo(d) for d in documentos if d.tipo == r.tipo],
        )


class ContactoEmpresaOut(BaseModel):
    empresa: Empresa
    nombre: str | None
    email: str | None
    telefono: str | None
    portal_url: str | None
    pendiente: bool

    @classmethod
    def desde(cls, c: ContactoEmpresa) -> "ContactoEmpresaOut":
        return cls(
            empresa=c.empresa,
            nombre=c.nombre,
            email=c.email,
            telefono=c.telefono,
            portal_url=c.portal_url,
            pendiente=c.nombre is None and c.email is None and c.portal_url is None,
        )


class EstadoPartnerOut(BaseModel):
    razon_social: str
    rfc: str | None
    subtipo: SubtipoPartner
    empresa_objetivo: Empresa
    estado: EstadoValidacion
    motivo_rechazo: str | None
    aprobado_en: datetime | None
    requisitos: list[RequisitoOut]
    # Contactos y portales solo cuando la cuenta esta aprobada; antes va vacio.
    contactos: list[ContactoEmpresaOut]
    limite_mb: int
    tipos_permitidos: list[str]

    @classmethod
    def desde_modelo(
        cls,
        p: PerfilPartner,
        requisitos: tuple[Requisito, ...],
        contactos: tuple[ContactoEmpresa, ...],
        *,
        limite_mb: int,
        tipos_permitidos: list[str],
    ) -> "EstadoPartnerOut":
        return cls(
            razon_social=p.razon_social,
            rfc=p.rfc,
            subtipo=p.subtipo,
            empresa_objetivo=p.empresa_objetivo,
            estado=p.estado,
            motivo_rechazo=p.motivo_rechazo,
            aprobado_en=p.aprobado_en,
            requisitos=[RequisitoOut.desde(r, p.documentos) for r in requisitos],
            contactos=[ContactoEmpresaOut.desde(c) for c in contactos]
            if p.estado == EstadoValidacion.VALIDADO
            else [],
            limite_mb=limite_mb,
            tipos_permitidos=tipos_permitidos,
        )


class DecisionDocumentoIn(BaseModel):
    motivo: str | None = Field(default=None, max_length=500)
