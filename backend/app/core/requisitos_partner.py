"""Catalogo POR DEFECTO de requisitos documentales.

# Pendiente 0.4 — el cliente no ha definido los documentos por tipo de partner. Desde el
# corte 3 los requisitos son DATO (`requisitos_documentales`, editables por cada empresa desde
# el panel); esta lista solo siembra un espacio que no tiene ninguno: los tres documentos
# genericos de cualquier alta comercial en Mexico, iguales para todos los tipos, mas "otro".
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Requisito:
    clave: str          # clave estable que se guarda en documentos_partner.tipo
    nombre: str
    descripcion: str
    obligatorio: bool


POR_DEFECTO: tuple[Requisito, ...] = (
    Requisito("constancia_fiscal", "Constancia de situacion fiscal", "Emitida por el SAT, vigente.", True),
    Requisito("identificacion_representante", "Identificacion del representante", "INE o pasaporte vigente.", True),
    Requisito("comprobante_domicilio", "Comprobante de domicilio", "No mayor a 3 meses.", True),
    Requisito("otro", "Otro documento", "Cualquier otro documento que te soliciten.", False),
)
