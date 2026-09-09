"""Admin: colas de validacion, alcance por empresa (ADR-0008), espacios y bitacora."""

import pytest
from sqlalchemy import select

from app.core.enums import Empresa, EstadoValidacion, Realm, Rol
from app.models import BitacoraValidacion
from app.services import correo, espacios
from tests.conftest import auth, crear_usuario, login

BASE = "/api/v1/admin"


def _admin(db, email: str, empresa: Empresa | None, rol: Rol = Rol.ADMIN_EMPRESA) -> dict:
    par = (Rol.ADMIN_GRUPO, None) if empresa is None else (rol, empresa)
    crear_usuario(db, email, realm=Realm.PARTNERS, roles=[par])
    return {"email": email}


@pytest.fixture
def escenario(db):
    """Un medico pendiente, un partner de Ordan pendiente, un partner de Medinter pendiente,
    un partner con Ordan aprobado y A7 pendiente. Admins de grupo, Ordan, GABAME y un editor de GABAME."""
    medico = crear_usuario(db, "med@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=EstadoValidacion.PENDIENTE)
    ordan = crear_usuario(db, "ordan@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)], estado_partner=EstadoValidacion.PENDIENTE)
    medinter = crear_usuario(
        db, "medinter@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)],
        vinculos=[(Empresa.MEDINTER, EstadoValidacion.PENDIENTE)],
    )
    doble = crear_usuario(
        db, "doble@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)],
        vinculos=[(Empresa.ORDAN, EstadoValidacion.VALIDADO), (Empresa.A7, EstadoValidacion.PENDIENTE)],
    )
    _admin(db, "grupo@ejemplo.com", None)
    _admin(db, "admin.ordan@ejemplo.com", Empresa.ORDAN)
    _admin(db, "admin.gabame@ejemplo.com", Empresa.GABAME)
    _admin(db, "editor.gabame@ejemplo.com", Empresa.GABAME, Rol.EDITOR_EMPRESA)
    return {"medico": medico, "ordan": ordan, "medinter": medinter, "doble": doble}


def _vinculos(client, headers, **params) -> list[dict]:
    r = client.get(f"{BASE}/partners", params=params, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- acceso ----------


def test_no_admin_no_entra(client, db):
    crear_usuario(db, "p@ejemplo.com")
    assert client.get(f"{BASE}/resumen", headers=auth(login(client, "p@ejemplo.com"))).status_code == 403


def test_resumen_segun_alcance(client, escenario):
    grupo = client.get(f"{BASE}/resumen", headers=auth(login(client, "grupo@ejemplo.com"))).json()
    assert grupo == {
        "medicos_pendientes": 1, "partners_pendientes": 3, "usuarios_total": 8,
        "alcance_grupo": True, "empresas": ["a7", "gabame", "medinter", "ordan"],
    }
    ordan = client.get(f"{BASE}/resumen", headers=auth(login(client, "admin.ordan@ejemplo.com"))).json()
    assert ordan["medicos_pendientes"] is None  # fuera de alcance
    assert ordan["partners_pendientes"] == 1  # el vinculo de doble con Ordan ya esta aprobado
    assert ordan["usuarios_total"] is None
    assert ordan["empresas"] == ["ordan"]

    editor = client.get(f"{BASE}/resumen", headers=auth(login(client, "editor.gabame@ejemplo.com"))).json()
    assert editor == {"medicos_pendientes": None, "partners_pendientes": 0, "usuarios_total": None, "alcance_grupo": False, "empresas": ["gabame"]}


# ---------- vinculos de partners ----------


def test_admin_empresa_solo_ve_vinculos_de_su_empresa(client, escenario):
    ordan = auth(login(client, "admin.ordan@ejemplo.com"))
    assert [(v["email"], v["empresa"]) for v in _vinculos(client, ordan)] == [("ordan@ejemplo.com", "ordan")]
    assert [v["email"] for v in _vinculos(client, ordan, estado="validado")] == ["doble@ejemplo.com"]

    grupo = auth(login(client, "grupo@ejemplo.com"))
    assert sorted(v["empresa"] for v in _vinculos(client, grupo)) == ["a7", "medinter", "ordan"]
    assert [v["email"] for v in _vinculos(client, grupo, empresa="a7")] == ["doble@ejemplo.com"]


def test_admin_empresa_no_aprueba_vinculo_de_otra_empresa(client, db, escenario):
    tokens = auth(login(client, "admin.ordan@ejemplo.com"))
    grupo = auth(login(client, "grupo@ejemplo.com"))
    otro = next(v for v in _vinculos(client, grupo) if v["empresa"] == "medinter")["vinculo_id"]
    r = client.post(f"{BASE}/vinculos/{otro}/aprobar", json={}, headers=tokens)
    assert r.status_code == 403
    # ...pero si el suyo
    mio = _vinculos(client, tokens)[0]["vinculo_id"]
    r = client.post(f"{BASE}/vinculos/{mio}/aprobar", json={}, headers=tokens)
    assert r.status_code == 200, r.text
    assert r.json()["estado"] == "validado" and r.json()["empresa"] == "ordan"
    assert correo.bandeja_memoria[-1]["para"] == "ordan@ejemplo.com"
    assert "Ordan" in correo.bandeja_memoria[-1]["asunto"]

    filas = db.scalars(select(BitacoraValidacion).where(BitacoraValidacion.objetivo_id == escenario["ordan"].id)).all()
    assert [f.accion for f in filas] == ["vinculo_validado"]
    assert filas[0].detalle["empresa"] == "ordan" and filas[0].detalle["vinculo_id"] == mio


def test_aprobar_un_vinculo_no_toca_los_demas(client, escenario):
    grupo = auth(login(client, "grupo@ejemplo.com"))
    a7 = next(v for v in _vinculos(client, grupo) if v["email"] == "doble@ejemplo.com" and v["empresa"] == "a7")
    r = client.post(f"{BASE}/vinculos/{a7['vinculo_id']}/rechazar", json={"motivo": "Sin RFC"}, headers=grupo)
    assert r.status_code == 200 and r.json()["estado"] == "rechazado"

    detalle = client.get(f"{BASE}/partners/{escenario['doble'].id}", headers=grupo).json()
    assert {v["empresa"]: v["estado"] for v in detalle["vinculos"]} == {"ordan": "validado", "a7": "rechazado"}
    # el partner sigue teniendo acceso por Ordan
    r = client.get("/api/v1/partners/me", headers=auth(login(client, "doble@ejemplo.com"))).json()
    assert r["estado"] == "validado"


def test_editor_no_aprueba_ni_ve_cuentas(client, escenario):
    editor = auth(login(client, "editor.gabame@ejemplo.com"))
    assert client.get(f"{BASE}/partners", headers=editor).status_code == 403
    assert client.get(f"{BASE}/usuarios", headers=editor).status_code == 403
    assert client.get(f"{BASE}/medicos", headers=editor).status_code == 403
    grupo = auth(login(client, "grupo@ejemplo.com"))
    vid = _vinculos(client, grupo)[0]["vinculo_id"]
    assert client.post(f"{BASE}/vinculos/{vid}/aprobar", json={}, headers=editor).status_code == 403


def test_aprobar_con_modulo_de_cuentas_apagado_es_403(client, db, escenario):
    espacios.actualizar(db, Empresa.ORDAN, {"modulos": ["contactos"]})
    tokens = auth(login(client, "admin.ordan@ejemplo.com"))
    vid = _vinculos(client, tokens)[0]["vinculo_id"]
    r = client.post(f"{BASE}/vinculos/{vid}/aprobar", json={}, headers=tokens)
    assert r.status_code == 403 and r.json()["detail"]["codigo"] == "modulo_no_habilitado"


# ---------- espacios ----------


def test_espacios_segun_alcance_y_quien_edita_que(client, escenario):
    grupo = auth(login(client, "grupo@ejemplo.com"))
    r = client.get(f"{BASE}/espacios", headers=grupo).json()
    assert sorted(e["empresa"] for e in r) == ["a7", "gabame", "medinter", "ordan"]
    assert all(e["administra"] and e["edita"] for e in r)
    assert "contenido_rx" in next(e for e in r if e["empresa"] == "gabame")["modulos"]

    editor = auth(login(client, "editor.gabame@ejemplo.com"))
    r = client.get(f"{BASE}/espacios", headers=editor).json()
    assert [(e["empresa"], e["administra"], e["edita"]) for e in r] == [("gabame", False, True)]

    # el editor captura contacto y portal
    r = client.patch(f"{BASE}/espacios/gabame", json={"contacto_nombre": "Laura", "portal_url": "https://portal.gabame.test"}, headers=editor)
    assert r.status_code == 200 and r.json()["contacto_nombre"] == "Laura"
    # ...pero no en otra empresa, no cambia modulos y no acepta http
    assert client.patch(f"{BASE}/espacios/ordan", json={"contacto_nombre": "X"}, headers=editor).status_code == 403
    assert client.patch(f"{BASE}/espacios/gabame", json={"modulos": ["cuentas"]}, headers=editor).status_code == 403
    assert client.patch(f"{BASE}/espacios/gabame", json={"portal_url": "http://inseguro"}, headers=editor).status_code == 422

    # admin_grupo si cambia modulos
    r = client.patch(f"{BASE}/espacios/medinter", json={"modulos": ["cuentas", "contactos"]}, headers=grupo)
    assert r.status_code == 200 and r.json()["modulos"] == ["cuentas", "contactos"]


# ---------- alcance de medicos ----------


def test_solo_grupo_y_gabame_validan_medicos(client, escenario):
    mid = escenario["medico"].id
    r = client.get(f"{BASE}/medicos", headers=auth(login(client, "admin.ordan@ejemplo.com")))
    assert r.status_code == 403

    r = client.get(f"{BASE}/medicos", headers=auth(login(client, "admin.gabame@ejemplo.com")))
    assert r.status_code == 200
    assert [m["email"] for m in r.json()] == ["med@ejemplo.com"]
    # el admin que valida si ve la cedula (no es respuesta publica)
    assert r.json()[0]["cedula_profesional"] == "12345678"

    r = client.post(f"{BASE}/medicos/{mid}/validar", json={}, headers=auth(login(client, "admin.ordan@ejemplo.com")))
    assert r.status_code == 403


def test_validar_medico_abre_el_acceso_rx_y_deja_bitacora(client, db, escenario):
    mid = escenario["medico"].id
    tokens_medico = login(client, "med@ejemplo.com")
    assert client.get("/api/v1/medicos/areas", headers=auth(tokens_medico)).status_code == 403

    admin = auth(login(client, "grupo@ejemplo.com"))
    r = client.post(f"{BASE}/medicos/{mid}/validar", json={}, headers=admin)
    assert r.status_code == 200, r.text
    assert r.json()["estado"] == "validado"
    assert r.json()["validado_en"] is not None

    # acceso Rx inmediato, sin token nuevo
    assert client.get("/api/v1/medicos/areas", headers=auth(tokens_medico)).status_code == 200

    filas = db.scalars(select(BitacoraValidacion).where(BitacoraValidacion.objetivo_id == mid)).all()
    assert len(filas) == 1
    assert filas[0].accion == "medico_validado"
    assert filas[0].detalle == {"de": "pendiente", "a": "validado", "motivo": None}
    assert filas[0].actor_id is not None
    assert "12345678" not in str(filas[0].detalle)
    assert correo.bandeja_memoria[-1]["para"] == "med@ejemplo.com"


def test_rechazo_exige_motivo_y_corta_el_acceso(client, escenario):
    mid = escenario["medico"].id
    admin = auth(login(client, "grupo@ejemplo.com"))
    client.post(f"{BASE}/medicos/{mid}/validar", json={}, headers=admin)
    tokens_medico = login(client, "med@ejemplo.com")
    assert client.get("/api/v1/medicos/areas", headers=auth(tokens_medico)).status_code == 200

    r = client.post(f"{BASE}/medicos/{mid}/rechazar", json={}, headers=admin)
    assert r.status_code == 422
    assert r.json()["detail"]["codigo"] == "motivo_requerido"

    r = client.post(f"{BASE}/medicos/{mid}/rechazar", json={"motivo": "Cedula no coincide"}, headers=admin)
    assert r.status_code == 200
    assert r.json()["motivo_rechazo"] == "Cedula no coincide"
    assert client.get("/api/v1/medicos/areas", headers=auth(tokens_medico)).status_code == 403
    assert "Cedula no coincide" in correo.bandeja_memoria[-1]["texto"]


def test_misma_transicion_dos_veces_es_409(client, escenario):
    mid = escenario["medico"].id
    admin = auth(login(client, "grupo@ejemplo.com"))
    assert client.post(f"{BASE}/medicos/{mid}/validar", json={}, headers=admin).status_code == 200
    r = client.post(f"{BASE}/medicos/{mid}/validar", json={}, headers=admin)
    assert r.status_code == 409
    assert r.json()["detail"]["codigo"] == "transicion_invalida"


def test_perfil_inexistente_es_404(client, escenario):
    admin = auth(login(client, "grupo@ejemplo.com"))
    r = client.post(f"{BASE}/medicos/00000000-0000-0000-0000-000000000000/validar", json={}, headers=admin)
    assert r.status_code == 404
    r = client.post(f"{BASE}/vinculos/00000000-0000-0000-0000-000000000000/aprobar", json={}, headers=admin)
    assert r.status_code == 404


# ---------- usuarios ----------


def test_listado_de_usuarios_respeta_alcance(client, escenario):
    grupo = client.get(f"{BASE}/usuarios", headers=auth(login(client, "grupo@ejemplo.com"))).json()
    assert grupo["total"] == 8

    ordan = client.get(f"{BASE}/usuarios", headers=auth(login(client, "admin.ordan@ejemplo.com"))).json()
    # sus partners y las cuentas administrativas de su empresa (incluida la suya)
    assert sorted(u["email"] for u in ordan["items"]) == ["admin.ordan@ejemplo.com", "doble@ejemplo.com", "ordan@ejemplo.com"]

    gabame = client.get(f"{BASE}/usuarios", headers=auth(login(client, "admin.gabame@ejemplo.com"))).json()
    assert sorted(u["email"] for u in gabame["items"]) == ["admin.gabame@ejemplo.com", "editor.gabame@ejemplo.com", "med@ejemplo.com"]


def test_busqueda_y_filtro_por_rol(client, escenario):
    admin = auth(login(client, "grupo@ejemplo.com"))
    r = client.get(f"{BASE}/usuarios", params={"rol": "partner"}, headers=admin).json()
    assert r["total"] == 3
    r = client.get(f"{BASE}/usuarios", params={"q": "MEDINTER"}, headers=admin).json()
    assert [u["email"] for u in r["items"]] == ["medinter@ejemplo.com"]
    assert r["items"][0]["vinculos"] == [{"empresa": "medinter", "tipo": "distribuidor", "estado": "pendiente"}]


# ---------- ecosistema ----------


def test_ecosistema_por_realm(client, db):
    crear_usuario(db, "p@ejemplo.com")
    r = client.get("/api/v1/ecosistema", headers=auth(login(client, "p@ejemplo.com")))
    assert r.status_code == 200
    productos = {p["producto"]: p for p in r.json()}
    assert "gabame" in productos and "tiendagabame" in productos
    assert "medinter" not in productos  # solo partners
    assert productos["aurashop"]["pendiente"] is True and productos["aurashop"]["url"] is None
