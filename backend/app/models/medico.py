import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import EstadoValidacion
from app.db.base import Base, TimestampMixin, enum_valores


class PerfilMedico(Base, TimestampMixin):
    """Validacion profesional. Mecanismo definitivo pendiente del punto 0.3 del plan.

    Sin datos clinicos: aqui solo vive la acreditacion del profesional.
    """

    __tablename__ = "perfiles_medico"

    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True
    )
    cedula_profesional: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    especialidad: Mapped[str | None] = mapped_column(String(120))
    institucion: Mapped[str | None] = mapped_column(String(160))

    estado: Mapped[EstadoValidacion] = mapped_column(
        enum_valores(EstadoValidacion, "estado_validacion"),
        default=EstadoValidacion.PENDIENTE,
        nullable=False,
    )
    validado_por_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL")
    )
    validado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    motivo_rechazo: Mapped[str | None] = mapped_column(Text)
