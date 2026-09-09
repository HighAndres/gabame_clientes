"""Router: espacios. Lo que cada empresa publica dentro de su espacio, por audiencia (corte 3).

La puerta es `acceso_audiencia` en deps: pacientes = cualquier sesion; medicos = medico validado
(la misma regla que el contenido Rx); partners = vinculo aprobado con ESA empresa.
"""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import DbSession, UsuarioActual, acceso_audiencia
from app.core.enums import Audiencia, Empresa
from app.models import Usuario
from app.schemas.admin import EspacioOut, PublicacionOut
from app.services import espacios, publicaciones

router = APIRouter()

ConAcceso = Annotated[Usuario, Depends(acceso_audiencia)]


@router.get("", response_model=list[EspacioOut])
def listar_espacios(usuario: UsuarioActual, db: DbSession) -> list[EspacioOut]:
    """Nombre y modulos de cada espacio. El contacto solo viaja por el vinculo aprobado (/partners/me)."""
    salida = []
    for e in espacios.listar(db):
        out = EspacioOut.desde_modelo(e, administra=False, edita=False)
        out.contacto_nombre = out.contacto_email = out.contacto_telefono = None
        salida.append(out)
    return salida


@router.get("/{empresa}/publicaciones/{audiencia}", response_model=list[PublicacionOut])
def listar_publicaciones(empresa: Empresa, audiencia: Audiencia, usuario: ConAcceso, db: DbSession) -> list[PublicacionOut]:
    return [PublicacionOut.desde_modelo(p) for p in publicaciones.publicadas(db, empresa, audiencia)]


@router.get("/{empresa}/publicaciones/{audiencia}/{slug}", response_model=PublicacionOut)
def leer_publicacion(empresa: Empresa, audiencia: Audiencia, slug: str, usuario: ConAcceso, db: DbSession) -> PublicacionOut:
    return PublicacionOut.desde_modelo(publicaciones.publicada(db, empresa, audiencia, slug))
