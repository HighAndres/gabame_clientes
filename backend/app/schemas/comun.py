"""Piezas compartidas por varios schemas."""

from pydantic import BaseModel, Field, field_validator

from app.core.enums import Producto


class OrigenIn(BaseModel):
    """Desde que pieza del ecosistema llego la persona. Solo pieza, ruta y campana.

    Nunca se acepta IP, user agent ni huella: si el frontend los manda, Pydantic los ignora.
    """

    producto: Producto
    ruta_entrada: str | None = Field(default=None, max_length=255)
    campana: str | None = Field(default=None, max_length=120)

    @field_validator("ruta_entrada")
    @classmethod
    def _solo_path(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        valor = valor.strip()
        if not valor:
            return None
        # Solo una ruta interna de la pieza de origen: sin host, sin query, sin fragmento.
        if not valor.startswith("/") or valor.startswith(("//", "/\\")):
            raise ValueError("ruta_entrada debe ser una ruta interna que empiece con /")
        if any(c in valor for c in "?#\\"):
            raise ValueError("ruta_entrada no admite query string ni fragmento")
        return valor

    @field_validator("campana")
    @classmethod
    def _campana_limpia(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        valor = valor.strip()
        return valor or None


class Mensaje(BaseModel):
    mensaje: str
