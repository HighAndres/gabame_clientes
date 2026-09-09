"""adr0008_espacios_y_vinculos

Espacios por empresa (modulos, contacto, portal) y vinculos usuario-empresa con tipo y estado
propios. El estado del partner deja de vivir en `perfiles_partner` y se reparte en un vinculo por
empresa; los datos existentes se migran como un vinculo con la empresa objetivo. Nuevo rol
`editor_empresa`.

Escrita a mano: Alembic no genera el backfill ni el ADD VALUE del enum.

Revision ID: 8a2c7d4e1f09
Revises: 0439bfd6221e
Create Date: 2026-09-09 09:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '8a2c7d4e1f09'
down_revision: str | None = '0439bfd6221e'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

EMPRESA = postgresql.ENUM('gabame', 'medinter', 'ordan', 'a7', name='empresa', create_type=False)
SUBTIPO = postgresql.ENUM('distribuidor', 'mayorista', 'institucional', name='subtipo_partner', create_type=False)
ESTADO = postgresql.ENUM('pendiente', 'validado', 'rechazado', name='estado_validacion', create_type=False)

# Espejo de app/services/espacios.py en el momento de esta migracion.
ESPACIOS = [
    ('gabame', 'GABAME', '["cuentas", "documentos", "contactos", "contenido_rx"]'),
    ('medinter', 'Medinter', '["cuentas", "documentos", "contactos"]'),
    ('ordan', 'Ordan', '["cuentas", "documentos", "contactos"]'),
    ('a7', 'A7 Pharmaceutical Distributor', '["cuentas", "documentos", "contactos"]'),
]


def upgrade() -> None:
    # Postgres >= 12 permite ADD VALUE dentro de la transaccion mientras no se use el valor aqui.
    op.execute("ALTER TYPE rol ADD VALUE IF NOT EXISTS 'editor_empresa'")

    op.create_table(
        'espacios',
        sa.Column('empresa', EMPRESA, nullable=False),
        sa.Column('nombre', sa.String(length=120), nullable=False),
        sa.Column('modulos', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('contacto_nombre', sa.String(length=120), nullable=True),
        sa.Column('contacto_email', sa.String(length=255), nullable=True),
        sa.Column('contacto_telefono', sa.String(length=30), nullable=True),
        sa.Column('portal_url', sa.String(length=500), nullable=True),
        sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('actualizado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('empresa'),
    )
    for empresa, nombre, modulos in ESPACIOS:  # constantes de este archivo, no entrada externa
        op.execute(f"INSERT INTO espacios (empresa, nombre, modulos) VALUES ('{empresa}', '{nombre}', '{modulos}'::jsonb)")

    op.create_table(
        'vinculos_empresa',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('usuario_id', sa.UUID(), nullable=False),
        sa.Column('empresa', EMPRESA, nullable=False),
        sa.Column('tipo', SUBTIPO, nullable=False),
        sa.Column('estado', ESTADO, nullable=False),
        sa.Column('aprobado_por_id', sa.UUID(), nullable=True),
        sa.Column('aprobado_en', sa.DateTime(timezone=True), nullable=True),
        sa.Column('motivo_rechazo', sa.Text(), nullable=True),
        sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('actualizado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['aprobado_por_id'], ['usuarios.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('usuario_id', 'empresa', name='uq_vinculo_usuario_empresa'),
    )
    op.create_index(op.f('ix_vinculos_empresa_usuario_id'), 'vinculos_empresa', ['usuario_id'], unique=False)
    op.create_index(op.f('ix_vinculos_empresa_empresa'), 'vinculos_empresa', ['empresa'], unique=False)

    # Backfill: cada perfil de partner existente se vuelve un vinculo con su empresa objetivo.
    op.execute(
        """
        INSERT INTO vinculos_empresa
            (id, usuario_id, empresa, tipo, estado, aprobado_por_id, aprobado_en, motivo_rechazo, creado_en, actualizado_en)
        SELECT gen_random_uuid(), usuario_id, empresa_objetivo, subtipo, estado, aprobado_por_id, aprobado_en,
               motivo_rechazo, creado_en, actualizado_en
        FROM perfiles_partner
        """
    )

    op.drop_column('perfiles_partner', 'motivo_rechazo')
    op.drop_column('perfiles_partner', 'aprobado_en')
    op.drop_column('perfiles_partner', 'aprobado_por_id')
    op.drop_column('perfiles_partner', 'estado')
    op.drop_column('perfiles_partner', 'empresa_objetivo')
    op.drop_column('perfiles_partner', 'subtipo')


def downgrade() -> None:
    op.add_column('perfiles_partner', sa.Column('subtipo', SUBTIPO, nullable=True))
    op.add_column('perfiles_partner', sa.Column('empresa_objetivo', EMPRESA, nullable=True))
    op.add_column('perfiles_partner', sa.Column('estado', ESTADO, nullable=True))
    op.add_column('perfiles_partner', sa.Column('aprobado_por_id', sa.UUID(), nullable=True))
    op.add_column('perfiles_partner', sa.Column('aprobado_en', sa.DateTime(timezone=True), nullable=True))
    op.add_column('perfiles_partner', sa.Column('motivo_rechazo', sa.Text(), nullable=True))
    op.create_foreign_key('fk_perfiles_partner_aprobado_por', 'perfiles_partner', 'usuarios', ['aprobado_por_id'], ['id'], ondelete='SET NULL')

    # Se conserva un solo vinculo por partner: el aprobado si lo hay, si no el mas antiguo.
    op.execute(
        """
        UPDATE perfiles_partner p SET
            subtipo = v.tipo, empresa_objetivo = v.empresa, estado = v.estado,
            aprobado_por_id = v.aprobado_por_id, aprobado_en = v.aprobado_en, motivo_rechazo = v.motivo_rechazo
        FROM (
            SELECT DISTINCT ON (usuario_id) *
            FROM vinculos_empresa
            ORDER BY usuario_id, (estado = 'validado') DESC, creado_en
        ) v
        WHERE v.usuario_id = p.usuario_id
        """
    )
    op.execute(
        """
        UPDATE perfiles_partner SET subtipo = 'distribuidor', empresa_objetivo = 'gabame', estado = 'pendiente'
        WHERE subtipo IS NULL
        """
    )
    op.alter_column('perfiles_partner', 'subtipo', nullable=False)
    op.alter_column('perfiles_partner', 'empresa_objetivo', nullable=False)
    op.alter_column('perfiles_partner', 'estado', nullable=False)

    op.drop_index(op.f('ix_vinculos_empresa_empresa'), table_name='vinculos_empresa')
    op.drop_index(op.f('ix_vinculos_empresa_usuario_id'), table_name='vinculos_empresa')
    op.drop_table('vinculos_empresa')
    op.drop_table('espacios')
    # Postgres no permite quitar un valor de un enum; 'editor_empresa' queda en el tipo `rol`.
    op.execute("DELETE FROM usuario_roles WHERE rol = 'editor_empresa'")
