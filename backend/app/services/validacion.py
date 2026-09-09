"""Transiciones de estado de medicos y vinculos de partners. Toda transicion deja bitacora y avisa.

El criterio de la validacion medica NO vive aqui: vive en `validacion_medica.py` (Pendiente 0.3).
Aqui solo se ejecuta la decision de un admin con alcance. El alcance y el modulo habilitado los
verifica el router (deps + espacios) antes de llegar.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.enums import EstadoValidacion
from app.core.errores import ErrorNegocio
from app.models import BitacoraValidacion, PerfilMedico, Usuario, VinculoEmpresa
from app.services import correo


class TransicionInvalida(ErrorNegocio):
    status = 409
    codigo = "transicion_invalida"
    mensaje_por_defecto = "Ya esta en ese estado."


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


def _validar_transicion(actual: EstadoValidacion, nuevo: EstadoValidacion, motivo: str | None) -> None:
    if actual == nuevo:
        raise TransicionInvalida()
    if nuevo == EstadoValidacion.RECHAZADO and not (motivo and motivo.strip()):
        raise MotivoRequerido()


# ---------- medicos ----------


def _decidir_medico(
    db: Session, actor: Usuario, usuario_id: uuid.UUID, nuevo: EstadoValidacion, motivo: str | None
) -> PerfilMedico:
    perfil = db.get(PerfilMedico, usuario_id)
    if perfil is None:
        raise PerfilNoEncontrado()
    _validar_transicion(perfil.estado, nuevo, motivo)

    anterior = perfil.estado
    perfil.estado = nuevo
    perfil.validado_por_id = actor.id
    perfil.validado_en = datetime.now(UTC)
    perfil.motivo_rechazo = motivo.strip() if (nuevo == EstadoValidacion.RECHAZADO and motivo) else None
    # La cedula no va a la bitacora: es dato sensible y ya esta en el perfil.
    _bitacora(db, actor, usuario_id, f"medico_{nuevo.value}", {"de": anterior.value, "a": nuevo.value, "motivo": motivo})
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


# ---------- vinculos de partners ----------


def _decidir_vinculo(
    db: Session, actor: Usuario, vinculo: VinculoEmpresa, nuevo: EstadoValidacion, motivo: str | None
) -> VinculoEmpresa:
    _validar_transicion(vinculo.estado, nuevo, motivo)

    anterior = vinculo.estado
    vinculo.estado = nuevo
    vinculo.aprobado_por_id = actor.id
    vinculo.aprobado_en = datetime.now(UTC)
    vinculo.motivo_rechazo = motivo.strip() if (nuevo == EstadoValidacion.RECHAZADO and motivo) else None
    _bitacora(
        db, actor, vinculo.usuario_id, f"vinculo_{nuevo.value}",
        {"vinculo_id": str(vinculo.id), "empresa": vinculo.empresa.value, "de": anterior.value, "a": nuevo.value, "motivo": motivo},
    )
    db.commit()
    db.refresh(vinculo)

    usuario = db.get(Usuario, vinculo.usuario_id)
    if usuario is not None:
        if nuevo == EstadoValidacion.VALIDADO:
            correo.enviar_vinculo_aprobado(usuario, vinculo.empresa)
        else:
            correo.enviar_vinculo_rechazado(usuario, vinculo.empresa, vinculo.motivo_rechazo or "")
    return vinculo


def aprobar_vinculo(db: Session, actor: Usuario, vinculo: VinculoEmpresa, motivo: str | None = None) -> VinculoEmpresa:
    return _decidir_vinculo(db, actor, vinculo, EstadoValidacion.VALIDADO, motivo)


def rechazar_vinculo(db: Session, actor: Usuario, vinculo: VinculoEmpresa, motivo: str | None) -> VinculoEmpresa:
    return _decidir_vinculo(db, actor, vinculo, EstadoValidacion.RECHAZADO, motivo)
