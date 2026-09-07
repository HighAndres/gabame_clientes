"""Router: medicos. Contenido tecnico Rx (Fase 4).

La UNICA puerta es `require_medico_validado`: ningun endpoint de aqui se expone sin ella,
ni temporalmente. Solo se sirve contenido publicado.

# Pendiente 0.5 — la estructura definitiva de las fichas la entrega el cliente.
"""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import DbSession, require_medico_validado
from app.models import Usuario
from app.schemas.contenido import AreaOut, FichaOut
from app.services import contenido

router = APIRouter(dependencies=[Depends(require_medico_validado)])

MedicoValidado = Annotated[Usuario, Depends(require_medico_validado)]


@router.get("/areas", response_model=list[AreaOut])
def listar_areas(db: DbSession) -> list[AreaOut]:
    return [AreaOut.desde_modelo(a, solo_publicadas=True) for a in contenido.areas_publicadas(db)]


@router.get("/areas/{area_slug}", response_model=AreaOut)
def leer_area(area_slug: str, db: DbSession) -> AreaOut:
    return AreaOut.desde_modelo(contenido.area_publicada(db, area_slug), solo_publicadas=True)


@router.get("/areas/{area_slug}/fichas/{ficha_slug}", response_model=FichaOut)
def leer_ficha(area_slug: str, ficha_slug: str, db: DbSession) -> FichaOut:
    return FichaOut.desde_modelo(contenido.ficha_publicada(db, area_slug, ficha_slug))
