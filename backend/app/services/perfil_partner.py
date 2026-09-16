"""Datos de la razon social del propio partner: corregirlos mientras ninguna empresa los aprobo.

Se capturaban solo al registrarse y no habia donde corregir un error de dedo. Una vez que alguna
empresa aprobo el vinculo, esos datos son los que aprobo: cambiarlos ya no es un formulario sino
un tramite con esa empresa (misma regla que la cedula del medico, ADR-0012).
"""

from sqlalchemy.orm import Session

from app.core.enums import EstadoValidacion
from app.core.errores import ErrorNegocio
from app.models import BitacoraValidacion, PerfilPartner, Usuario


class DatosPartnerBloqueados(ErrorNegocio):
    status = 409
    codigo = "datos_partner_bloqueados"
    mensaje_por_defecto = (
        "Una empresa del grupo ya aprobó tu vínculo con estos datos; para cambiarlos escribe a su contacto comercial."
    )


def puede_editar(usuario: Usuario) -> bool:
    return not any(v.estado == EstadoValidacion.VALIDADO for v in usuario.vinculos)


def actualizar(db: Session, usuario: Usuario, cambios: dict) -> PerfilPartner:
    perfil = usuario.perfil_partner
    if cambios.get("razon_social") is None:
        cambios.pop("razon_social", None)  # obligatoria: un null no la borra
    cambiados = [c for c, v in cambios.items() if getattr(perfil, c) != v]
    if not cambiados:
        return perfil
    if not puede_editar(usuario):
        raise DatosPartnerBloqueados()
    for campo in cambiados:
        setattr(perfil, campo, cambios[campo])
    # Que campos, nunca su valor.
    db.add(
        BitacoraValidacion(
            actor_id=usuario.id, objetivo_id=usuario.id, accion="partner_datos_actualizados",
            detalle={"campos": sorted(cambiados)},
        )
    )
    db.commit()
    db.refresh(perfil)
    return perfil
