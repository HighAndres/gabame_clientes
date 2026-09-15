"""Publicaciones con vigencia y enlace al ecosistema.

Las promociones de Farmacias GABAME se capturan como publicaciones para medicos. Una promocion
sin fecha de fin se queda colgada para siempre, y lo que anuncia vive en la tienda, no aqui:
por eso `vigencia_hasta` y `url_externa`. Ambas nulas = publicacion institucional de siempre,
asi que las filas existentes no cambian de comportamiento.

Revision ID: a1c7d4e90b32
Revises: 9b3d8e5f2a10
"""

import sqlalchemy as sa

from alembic import op

revision = "a1c7d4e90b32"
down_revision = "9b3d8e5f2a10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("publicaciones", sa.Column("vigencia_hasta", sa.Date(), nullable=True))
    op.add_column("publicaciones", sa.Column("url_externa", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("publicaciones", "url_externa")
    op.drop_column("publicaciones", "vigencia_hasta")
