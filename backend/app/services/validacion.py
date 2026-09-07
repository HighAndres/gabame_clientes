"""Transiciones de estado de medicos y partners. Toda transicion deja bitacora y avisa por correo.

El criterio de la validacion medica NO vive aqui: vive en `validacion_medica.py` (Pendiente 0.3).
Aqui solo se ejecuta la decision de un admin con alcance.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.enums import EstadoValidacion
from app.core.errores import ErrorNegocio
from app.models import BitacoraValidacion, PerfilMedico, PerfilPartner, Usuario
from app.services import correo


class TransicionInvalida(ErrorNegocio):
    status = 409
    codigo = "transicion_invalida"
    mensaje_por_defecto = "El perfil ya esta en ese estado."


class MotivoRequerido(ErrorNegocio):
    status = 422
    codigo = "motivo_requerido"
    mensaje_por_defecto = "Un rechazo necesita motivo."


class PerfilNoEncontrado(ErrorNegocio):
    status = 404
    codigo = "perfil_no_encontrado"
    mensaje_por_defecto = "No existe ese perfil."


def _bitacora(db: Session, actor: Usuario, objetivo_id: uuid.UUID, accion: str, detalle: dict) -> None:
    db.add(BitacoraValidacion(actor_id=actor.id, objetivo_id=objetivo_id, accion=accion, detalle=detalle))


def _decidir_medico(
    db: Session, actor: Usuario, usuario_id: uuid.UUID, nuevo: EstadoValidacion, motivo: str | None
) -> PerfilMedico:
    perfil = db.get(PerfilMedico, usuario_id)
    if perfil is None:
        raise PerfilNoEncontrado()
    if perfil.estado == nuevo:
        raise TransicionInvalida()
    if nuevo == EstadoValidacion.RECHAZADO and not (motivo and motivo.strip()):
        raise MotivoRequerido()

    anterior = perfil.estado
    perfil.estado = nuevo
    perfil.validado_por_id = actor.id
    perfil.validado_en = datetime.now(UTC)
    perfil.motivo_rechazo = motivo.strip() if (nuevo == EstadoValidacion.RECHAZADO and motivo) else None
    # La cedula no va a la bitacora: es dato sensible y ya esta en el perfil.
    _bitacora(
        db, actor, usuario_id, f"medico_{nuevo.value}",
        {"de": anterior.value, "a": nuevo.value, "motivo": motivo},
    )
    db.commit()
    db.refresh(perfil)

    usuario = db.get(Usuario, usuario_id)
    if usuario is not None:
        if nuevo == EstadoValidacion.VALIDADO:
            correo.enviar_medico_validado(usuario)
        else:
            correo.enviar_medico_rechazado(usuario, perfil.motivo_rechazo or "")
    return perfil


def validar_medico(db: Session, actor: Usuario, usuario_id: uuid.UUID, motivo: str | None = None) -> PerfilMedico:
    return _decidir_medico(db, actor, usuario_id, EstadoValidacion.VALIDADO, motivo)


def rechazar_medico(db: Session, actor: Usuario, usuario_id: uuid.UUID, motivo: str | None) -> PerfilMedico:
    return _decidir_medico(db, actor, usuario_id, EstadoValidacion.RECHAZADO, motivo)


def _decidir_partner(
    db: Session, actor: Usuario, usuario_id: uuid.UUID, nuevo: EstadoValidacion, motivo: str | None
) -> PerfilPartner:
    perfil = db.get(PerfilPartner, usuario_id)
    if perfil is None:
        raise PerfilNoEncontrado()
    if perfil.estado == nuevo:
        raise TransicionInvalida()
    if nuevo == EstadoValidacion.RECHAZADO and not (motivo and motivo.strip()):
        raise MotivoRequerido()

    anterior = perfil.estado
    perfil.estado = nuevo
    perfil.aprobado_por_id = actor.id
    perfil.aprobado_en = datetime.now(UTC)
    perfil.motivo_rechazo = motivo.strip() if (nuevo == EstadoValidacion.RECHAZADO and motivo) else None
    _bitacora(
        db, actor, usuario_id, f"partner_{nuevo.value}",
        {"de": anterior.value, "a": nuevo.value, "motivo": motivo, "empresa": perfil.empresa_objetivo.value},
    )
    db.commit()
    db.refresh(perfil)

    usuario = db.get(Usuario, usuario_id)
    if usuario is not None:
        if nuevo == EstadoValidacion.VALIDADO:
            correo.enviar_partner_aprobado(usuario)
        else:
            correo.enviar_partner_rechazado(usuario, perfil.motivo_rechazo or "")
    return perfil


def aprobar_partner(db: Session, actor: Usuario, usuario_id: uuid.UUID, motivo: str | None = None) -> PerfilPartner:
    return _decidir_partner(db, actor, usuario_id, EstadoValidacion.VALIDADO, motivo)


def rechazar_partner(db: Session, actor: Usuario, usuario_id: uuid.UUID, motivo: str | None) -> PerfilPartner:
    return _decidir_partner(db, actor, usuario_id, EstadoValidacion.RECHAZADO, motivo)
