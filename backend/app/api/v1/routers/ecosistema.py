"""Router: ecosistema. Catalogo de piezas del grupo para armar enlaces (nunca integracion)."""

from fastapi import APIRouter

from app.api.deps import UsuarioActual, empresas_visibles
from app.core.ecosistema import piezas_para
from app.schemas.admin import PiezaOut

router = APIRouter()


@router.get("", response_model=list[PiezaOut])
def piezas(usuario: UsuarioActual) -> list[PiezaOut]:
    """Piezas del realm de la persona, acotadas a sus empresas (ADR-0015). Las piezas del grupo,
    como la app, no son de ninguna empresa y se muestran siempre.
    `pendiente` = sin URL entregada por el cliente."""
    visibles = empresas_visibles(usuario)
    return [
        PiezaOut(
            producto=p.producto,
            nombre=p.nombre,
            tipo=p.tipo,
            empresa=p.empresa,
            url=p.url,
            descripcion=p.descripcion,
            pendiente=p.url is None,
        )
        for p in piezas_para(usuario.realm)
        if p.empresa is None or p.empresa in visibles
    ]
