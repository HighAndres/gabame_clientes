"""Contenido tecnico Rx: salidas para medicos validados y entradas del admin de contenido."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models import AreaTerapeutica, FichaTecnica


class FichaResumenOut(BaseModel):
    id: uuid.UUID
    slug: str
    nombre: str
    resumen: str | None
    publicada: bool

    @classmethod
    def desde_modelo(cls, f: FichaTecnica) -> "FichaResumenOut":
        return cls(id=f.id, slug=f.slug, nombre=f.nombre, resumen=f.resumen, publicada=f.publicada)


class FichaOut(FichaResumenOut):
    area_id: uuid.UUID
    area_slug: str
    area_nombre: str
    contenido: str
    actualizado_en: datetime

    @classmethod
    def desde_modelo(cls, f: FichaTecnica) -> "FichaOut":
        return cls(
            id=f.id,
            slug=f.slug,
            nombre=f.nombre,
            resumen=f.resumen,
            publicada=f.publicada,
            area_id=f.area_id,
            area_slug=f.area.slug,
            area_nombre=f.area.nombre,
            contenido=f.contenido,
            actualizado_en=f.actualizado_en,
        )


class AreaOut(BaseModel):
    id: uuid.UUID
    slug: str
    nombre: str
    descripcion: str | None
    orden: int
    publicada: bool
    fichas: list[FichaResumenOut]

    @classmethod
    def desde_modelo(cls, a: AreaTerapeutica, *, solo_publicadas: bool) -> "AreaOut":
        fichas = [f for f in a.fichas if f.publicada or not solo_publicadas]
        return cls(
            id=a.id,
            slug=a.slug,
            nombre=a.nombre,
            descripcion=a.descripcion,
            orden=a.orden,
            publicada=a.publicada,
            fichas=[FichaResumenOut.desde_modelo(f) for f in fichas],
        )


def _limpio(valor: str | None) -> str | None:
    if valor is None:
        return None
    valor = valor.strip()
    return valor or None


class AreaIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    descripcion: str | None = Field(default=None, max_length=2000)
    orden: int = Field(default=0, ge=0, le=999)
    publicada: bool = False

    _l = field_validator("descripcion")(_limpio)


class AreaUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=120)
    descripcion: str | None = Field(default=None, max_length=2000)
    orden: int | None = Field(default=None, ge=0, le=999)
    publicada: bool | None = None


class FichaIn(BaseModel):
    area_id: uuid.UUID
    nombre: str = Field(min_length=2, max_length=160)
    resumen: str | None = Field(default=None, max_length=500)
    contenido: str = Field(default="", max_length=100_000)
    publicada: bool = False

    _l = field_validator("resumen")(_limpio)


class FichaUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=160)
    resumen: str | None = Field(default=None, max_length=500)
    contenido: str | None = Field(default=None, max_length=100_000)
    publicada: bool | None = None
