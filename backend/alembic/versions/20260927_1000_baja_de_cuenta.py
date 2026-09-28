"""Solicitud de baja de la cuenta (derecho de cancelacion, ADR-0016).

Se guarda cuando la persona la pidio y, si quiso decirlo, por que. El borrado lo confirma un
administrador: la retencion de documentos y bitacora todavia no esta definida por el cliente.

Revision ID: c3f1a7d20e58
Revises: b2d8e5f01c43
"""

import sqlalchemy as sa

from alembic import op

revision = "c3f1a7d20e58"
down_revision = "b2d8e5f01c43"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("usuarios", sa.Column("baja_solicitada_en", sa.DateTime(timezone=True), nullable=True))
    op.add_column("usuarios", sa.Column("baja_motivo", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("usuarios", "baja_motivo")
    op.drop_column("usuarios", "baja_solicitada_en")
