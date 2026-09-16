"""Acentos en los nombres de los requisitos por defecto.

El catalogo generico sembro "Constancia de situacion fiscal" e "Identificacion del representante"
sin tilde, y el partner los lee en su tabla de documentos. Los requisitos son dato editable por
cada empresa (ADR-0009): solo se corrigen las filas que siguen exactamente con el texto sembrado,
para no pisar lo que un admin haya escrito.

Revision ID: b2d8e5f01c43
Revises: a1c7d4e90b32
"""

import sqlalchemy as sa

from alembic import op

revision = "b2d8e5f01c43"
down_revision = "a1c7d4e90b32"
branch_labels = None
depends_on = None

CAMBIOS = (
    ("Constancia de situacion fiscal", "Constancia de situación fiscal"),
    ("Identificacion del representante", "Identificación del representante"),
)


def _renombrar(de: str, a: str) -> None:
    op.get_bind().execute(
        sa.text("update requisitos_documentales set nombre = :a where nombre = :de"), {"a": a, "de": de}
    )


def upgrade() -> None:
    for sin, con in CAMBIOS:
        _renombrar(sin, con)


def downgrade() -> None:
    for sin, con in CAMBIOS:
        _renombrar(con, sin)
