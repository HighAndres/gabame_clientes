"""Gestion de cuentas administrativas: alta de admins y editores, roles, activar/desactivar y
restablecimiento de contrasena (corte 3). Toda accion deja bitacora.

El alcance lo resuelve `deps.py`; aqui se valida que cada rol que se toca este dentro de ese
alcance. Los roles de persona (paciente, medico, partner) no se administran desde aqui: nacen
con el registro y su ciclo de vida es el de sus perfiles.
"""

import secrets
import uuid

from sqlalchemy.orm import Session

from app.core.enums import Empresa, Realm, Rol, TipoToken
from app.core.errores import EmailYaRegistrado, ErrorNegocio
from app.core.matriz import Alcance
from app.core.security import hash_password
from app.models import BitacoraValidacion, Usuario, UsuarioRol
from app.services import correo
from app.services.cuentas import buscar_por_email
from app.services.sesion import revocar_todas_las_sesiones
from app.services.tokens import emitir_token

ROLES_ADMINISTRABLES = {Rol.ADMIN_GRUPO, Rol.ADMIN_EMPRESA, Rol.EDITOR_EMPRESA}


class RolFueraDeAlcance(ErrorNegocio):
    status = 403
    codigo = "rol_fuera_de_alcance"
    mensaje_por_defecto = "No puedes asignar ni retirar ese rol."


class AccionSobreUnoMismo(ErrorNegocio):
    status = 409
    codigo = "accion_sobre_uno_mismo"
    mensaje_por_defecto = "No puedes hacer eso con tu propia cuenta."


def _bitacora(db: Session, actor: Usuario, objetivo_id: uuid.UUID, accion: str, detalle: dict) -> None:
    db.add(BitacoraValidacion(actor_id=actor.id, objetivo_id=objetivo_id, accion=accion, detalle=detalle))


def puede_asignar(alcance: Alcance, rol: Rol, empresa: Empresa | None) -> bool:
    if rol == Rol.ADMIN_GRUPO:
        return alcance.grupo and empresa is None
    if rol in (Rol.ADMIN_EMPRESA, Rol.EDITOR_EMPRESA):
        return empresa is not None and alcance.administra(empresa)
    return False


def _exigir(alcance: Alcance, rol: Rol, empresa: Empresa | None) -> None:
    if not puede_asignar(alcance, rol, empresa):
        raise RolFueraDeAlcance()


def _clave(r: UsuarioRol | tuple[Rol, Empresa | None]) -> tuple[Rol, Empresa | None]:
    return (r.rol, r.empresa) if isinstance(r, UsuarioRol) else r


def asignar_roles(
    db: Session, actor: Usuario, alcance: Alcance, usuario: Usuario, deseados: list[tuple[Rol, Empresa | None]]
) -> Usuario:
    """Deja los roles administrativos del usuario como `deseados`, tocando solo lo que esta en el
    alcance del actor. Los roles fuera de su alcance (y los de persona) no se modifican."""
    for rol, empresa in deseados:
        if rol not in ROLES_ADMINISTRABLES:
            raise RolFueraDeAlcance("Los roles de persona no se asignan desde el panel.")
    actuales = {_clave(r): r for r in usuario.roles if r.rol in ROLES_ADMINISTRABLES}
    quiere = set(deseados)

    agregados: list[tuple[Rol, Empresa | None]] = []
    retirados: list[tuple[Rol, Empresa | None]] = []
    for clave in quiere - set(actuales):
        _exigir(alcance, *clave)
        db.add(UsuarioRol(usuario_id=usuario.id, rol=clave[0], empresa=clave[1]))
        agregados.append(clave)
    for clave, fila in actuales.items():
        if clave in quiere or not puede_asignar(alcance, *clave):
            continue  # fuera del alcance del actor: se conserva
        if usuario.id == actor.id and clave[0] == Rol.ADMIN_GRUPO:
            raise AccionSobreUnoMismo("No puedes retirarte el rol de administrador del grupo.")
        db.delete(fila)
        retirados.append(clave)

    if agregados or retirados:
        _bitacora(
            db, actor, usuario.id, "roles_actualizados",
            {
                "agregados": [{"rol": r.value, "empresa": e.value if e else None} for r, e in agregados],
                "retirados": [{"rol": r.value, "empresa": e.value if e else None} for r, e in retirados],
            },
        )
    db.commit()
    db.refresh(usuario)
    return usuario


def crear_administrador(
    db: Session, actor: Usuario, alcance: Alcance, *, email: str, nombre: str, apellidos: str,
    roles: list[tuple[Rol, Empresa | None]],
) -> Usuario:
    """Alta de una cuenta administrativa. Nace sin contrasena conocida: recibe un enlace para
    establecerla, y abrirlo verifica el correo."""
    if not roles:
        raise RolFueraDeAlcance("Una cuenta administrativa necesita al menos un rol.")
    for rol, empresa in roles:
        _exigir(alcance, rol, empresa)
    if buscar_por_email(db, email) is not None:
        raise EmailYaRegistrado()

    usuario = Usuario(
        email=email,
        password_hash=hash_password(secrets.token_urlsafe(24)),
        nombre=nombre,
        apellidos=apellidos,
        realm=Realm.PARTNERS,
    )
    db.add(usuario)
    db.flush()
    for rol, empresa in set(roles):
        db.add(UsuarioRol(usuario_id=usuario.id, rol=rol, empresa=empresa))
    _bitacora(
        db, actor, usuario.id, "usuario_creado",
        {"roles": [{"rol": r.value, "empresa": e.value if e else None} for r, e in roles]},
    )
    token = emitir_token(db, usuario, TipoToken.RESET_PASSWORD)
    db.commit()
    db.refresh(usuario)
    correo.enviar_bienvenida_admin(usuario, token)
    return usuario


def cambiar_activo(db: Session, actor: Usuario, usuario: Usuario, activo: bool) -> Usuario:
    if usuario.id == actor.id:
        raise AccionSobreUnoMismo()
    if usuario.activo == activo:
        return usuario
    usuario.activo = activo
    if not activo:
        revocar_todas_las_sesiones(db, usuario.id)
    _bitacora(db, actor, usuario.id, "usuario_activado" if activo else "usuario_desactivado", {})
    db.commit()
    db.refresh(usuario)
    return usuario


def enviar_restablecimiento(db: Session, actor: Usuario, usuario: Usuario) -> None:
    token = emitir_token(db, usuario, TipoToken.RESET_PASSWORD)
    _bitacora(db, actor, usuario.id, "restablecimiento_enviado", {})
    db.commit()
    correo.enviar_reset_password(usuario, token)
