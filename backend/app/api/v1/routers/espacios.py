"""Router: espacios. Lo que cada empresa muestra dentro de su espacio a quien usa el portal
(corte 3 y 4).

La puerta es `acceso_audiencia` / `audiencias_permitidas` en deps: pacientes = cualquier sesion;
medicos = medico validado (la misma regla que el contenido Rx); partners = vinculo aprobado
con ESA empresa. El contacto comercial solo viaja con vinculo aprobado y modulo `contactos`.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import DbSession, UsuarioActual, acceso_audiencia, audiencias_permitidas
from app.core.enums import Audiencia, Empresa, EstadoValidacion, Modulo
from app.models import Espacio, Usuario
from app.schemas.admin import EspacioOut, PublicacionOut
from app.schemas.espacios import EspacioMioOut
from app.services import espacios, publicaciones

router = APIRouter()

ConAcceso = Annotated[Usuario, Depends(acceso_audiencia)]


def _mio(db: Session, usuario: Usuario, e: Espacio) -> EspacioMioOut:
    audiencias = audiencias_permitidas(usuario, e.empresa)
    vinculo = next((v for v in usuario.vinculos if v.empresa == e.empresa), None)
    aprobado = vinculo is not None and vinculo.estado == EstadoValidacion.VALIDADO
    pubs = [p for a in audiencias for p in publicaciones.publicadas(db, e.empresa, a)]
    return EspacioMioOut.desde_modelo(
        e,
        audiencias=audiencias,
        vinculo_estado=vinculo.estado if vinculo else None,
        contacto=aprobado and e.tiene(Modulo.CONTACTOS.value),
        publicaciones=pubs,
    )


@router.get("", response_model=list[EspacioOut])
def listar_espacios(usuario: UsuarioActual, db: DbSession) -> list[EspacioOut]:
    """Nombre y modulos de cada espacio. El contacto solo viaja por el vinculo aprobado."""
    salida = []
    for e in espacios.listar(db):
        out = EspacioOut.desde_modelo(e, administra=False, edita=False)
        out.contacto_nombre = out.contacto_email = out.contacto_telefono = None
        salida.append(out)
    return salida


@router.get("/mios", response_model=list[EspacioMioOut])
def mis_espacios(usuario: UsuarioActual, db: DbSession) -> list[EspacioMioOut]:
    """Cada espacio con lo que la persona actual puede ver en el (corte 4)."""
    return [_mio(db, usuario, e) for e in espacios.listar(db)]


@router.get("/{empresa}/mio", response_model=EspacioMioOut)
def mi_espacio(empresa: Empresa, usuario: UsuarioActual, db: DbSession) -> EspacioMioOut:
    return _mio(db, usuario, espacios.obtener(db, empresa))


@router.get("/{empresa}/publicaciones/{audiencia}", response_model=list[PublicacionOut])
def listar_publicaciones(empresa: Empresa, audiencia: Audiencia, usuario: ConAcceso, db: DbSession) -> list[PublicacionOut]:
    return [PublicacionOut.desde_modelo(p) for p in publicaciones.publicadas(db, empresa, audiencia)]


@router.get("/{empresa}/publicaciones/{audiencia}/{slug}", response_model=PublicacionOut)
def leer_publicacion(empresa: Empresa, audiencia: Audiencia, slug: str, usuario: ConAcceso, db: DbSession) -> PublicacionOut:
    return PublicacionOut.desde_modelo(publicaciones.publicada(db, empresa, audiencia, slug))
