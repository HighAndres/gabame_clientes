"""Allowlist de destinos del grupo. Espejo de frontend/src/lib/dominios-grupo.ts.

Un enlace que sale del portal lo teclea una persona en el panel. Sin lista cerrada, la
publicacion de una empresa seria un lugar comodo para colgar un destino ajeno con la marca del
grupo detras; por eso se valida el host aqui y no solo al renderizar.

Son datos publicos, no secretos: viven en codigo. Las URLs configurables del ecosistema
(hoy Farmacias GABAME, que esta en un entorno de pruebas) entran por su ajuste, para que mover
una tienda de dominio no exija tocar esta lista.
"""

from urllib.parse import urlparse

from app.core.config import settings

DOMINIOS_GRUPO: tuple[str, ...] = (
    "gabame.com",
    "medinter.com.mx",
    "ordan.com.mx",
    "a7siete.com",
    "farmaciasgabame.com",
    # Pendiente 0.6 — Aurashop no tiene dominio documentado todavia
)


def _host(url: str) -> str:
    return (urlparse(url).hostname or "").lower()


def hosts_permitidos() -> set[str]:
    """Los dominios del grupo mas los hosts de las piezas configurables."""
    extras = {_host(u) for u in (settings.URL_FARMACIAS, settings.FRONTEND_URL) if u}
    return {d for d in DOMINIOS_GRUPO} | {h for h in extras if h}


def es_del_grupo(url: str) -> bool:
    """Acepta el host exacto o cualquier subdominio suyo. Solo https (o http en local)."""
    partes = urlparse(url)
    host = (partes.hostname or "").lower()
    if not host:
        return False
    if partes.scheme != "https" and host not in ("localhost", "127.0.0.1"):
        return False
    return any(host == p or host.endswith("." + p) for p in hosts_permitidos())
