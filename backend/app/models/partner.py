import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import EstadoValidacion
from app.db.base import Base, TimestampMixin, enum_valores, nuevo_uuid


class PerfilPartner(Base, TimestampMixin):
    """Datos de la empresa del partner. La relacion con cada empresa del grupo (tipo y estado)
    vive en `vinculos_empresa` (ADR-0008); aqui solo lo que es de la razon social."""

    __tablename__ = "perfiles_partner"

    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True
    )
    razon_social: Mapped[str] = mapped_column(String(200), nullable=False)
    rfc: Mapped[str | None] = mapped_column(String(13), index=True)

    documentos: Mapped[list["DocumentoPartner"]] = relationship(
        back_populates="partner", cascade="all, delete-orphan", order_by="DocumentoPartner.subido_en",
        lazy="selectin",
    )


class DocumentoPartner(Base):
    """Documento cargado por el partner. El archivo vive en disco (UPLOADS_DIR), aqui solo metadatos.

    Los documentos son de la razon social, no de un vinculo: cualquier admin con alcance sobre
    alguna de las empresas vinculadas puede revisarlos.
    `tipo` es una clave del catalogo provisional `app/core/requisitos_partner.py` (Pendiente 0.4).
    """

    __tablename__ = "documentos_partner"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=nuevo_uuid)
    partner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("perfiles_partner.usuario_id", ondelete="CASCADE"), nullable=False, index=True
    )
    tipo: Mapped[str] = mapped_column(String(60), nullable=False)
    nombre_archivo: Mapped[str] = mapped_column(String(255), nullable=False)
    ruta: Mapped[str] = mapped_column(String(500), nullable=False)  # relativa a UPLOADS_DIR
    content_type: Mapped[str] = mapped_column(String(100), nullable=False, default="application/octet-stream")
    tamano_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    estado: Mapped[EstadoValidacion] = mapped_column(
        enum_valores(EstadoValidacion, "estado_validacion"),
        default=EstadoValidacion.PENDIENTE,
        nullable=False,
    )
    motivo_rechazo: Mapped[str | None] = mapped_column(Text)
    revisado_por_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL")
    )
    revisado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    subido_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    partner: Mapped[PerfilPartner] = relationship(back_populates="documentos")
