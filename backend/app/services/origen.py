"""Historial de origen dentro del ecosistema (`origenes_usuario`, append-only).

Reglas:
- Registro: escribe `usuarios.origen_inicial` una sola vez y SIEMPRE agrega una fila
  `registro` (con `directo` si no vino de ninguna pieza), para que la tabla sea completa.
- Login y retorno: solo agregan fila cuando la peticion trae origen. Sin origen no hay ruido.
- Nada se sobrescribe. Nunca IP, user agent ni huella.
"""

from sqlalchemy.orm import Session

from app.core.enums import EventoOrigen, Producto
from app.models import OrigenUsuario, Usuario
from app.schemas.comun import OrigenIn


def registrar_origen(
    db: Session, usuario: Usuario, evento: EventoOrigen, origen: OrigenIn | None
) -> OrigenUsuario | None:
    if evento == EventoOrigen.REGISTRO:
        producto = origen.producto if origen else Producto.DIRECTO
        usuario.origen_inicial = producto
    elif origen is None:
        return None
    else:
        producto = origen.producto

    fila = OrigenUsuario(
        usuario_id=usuario.id,
        producto=producto,
        evento=evento,
        ruta_entrada=origen.ruta_entrada if origen else None,
        campana=origen.campana if origen else None,
    )
    db.add(fila)
    return fila
