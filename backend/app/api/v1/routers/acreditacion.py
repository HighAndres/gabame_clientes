"""Router: la acreditacion del propio medico.

Va aparte del router de contenido Rx a proposito: aquel entra entero por `require_medico_validado`
y aqui tienen que poder entrar justo los que NO estan validados, que son quienes necesitan
consultar su estado, corregir un dato y volver a enviar. No abre ningun contenido tecnico.
"""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import DbSession, require_perfil_medico
from app.models import Usuario
from app.schemas.medico import AcreditacionOut, AcreditacionUpdate
from app.services import acreditacion

router = APIRouter()

Medico = Annotated[Usuario, Depends(require_perfil_medico)]


@router.get("/me/acreditacion", response_model=AcreditacionOut)
def leer_acreditacion(usuario: Medico) -> AcreditacionOut:
    return AcreditacionOut.desde_modelo(usuario.perfil_medico)


@router.patch("/me/acreditacion", response_model=AcreditacionOut)
def actualizar_acreditacion(datos: AcreditacionUpdate, usuario: Medico, db: DbSession) -> AcreditacionOut:
    perfil = acreditacion.actualizar(db, usuario, datos.model_dump(exclude_unset=True))
    return AcreditacionOut.desde_modelo(perfil)


@router.post("/me/acreditacion/reenviar", response_model=AcreditacionOut)
def reenviar_acreditacion(usuario: Medico, db: DbSession) -> AcreditacionOut:
    """Tras un rechazo: corrige el dato y vuelve a la cola de validacion, con bitacora."""
    return AcreditacionOut.desde_modelo(acreditacion.reenviar(db, usuario))
