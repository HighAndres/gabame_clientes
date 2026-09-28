"""Derechos de la persona sobre sus datos (ADR-0016): descargarlos y pedir la baja.

Lo que importa fijar: la baja cierra el acceso en el acto, el borrado solo lo hace un admin con
alcance sobre esa cuenta, y la bitacora sobrevive al borrado (es requisito, no auditoria opcional).
"""

import json

from sqlalchemy import select

from app.core.enums import Empresa, EstadoValidacion, EventoOrigen, Producto, Realm, Rol
from app.models import BitacoraValidacion, OrigenUsuario, Usuario
from tests.conftest import PASSWORD, auth, crear_usuario, login

ME = "/api/v1/usuarios/me"
ADMIN = "/api/v1/admin"


def _grupo(client, db):
    crear_usuario(db, "grupo@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_GRUPO, None)])
    return auth(login(client, "grupo@ejemplo.com"))


# ---------- descargar mis datos ----------


def test_la_descarga_trae_lo_suyo_y_nada_de_terceros(client, db):
    u = crear_usuario(db, "med@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=EstadoValidacion.VALIDADO)
    db.add(OrigenUsuario(usuario_id=u.id, producto=Producto.GABAME, evento=EventoOrigen.REGISTRO))
    crear_usuario(db, "otra@ejemplo.com")
    db.commit()

    r = client.get(f"{ME}/datos", headers=auth(login(client, "med@ejemplo.com")))
    assert r.status_code == 200, r.text
    assert r.headers["content-disposition"].startswith("attachment;")
    datos = json.loads(r.text)

    assert datos["cuenta"]["correo"] == "med@ejemplo.com"
    # La cedula va completa: enmascararla tiene sentido en pantalla, no cuando el titular la pide.
    assert datos["acreditacion_profesional"]["cedula_profesional"] == "12345678"
    assert [o["sitio_o_tienda"] for o in datos["como_llegaste"]] == ["gabame"]
    assert "otra@ejemplo.com" not in r.text
    assert "empresa" not in datos  # no es partner


def test_el_partner_recibe_su_empresa_sus_vinculos_y_la_ficha_de_sus_documentos(client, db):
    crear_usuario(
        db, "p@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)],
        vinculos=[(Empresa.ORDAN, EstadoValidacion.VALIDADO)],
    )
    datos = json.loads(client.get(f"{ME}/datos", headers=auth(login(client, "p@ejemplo.com"))).text)
    assert datos["empresa"]["razon_social"] == "Prueba SA"
    assert [v["empresa"] for v in datos["empresa"]["vinculos"]] == ["ordan"]
    assert datos["empresa"]["documentos"] == []


# ---------- pedir la baja ----------


def test_pedir_la_baja_cierra_el_acceso_en_el_acto(client, db):
    u = crear_usuario(db, "ana@ejemplo.com")
    headers = auth(login(client, "ana@ejemplo.com"))

    r = client.post(f"{ME}/baja", json={"motivo": "Ya no lo uso"}, headers=headers)
    assert r.status_code == 200, r.text

    # Su sesion deja de servir y no puede volver a entrar.
    assert client.get(ME, headers=headers).status_code == 401
    assert client.post("/api/v1/auth/login", json={"email": "ana@ejemplo.com", "password": PASSWORD}).status_code == 403

    db.refresh(u)
    assert u.activo is False and u.baja_solicitada_en is not None and u.baja_motivo == "Ya no lo uso"
    fila = db.scalar(select(BitacoraValidacion).where(BitacoraValidacion.accion == "baja_solicitada"))
    assert fila.detalle["motivo"] == "Ya no lo uso"


def test_el_motivo_es_opcional_y_no_se_pide_dos_veces(client, db):
    crear_usuario(db, "ana@ejemplo.com")
    headers = auth(login(client, "ana@ejemplo.com"))
    assert client.post(f"{ME}/baja", json={}, headers=headers).status_code == 200
    # La sesion ya no vale, asi que el segundo intento ni siquiera llega: la cuenta esta cerrada.
    assert client.post(f"{ME}/baja", json={}, headers=headers).status_code == 401


# ---------- el borrado lo confirma un admin ----------


def test_el_admin_borra_solo_lo_que_pidio_su_baja_y_la_bitacora_queda(client, db):
    headers = _grupo(client, db)
    u = crear_usuario(db, "ana@ejemplo.com")
    ana = u.id

    assert client.delete(f"{ADMIN}/usuarios/{ana}", headers=headers).status_code == 409

    propios = auth(login(client, "ana@ejemplo.com"))
    client.post(f"{ME}/baja", json={"motivo": "Ya no lo uso"}, headers=propios)

    lista = client.get(f"{ADMIN}/usuarios", params={"bajas": True}, headers=headers).json()
    assert [x["email"] for x in lista["items"]] == ["ana@ejemplo.com"]
    assert lista["items"][0]["baja_motivo"] == "Ya no lo uso"

    assert client.delete(f"{ADMIN}/usuarios/{ana}", headers=headers).status_code == 204
    db.expire_all()  # la peticion borro en otra sesion
    assert db.get(Usuario, ana) is None
    filas = db.scalars(select(BitacoraValidacion).where(BitacoraValidacion.objetivo_id == ana)).all()
    assert [b.accion for b in filas] == ["baja_solicitada", "cuenta_eliminada"]
    # Queda que paso y cuando; lo que la persona escribio sobre si misma, no.
    assert all("Ya no lo uso" not in str(b.detalle) for b in filas)


def test_nadie_borra_fuera_de_su_alcance_ni_su_propia_cuenta(client, db):
    crear_usuario(db, "admin.ordan@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_EMPRESA, Empresa.ORDAN)])
    headers = auth(login(client, "admin.ordan@ejemplo.com"))
    ajena = crear_usuario(db, "ana@ejemplo.com")  # paciente: solo la ve el admin del grupo
    client.post(f"{ME}/baja", json={}, headers=auth(login(client, "ana@ejemplo.com")))

    assert client.delete(f"{ADMIN}/usuarios/{ajena.id}", headers=headers).status_code == 404
    assert db.get(Usuario, ajena.id) is not None

    yo = db.scalar(select(Usuario).where(Usuario.email == "admin.ordan@ejemplo.com"))
    assert client.delete(f"{ADMIN}/usuarios/{yo.id}", headers=headers).status_code == 403
