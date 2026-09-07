"""Limite de intentos para los endpoints de auth (Fase 7).

Ventana deslizante en memoria del proceso. Las claves (IP del cliente, correo) viven solo en
RAM el tiempo de la ventana: no se persisten, no se loguean y no alimentan ninguna tabla.
Es proteccion contra fuerza bruta y abuso de correo, no telemetria (ver ADR-0003).

En despliegue con varios workers el limite es por proceso; si hace falta uno global se cambia
este modulo por un backend compartido sin tocar los routers.
"""

import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import HTTPException, Request, status

from app.core.config import settings

_ventanas: dict[str, deque[float]] = defaultdict(deque)
_lock = threading.Lock()


def reiniciar() -> None:
    """Solo para pruebas."""
    with _lock:
        _ventanas.clear()


def _ip_de(request: Request) -> str:
    # Detras de un proxy inverso se usa X-Forwarded-For (primer salto); en local, la conexion.
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "desconocido"


def _registrar(clave: str, maximo: int, ventana_s: int) -> bool:
    ahora = time.monotonic()
    with _lock:
        cola = _ventanas[clave]
        while cola and ahora - cola[0] > ventana_s:
            cola.popleft()
        if len(cola) >= maximo:
            return False
        cola.append(ahora)
        return True


def limitar(nombre: str, *, maximo: int, ventana_s: int = 60) -> Callable[[Request], None]:
    """Dependencia: a lo mas `maximo` peticiones por IP en `ventana_s` segundos para `nombre`."""

    def _dep(request: Request) -> None:
        if not settings.RATE_LIMIT_ACTIVO:
            return
        if not _registrar(f"{nombre}:{_ip_de(request)}", maximo, ventana_s):
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                {"codigo": "demasiados_intentos", "mensaje": "Demasiados intentos. Espera un momento."},
                headers={"Retry-After": str(ventana_s)},
            )

    return _dep


def limitar_por_cuenta(nombre: str, email: str, *, maximo: int, ventana_s: int = 300) -> None:
    """Freno por cuenta (ademas del de IP): frena a quien prueba contrasenas de un correo desde
    muchas IPs. Se llama desde el servicio con el correo ya normalizado."""
    if not settings.RATE_LIMIT_ACTIVO:
        return
    if not _registrar(f"{nombre}:cuenta:{email}", maximo, ventana_s):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            {"codigo": "demasiados_intentos", "mensaje": "Demasiados intentos para esta cuenta. Espera unos minutos."},
            headers={"Retry-After": str(ventana_s)},
        )
