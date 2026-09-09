import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import Empresa, Producto, Realm, Rol
from app.db.base import Base, TimestampMixin, enum_valores, nuevo_uuid


class Usuario(Base, TimestampMixin):
    """Identidad del grupo. El id es estable y nunca se regenera (prerequisito OIDC, ADR-0001).

    El email es la llave de reconciliacion para migrar las cuentas locales de las tiendas en
    Fase 6: se normaliza a minusculas al entrar y ademas la BD lo protege con un indice unico
    sobre `lower(email)`, para que ninguna via alterna pueda duplicarlo. No se cambia sin
    re-verificar (en Fase 2 es inmutable desde la API).
    """

    __tablename__ = "usuarios"
    __table_args__ = (Index("uq_usuarios_email_lower", text("lower(email)"), unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=nuevo_uuid)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    email_verificado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(160), nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(30))

    realm: Mapped[Realm] = mapped_column(enum_valores(Realm, "realm"), nullable=False)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Primer contacto con el ecosistema. Se escribe una vez en el registro y no se toca mas.
    # El historial completo vive en `origenes_usuario`; esto es solo comodidad de consulta.
    origen_inicial: Mapped[Producto] = mapped_column(
        enum_valores(Producto, "producto"), default=Producto.DIRECTO, nullable=False
    )

    roles: Mapped[list["UsuarioRol"]] = relationship(
        back_populates="usuario", cascade="all, delete-orphan", lazy="selectin"
    )
    origenes: Mapped[list["OrigenUsuario"]] = relationship(  # noqa: F821
        back_populates="usuario", cascade="all, delete-orphan", order_by="OrigenUsuario.creado_en"
    )
    perfil_medico: Mapped["PerfilMedico | None"] = relationship(  # noqa: F821
        primaryjoin="Usuario.id == PerfilMedico.usuario_id",
        foreign_keys="PerfilMedico.usuario_id",
        uselist=False,
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    perfil_partner: Mapped["PerfilPartner | None"] = relationship(  # noqa: F821
        primaryjoin="Usuario.id == PerfilPartner.usuario_id",
        foreign_keys="PerfilPartner.usuario_id",
        uselist=False,
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    vinculos: Mapped[list["VinculoEmpresa"]] = relationship(  # noqa: F821
        back_populates="usuario", cascade="all, delete-orphan", lazy="selectin",
        order_by="VinculoEmpresa.creado_en", foreign_keys="VinculoEmpresa.usuario_id",
    )

    @property
    def email_verificado(self) -> bool:
        return self.email_verificado_en is not None

    def tiene_rol(self, rol: Rol) -> bool:
        return any(r.rol == rol for r in self.roles)


class UsuarioRol(Base):
    """Un usuario puede tener varios roles; `empresa` solo aplica a admin_empresa."""

    __tablename__ = "usuario_roles"
    __table_args__ = (UniqueConstraint("usuario_id", "rol", "empresa", name="uq_usuario_rol_empresa"),)

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=nuevo_uuid)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rol: Mapped[Rol] = mapped_column(enum_valores(Rol, "rol"), nullable=False)
    empresa: Mapped[Empresa | None] = mapped_column(enum_valores(Empresa, "empresa"))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    usuario: Mapped[Usuario] = relationship(back_populates="roles")
