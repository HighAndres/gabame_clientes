"""fase1_esquema_base_y_sesiones

Revision ID: c1e4f25ccb84
Revises: 
Create Date: 2026-09-07 00:01:41.704562
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = 'c1e4f25ccb84'
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Tipos enum compartidos por varias tablas: se crean una sola vez aqui.
REALM = postgresql.ENUM('id', 'partners', name='realm')
PRODUCTO = postgresql.ENUM('gabame', 'medinter', 'ordan', 'a7', 'tiendagabame', 'aurashop', 'app_paciente', 'directo', name='producto')
EVENTO_ORIGEN = postgresql.ENUM('registro', 'login', 'retorno', name='evento_origen')
ESTADO_VALIDACION = postgresql.ENUM('pendiente', 'validado', 'rechazado', name='estado_validacion')
SUBTIPO_PARTNER = postgresql.ENUM('distribuidor', 'mayorista', 'institucional', name='subtipo_partner')
EMPRESA = postgresql.ENUM('gabame', 'medinter', 'ordan', 'a7', name='empresa')
ROL = postgresql.ENUM('paciente', 'medico', 'partner', 'admin_empresa', 'admin_grupo', name='rol')
TIPOS = [REALM, PRODUCTO, EVENTO_ORIGEN, ESTADO_VALIDACION, SUBTIPO_PARTNER, EMPRESA, ROL]


def upgrade() -> None:
    bind = op.get_bind()
    for tipo in TIPOS:
        tipo.create(bind, checkfirst=True)

    op.create_table('usuarios',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('email_verificado_en', sa.DateTime(timezone=True), nullable=True),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('nombre', sa.String(length=120), nullable=False),
    sa.Column('apellidos', sa.String(length=160), nullable=False),
    sa.Column('telefono', sa.String(length=30), nullable=True),
    sa.Column('realm', postgresql.ENUM('id', 'partners', name='realm', create_type=False), nullable=False),
    sa.Column('activo', sa.Boolean(), nullable=False),
    sa.Column('origen_inicial', postgresql.ENUM('gabame', 'medinter', 'ordan', 'a7', 'tiendagabame', 'aurashop', 'app_paciente', 'directo', name='producto', create_type=False), nullable=False),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('actualizado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('uq_usuarios_email_lower', 'usuarios', [sa.literal_column('lower(email)')], unique=True)
    op.create_table('bitacora_validacion',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('actor_id', sa.UUID(), nullable=True),
    sa.Column('objetivo_id', sa.UUID(), nullable=False),
    sa.Column('accion', sa.String(length=60), nullable=False),
    sa.Column('detalle', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['actor_id'], ['usuarios.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bitacora_validacion_objetivo_id'), 'bitacora_validacion', ['objetivo_id'], unique=False)
    op.create_table('origenes_usuario',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('usuario_id', sa.UUID(), nullable=False),
    sa.Column('producto', postgresql.ENUM('gabame', 'medinter', 'ordan', 'a7', 'tiendagabame', 'aurashop', 'app_paciente', 'directo', name='producto', create_type=False), nullable=False),
    sa.Column('evento', postgresql.ENUM('registro', 'login', 'retorno', name='evento_origen', create_type=False), nullable=False),
    sa.Column('ruta_entrada', sa.String(length=255), nullable=True),
    sa.Column('campana', sa.String(length=120), nullable=True),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_origenes_usuario_creado_en'), 'origenes_usuario', ['creado_en'], unique=False)
    op.create_index(op.f('ix_origenes_usuario_producto'), 'origenes_usuario', ['producto'], unique=False)
    op.create_index(op.f('ix_origenes_usuario_usuario_id'), 'origenes_usuario', ['usuario_id'], unique=False)
    op.create_table('perfiles_medico',
    sa.Column('usuario_id', sa.UUID(), nullable=False),
    sa.Column('cedula_profesional', sa.String(length=30), nullable=False),
    sa.Column('especialidad', sa.String(length=120), nullable=True),
    sa.Column('institucion', sa.String(length=160), nullable=True),
    sa.Column('estado', postgresql.ENUM('pendiente', 'validado', 'rechazado', name='estado_validacion', create_type=False), nullable=False),
    sa.Column('validado_por_id', sa.UUID(), nullable=True),
    sa.Column('validado_en', sa.DateTime(timezone=True), nullable=True),
    sa.Column('motivo_rechazo', sa.Text(), nullable=True),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('actualizado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['validado_por_id'], ['usuarios.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('usuario_id')
    )
    op.create_index(op.f('ix_perfiles_medico_cedula_profesional'), 'perfiles_medico', ['cedula_profesional'], unique=False)
    op.create_table('perfiles_partner',
    sa.Column('usuario_id', sa.UUID(), nullable=False),
    sa.Column('razon_social', sa.String(length=200), nullable=False),
    sa.Column('rfc', sa.String(length=13), nullable=True),
    sa.Column('subtipo', postgresql.ENUM('distribuidor', 'mayorista', 'institucional', name='subtipo_partner', create_type=False), nullable=False),
    sa.Column('empresa_objetivo', postgresql.ENUM('gabame', 'medinter', 'ordan', 'a7', name='empresa', create_type=False), nullable=False),
    sa.Column('estado', postgresql.ENUM('pendiente', 'validado', 'rechazado', name='estado_validacion', create_type=False), nullable=False),
    sa.Column('aprobado_por_id', sa.UUID(), nullable=True),
    sa.Column('aprobado_en', sa.DateTime(timezone=True), nullable=True),
    sa.Column('motivo_rechazo', sa.Text(), nullable=True),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('actualizado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['aprobado_por_id'], ['usuarios.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('usuario_id')
    )
    op.create_index(op.f('ix_perfiles_partner_rfc'), 'perfiles_partner', ['rfc'], unique=False)
    op.create_table('sesiones_refresh',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('usuario_id', sa.UUID(), nullable=False),
    sa.Column('token_hash', sa.String(length=128), nullable=False),
    sa.Column('expira_en', sa.DateTime(timezone=True), nullable=False),
    sa.Column('revocado_en', sa.DateTime(timezone=True), nullable=True),
    sa.Column('reemplazada_por_id', sa.UUID(), nullable=True),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('token_hash')
    )
    op.create_index(op.f('ix_sesiones_refresh_usuario_id'), 'sesiones_refresh', ['usuario_id'], unique=False)
    op.create_table('tokens_verificacion',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('usuario_id', sa.UUID(), nullable=False),
    sa.Column('tipo', sa.String(length=30), nullable=False),
    sa.Column('token_hash', sa.String(length=128), nullable=False),
    sa.Column('expira_en', sa.DateTime(timezone=True), nullable=False),
    sa.Column('usado_en', sa.DateTime(timezone=True), nullable=True),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('token_hash')
    )
    op.create_index(op.f('ix_tokens_verificacion_usuario_id'), 'tokens_verificacion', ['usuario_id'], unique=False)
    op.create_table('usuario_roles',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('usuario_id', sa.UUID(), nullable=False),
    sa.Column('rol', postgresql.ENUM('paciente', 'medico', 'partner', 'admin_empresa', 'admin_grupo', name='rol', create_type=False), nullable=False),
    sa.Column('empresa', postgresql.ENUM('gabame', 'medinter', 'ordan', 'a7', name='empresa', create_type=False), nullable=True),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('usuario_id', 'rol', 'empresa', name='uq_usuario_rol_empresa')
    )
    op.create_index(op.f('ix_usuario_roles_usuario_id'), 'usuario_roles', ['usuario_id'], unique=False)
    op.create_table('documentos_partner',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('partner_id', sa.UUID(), nullable=False),
    sa.Column('tipo', sa.String(length=60), nullable=False),
    sa.Column('nombre_archivo', sa.String(length=255), nullable=False),
    sa.Column('ruta', sa.String(length=500), nullable=False),
    sa.Column('estado', postgresql.ENUM('pendiente', 'validado', 'rechazado', name='estado_validacion', create_type=False), nullable=False),
    sa.Column('subido_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['partner_id'], ['perfiles_partner.usuario_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_documentos_partner_partner_id'), 'documentos_partner', ['partner_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_documentos_partner_partner_id'), table_name='documentos_partner')
    op.drop_table('documentos_partner')
    op.drop_index(op.f('ix_usuario_roles_usuario_id'), table_name='usuario_roles')
    op.drop_table('usuario_roles')
    op.drop_index(op.f('ix_tokens_verificacion_usuario_id'), table_name='tokens_verificacion')
    op.drop_table('tokens_verificacion')
    op.drop_index(op.f('ix_sesiones_refresh_usuario_id'), table_name='sesiones_refresh')
    op.drop_table('sesiones_refresh')
    op.drop_index(op.f('ix_perfiles_partner_rfc'), table_name='perfiles_partner')
    op.drop_table('perfiles_partner')
    op.drop_index(op.f('ix_perfiles_medico_cedula_profesional'), table_name='perfiles_medico')
    op.drop_table('perfiles_medico')
    op.drop_index(op.f('ix_origenes_usuario_usuario_id'), table_name='origenes_usuario')
    op.drop_index(op.f('ix_origenes_usuario_producto'), table_name='origenes_usuario')
    op.drop_index(op.f('ix_origenes_usuario_creado_en'), table_name='origenes_usuario')
    op.drop_table('origenes_usuario')
    op.drop_index(op.f('ix_bitacora_validacion_objetivo_id'), table_name='bitacora_validacion')
    op.drop_table('bitacora_validacion')
    op.drop_index('uq_usuarios_email_lower', table_name='usuarios')
    op.drop_table('usuarios')

    bind = op.get_bind()
    for tipo in reversed(TIPOS):
        tipo.drop(bind, checkfirst=True)
