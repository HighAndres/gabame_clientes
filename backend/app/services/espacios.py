"""Espacios por empresa (ADR-0008): modulos habilitados, contacto comercial y portal operativo.

Los valores por defecto viven aqui; la fila se crea al primer uso si no existe (tambien en
pruebas, que no corren migraciones). Los contactos y URLs reales los entrega el cliente y se
capturan desde el panel (corte 3); hasta entonces quedan vacios.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import Empresa, Modulo
from app.core.errores import ErrorNegocio
from app.models import Espacio

NOMBRES: dict[Empresa, str] = {
    Empresa.GABAME: "GABAME",
    Empresa.MEDINTER: "Medinter",
    Empresa.ORDAN: "Ordan",
    Empresa.A7: "A7 Pharmaceutical Distributor",
}

_BASE = [Modulo.CUENTAS.value, Modulo.DOCUMENTOS.value, Modulo.CONTACTOS.value]
MODULOS_POR_DEFECTO: dict[Empresa, list[str]] = {
    Empresa.GABAME: [*_BASE, Modulo.CONTENIDO_RX.value],
    Empresa.MEDINTER: list(_BASE),
    Empresa.ORDAN: list(_BASE),
    Empresa.A7: list(_BASE),
}


class ModuloNoHabilitado(ErrorNegocio):
    status = 403
    codigo = "modulo_no_habilitado"
    mensaje_por_defecto = "Esta empresa no tiene habilitado ese modulo."


def obtener(db: Session, empresa: Empresa) -> Espacio:
    espacio = db.get(Espacio, empresa)
    if espacio is None:
        espacio = Espacio(empresa=empresa, nombre=NOMBRES[empresa], modulos=list(MODULOS_POR_DEFECTO[empresa]))
        db.add(espacio)
        db.commit()
        db.refresh(espacio)
    return espacio


def listar(db: Session) -> list[Espacio]:
    for e in Empresa:
        obtener(db, e)
    return list(db.scalars(select(Espacio)).all())


def exigir_modulo(db: Session, empresa: Empresa, modulo: Modulo) -> Espacio:
    espacio = obtener(db, empresa)
    if not espacio.tiene(modulo.value):
        raise ModuloNoHabilitado()
    return espacio


def actualizar(db: Session, empresa: Empresa, cambios: dict) -> Espacio:
    espacio = obtener(db, empresa)
    for campo, valor in cambios.items():
        setattr(espacio, campo, valor)
    db.commit()
    db.refresh(espacio)
    return espacio


def contacto_pendiente(espacio: Espacio) -> bool:
    return not (espacio.contacto_nombre or espacio.contacto_email or espacio.portal_url)
