"""Vinculos usuario-empresa del partner (ADR-0008)."""

from sqlalchemy.orm import Session

from app.core.enums import Empresa, EstadoValidacion, Modulo, SubtipoPartner
from app.core.errores import ErrorNegocio
from app.models import Usuario, VinculoEmpresa
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
