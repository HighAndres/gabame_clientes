"""La acreditacion vista por el propio medico: consultarla, corregirla y volver a enviarla.

Hasta ahora estos datos se guardaban y nadie se los mostraba al profesional: no podia confirmar
con que cedula quedo registrado ni corregir un digito mal tecleado, y un rechazo lo dejaba fuera
para siempre. Aqui vive esa mitad del ciclo; la decision del admin sigue en `validacion.py`.

La cedula es dato personal sensible: sale siempre enmascarada, no se loguea y no viaja en el token.
"""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.enums import EstadoValidacion
from app.core.errores import ErrorNegocio
from app.models import BitacoraValidacion, PerfilMedico, Usuario

VISIBLES = 4  # ultimos digitos que se muestran al propio medico para reconocer su cedula
MINIMO_PARA_MOSTRAR = 6  # por debajo de esto no se revela nada: no ayuda a reconocer y si filtra


class CedulaBloqueada(ErrorNegocio):
    status = 409
    codigo = "cedula_bloqueada"
    mensaje_por_defecto = "Una acreditación validada no cambia de cédula; escribe al equipo del grupo."


class NadaQueReenviar(ErrorNegocio):
    status = 409
    codigo = "nada_que_reenviar"
    mensaje_por_defecto = "Solo se puede reenviar una acreditación rechazada."


def enmascarar(cedula: str) -> str:
    """Deja ver los ultimos digitos para que el medico reconozca la suya, nada mas.

    Con cedulas muy cortas no se revela mas de la mitad: mas vale mostrar de menos.
    """
    limpia = (cedula or "").strip()
    if not limpia:
        return ""
    if len(limpia) < MINIMO_PARA_MOSTRAR:
        return "•" * len(limpia)
    visibles = min(VISIBLES, len(limpia) // 2)
    return "•" * (len(limpia) - visibles) + limpia[-visibles:]


def puede_editar_cedula(perfil: PerfilMedico) -> bool:
    """Mientras la acreditacion no este validada, el medico corrige lo que capturo."""
    return perfil.estado != EstadoValidacion.VALIDADO


def actualizar(db: Session, usuario: Usuario, cambios: dict) -> PerfilMedico:
    """Especialidad e institucion son libres; la cedula solo mientras no este validada."""
    perfil = usuario.perfil_medico
    if "cedula_profesional" in cambios and not puede_editar_cedula(perfil):
        raise CedulaBloqueada()

    cambiados: list[str] = []
    for campo, valor in cambios.items():
        if getattr(perfil, campo) != valor:
            setattr(perfil, campo, valor)
            cambiados.append(campo)

    if cambiados:
        # Que campos se tocaron, nunca su contenido: la cedula no entra en la bitacora.
        db.add(
            BitacoraValidacion(
                actor_id=usuario.id,
                objetivo_id=usuario.id,
                accion="acreditacion_actualizada",
                detalle={"campos": sorted(cambiados)},
            )
        )
    db.commit()
    db.refresh(perfil)
    return perfil


def reenviar(db: Session, usuario: Usuario) -> PerfilMedico:
    """Un rechazo deja de ser el final del camino: corrige y vuelve a la cola."""
    perfil = usuario.perfil_medico
    if perfil.estado != EstadoValidacion.RECHAZADO:
        raise NadaQueReenviar()

    motivo_anterior = perfil.motivo_rechazo
    perfil.estado = EstadoValidacion.PENDIENTE
    perfil.motivo_rechazo = None
    perfil.validado_por_id = None
    perfil.validado_en = None
    db.add(
        BitacoraValidacion(
            actor_id=usuario.id,
            objetivo_id=usuario.id,
            accion="acreditacion_reenviada",
            detalle={"de": EstadoValidacion.RECHAZADO.value, "a": EstadoValidacion.PENDIENTE.value,
                     "motivo_anterior": motivo_anterior, "reenviada_en": datetime.now(UTC).isoformat()},
        )
    )
    db.commit()
    db.refresh(perfil)
    return perfil
