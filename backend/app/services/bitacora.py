"""Lectura de la bitacora (corte 3). Escribirla es responsabilidad de cada servicio que decide."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.core.matriz import Alcance
from app.models import BitacoraValidacion, Usuario


def listar(
    db: Session, alcance: Alcance, visibles, *, objetivo_id: uuid.UUID | None, limit: int, offset: int
) -> tuple[int, list[tuple[BitacoraValidacion, Usuario | None, Usuario | None]]]:
    """Entradas cuyo objetivo esta dentro del alcance (`visibles` es la consulta base de usuarios
    del admin). Devuelve (total, [(entrada, actor, objetivo)])."""
    actor = aliased(Usuario)
    objetivo = aliased(Usuario)
    base = (
        select(BitacoraValidacion, actor, objetivo)
        .outerjoin(actor, actor.id == BitacoraValidacion.actor_id)
        .outerjoin(objetivo, objetivo.id == BitacoraValidacion.objetivo_id)
    )
    if not alcance.grupo:
        base = base.where(BitacoraValidacion.objetivo_id.in_(select(visibles.subquery().c.id)))
    if objetivo_id is not None:
        base = base.where(BitacoraValidacion.objetivo_id == objetivo_id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    filas = db.execute(base.order_by(BitacoraValidacion.creado_en.desc()).limit(limit).offset(offset)).all()
    return total, [(b, a, o) for b, a, o in filas]
