"""Publicaciones de un espacio por audiencia y requisitos documentales editables (corte 3).

- `publicaciones`: contenido que una empresa publica dentro de su espacio para una audiencia
  (pacientes, medicos validados, partners aprobados). Es informacion institucional o comercial;
  el contenido tecnico Rx sigue en `fichas_tecnicas` con su puerta propia.
- `requisitos_documentales`: que documentos pide cada empresa a sus partners. Resuelve el
  pendiente 0.4 como dato: el admin los edita desde el panel. `documentos_partner.tipo` guarda
  la `clave`; un requisito que se retira se desactiva, no se borra, para que los documentos ya
  cargados conserven su etiqueta.

Sin datos clinicos.
"""

import uuid

from sqlalchemy import Boolean, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import Audiencia, Empresa, SubtipoPartner
from app.db.base import Base, TimestampMixin, enum_valores, nuevo_uuid


class Publicacion(Base, TimestampMixin):
    __tablename__ = "publicaciones"
    __table_args__ = (UniqueConstraint("empresa", "slug", name="uq_publicacion_empresa_slug"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=nuevo_uuid)
    empresa: Mapped[Empresa] = mapped_column(enum_valores(Empresa, "empresa"), nullable=False, index=True)
    audiencia: Mapped[Audiencia] = mapped_column(enum_valores(Audiencia, "audiencia"), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    titulo: Mapped[str] = mapped_column(String(160), nullable=False)
    resumen: Mapped[str | None] = mapped_column(String(500))
    contenido: Mapped[str] = mapped_column(Text, default="", nullable=False)  # markdown
    orden: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    publicada: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class RequisitoDocumental(Base, TimestampMixin):
    __tablename__ = "requisitos_documentales"
    __table_args__ = (UniqueConstraint("empresa", "clave", name="uq_requisito_empresa_clave"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=nuevo_uuid)
    empresa: Mapped[Empresa] = mapped_column(enum_valores(Empresa, "empresa"), nullable=False, index=True)
    # None = aplica a todos los tipos de partner de esa empresa
    tipo: Mapped[SubtipoPartner | None] = mapped_column(enum_valores(SubtipoPartner, "subtipo_partner"))
    clave: Mapped[str] = mapped_column(String(60), nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    obligatorio: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    orden: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
