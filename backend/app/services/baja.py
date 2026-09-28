"""Baja de la cuenta (derecho de cancelacion, LFPDPPP; ADR-0016).

Dos pasos a proposito:

1. La persona la solicita y **su acceso se cierra en el acto**: la cuenta queda inactiva y sus
   sesiones se revocan. Su decision no espera a nadie.
2. El borrado lo confirma un administrador con alcance sobre esa cuenta. Lo que hay detras no es
   solo un registro: documentos fiscales de un partner, vinculos aprobados por una empresa y una
   bitacora que es requisito. Cuanto de eso debe conservarse, y por cuanto tiempo, lo define el
   cliente (pendiente). Borrar sin esa definicion seria decidirlo nosotros.

La bitacora sobrevive al borrado: `bitacora_validacion.objetivo_id` no es una llave foranea, y el
actor queda en nulo. Queda el que paso y cuando, sin los datos de la persona.
"""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errores import ErrorNegocio
from app.models import BitacoraValidacion, Usuario
from app.services import documentos, sesion


class BajaYaSolicitada(ErrorNegocio):
    status = 409
    codigo = "baja_ya_solicitada"
    mensaje_por_defecto = "Ya pediste la baja de esta cuenta."


class SinBajaSolicitada(ErrorNegocio):
    status = 409
    codigo = "sin_baja_solicitada"
    mensaje_por_defecto = "Esta cuenta no ha pedido su baja; no se borra desde aquí."


def solicitar(db: Session, usuario: Usuario, motivo: str | None) -> Usuario:
    if usuario.baja_solicitada_en is not None:
        raise BajaYaSolicitada()

    usuario.baja_solicitada_en = datetime.now(UTC)
    usuario.baja_motivo = (motivo or "").strip() or None
    usuario.activo = False
    sesion.revocar_todas_las_sesiones(db, usuario.id)
    db.add(
        BitacoraValidacion(
            actor_id=usuario.id,
            objetivo_id=usuario.id,
            accion="baja_solicitada",
            # El motivo lo escribio la persona sobre su propia cuenta y es lo que el admin debe leer.
            detalle={"motivo": usuario.baja_motivo},
        )
    )
    db.commit()
    db.refresh(usuario)
    return usuario


def eliminar(db: Session, actor: Usuario, usuario: Usuario) -> None:
    """Borrado definitivo, solo sobre una cuenta que pidio su baja. Se lleva sus archivos."""
    if usuario.baja_solicitada_en is None:
        raise SinBajaSolicitada()

    perfil = usuario.perfil_partner
    if perfil is not None:
        for doc in list(perfil.documentos):
            ruta = documentos.ruta_absoluta(doc)
            ruta.unlink(missing_ok=True)

    # El motivo lo escribio la persona sobre si misma: se retira al borrar, para que la bitacora
    # conserve que paso y cuando, sin sus datos. Es lo que promete la pantalla del panel.
    for fila in db.scalars(
        select(BitacoraValidacion).where(
            BitacoraValidacion.objetivo_id == usuario.id, BitacoraValidacion.accion == "baja_solicitada"
        )
    ):
        fila.detalle = {k: v for k, v in (fila.detalle or {}).items() if k != "motivo"}

    db.add(
        BitacoraValidacion(
            actor_id=actor.id,
            objetivo_id=usuario.id,
            accion="cuenta_eliminada",
            # Ni correo ni nombre: la fila queda, los datos de la persona no.
            detalle={"solicitada_en": usuario.baja_solicitada_en.isoformat()},
        )
    )
    db.delete(usuario)
    db.commit()
