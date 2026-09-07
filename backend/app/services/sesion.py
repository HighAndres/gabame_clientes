"""Login, claims y refresh tokens rotativos (ADR-0002)."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import EventoOrigen
from app.core.errores import (
    CredencialesInvalidas,
    CuentaInactiva,
    EmailNoVerificado,
    SesionInvalida,
)
from app.core.ratelimit import limitar_por_cuenta
from app.core.security import (
    create_access_token,
    generar_token_opaco,
    hash_password,
    hash_token,
    verify_password,
)
from app.models import SesionRefresh, Usuario
from app.schemas.auth import LoginIn, TokenOut
from app.services.origen import registrar_origen

# Se verifica contra este hash cuando el email no existe, para que el tiempo de respuesta
# no delate si la cuenta existe o no.
_HASH_SENUELO = hash_password(uuid.uuid4().hex)


def construir_claims(usuario: Usuario) -> dict[str, Any]:
    """Forma OIDC-ready (ADR-0001): realm, roles y empresas viajan desde hoy."""
    return {
        "realm": usuario.realm.value,
        "roles": sorted({r.rol.value for r in usuario.roles}),
        "empresas": sorted({r.empresa.value for r in usuario.roles if r.empresa is not None}),
        "email_verified": usuario.email_verificado,
    }


def autenticar(db: Session, email: str, password: str) -> Usuario:
    from app.services.cuentas import buscar_por_email

    limitar_por_cuenta("login", email, maximo=10)
    usuario = buscar_por_email(db, email)
    if usuario is None:
        verify_password(password, _HASH_SENUELO)
        raise CredencialesInvalidas()
    if not verify_password(password, usuario.password_hash):
        raise CredencialesInvalidas()
    if not usuario.activo:
        raise CuentaInactiva()
    if not usuario.email_verificado:
        raise EmailNoVerificado()
    return usuario


def emitir_tokens(db: Session, usuario: Usuario) -> TokenOut:
    """Access JWT de vida corta + refresh opaco guardado por hash. Hace commit."""
    access = create_access_token(str(usuario.id), construir_claims(usuario))
    plano, hash_ = generar_token_opaco()
    db.add(
        SesionRefresh(
            usuario_id=usuario.id,
            token_hash=hash_,
            expira_en=datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    db.commit()
    return TokenOut(
        access_token=access,
        refresh_token=plano,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def iniciar_sesion(db: Session, datos: LoginIn) -> TokenOut:
    usuario = autenticar(db, datos.email, datos.password)
    registrar_origen(db, usuario, EventoOrigen.LOGIN, datos.origen)
    return emitir_tokens(db, usuario)


def _buscar_sesion(db: Session, refresh_plano: str) -> SesionRefresh | None:
    return db.scalar(select(SesionRefresh).where(SesionRefresh.token_hash == hash_token(refresh_plano)))


def refrescar(db: Session, refresh_plano: str) -> TokenOut:
    sesion = _buscar_sesion(db, refresh_plano)
    if sesion is None:
        raise SesionInvalida()
    if sesion.revocado_en is not None:
        # Reutilizacion de un refresh ya rotado: se asume robo y se cierra todo.
        revocar_todas_las_sesiones(db, sesion.usuario_id)
        db.commit()
        raise SesionInvalida()
    if not sesion.vigente:
        raise SesionInvalida()

    usuario = sesion.usuario
    if not usuario.activo:
        raise SesionInvalida()

    ahora = datetime.now(UTC)
    nueva = SesionRefresh(
        usuario_id=usuario.id,
        expira_en=ahora + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    plano, nueva.token_hash = generar_token_opaco()
    db.add(nueva)
    db.flush()
    sesion.revocado_en = ahora
    sesion.reemplazada_por_id = nueva.id
    db.commit()

    return TokenOut(
        access_token=create_access_token(str(usuario.id), construir_claims(usuario)),
        refresh_token=plano,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def cerrar_sesion(db: Session, refresh_plano: str) -> None:
    """Idempotente: un refresh desconocido o ya revocado no es error."""
    sesion = _buscar_sesion(db, refresh_plano)
    if sesion is not None and sesion.revocado_en is None:
        sesion.revocado_en = datetime.now(UTC)
        db.commit()


def revocar_todas_las_sesiones(db: Session, usuario_id: uuid.UUID) -> None:
    """No hace commit: lo decide quien llama."""
    db.execute(
        update(SesionRefresh)
        .where(SesionRefresh.usuario_id == usuario_id, SesionRefresh.revocado_en.is_(None))
        .values(revocado_en=datetime.now(UTC))
    )
