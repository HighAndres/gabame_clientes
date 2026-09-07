"""Contenido tecnico Rx para profesionales validados (Fase 4).

# Pendiente 0.5 — el cliente no ha entregado el contenido ni la estructura de las fichas.
# Por eso una ficha es: nombre, resumen y `contenido` como texto libre (markdown). Cuando 0.5
# defina campos (indicaciones, presentaciones, etc.) se agregan aqui con su migracion.
# Los datos del "Acordeon del Control Gabame" NO se usan sin validacion del cliente.

Esto es informacion de PRODUCTO, no de pacientes: aqui no hay recetas, diagnosticos ni
historial de nadie (regla 1).
"""

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, nuevo_uuid


class AreaTerapeutica(Base, TimestampMixin):
    __tablename__ = "areas_terapeuticas"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=nuevo_uuid)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    orden: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Solo lo publicado llega a los medicos; el admin ve todo.
    publicada: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    fichas: Mapped[list["FichaTecnica"]] = relationship(
        back_populates="area", cascade="all, delete-orphan", order_by="FichaTecnica.nombre"
    )


class FichaTecnica(Base, TimestampMixin):
    __tablename__ = "fichas_tecnicas"
    __table_args__ = (UniqueConstraint("area_id", "slug", name="uq_ficha_area_slug"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=nuevo_uuid)
    area_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("areas_terapeuticas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    nombre: Mapped[str] = mapped_column(String(160), nullable=False)
    resumen: Mapped[str | None] = mapped_column(String(500))
    contenido: Mapped[str] = mapped_column(Text, default="", nullable=False)  # markdown
    publicada: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    area: Mapped[AreaTerapeutica] = relationship(back_populates="fichas")
