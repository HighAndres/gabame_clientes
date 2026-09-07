"""Router: ecosistema. Catalogo de piezas del grupo para armar enlaces (nunca integracion)."""

from fastapi import APIRouter

from app.api.deps import UsuarioActual
from app.core.ecosistema import piezas_para
from app.schemas.admin import PiezaOut

router = APIRouter()


@router.get("", response_model=list[PiezaOut])
def piezas(usuario: UsuarioActual) -> list[PiezaOut]:
    """Piezas visibles para el realm del usuario. `pendiente` = sin URL entregada por el cliente."""
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
    ]
