"""Router: auth. Handlers delgados; la logica vive en app/services."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import DbSession
from app.core.ratelimit import limitar
from app.schemas.auth import (
    EmailIn,
    LoginIn,
    RefreshIn,
    RegistroIn,
    RestablecerIn,
    TokenCorreoIn,
    TokenOut,
)
from app.schemas.comun import Mensaje
from app.schemas.usuario import UsuarioOut
from app.services import cuentas, sesion

router = APIRouter()


@router.post(
    "/registro",
    response_model=UsuarioOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limitar("registro", maximo=10, ventana_s=600))],
)
def registro(datos: RegistroIn, db: DbSession) -> UsuarioOut:
    """Alta con bifurcacion por tipo de cuenta. Envia el correo de verificacion."""
    return UsuarioOut.desde_modelo(cuentas.registrar(db, datos))


@router.post("/login", response_model=TokenOut, dependencies=[Depends(limitar("login", maximo=20))])
def login(datos: LoginIn, db: DbSession) -> TokenOut:
    """Login JSON. Si viene `origen`, agrega una fila al historial del ecosistema."""
    return sesion.iniciar_sesion(db, datos)


@router.post("/token", response_model=TokenOut, include_in_schema=False, dependencies=[Depends(limitar("login", maximo=20))])
def token(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession) -> TokenOut:
    """Solo para el boton Authorize de /docs (OAuth2 password form)."""
    return sesion.iniciar_sesion(db, LoginIn(email=form.username, password=form.password))


@router.post("/refresh", response_model=TokenOut)
def refresh(datos: RefreshIn, db: DbSession) -> TokenOut:
    return sesion.refrescar(db, datos.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(datos: RefreshIn, db: DbSession) -> None:
    sesion.cerrar_sesion(db, datos.refresh_token)


@router.post("/verificar-email", response_model=Mensaje, dependencies=[Depends(limitar("verificar", maximo=20))])
def verificar_email(datos: TokenCorreoIn, db: DbSession) -> Mensaje:
    cuentas.verificar_email(db, datos.token)
    return Mensaje(mensaje="Correo confirmado. Ya puedes iniciar sesion.")


@router.post(
    "/reenviar-verificacion",
    response_model=Mensaje,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(limitar("reenviar", maximo=5, ventana_s=600))],
)
def reenviar_verificacion(datos: EmailIn, db: DbSession) -> Mensaje:
    cuentas.reenviar_verificacion(db, datos.email)
    return Mensaje(mensaje="Si el correo existe y no esta confirmado, enviamos un nuevo enlace.")


@router.post(
    "/recuperar",
    response_model=Mensaje,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(limitar("recuperar", maximo=5, ventana_s=600))],
)
def recuperar(datos: EmailIn, db: DbSession) -> Mensaje:
    cuentas.solicitar_reset(db, datos.email)
    return Mensaje(mensaje="Si el correo existe, enviamos un enlace para restablecer la contrasena.")


@router.post("/restablecer", response_model=Mensaje, dependencies=[Depends(limitar("restablecer", maximo=10))])
def restablecer(datos: RestablecerIn, db: DbSession) -> Mensaje:
    cuentas.restablecer_password(db, datos.token, datos.password)
    return Mensaje(mensaje="Contrasena actualizada. Inicia sesion con la nueva.")
