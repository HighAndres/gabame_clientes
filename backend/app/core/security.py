"""Hashing y tokens.

Los claims se emiten con la forma que necesitara el OIDC de Fase 6:
`sub` = UUID estable del usuario, mas `realm`, `roles` y `empresas`.
No cambiar la forma sin actualizar ADR-0001 / ADR-0002.

Los tokens opacos (refresh, verificacion de email, reset) nunca se guardan en claro:
en BD vive solo su SHA-256.
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import jwt

from app.core.config import settings

_hasher = PasswordHasher()


def hash_password(plain: str) -> str:
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, plain)
    except VerifyMismatchError:
        return False


def create_access_token(subject: str, claims: dict[str, Any] | None = None) -> str:
    ahora = datetime.now(UTC)
    expira = ahora + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {"sub": subject, "exp": expira, "iat": ahora, "typ": "access"}
    payload.update(claims or {})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def hash_token(plano: str) -> str:
    return hashlib.sha256(plano.encode("utf-8")).hexdigest()


def generar_token_opaco() -> tuple[str, str]:
    """Devuelve (token en claro para enviar, hash para guardar)."""
    plano = secrets.token_urlsafe(32)
    return plano, hash_token(plano)
