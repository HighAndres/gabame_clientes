import uuid
from datetime import datetime
from enum import Enum as EnumPy

from sqlalchemy import DateTime, Enum, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


def nuevo_uuid() -> uuid.UUID:
    return uuid.uuid4()


def enum_valores(enum_cls: type[EnumPy], nombre: str) -> Enum:
    """Columna enum de Postgres que guarda el *valor* del miembro (`paciente`), no su nombre
    (`PACIENTE`). Asi la BD, los claims del token y el frontend hablan el mismo vocabulario.

    Varias tablas comparten el mismo tipo (`producto`, `empresa`, `estado_validacion`); en las
    migraciones el tipo se crea una sola vez y las columnas lo referencian con create_type=False.
    """
    return Enum(enum_cls, name=nombre, values_callable=lambda e: [m.value for m in e])
