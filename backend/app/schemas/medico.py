"""La acreditacion que el propio medico ve y edita.

La cedula sale SIEMPRE enmascarada: es dato personal sensible y ni su dueno necesita leerla
completa en pantalla, le basta reconocerla. Nunca se devuelve en claro por esta via.
"""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.core.enums import EstadoValidacion
from app.models import PerfilMedico
from app.services.acreditacion import enmascarar, puede_editar_cedula


class AcreditacionOut(BaseModel):
    cedula_enmascarada: str
    especialidad: str | None
    institucion: str | None
    estado: EstadoValidacion
    motivo_rechazo: str | None
    validado_en: datetime | None
    # Desde cuando espera: es lo primero que pregunta quien lleva dias en revision.
    solicitada_en: datetime
    # Que puede hacer desde aqui, decidido en el backend y no adivinado por la pantalla.
    puede_editar_cedula: bool
    puede_reenviar: bool

    @classmethod
    def desde_modelo(cls, p: PerfilMedico) -> "AcreditacionOut":
        return cls(
            cedula_enmascarada=enmascarar(p.cedula_profesional),
            especialidad=p.especialidad,
            institucion=p.institucion,
            estado=p.estado,
            motivo_rechazo=p.motivo_rechazo,
            validado_en=p.validado_en,
            solicitada_en=p.creado_en,
            puede_editar_cedula=puede_editar_cedula(p),
            puede_reenviar=p.estado == EstadoValidacion.RECHAZADO,
        )


class AcreditacionUpdate(BaseModel):
    """Lo que el medico puede corregir. La cedula solo mientras no este validada (lo exige el servicio)."""

    cedula_profesional: str | None = Field(default=None, min_length=4, max_length=30)
    especialidad: str | None = Field(default=None, max_length=120)
    institucion: str | None = Field(default=None, max_length=160)

    @field_validator("cedula_profesional", "especialidad", "institucion")
    @classmethod
    def _sin_espacios(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        valor = valor.strip()
        return valor or None
