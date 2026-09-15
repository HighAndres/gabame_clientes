"""Publicaciones de un espacio por audiencia (corte 3).

El alcance del admin y la puerta de cada audiencia se resuelven en `deps.py`; aqui solo datos.
"""

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.dominios import es_del_grupo
from app.core.enums import Audiencia, Empresa
from app.core.errores import ErrorNegocio
from app.models import Publicacion
from app.services.contenido import _slug_unico, slugify


class PublicacionNoEncontrada(ErrorNegocio):
    status = 404
    codigo = "publicacion_no_encontrada"
    mensaje_por_defecto = "No existe esa publicación."


class EnlaceFueraDelGrupo(ErrorNegocio):
    status = 422
    codigo = "enlace_fuera_del_grupo"
    mensaje_por_defecto = "El enlace debe apuntar a un sitio o tienda del grupo, con https."


def _revisar_enlace(datos: dict) -> None:
    """Un enlace que sale del portal lo teclea una persona: se valida antes de guardarlo.

    Va aqui y no en el esquema para que el panel reciba un codigo y pueda explicar el porque;
    un 422 de pydantic solo trae la lista cruda de errores.
    """
    url = datos.get("url_externa")
    if url and not es_del_grupo(url):
        raise EnlaceFueraDelGrupo()


def hoy() -> date:
    return datetime.now(UTC).date()


def vencida(p: Publicacion) -> bool:
    """Una publicacion con vigencia cumplida ya no se muestra, aunque siga marcada publicada.
    Se marca, no se borra: el admin decide si la renueva o la retira."""
    return p.vigencia_hasta is not None and p.vigencia_hasta < hoy()


def _vigente():
    """Sin fecha de fin, o con una que todavia no llega."""
    return or_(Publicacion.vigencia_hasta.is_(None), Publicacion.vigencia_hasta >= hoy())


def _existe(db: Session, empresa: Empresa, slug: str) -> bool:
    return db.scalar(
        select(Publicacion.id).where(Publicacion.empresa == empresa, Publicacion.slug == slug)
    ) is not None


def crear(db: Session, empresa: Empresa, datos: dict) -> Publicacion:
    _revisar_enlace(datos)
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
    _revisar_enlace(cambios)
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
            .where(
                Publicacion.empresa == empresa,
                Publicacion.audiencia == audiencia,
                Publicacion.publicada.is_(True),
                _vigente(),
            )
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
            _vigente(),
        )
    )
    if p is None:
        raise PublicacionNoEncontrada()
    return p
