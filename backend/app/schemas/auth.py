"""Entradas y salidas de /auth."""

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.core.enums import Empresa, SubtipoPartner, TipoCuenta
from app.schemas.comun import OrigenIn

# Politica de contrasena: longitud, no complejidad artificial (NIST 800-63B).
PASSWORD_MIN = 8
PASSWORD_MAX = 128


def normalizar_email(valor: str) -> str:
    """El email es la llave de reconciliacion (Fase 6): siempre en minusculas y sin espacios."""
    return valor.strip().lower()


class PerfilMedicoIn(BaseModel):
    # Dato personal sensible: se guarda, nunca se devuelve ni se loguea.
    cedula_profesional: str = Field(min_length=6, max_length=30)
    especialidad: str | None = Field(default=None, max_length=120)
    institucion: str | None = Field(default=None, max_length=160)

    @field_validator("cedula_profesional")
    @classmethod
    def _cedula_limpia(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor.isalnum():
            raise ValueError("La cedula solo admite letras y numeros")
        return valor


class VinculoIn(BaseModel):
    empresa: Empresa
    tipo: SubtipoPartner


class PerfilPartnerIn(BaseModel):
    razon_social: str = Field(min_length=2, max_length=200)
    rfc: str | None = Field(default=None, min_length=12, max_length=13)
    # Con que empresas del grupo se relaciona y como (ADR-0008). Al menos una, sin repetir.
    vinculos: list[VinculoIn] = Field(min_length=1, max_length=4)

    @field_validator("rfc")
    @classmethod
    def _rfc_mayusculas(cls, valor: str | None) -> str | None:
        return valor.strip().upper() if valor else None

    @field_validator("vinculos")
    @classmethod
    def _empresas_unicas(cls, valor: list[VinculoIn]) -> list[VinculoIn]:
        if len({v.empresa for v in valor}) != len(valor):
            raise ValueError("No se puede repetir una empresa en los vinculos")
        return valor


class RegistroIn(BaseModel):
    tipo_cuenta: TipoCuenta
    email: EmailStr
    password: str = Field(min_length=PASSWORD_MIN, max_length=PASSWORD_MAX)
    nombre: str = Field(min_length=1, max_length=120)
    apellidos: str = Field(min_length=1, max_length=160)
    telefono: str | None = Field(default=None, max_length=30)
    origen: OrigenIn | None = None
    perfil_medico: PerfilMedicoIn | None = None
    perfil_partner: PerfilPartnerIn | None = None

    @field_validator("email")
    @classmethod
    def _email(cls, valor: str) -> str:
        return normalizar_email(valor)

    @field_validator("nombre", "apellidos", "telefono")
    @classmethod
    def _sin_espacios(cls, valor: str | None) -> str | None:
        return valor.strip() if valor else valor

    @model_validator(mode="after")
    def _perfil_segun_tipo(self) -> "RegistroIn":
        if self.tipo_cuenta == TipoCuenta.PROFESIONAL and self.perfil_medico is None:
            raise ValueError("Un profesional de la salud debe capturar su cedula profesional")
        if self.tipo_cuenta == TipoCuenta.EMPRESA and self.perfil_partner is None:
            raise ValueError("Una empresa debe capturar sus datos de partner")
        if self.tipo_cuenta == TipoCuenta.PACIENTE and (self.perfil_medico or self.perfil_partner):
            raise ValueError("Un paciente no lleva perfil profesional ni de partner")
        return self


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=PASSWORD_MAX)
    origen: OrigenIn | None = None

    @field_validator("email")
    @classmethod
    def _email(cls, valor: str) -> str:
        return normalizar_email(valor)


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # segundos de vida del access token


class RefreshIn(BaseModel):
    refresh_token: str = Field(max_length=256)


class EmailIn(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def _email(cls, valor: str) -> str:
        return normalizar_email(valor)


class TokenCorreoIn(BaseModel):
    token: str = Field(min_length=16, max_length=256)


class RestablecerIn(TokenCorreoIn):
    password: str = Field(min_length=PASSWORD_MIN, max_length=PASSWORD_MAX)
