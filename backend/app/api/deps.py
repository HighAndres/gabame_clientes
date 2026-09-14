"""Dependencias de autorizacion.

Los permisos se resuelven aqui, nunca con chequeos sueltos dentro de un handler.
Tres ejes: realm, rol y empresa (ver docs/arquitectura.md).

Cada dependencia de este modulo protege al menos un endpoint (ADR-0010): si una regla deja de
usarse se retira, para que no haya dos formas de decidir lo mismo.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import Audiencia, Empresa, EstadoValidacion, Rol
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


def require_partner(usuario: UsuarioActual) -> Usuario:
    """Area Partners: rol partner con perfil, sin exigir vinculo aprobado (ADR-0010).

    La aprobacion depende de los documentos que se cargan aqui, asi que cerrar el area a quien
    esta en revision seria un candado sin llave. Lo que si exige vinculo aprobado es el detalle de
    cada empresa (contacto, portal y publicaciones), y esa regla vive en `audiencias_permitidas`
    y en el router de partners, por vinculo y no por cuenta.
    """
    if not usuario.tiene_rol(Rol.PARTNER) or usuario.perfil_partner is None:
        raise _prohibido("Solo cuentas GABAME Partners")
    return usuario


def audiencias_permitidas(usuario: Usuario, empresa: Empresa) -> list[Audiencia]:
    """Que audiencias de un espacio puede ver la persona: pacientes = cualquier sesion; medicos =
    medico validado (misma regla que el contenido Rx); partners = vinculo aprobado con ESA empresa."""
    salida = [Audiencia.PACIENTES]
    perfil = usuario.perfil_medico
    if perfil is not None and perfil.estado == EstadoValidacion.VALIDADO:
        salida.append(Audiencia.MEDICOS)
    if any(v.empresa == empresa and v.estado == EstadoValidacion.VALIDADO for v in usuario.vinculos):
        salida.append(Audiencia.PARTNERS)
    return salida


def acceso_audiencia(empresa: Empresa, audiencia: Audiencia, usuario: UsuarioActual) -> Usuario:
    """Puerta de las publicaciones de un espacio (corte 3), por audiencia."""
    if audiencia == Audiencia.MEDICOS:
        return require_medico_validado(usuario)
    if audiencia not in audiencias_permitidas(usuario, empresa):
        raise _prohibido("Solo partners con vinculo aprobado con esta empresa")
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
