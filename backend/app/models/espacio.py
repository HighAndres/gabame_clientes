"""Espacios por empresa y vinculos usuario-empresa (ADR-0008).

- `espacios`: configuracion de cada empresa dentro del portal: modulos habilitados, contacto
  comercial y portal operativo. Una fila por Empresa; se crea con valores por defecto si falta.
- `vinculos_empresa`: relacion de un usuario (partner) con una empresa, con tipo y estado
  propios. Un partner puede estar aprobado con Ordan y en revision con A7. Supersede
  `perfiles_partner.empresa_objetivo` / `estado`.

Sin datos clinicos ni de rastreo.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import Empresa, EstadoValidacion, SubtipoPartner
from app.db.base import Base, TimestampMixin, enum_valores, nuevo_uuid


class Espacio(Base, TimestampMixin):
    __tablename__ = "espacios"

    empresa: Mapped[Empresa] = mapped_column(enum_valores(Empresa, "empresa"), primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    # Lista de valores de `Modulo`. Lo que no esta aqui, no existe para esa empresa.
    modulos: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    contacto_nombre: Mapped[str | None] = mapped_column(String(120))
    contacto_email: Mapped[str | None] = mapped_column(String(255))
    contacto_telefono: Mapped[str | None] = mapped_column(String(30))
    portal_url: Mapped[str | None] = mapped_column(String(500))

    def tiene(self, modulo: str) -> bool:
        return modulo in (self.modulos or [])


class VinculoEmpresa(Base, TimestampMixin):
    __tablename__ = "vinculos_empresa"
    __table_args__ = (UniqueConstraint("usuario_id", "empresa", name="uq_vinculo_usuario_empresa"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=nuevo_uuid)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    empresa: Mapped[Empresa] = mapped_column(enum_valores(Empresa, "empresa"), nullable=False, index=True)
    tipo: Mapped[SubtipoPartner] = mapped_column(enum_valores(SubtipoPartner, "subtipo_partner"), nullable=False)
    estado: Mapped[EstadoValidacion] = mapped_column(
        enum_valores(EstadoValidacion, "estado_validacion"),
        default=EstadoValidacion.PENDIENTE,
        nullable=False,
    )
    aprobado_por_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL")
    )
    aprobado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    motivo_rechazo: Mapped[str | None] = mapped_column(Text)

    usuario: Mapped["Usuario"] = relationship(  # noqa: F821
        back_populates="vinculos", foreign_keys=[usuario_id]
    )
