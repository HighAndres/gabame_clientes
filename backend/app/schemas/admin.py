"""Entradas y salidas de /admin y /ecosistema."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.core.enums import Empresa, EstadoValidacion, Producto, SubtipoPartner
from app.models import PerfilMedico, PerfilPartner, Usuario
from app.schemas.usuario import UsuarioOut


class UsuarioAdminOut(UsuarioOut):
    activo: bool

    @classmethod
    def desde_modelo(cls, u: Usuario) -> "UsuarioAdminOut":
        base = UsuarioOut.desde_modelo(u)
        return cls(**base.model_dump(), activo=u.activo)


class PaginaUsuarios(BaseModel):
    total: int
    items: list[UsuarioAdminOut]


class MedicoAdminOut(BaseModel):
    """Vista del admin que valida. Incluye la cedula porque es lo que valida: no es una
    respuesta publica y solo la reciben admins con alcance sobre medicos. Nunca se loguea."""

    usuario_id: uuid.UUID
    email: str
    nombre: str
    apellidos: str
    telefono: str | None
    cedula_profesional: str
    especialidad: str | None
    institucion: str | None
    estado: EstadoValidacion
    validado_por_id: uuid.UUID | None
    validado_en: datetime | None
    motivo_rechazo: str | None
    origen_inicial: Producto
    creado_en: datetime

    @classmethod
    def desde_modelo(cls, u: Usuario, p: PerfilMedico) -> "MedicoAdminOut":
        return cls(
            usuario_id=u.id,
            email=u.email,
            nombre=u.nombre,
            apellidos=u.apellidos,
            telefono=u.telefono,
            cedula_profesional=p.cedula_profesional,
            especialidad=p.especialidad,
            institucion=p.institucion,
            estado=p.estado,
            validado_por_id=p.validado_por_id,
            validado_en=p.validado_en,
            motivo_rechazo=p.motivo_rechazo,
            origen_inicial=u.origen_inicial,
            creado_en=p.creado_en,
        )


class PartnerAdminOut(BaseModel):
    usuario_id: uuid.UUID
    email: str
    nombre: str
    apellidos: str
    telefono: str | None
    razon_social: str
    rfc: str | None
    subtipo: SubtipoPartner
    empresa_objetivo: Empresa
    estado: EstadoValidacion
    aprobado_por_id: uuid.UUID | None
    aprobado_en: datetime | None
    motivo_rechazo: str | None
    documentos: int
    creado_en: datetime

    @classmethod
    def desde_modelo(cls, u: Usuario, p: PerfilPartner) -> "PartnerAdminOut":
        return cls(
            usuario_id=u.id,
            email=u.email,
            nombre=u.nombre,
            apellidos=u.apellidos,
            telefono=u.telefono,
            razon_social=p.razon_social,
            rfc=p.rfc,
            subtipo=p.subtipo,
            empresa_objetivo=p.empresa_objetivo,
            estado=p.estado,
            aprobado_por_id=p.aprobado_por_id,
            aprobado_en=p.aprobado_en,
            motivo_rechazo=p.motivo_rechazo,
            documentos=len(p.documentos),
            creado_en=p.creado_en,
        )


class DecisionIn(BaseModel):
    """Motivo obligatorio al rechazar; opcional al aprobar (queda en bitacora)."""

    motivo: str | None = Field(default=None, max_length=500)


class ResumenAdmin(BaseModel):
    medicos_pendientes: int | None  # None = fuera del alcance de este admin
    partners_pendientes: int
    usuarios_total: int | None
    alcance_grupo: bool
    empresas: list[Empresa]


class PiezaOut(BaseModel):
    producto: Producto
    nombre: str
    tipo: str
    empresa: Empresa | None
    url: str | None
    descripcion: str
    pendiente: bool
