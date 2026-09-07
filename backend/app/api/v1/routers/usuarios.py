"""Router: usuarios. Lo propio del usuario autenticado."""

from fastapi import APIRouter, status

from app.api.deps import DbSession, UsuarioActual
from app.core.enums import EventoOrigen
from app.schemas.comun import Mensaje, OrigenIn
from app.schemas.usuario import UsuarioOut, UsuarioUpdate
from app.services.origen import registrar_origen

router = APIRouter()


@router.get("/me", response_model=UsuarioOut)
def leer_me(usuario: UsuarioActual) -> UsuarioOut:
    return UsuarioOut.desde_modelo(usuario)


@router.patch("/me", response_model=UsuarioOut)
def actualizar_me(datos: UsuarioUpdate, usuario: UsuarioActual, db: DbSession) -> UsuarioOut:
    """Nombre, apellidos y telefono. El email no se cambia por aqui (exige re-verificacion)."""
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(usuario, campo, valor)
    db.commit()
    db.refresh(usuario)
    return UsuarioOut.desde_modelo(usuario)


@router.post("/me/origen", response_model=Mensaje, status_code=status.HTTP_201_CREATED)
def registrar_retorno(origen: OrigenIn, usuario: UsuarioActual, db: DbSession) -> Mensaje:
    """Un usuario ya con sesion volvio al portal desde una pieza del ecosistema."""
    registrar_origen(db, usuario, EventoOrigen.RETORNO, origen)
    db.commit()
    return Mensaje(mensaje="Origen registrado")
