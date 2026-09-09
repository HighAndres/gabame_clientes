"""Salida publica del usuario. Sin cedula, sin hash, sin nada clinico."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.core.enums import Empresa, EstadoValidacion, Producto, Realm, Rol, SubtipoPartner
from app.models import Usuario
from app.services.vinculos import estado_agregado


class RolOut(BaseModel):
    rol: Rol
    empresa: Empresa | None = None


class VinculoResumenOut(BaseModel):
    empresa: Empresa
    tipo: SubtipoPartner
    estado: EstadoValidacion


class UsuarioOut(BaseModel):
    id: uuid.UUID
    email: str
    email_verificado: bool
    nombre: str
    apellidos: str
    telefono: str | None
    realm: Realm
    roles: list[RolOut]
    origen_inicial: Producto
    # Estado de la acreditacion; None cuando el usuario no tiene ese perfil.
    estado_medico: EstadoValidacion | None = None
    # Agregado de los vinculos (ADR-0008); el detalle por empresa va en `vinculos`.
    estado_partner: EstadoValidacion | None = None
    vinculos: list[VinculoResumenOut] = []
    creado_en: datetime

    @classmethod
    def desde_modelo(cls, u: Usuario) -> "UsuarioOut":
        return cls(
            id=u.id,
            email=u.email,
            email_verificado=u.email_verificado,
            nombre=u.nombre,
            apellidos=u.apellidos,
            telefono=u.telefono,
            realm=u.realm,
            roles=[RolOut(rol=r.rol, empresa=r.empresa) for r in u.roles],
            origen_inicial=u.origen_inicial,
            estado_medico=u.perfil_medico.estado if u.perfil_medico else None,
            estado_partner=estado_agregado(u.vinculos) if u.perfil_partner else None,
            vinculos=[VinculoResumenOut(empresa=v.empresa, tipo=v.tipo, estado=v.estado) for v in u.vinculos],
            creado_en=u.creado_en,
        )


class UsuarioUpdate(BaseModel):
    """Datos editables por el propio usuario. El email no esta aqui a proposito:
    cambiarlo exige re-verificacion y ese flujo no entra en Fase 2."""

    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    apellidos: str | None = Field(default=None, min_length=1, max_length=160)
    telefono: str | None = Field(default=None, max_length=30)

    @field_validator("nombre", "apellidos", "telefono")
    @classmethod
    def _sin_espacios(cls, valor: str | None) -> str | None:
        return valor.strip() if valor else valor
