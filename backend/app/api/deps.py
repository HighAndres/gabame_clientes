"""Dependencias de autorizacion.

Los permisos se resuelven aqui, nunca con chequeos sueltos dentro de un handler.
Tres ejes: realm, rol y empresa (ver docs/arquitectura.md).
"""

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import Empresa, EstadoValidacion, Rol
from app.core.matriz import Alcance, alcance_de
from app.core.security import decode_token
from app.db.session import get_db
from app.models import Usuario

# /auth/token es el form OAuth2 que usa el boton Authorize de /docs; el frontend usa /auth/login.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/token")

DbSession = Annotated[Session, Depends(get_db)]


def get_usuario_actual(db: DbSession, token: Annotated[str, Depends(oauth2_scheme)]) -> Usuario:
    credenciales = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"codigo": "no_autenticado", "mensaje": "Credenciales invalidas"},
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        usuario_id = payload.get("sub")
    except JWTError as exc:
        raise credenciales from exc
    if usuario_id is None or payload.get("typ") != "access":
        raise credenciales

    usuario = db.get(Usuario, usuario_id)
    if usuario is None or not usuario.activo:
        raise credenciales
    return usuario


UsuarioActual = Annotated[Usuario, Depends(get_usuario_actual)]


def _prohibido(mensaje: str) -> HTTPException:
    return HTTPException(status.HTTP_403_FORBIDDEN, {"codigo": "prohibido", "mensaje": mensaje})


def require_role(*roles: Rol) -> Callable[[Usuario], Usuario]:
    permitidos = set(roles)

    def _dep(usuario: UsuarioActual) -> Usuario:
        if not permitidos & {r.rol for r in usuario.roles}:
            raise _prohibido("Rol insuficiente")
        return usuario

    return _dep


def require_empresa(empresa: Empresa) -> Callable[[Usuario], Usuario]:
    """admin_grupo pasa siempre; admin_empresa solo en la suya."""

    def _dep(usuario: UsuarioActual) -> Usuario:
        roles = {r.rol for r in usuario.roles}
        if Rol.ADMIN_GRUPO in roles:
            return usuario
        if any(r.rol == Rol.ADMIN_EMPRESA and r.empresa == empresa for r in usuario.roles):
            return usuario
        raise _prohibido("Sin alcance sobre esta empresa")

    return _dep


def get_alcance_admin(usuario: UsuarioActual) -> Alcance:
    """Alcance del admin actual segun la matriz provisional (ADR-0004). 403 si no es admin."""
    alcance = alcance_de(usuario)
    if not alcance.es_admin:
        raise _prohibido("Solo administradores")
    return alcance


AlcanceAdmin = Annotated[Alcance, Depends(get_alcance_admin)]


def require_alcance_medicos(alcance: AlcanceAdmin) -> Alcance:
    """Cola de validacion de medicos: quien administra GABAME."""
    if not alcance.ve_medicos:
        raise _prohibido("Sin alcance sobre la validacion de medicos")
    return alcance


def require_contenido_rx(alcance: AlcanceAdmin, db: DbSession) -> Alcance:
    """Editar contenido Rx: quien edita GABAME (admin o editor) y el espacio tiene el modulo."""
    from app.core.enums import Modulo
    from app.core.matriz import EMPRESA_DUENA_MEDICOS
    from app.services import espacios

    if not alcance.edita_contenido_rx:
        raise _prohibido("Sin alcance sobre el contenido Rx")
    espacios.exigir_modulo(db, EMPRESA_DUENA_MEDICOS, Modulo.CONTENIDO_RX)
    return alcance


def require_administra_alguna(alcance: AlcanceAdmin) -> Alcance:
    """Usuarios y cuentas: admins, no editores."""
    if not alcance.administra_alguna:
        raise _prohibido("Solo administradores")
    return alcance


def require_alcance_pacientes(alcance: AlcanceAdmin) -> Alcance:
    if not alcance.ve_pacientes:
        raise _prohibido("Solo admin_grupo ve pacientes")
    return alcance


def require_partner(usuario: UsuarioActual) -> Usuario:
    """Area Partners: rol partner con perfil. Pendiente o aprobado entran (para cargar documentos);
    lo que exige aprobacion lo decide cada endpoint con `require_partner_aprobado`."""
    if not usuario.tiene_rol(Rol.PARTNER) or usuario.perfil_partner is None:
        raise _prohibido("Solo cuentas GABAME Partners")
    return usuario


def require_partner_aprobado(usuario: Annotated[Usuario, Depends(require_partner)]) -> Usuario:
    """Al menos un vinculo aprobado con alguna empresa del grupo (ADR-0008)."""
    if not any(v.estado == EstadoValidacion.VALIDADO for v in usuario.vinculos):
        raise _prohibido("Aun no tienes un vinculo aprobado")
    return usuario


def require_medico_validado(usuario: UsuarioActual) -> Usuario:
    """Puerta del contenido tecnico Rx (Fase 4). Nadie no-validado pasa.

    Se consulta el perfil en BD en cada peticion, no el token: si un admin rechaza al
    medico, el acceso cae de inmediato aunque el access token siga vigente.
    """
    perfil = usuario.perfil_medico
    if perfil is None or perfil.estado != EstadoValidacion.VALIDADO:
        raise _prohibido("Contenido exclusivo para profesionales de la salud validados")
    return usuario
