"""Entradas y salidas de /admin y /ecosistema."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.core.enums import (
    Audiencia,
    Empresa,
    EstadoValidacion,
    Modulo,
    Producto,
    Rol,
    SubtipoPartner,
)
from app.models import (
    Espacio,
    PerfilMedico,
    PerfilPartner,
    Publicacion,
    RequisitoDocumental,
    Usuario,
    VinculoEmpresa,
)
from app.schemas.auth import normalizar_email
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


class VinculoAdminOut(BaseModel):
    """Una fila de la cola de partners: un vinculo usuario-empresa con los datos de la razon social."""

    vinculo_id: uuid.UUID
    usuario_id: uuid.UUID
    email: str
    nombre: str
    apellidos: str
    telefono: str | None
    razon_social: str
    rfc: str | None
    empresa: Empresa
    tipo: SubtipoPartner
    estado: EstadoValidacion
    aprobado_por_id: uuid.UUID | None
    aprobado_en: datetime | None
    motivo_rechazo: str | None
    documentos: int
    creado_en: datetime

    @classmethod
    def desde_modelo(cls, u: Usuario, p: PerfilPartner, v: VinculoEmpresa) -> "VinculoAdminOut":
        return cls(
            vinculo_id=v.id,
            usuario_id=u.id,
            email=u.email,
            nombre=u.nombre,
            apellidos=u.apellidos,
            telefono=u.telefono,
            razon_social=p.razon_social,
            rfc=p.rfc,
            empresa=v.empresa,
            tipo=v.tipo,
            estado=v.estado,
            aprobado_por_id=v.aprobado_por_id,
            aprobado_en=v.aprobado_en,
            motivo_rechazo=v.motivo_rechazo,
            documentos=len(p.documentos),
            creado_en=v.creado_en,
        )


class VinculoDetalleOut(BaseModel):
    id: uuid.UUID
    empresa: Empresa
    tipo: SubtipoPartner
    estado: EstadoValidacion
    motivo_rechazo: str | None
    aprobado_en: datetime | None
    creado_en: datetime
    # True si el admin actual puede decidir sobre este vinculo
    decidible: bool


class PartnerAdminOut(BaseModel):
    usuario_id: uuid.UUID
    email: str
    nombre: str
    apellidos: str
    telefono: str | None
    razon_social: str
    rfc: str | None
    vinculos: list[VinculoDetalleOut]
    documentos: int
    creado_en: datetime

    @classmethod
    def desde_modelo(cls, u: Usuario, p: PerfilPartner, vinculos: list[VinculoDetalleOut]) -> "PartnerAdminOut":
        return cls(
            usuario_id=u.id,
            email=u.email,
            nombre=u.nombre,
            apellidos=u.apellidos,
            telefono=u.telefono,
            razon_social=p.razon_social,
            rfc=p.rfc,
            vinculos=vinculos,
            documentos=len(p.documentos),
            creado_en=p.creado_en,
        )


class EspacioOut(BaseModel):
    empresa: Empresa
    nombre: str
    modulos: list[Modulo]
    contacto_nombre: str | None
    contacto_email: str | None
    contacto_telefono: str | None
    portal_url: str | None
    # Lo que el admin actual puede hacer en este espacio
    administra: bool
    edita: bool

    @classmethod
    def desde_modelo(cls, e: Espacio, *, administra: bool, edita: bool) -> "EspacioOut":
        return cls(
            empresa=e.empresa,
            nombre=e.nombre,
            modulos=[Modulo(m) for m in e.modulos if m in Modulo._value2member_map_],
            contacto_nombre=e.contacto_nombre,
            contacto_email=e.contacto_email,
            contacto_telefono=e.contacto_telefono,
            portal_url=e.portal_url,
            administra=administra,
            edita=edita,
        )


class EspacioUpdate(BaseModel):
    """Contactos y portal los edita admin o editor; los modulos solo admin_grupo."""

    nombre: str | None = Field(default=None, min_length=2, max_length=120)
    contacto_nombre: str | None = Field(default=None, max_length=120)
    contacto_email: str | None = Field(default=None, max_length=255)
    contacto_telefono: str | None = Field(default=None, max_length=30)
    portal_url: str | None = Field(default=None, max_length=500)
    modulos: list[Modulo] | None = None

    @field_validator("portal_url")
    @classmethod
    def _https(cls, valor: str | None) -> str | None:
        if valor is None or not valor.strip():
            return None
        valor = valor.strip()
        if not valor.startswith("https://"):
            raise ValueError("El portal operativo debe ser una URL https")
        return valor


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


# ---------- corte 3: cuentas administrativas, requisitos, publicaciones, bitacora ----------


class RolAsignadoIn(BaseModel):
    rol: Rol
    empresa: Empresa | None = None

    @model_validator(mode="after")
    def _empresa_segun_rol(self) -> "RolAsignadoIn":
        if self.rol == Rol.ADMIN_GRUPO and self.empresa is not None:
            raise ValueError("admin_grupo no lleva empresa")
        if self.rol in (Rol.ADMIN_EMPRESA, Rol.EDITOR_EMPRESA) and self.empresa is None:
            raise ValueError("Ese rol necesita empresa")
        return self

    def par(self) -> tuple[Rol, Empresa | None]:
        return (self.rol, self.empresa)


class RolesIn(BaseModel):
    roles: list[RolAsignadoIn] = Field(max_length=12)


class AdminNuevoIn(BaseModel):
    email: EmailStr
    nombre: str = Field(min_length=1, max_length=120)
    apellidos: str = Field(min_length=1, max_length=160)
    roles: list[RolAsignadoIn] = Field(min_length=1, max_length=12)

    @field_validator("email")
    @classmethod
    def _email(cls, valor: str) -> str:
        return normalizar_email(valor)

    @field_validator("nombre", "apellidos")
    @classmethod
    def _sin_espacios(cls, valor: str) -> str:
        return valor.strip()


class ActivoIn(BaseModel):
    activo: bool


class RequisitoDocumentalIn(BaseModel):
    clave: str | None = Field(default=None, max_length=60, pattern=r"^[a-z0-9_]+$")
    nombre: str = Field(min_length=2, max_length=120)
    descripcion: str | None = Field(default=None, max_length=500)
    obligatorio: bool = True
    tipo: SubtipoPartner | None = None


class RequisitosIn(BaseModel):
    requisitos: list[RequisitoDocumentalIn] = Field(max_length=30)


class RequisitoDocumentalOut(BaseModel):
    id: uuid.UUID
    clave: str
    nombre: str
    descripcion: str | None
    obligatorio: bool
    tipo: SubtipoPartner | None
    orden: int
    activo: bool

    @classmethod
    def desde_modelo(cls, r: RequisitoDocumental) -> "RequisitoDocumentalOut":
        return cls(
            id=r.id, clave=r.clave, nombre=r.nombre, descripcion=r.descripcion, obligatorio=r.obligatorio,
            tipo=r.tipo, orden=r.orden, activo=r.activo,
        )


class PublicacionIn(BaseModel):
    audiencia: Audiencia
    titulo: str = Field(min_length=2, max_length=160)
    resumen: str | None = Field(default=None, max_length=500)
    contenido: str = Field(default="", max_length=100_000)
    orden: int = Field(default=0, ge=0, le=999)
    publicada: bool = False


class PublicacionUpdate(BaseModel):
    audiencia: Audiencia | None = None
    titulo: str | None = Field(default=None, min_length=2, max_length=160)
    resumen: str | None = Field(default=None, max_length=500)
    contenido: str | None = Field(default=None, max_length=100_000)
    orden: int | None = Field(default=None, ge=0, le=999)
    publicada: bool | None = None


class PublicacionOut(BaseModel):
    id: uuid.UUID
    empresa: Empresa
    audiencia: Audiencia
    slug: str
    titulo: str
    resumen: str | None
    contenido: str
    orden: int
    publicada: bool
    actualizado_en: datetime

    @classmethod
    def desde_modelo(cls, p: Publicacion) -> "PublicacionOut":
        return cls(
            id=p.id, empresa=p.empresa, audiencia=p.audiencia, slug=p.slug, titulo=p.titulo, resumen=p.resumen,
            contenido=p.contenido, orden=p.orden, publicada=p.publicada, actualizado_en=p.actualizado_en,
        )


class PersonaRefOut(BaseModel):
    id: uuid.UUID
    email: str
    nombre: str

    @classmethod
    def desde_modelo(cls, u: Usuario | None) -> "PersonaRefOut | None":
        if u is None:
            return None
        return cls(id=u.id, email=u.email, nombre=f"{u.nombre} {u.apellidos}".strip())


class BitacoraOut(BaseModel):
    id: uuid.UUID
    accion: str
    detalle: dict
    creado_en: datetime
    actor: PersonaRefOut | None
    objetivo: PersonaRefOut | None
    objetivo_id: uuid.UUID


class PaginaBitacora(BaseModel):
    total: int
    items: list[BitacoraOut]
