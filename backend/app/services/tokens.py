"""Tokens de un solo uso que viajan por correo (verificar email, restablecer contrasena)."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import TipoToken
from app.core.errores import TokenInvalido
from app.core.security import generar_token_opaco, hash_token
from app.models import TokenVerificacion, Usuario


def _vigencia(tipo: TipoToken) -> timedelta:
    if tipo == TipoToken.EMAIL:
        return timedelta(hours=settings.EMAIL_TOKEN_EXPIRE_HOURS)
    return timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)


def emitir_token(db: Session, usuario: Usuario, tipo: TipoToken) -> str:
    """Invalida los tokens previos del mismo tipo y devuelve uno nuevo en claro (no se guarda)."""
    db.execute(
        delete(TokenVerificacion).where(
            TokenVerificacion.usuario_id == usuario.id,
            TokenVerificacion.tipo == tipo.value,
            TokenVerificacion.usado_en.is_(None),
        )
    )
    plano, hash_ = generar_token_opaco()
    db.add(
        TokenVerificacion(
            usuario_id=usuario.id,
            tipo=tipo.value,
            token_hash=hash_,
            expira_en=datetime.now(UTC) + _vigencia(tipo),
        )
    )
    return plano


def consumir_token(db: Session, plano: str, tipo: TipoToken) -> TokenVerificacion:
    """Marca el token como usado y lo devuelve. Un token vale una sola vez."""
    token = db.scalar(
        select(TokenVerificacion).where(
            TokenVerificacion.token_hash == hash_token(plano),
            TokenVerificacion.tipo == tipo.value,
        )
    )
    if token is None or token.usado_en is not None or token.expira_en < datetime.now(UTC):
        raise TokenInvalido()
    token.usado_en = datetime.now(UTC)
    return token
