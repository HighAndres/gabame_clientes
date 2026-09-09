"""corte3_publicaciones_y_requisitos

Publicaciones por audiencia dentro de cada espacio y requisitos documentales como dato por
empresa (resuelve 0.4 como dato). Siembra el catalogo generico en cada empresa.

Revision ID: 9b3d8e5f2a10
Revises: 8a2c7d4e1f09
Create Date: 2026-09-09 15:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '9b3d8e5f2a10'
down_revision: str | None = '8a2c7d4e1f09'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

EMPRESA = postgresql.ENUM('gabame', 'medinter', 'ordan', 'a7', name='empresa', create_type=False)
SUBTIPO = postgresql.ENUM('distribuidor', 'mayorista', 'institucional', name='subtipo_partner', create_type=False)
AUDIENCIA = postgresql.ENUM('pacientes', 'medicos', 'partners', name='audiencia')

# Espejo de app/core/requisitos_partner.py en el momento de esta migracion.
POR_DEFECTO = [
    ('constancia_fiscal', 'Constancia de situacion fiscal', 'Emitida por el SAT, vigente.', True),
    ('identificacion_representante', 'Identificacion del representante', 'INE o pasaporte vigente.', True),
    ('comprobante_domicilio', 'Comprobante de domicilio', 'No mayor a 3 meses.', True),
    ('otro', 'Otro documento', 'Cualquier otro documento que te soliciten.', False),
]


def upgrade() -> None:
    AUDIENCIA.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'publicaciones',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('empresa', EMPRESA, nullable=False),
        sa.Column('audiencia', postgresql.ENUM('pacientes', 'medicos', 'partners', name='audiencia', create_type=False), nullable=False),
        sa.Column('slug', sa.String(length=80), nullable=False),
        sa.Column('titulo', sa.String(length=160), nullable=False),
        sa.Column('resumen', sa.String(length=500), nullable=True),
        sa.Column('contenido', sa.Text(), nullable=False),
        sa.Column('orden', sa.Integer(), nullable=False),
        sa.Column('publicada', sa.Boolean(), nullable=False),
        sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('actualizado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('empresa', 'slug', name='uq_publicacion_empresa_slug'),
    )
    op.create_index(op.f('ix_publicaciones_empresa'), 'publicaciones', ['empresa'], unique=False)

    op.create_table(
        'requisitos_documentales',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('empresa', EMPRESA, nullable=False),
        sa.Column('tipo', SUBTIPO, nullable=True),
        sa.Column('clave', sa.String(length=60), nullable=False),
        sa.Column('nombre', sa.String(length=120), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('obligatorio', sa.Boolean(), nullable=False),
        sa.Column('orden', sa.Integer(), nullable=False),
        sa.Column('activo', sa.Boolean(), nullable=False),
        sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('actualizado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('empresa', 'clave', name='uq_requisito_empresa_clave'),
    )
    op.create_index(op.f('ix_requisitos_documentales_empresa'), 'requisitos_documentales', ['empresa'], unique=False)

    for empresa in ('gabame', 'medinter', 'ordan', 'a7'):
        for i, (clave, nombre, descripcion, obligatorio) in enumerate(POR_DEFECTO):
            op.execute(
                "INSERT INTO requisitos_documentales (id, empresa, clave, nombre, descripcion, obligatorio, orden, activo) "
                f"VALUES (gen_random_uuid(), '{empresa}', '{clave}', '{nombre}', '{descripcion}', {str(obligatorio).lower()}, {i}, true)"
            )


def downgrade() -> None:
    op.drop_index(op.f('ix_requisitos_documentales_empresa'), table_name='requisitos_documentales')
    op.drop_table('requisitos_documentales')
    op.drop_index(op.f('ix_publicaciones_empresa'), table_name='publicaciones')
    op.drop_table('publicaciones')
    AUDIENCIA.drop(op.get_bind(), checkfirst=True)
