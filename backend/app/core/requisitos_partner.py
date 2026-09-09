"""Requisitos documentales por subtipo de partner y contactos comerciales por empresa.

# Pendiente 0.4 — el cliente no ha definido los documentos por subtipo. Esta lista es
# PROVISIONAL: los tres documentos genericos de cualquier alta comercial en Mexico, iguales para
# los tres subtipos, mas "otro". Cuando llegue 0.4 se cambia SOLO este modulo (y su espejo en
# el frontend si se muestra texto distinto).

# Los contactos comerciales y portales operativos por empresa viven en `espacios` (ADR-0008).
"""

from dataclasses import dataclass

from app.core.enums import SubtipoPartner


@dataclass(frozen=True)
class Requisito:
    tipo: str          # clave estable que se guarda en documentos_partner.tipo
    nombre: str
    descripcion: str
    obligatorio: bool


_GENERICOS: tuple[Requisito, ...] = (
    Requisito("constancia_fiscal", "Constancia de situacion fiscal", "Emitida por el SAT, vigente.", True),
    Requisito("identificacion_representante", "Identificacion del representante", "INE o pasaporte vigente.", True),
    Requisito("comprobante_domicilio", "Comprobante de domicilio", "No mayor a 3 meses.", True),
    Requisito("otro", "Otro documento", "Cualquier otro documento que te soliciten.", False),
)

REQUISITOS: dict[SubtipoPartner, tuple[Requisito, ...]] = {
    SubtipoPartner.DISTRIBUIDOR: _GENERICOS,
    SubtipoPartner.MAYORISTA: _GENERICOS,
    SubtipoPartner.INSTITUCIONAL: _GENERICOS,
}


def requisitos_de(subtipo: SubtipoPartner) -> tuple[Requisito, ...]:
    return REQUISITOS[subtipo]


def tipo_valido(subtipo: SubtipoPartner, tipo: str) -> bool:
    return any(r.tipo == tipo for r in requisitos_de(subtipo))
