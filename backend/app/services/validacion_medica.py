"""Punto unico de verificacion de la cedula profesional.

# Pendiente 0.3 — el mecanismo real (aprobacion manual vs. verificacion contra registro)
# no esta decidido. Hoy todo entra en `pendiente` y lo aprueba un admin. Cuando el cliente
# cierre 0.3, se cambia solo este modulo: nadie mas conoce el criterio.

Aqui no hay datos clinicos ni los habra: solo la acreditacion del profesional.
"""

from dataclasses import dataclass

from app.core.enums import EstadoValidacion


@dataclass(frozen=True)
class ResultadoVerificacion:
    estado_inicial: EstadoValidacion
    requiere_aprobacion_manual: bool
    nota: str


def verificar_cedula(cedula_profesional: str) -> ResultadoVerificacion:
    # La cedula no se loguea ni se devuelve: es dato personal sensible.
    return ResultadoVerificacion(
        estado_inicial=EstadoValidacion.PENDIENTE,
        requiere_aprobacion_manual=True,
        nota="Pendiente 0.3: aprobacion manual por un admin",
    )
