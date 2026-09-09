"""Publicaciones de un espacio por audiencia (corte 3).

El alcance del admin y la puerta de cada audiencia se resuelven en `deps.py`; aqui solo datos.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import Audiencia, Empresa
from app.core.errores import ErrorNegocio
from app.models import Publicacion
from app.services.contenido import _slug_unico, slugify


class PublicacionNoEncontrada(ErrorNegocio):
    status = 404
    codigo = "publicacion_no_encontrada"
    mensaje_por_defecto = "No existe esa publicacion."


def _existe(db: Session, empresa: Empresa, slug: str) -> bool:
    return db.scalar(
        select(Publicacion.id).where(Publicacion.empresa == empresa, Publicacion.slug == slug)
    ) is not None


def crear(db: Session, empresa: Empresa, datos: dict) -> Publicacion:
    slug = _slug_unico(db, slugify(datos["titulo"]), lambda s: _existe(db, empresa, s))
    p = Publicacion(empresa=empresa, slug=slug, **datos)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def obtener(db: Session, publicacion_id: uuid.UUID) -> Publicacion:
    p = db.get(Publicacion, publicacion_id)
    if p is None:
        raise PublicacionNoEncontrada()
    return p


def actualizar(db: Session, p: Publicacion, cambios: dict) -> Publicacion:
    for campo, valor in cambios.items():
        setattr(p, campo, valor)
    db.commit()
    db.refresh(p)
    return p


def eliminar(db: Session, p: Publicacion) -> None:
    db.delete(p)
    db.commit()


def listar_admin(db: Session, empresa: Empresa) -> list[Publicacion]:
    return list(
        db.scalars(
            select(Publicacion)
            .where(Publicacion.empresa == empresa)
            .order_by(Publicacion.audiencia, Publicacion.orden, Publicacion.titulo)
        ).all()
    )


def publicadas(db: Session, empresa: Empresa, audiencia: Audiencia) -> list[Publicacion]:
    return list(
        db.scalars(
            select(Publicacion)
            .where(Publicacion.empresa == empresa, Publicacion.audiencia == audiencia, Publicacion.publicada.is_(True))
            .order_by(Publicacion.orden, Publicacion.titulo)
        ).all()
    )


def publicada(db: Session, empresa: Empresa, audiencia: Audiencia, slug: str) -> Publicacion:
    p = db.scalar(
        select(Publicacion).where(
            Publicacion.empresa == empresa,
            Publicacion.audiencia == audiencia,
            Publicacion.slug == slug,
            Publicacion.publicada.is_(True),
        )
    )
    if p is None:
        raise PublicacionNoEncontrada()
    return p
