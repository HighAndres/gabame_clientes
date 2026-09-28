"""Router: usuarios. Lo propio del usuario autenticado."""

import json

from fastapi import APIRouter, Response, status

from app.api.deps import DbSession, UsuarioActual
from app.core.enums import EventoOrigen
from app.schemas.comun import Mensaje, OrigenIn
from app.schemas.usuario import BajaIn, UsuarioOut, UsuarioUpdate
from app.services import baja, datos_personales
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


@router.get("/me/datos")
def descargar_mis_datos(usuario: UsuarioActual, db: DbSession) -> Response:
    """Derecho de acceso (ADR-0016): todo lo que la plataforma guarda de esta persona, como archivo."""
    cuerpo = json.dumps(datos_personales.exportar(db, usuario), ensure_ascii=False, indent=2)
    return Response(
        content=cuerpo,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{datos_personales.nombre_archivo(usuario)}"'},
    )


@router.post("/me/baja", response_model=UsuarioOut)
def solicitar_baja(datos: BajaIn, usuario: UsuarioActual, db: DbSession) -> UsuarioOut:
    """Derecho de cancelacion (ADR-0016). Cierra el acceso en el acto; el borrado lo confirma un
    administrador, porque la retencion de documentos y bitacora la define el cliente."""
    return UsuarioOut.desde_modelo(baja.solicitar(db, usuario, datos.motivo))


@router.post("/me/origen", response_model=Mensaje, status_code=status.HTTP_201_CREATED)
def registrar_retorno(origen: OrigenIn, usuario: UsuarioActual, db: DbSession) -> Mensaje:
    """Un usuario ya con sesion volvio al portal desde una pieza del ecosistema."""
    registrar_origen(db, usuario, EventoOrigen.RETORNO, origen)
    db.commit()
    return Mensaje(mensaje="Origen registrado")
