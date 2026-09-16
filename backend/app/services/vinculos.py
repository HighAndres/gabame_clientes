"""Vinculos usuario-empresa del partner (ADR-0008)."""

import uuid

from sqlalchemy.orm import Session

from app.core.enums import Empresa, EstadoValidacion, Modulo, SubtipoPartner
from app.core.errores import ErrorNegocio
from app.models import BitacoraValidacion, Usuario, VinculoEmpresa
from app.services import espacios


class VinculoYaExiste(ErrorNegocio):
    status = 409
    codigo = "vinculo_ya_existe"
    mensaje_por_defecto = "Ya tienes un vinculo con esa empresa."


def crear(db: Session, usuario: Usuario, empresa: Empresa, tipo: SubtipoPartner) -> VinculoEmpresa:
    """Crea el vinculo en `pendiente`. No hace commit: lo decide quien llama."""
    if any(v.empresa == empresa for v in usuario.vinculos):
        raise VinculoYaExiste()
    espacios.exigir_modulo(db, empresa, Modulo.CUENTAS)
    vinculo = VinculoEmpresa(usuario_id=usuario.id, empresa=empresa, tipo=tipo)
    db.add(vinculo)
    return vinculo


def solicitar(db: Session, usuario: Usuario, empresa: Empresa, tipo: SubtipoPartner) -> VinculoEmpresa:
    vinculo = crear(db, usuario, empresa, tipo)
    db.commit()
    db.refresh(vinculo)
    db.refresh(usuario)
    return vinculo


class VinculoNoEncontrado(ErrorNegocio):
    status = 404
    codigo = "vinculo_no_encontrado"
    mensaje_por_defecto = "No tienes ese vínculo."


class VinculoNoRechazado(ErrorNegocio):
    status = 409
    codigo = "vinculo_no_rechazado"
    mensaje_por_defecto = "Solo se puede volver a solicitar un vínculo que no fue aprobado."


def reenviar(
    db: Session, usuario: Usuario, vinculo_id: uuid.UUID, tipo: SubtipoPartner | None = None
) -> VinculoEmpresa:
    """Un rechazo deja de ser el final: el partner corrige (sus documentos, el tipo de relacion) y
    vuelve a la cola de esa empresa. Reenviar no aprueba nada; la decision sigue siendo del admin."""
    vinculo = next((v for v in usuario.vinculos if v.id == vinculo_id), None)
    if vinculo is None:
        # Un vinculo ajeno se responde igual que uno inexistente: no se confirma que exista.
        raise VinculoNoEncontrado()
    if vinculo.estado != EstadoValidacion.RECHAZADO:
        raise VinculoNoRechazado()
    espacios.exigir_modulo(db, vinculo.empresa, Modulo.CUENTAS)

    motivo_anterior = vinculo.motivo_rechazo
    vinculo.estado = EstadoValidacion.PENDIENTE
    vinculo.motivo_rechazo = None
    vinculo.aprobado_por_id = None
    vinculo.aprobado_en = None
    if tipo is not None:
        vinculo.tipo = tipo
    db.add(
        BitacoraValidacion(
            actor_id=usuario.id,
            objetivo_id=usuario.id,
            accion="vinculo_reenviado",
            detalle={
                "vinculo_id": str(vinculo.id), "empresa": vinculo.empresa.value,
                "de": EstadoValidacion.RECHAZADO.value, "a": EstadoValidacion.PENDIENTE.value,
                "motivo_anterior": motivo_anterior,
            },
        )
    )
    db.commit()
    db.refresh(vinculo)
    db.refresh(usuario)
    return vinculo


def estado_agregado(vinculos: list[VinculoEmpresa]) -> EstadoValidacion | None:
    """Resumen para tarjetas: validado si alguno lo esta; si no, pendiente si alguno; si no, rechazado."""
    estados = {v.estado for v in vinculos}
    if not estados:
        return None
    for e in (EstadoValidacion.VALIDADO, EstadoValidacion.PENDIENTE, EstadoValidacion.RECHAZADO):
        if e in estados:
            return e
    return None


def empresas_aprobadas(vinculos: list[VinculoEmpresa]) -> list[Empresa]:
    return [v.empresa for v in vinculos if v.estado == EstadoValidacion.VALIDADO]
