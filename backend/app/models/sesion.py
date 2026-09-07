import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, nuevo_uuid


class SesionRefresh(Base):
    """Refresh tokens rotativos (ADR-0002). Se guarda el hash, nunca el token.

    Cada uso del refresh lo revoca y emite uno nuevo (`reemplazada_por_id` deja la cadena).
    Presentar un refresh ya revocado se trata como senal de robo: se revocan todas las
    sesiones del usuario.

    Sin IP, user agent ni huella: una sesion se identifica por su token, no por el dispositivo.
    """

    __tablename__ = "sesiones_refresh"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=nuevo_uuid)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revocado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reemplazada_por_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    usuario: Mapped["Usuario"] = relationship(lazy="selectin")  # noqa: F821

    @property
    def vigente(self) -> bool:
        return self.revocado_en is None and self.expira_en > datetime.now(UTC)
