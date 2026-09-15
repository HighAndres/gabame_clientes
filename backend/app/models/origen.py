import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import EventoOrigen, Producto
from app.db.base import Base, enum_valores, nuevo_uuid


class OrigenUsuario(Base):
    """Historial de por que pieza del ecosistema entro el usuario al portal. Append-only.

    Un usuario llega por gabame.com, mas tarde vuelve desde farmaciasgabame.com y despues desde
    Ordan: son tres filas, no un campo que se sobrescribe. `usuarios.origen_inicial` guarda el
    primer contacto por comodidad de consulta, pero **la fuente de verdad es esta tabla**.

    Privacidad (LFPDPPP): se registra la pieza de origen, la ruta de entrada y, si viene,
    la campana. **No** se guardan IP, user agent, huella de dispositivo ni nada que sirva para
    rastrear a la persona fuera del ecosistema. Si alguien pide agregar uno de esos campos,
    la finalidad esta mal planteada.
    """

    __tablename__ = "origenes_usuario"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=nuevo_uuid)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    producto: Mapped[Producto] = mapped_column(enum_valores(Producto, "producto"), nullable=False, index=True)
    evento: Mapped[EventoOrigen] = mapped_column(enum_valores(EventoOrigen, "evento_origen"), nullable=False)

    # Ruta dentro de la pieza de origen, p.ej. "/conocer-mas" o "/portal-de-clientes".
    # Solo path, nunca URL completa con query string (puede arrastrar datos personales).
    ruta_entrada: Mapped[str | None] = mapped_column(String(255))
    campana: Mapped[str | None] = mapped_column(String(120))

    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    usuario: Mapped["Usuario"] = relationship(back_populates="origenes")  # noqa: F821
