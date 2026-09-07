import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, nuevo_uuid


class BitacoraValidacion(Base):
    """Append-only. Quien aprobo o rechazo que, y cuando (requisito de Fase 4)."""

    __tablename__ = "bitacora_validacion"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=nuevo_uuid)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL")
    )
    objetivo_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    accion: Mapped[str] = mapped_column(String(60), nullable=False)
    detalle: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
