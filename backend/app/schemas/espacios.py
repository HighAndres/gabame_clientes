"""Salidas de /espacios para quien usa el portal (corte 4): lo que cada persona ve de cada empresa."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.core.enums import Audiencia, Empresa, EstadoValidacion, Modulo
from app.models import Espacio, Publicacion
from app.schemas.partner import ContactoEmpresaOut


class PublicacionResumenOut(BaseModel):
    id: uuid.UUID
    audiencia: Audiencia
    slug: str
    titulo: str
    resumen: str | None
    orden: int
    vigencia_hasta: date | None
    url_externa: str | None
    actualizado_en: datetime

    @classmethod
    def desde_modelo(cls, p: Publicacion) -> "PublicacionResumenOut":
        return cls(
            id=p.id, audiencia=p.audiencia, slug=p.slug, titulo=p.titulo, resumen=p.resumen,
            orden=p.orden, vigencia_hasta=p.vigencia_hasta, url_externa=p.url_externa,
            actualizado_en=p.actualizado_en,
        )


class EspacioMioOut(BaseModel):
    """Un espacio visto por la persona actual: que audiencias tiene, su vinculo si es partner,
    el contacto solo si el vinculo esta aprobado y la empresa tiene el modulo, y lo publicado."""

    empresa: Empresa
    nombre: str
    modulos: list[Modulo]
    portal_url: str | None
    audiencias: list[Audiencia]
    vinculo_estado: EstadoValidacion | None
    contacto: ContactoEmpresaOut | None
    publicaciones: list[PublicacionResumenOut]

    @classmethod
    def desde_modelo(
        cls,
        e: Espacio,
        *,
        audiencias: list[Audiencia],
        vinculo_estado: EstadoValidacion | None,
        contacto: bool,
        publicaciones: list[Publicacion],
    ) -> "EspacioMioOut":
        return cls(
            empresa=e.empresa,
            nombre=e.nombre,
            modulos=[Modulo(m) for m in e.modulos if m in Modulo._value2member_map_],
            portal_url=e.portal_url,
            audiencias=audiencias,
            vinculo_estado=vinculo_estado,
            contacto=ContactoEmpresaOut.desde_espacio(e) if contacto else None,
            publicaciones=[PublicacionResumenOut.desde_modelo(p) for p in publicaciones],
        )
