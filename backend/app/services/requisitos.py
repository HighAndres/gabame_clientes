"""Requisitos documentales por empresa (dato editable, corte 3; resuelve 0.4 como dato).

Un partner ve la union de los requisitos activos de las empresas con las que tiene vinculo,
filtrados por su tipo de relacion con cada una. Los documentos son de la razon social, asi que
dos empresas que piden la misma clave comparten el documento.
"""

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import Empresa
from app.core.errores import ErrorNegocio
from app.core.requisitos_partner import POR_DEFECTO
from app.models import RequisitoDocumental, Usuario


class RequisitoInvalido(ErrorNegocio):
    status = 422
    codigo = "requisito_invalido"
    mensaje_por_defecto = "Requisito invalido."


def clave_de(texto: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "_", texto.lower().strip()).strip("_")
    return base[:60] or "documento"


def listar(db: Session, empresa: Empresa, *, solo_activos: bool = False) -> list[RequisitoDocumental]:
    """Los requisitos de una empresa; siembra el catalogo por defecto la primera vez."""
    filas = list(
        db.scalars(
            select(RequisitoDocumental)
            .where(RequisitoDocumental.empresa == empresa)
            .order_by(RequisitoDocumental.orden, RequisitoDocumental.nombre)
        ).all()
    )
    if not filas:
        for i, r in enumerate(POR_DEFECTO):
            db.add(
                RequisitoDocumental(
                    empresa=empresa, clave=r.clave, nombre=r.nombre, descripcion=r.descripcion,
                    obligatorio=r.obligatorio, orden=i,
                )
            )
        db.commit()
        return listar(db, empresa, solo_activos=solo_activos)
    return [f for f in filas if f.activo or not solo_activos]


def para_usuario(db: Session, usuario: Usuario) -> list[RequisitoDocumental]:
    """Union de los requisitos activos de todas las empresas vinculadas, sin repetir clave."""
    salida: list[RequisitoDocumental] = []
    vistas: set[str] = set()
    for v in usuario.vinculos:
        for r in listar(db, v.empresa, solo_activos=True):
            if r.tipo is not None and r.tipo != v.tipo:
                continue
            if r.clave not in vistas:
                vistas.add(r.clave)
                salida.append(r)
    return salida


def clave_valida(db: Session, usuario: Usuario, clave: str) -> bool:
    return any(r.clave == clave for r in para_usuario(db, usuario))


def reemplazar(db: Session, empresa: Empresa, items: list[dict]) -> list[RequisitoDocumental]:
    """Deja la lista como se recibe. Lo que ya no viene se desactiva (no se borra), para que los
    documentos ya cargados con esa clave conserven su etiqueta."""
    actuales = {r.clave: r for r in listar(db, empresa)}
    claves_nuevas: set[str] = set()
    for i, item in enumerate(items):
        clave = item.get("clave") or clave_de(item["nombre"])
        if clave in claves_nuevas:
            raise RequisitoInvalido(f"La clave '{clave}' esta repetida.")
        claves_nuevas.add(clave)
        fila = actuales.get(clave)
        if fila is None:
            fila = RequisitoDocumental(empresa=empresa, clave=clave)
            db.add(fila)
        fila.nombre = item["nombre"]
        fila.descripcion = item.get("descripcion")
        fila.obligatorio = bool(item.get("obligatorio", True))
        fila.tipo = item.get("tipo")
        fila.orden = i
        fila.activo = True
    for clave, fila in actuales.items():
        if clave not in claves_nuevas:
            fila.activo = False
    db.commit()
    return listar(db, empresa)
