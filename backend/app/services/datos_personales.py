"""Los datos de una persona, en sus manos (derecho de acceso, LFPDPPP; ADR-0016).

El aviso de privacidad remite a un contacto que el grupo todavia no publica, asi que hasta que
llegue, el portal resuelve dentro del producto los dos derechos que puede resolver solo: acceso
(esta exportacion) y cancelacion (`baja.py`).

Va todo lo que esta plataforma guarda de esa persona, incluida su cedula profesional: enmascararla
tiene sentido en una pantalla, no cuando el titular pide sus propios datos. Lo que no va: datos de
terceros. La bitacora se incluye sin el nombre de quien decidio, porque ese es dato de otra persona;
que fue lo que paso si es suyo.
"""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import BitacoraValidacion, Usuario


def _fecha(valor: datetime | None) -> str | None:
    return valor.isoformat() if valor else None


def exportar(db: Session, usuario: Usuario) -> dict:
    perfil_medico = usuario.perfil_medico
    perfil_partner = usuario.perfil_partner
    bitacora = db.scalars(
        select(BitacoraValidacion)
        .where(BitacoraValidacion.objetivo_id == usuario.id)
        .order_by(BitacoraValidacion.creado_en)
    ).all()

    datos: dict = {
        "generado_en": datetime.now(UTC).isoformat(),
        "aviso": (
            "Estos son los datos que la Cuenta GABAME guarda sobre ti. No incluye datos clínicos: "
            "esta plataforma no los almacena."
        ),
        "cuenta": {
            "id": str(usuario.id),
            "correo": usuario.email,
            "correo_verificado": usuario.email_verificado,
            "nombre": usuario.nombre,
            "apellidos": usuario.apellidos,
            "telefono": usuario.telefono,
            "tipo_de_cuenta": usuario.realm.value,
            "roles": [{"rol": r.rol.value, "empresa": r.empresa.value if r.empresa else None} for r in usuario.roles],
            "activa": usuario.activo,
            "baja_solicitada_en": _fecha(usuario.baja_solicitada_en),
            "alta": _fecha(usuario.creado_en),
        },
        # De donde llegaste al portal. Nunca se guardo IP, navegador ni huella de dispositivo.
        "como_llegaste": [
            {
                "sitio_o_tienda": o.producto.value,
                "evento": o.evento.value,
                "ruta_de_entrada": o.ruta_entrada,
                "campana": o.campana,
                "fecha": _fecha(o.creado_en),
            }
            for o in usuario.origenes
        ],
        "movimientos_sobre_tu_cuenta": [
            {"que_paso": b.accion, "detalle": b.detalle, "fecha": _fecha(b.creado_en)} for b in bitacora
        ],
    }

    if perfil_medico is not None:
        datos["acreditacion_profesional"] = {
            "cedula_profesional": perfil_medico.cedula_profesional,
            "especialidad": perfil_medico.especialidad,
            "institucion": perfil_medico.institucion,
            "estado": perfil_medico.estado.value,
            "motivo_rechazo": perfil_medico.motivo_rechazo,
            "validada_en": _fecha(perfil_medico.validado_en),
            "solicitada_en": _fecha(perfil_medico.creado_en),
        }

    if perfil_partner is not None:
        datos["empresa"] = {
            "razon_social": perfil_partner.razon_social,
            "rfc": perfil_partner.rfc,
            "vinculos": [
                {
                    "empresa": v.empresa.value,
                    "tipo": v.tipo.value,
                    "estado": v.estado.value,
                    "aprobado_en": _fecha(v.aprobado_en),
                    "motivo_rechazo": v.motivo_rechazo,
                    "solicitado_en": _fecha(v.creado_en),
                }
                for v in usuario.vinculos
            ],
            # Los archivos se descargan uno por uno desde el area de Partners; aqui va su ficha.
            "documentos": [
                {
                    "requisito": d.tipo,
                    "archivo": d.nombre_archivo,
                    "tamano_bytes": d.tamano_bytes,
                    "estado": d.estado.value,
                    "motivo_rechazo": d.motivo_rechazo,
                    "subido_en": _fecha(d.subido_en),
                }
                for d in perfil_partner.documentos
            ],
        }

    return datos


def nombre_archivo(usuario: Usuario) -> str:
    return f"cuenta-gabame-{usuario.id}.json"
