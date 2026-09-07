"""Alta y edicion del contenido Rx por el admin de contenido (alcance de medicos, ADR-0004)."""

import re
import unicodedata
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errores import ErrorNegocio
from app.models import AreaTerapeutica, FichaTecnica
from app.schemas.contenido import AreaIn, AreaUpdate, FichaIn, FichaUpdate


class ContenidoNoEncontrado(ErrorNegocio):
    status = 404
    codigo = "contenido_no_encontrado"
    mensaje_por_defecto = "No existe ese contenido."


def slugify(texto: str) -> str:
    base = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    base = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")
    return base[:80] or "item"


def _slug_unico(db: Session, base: str, existe) -> str:
    slug, n = base, 2
    while existe(slug):
        slug = f"{base[:76]}-{n}"
        n += 1
    return slug


def crear_area(db: Session, datos: AreaIn) -> AreaTerapeutica:
    slug = _slug_unico(
        db, slugify(datos.nombre),
        lambda s: db.scalar(select(AreaTerapeutica.id).where(AreaTerapeutica.slug == s)) is not None,
    )
    area = AreaTerapeutica(slug=slug, **datos.model_dump())
    db.add(area)
    db.commit()
    db.refresh(area)
    return area


def actualizar_area(db: Session, area_id: uuid.UUID, datos: AreaUpdate) -> AreaTerapeutica:
    area = db.get(AreaTerapeutica, area_id)
    if area is None:
        raise ContenidoNoEncontrado()
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(area, campo, valor)
    db.commit()
    db.refresh(area)
    return area


def crear_ficha(db: Session, datos: FichaIn) -> FichaTecnica:
    if db.get(AreaTerapeutica, datos.area_id) is None:
        raise ContenidoNoEncontrado("No existe esa area terapeutica.")
    slug = _slug_unico(
        db, slugify(datos.nombre),
        lambda s: db.scalar(
            select(FichaTecnica.id).where(FichaTecnica.area_id == datos.area_id, FichaTecnica.slug == s)
        ) is not None,
    )
    ficha = FichaTecnica(slug=slug, **datos.model_dump())
    db.add(ficha)
    db.commit()
    db.refresh(ficha)
    return ficha


def actualizar_ficha(db: Session, ficha_id: uuid.UUID, datos: FichaUpdate) -> FichaTecnica:
    ficha = db.get(FichaTecnica, ficha_id)
    if ficha is None:
        raise ContenidoNoEncontrado()
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(ficha, campo, valor)
    db.commit()
    db.refresh(ficha)
    return ficha


# ---------- lectura para medicos validados: SOLO publicado ----------


def areas_publicadas(db: Session) -> list[AreaTerapeutica]:
    return list(
        db.scalars(
            select(AreaTerapeutica).where(AreaTerapeutica.publicada.is_(True))
            .order_by(AreaTerapeutica.orden, AreaTerapeutica.nombre)
        )
    )


def area_publicada(db: Session, slug: str) -> AreaTerapeutica:
    area = db.scalar(
        select(AreaTerapeutica).where(AreaTerapeutica.slug == slug, AreaTerapeutica.publicada.is_(True))
    )
    if area is None:
        raise ContenidoNoEncontrado()
    return area


def ficha_publicada(db: Session, area_slug: str, ficha_slug: str) -> FichaTecnica:
    ficha = db.scalar(
        select(FichaTecnica)
        .join(AreaTerapeutica)
        .where(
            AreaTerapeutica.slug == area_slug,
            AreaTerapeutica.publicada.is_(True),
            FichaTecnica.slug == ficha_slug,
            FichaTecnica.publicada.is_(True),
        )
    )
    if ficha is None:
        raise ContenidoNoEncontrado()
    return ficha
