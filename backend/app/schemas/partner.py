"""Area Partners: razon social, vinculos por empresa, requisitos, documentos y contactos."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.core.enums import Empresa, EstadoValidacion, SubtipoPartner
from app.models import DocumentoPartner, Espacio, PerfilPartner, RequisitoDocumental, VinculoEmpresa


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
    descripcion: str | None
    obligatorio: bool
    documentos: list[DocumentoOut]

    @classmethod
    def desde(cls, r: RequisitoDocumental, documentos: list[DocumentoPartner]) -> "RequisitoOut":
        # `tipo` en la API es la clave del requisito (asi lo guarda documentos_partner.tipo)
        return cls(
            tipo=r.clave,
            nombre=r.nombre,
            descripcion=r.descripcion,
            obligatorio=r.obligatorio,
            documentos=[DocumentoOut.desde_modelo(d) for d in documentos if d.tipo == r.clave],
        )


class ContactoEmpresaOut(BaseModel):
    empresa: Empresa
    nombre: str | None
    email: str | None
    telefono: str | None
    portal_url: str | None
    pendiente: bool

    @classmethod
    def desde_espacio(cls, e: Espacio) -> "ContactoEmpresaOut":
        return cls(
            empresa=e.empresa,
            nombre=e.contacto_nombre,
            email=e.contacto_email,
            telefono=e.contacto_telefono,
            portal_url=e.portal_url,
            pendiente=not (e.contacto_nombre or e.contacto_email or e.portal_url),
        )


class VinculoOut(BaseModel):
    id: uuid.UUID
    empresa: Empresa
    empresa_nombre: str
    tipo: SubtipoPartner
    estado: EstadoValidacion
    motivo_rechazo: str | None
    aprobado_en: datetime | None
    creado_en: datetime
    # Solo cuando el vinculo esta aprobado y la empresa tiene el modulo de contactos.
    contacto: ContactoEmpresaOut | None = None

    @classmethod
    def desde_modelo(cls, v: VinculoEmpresa, espacio: Espacio | None, contacto: bool) -> "VinculoOut":
        return cls(
            id=v.id,
            empresa=v.empresa,
            empresa_nombre=espacio.nombre if espacio else v.empresa.value,
            tipo=v.tipo,
            estado=v.estado,
            motivo_rechazo=v.motivo_rechazo,
            aprobado_en=v.aprobado_en,
            creado_en=v.creado_en,
            contacto=ContactoEmpresaOut.desde_espacio(espacio) if (contacto and espacio) else None,
        )


class EstadoPartnerOut(BaseModel):
    razon_social: str
    rfc: str | None
    estado: EstadoValidacion | None  # agregado de los vinculos, para tarjetas
    vinculos: list[VinculoOut]
    requisitos: list[RequisitoOut]
    limite_mb: int
    tipos_permitidos: list[str]
    # Empresas con las que aun no hay vinculo y aceptan solicitudes
    empresas_disponibles: list[Empresa]

    @classmethod
    def desde_modelo(
        cls,
        p: PerfilPartner,
        vinculos: list[VinculoOut],
        estado: EstadoValidacion | None,
        requisitos: list[RequisitoDocumental],
        *,
        limite_mb: int,
        tipos_permitidos: list[str],
        empresas_disponibles: list[Empresa],
    ) -> "EstadoPartnerOut":
        return cls(
            razon_social=p.razon_social,
            rfc=p.rfc,
            estado=estado,
            vinculos=vinculos,
            requisitos=[RequisitoOut.desde(r, p.documentos) for r in requisitos],
            limite_mb=limite_mb,
            tipos_permitidos=tipos_permitidos,
            empresas_disponibles=empresas_disponibles,
        )


class SolicitarVinculoIn(BaseModel):
    empresa: Empresa
    tipo: SubtipoPartner


class DecisionDocumentoIn(BaseModel):
    motivo: str | None = Field(default=None, max_length=500)
