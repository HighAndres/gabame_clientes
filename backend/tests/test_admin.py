"""Admin: colas de validacion, alcance por empresa (ADR-0004) y bitacora."""

import pytest
from sqlalchemy import select

from app.core.enums import Empresa, EstadoValidacion, Realm, Rol
from app.models import BitacoraValidacion
from app.services import correo
from tests.conftest import auth, crear_usuario, login

BASE = "/api/v1/admin"


def _admin(db, email: str, empresa: Empresa | None) -> dict:
    rol = (Rol.ADMIN_GRUPO, None) if empresa is None else (Rol.ADMIN_EMPRESA, empresa)
    crear_usuario(db, email, realm=Realm.PARTNERS, roles=[rol])
    return {"email": email}


@pytest.fixture
def escenario(db):
    """Un medico pendiente, un partner de Ordan pendiente, un partner de Medinter pendiente."""
    medico = crear_usuario(db, "med@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=EstadoValidacion.PENDIENTE)
    ordan = crear_usuario(db, "ordan@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)], estado_partner=EstadoValidacion.PENDIENTE)
    medinter = crear_usuario(db, "medinter@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)], estado_partner=EstadoValidacion.PENDIENTE)
    medinter.perfil_partner.empresa_objetivo = Empresa.MEDINTER
    db.commit()
    _admin(db, "grupo@ejemplo.com", None)
    _admin(db, "admin.ordan@ejemplo.com", Empresa.ORDAN)
    _admin(db, "admin.gabame@ejemplo.com", Empresa.GABAME)
    return {"medico": medico, "ordan": ordan, "medinter": medinter}


# ---------- acceso ----------


def test_no_admin_no_entra(client, db):
    crear_usuario(db, "p@ejemplo.com")
    assert client.get(f"{BASE}/resumen", headers=auth(login(client, "p@ejemplo.com"))).status_code == 403


def test_resumen_segun_alcance(client, escenario):
    grupo = client.get(f"{BASE}/resumen", headers=auth(login(client, "grupo@ejemplo.com"))).json()
    assert grupo == {
        "medicos_pendientes": 1, "partners_pendientes": 2, "usuarios_total": 6,
        "alcance_grupo": True, "empresas": [],
    }
    ordan = client.get(f"{BASE}/resumen", headers=auth(login(client, "admin.ordan@ejemplo.com"))).json()
    assert ordan["medicos_pendientes"] is None  # fuera de alcance
    assert ordan["partners_pendientes"] == 1
    assert ordan["usuarios_total"] is None
    assert ordan["empresas"] == ["ordan"]


# ---------- alcance de partners ----------


def test_admin_empresa_solo_ve_partners_de_su_empresa(client, escenario):
    r = client.get(f"{BASE}/partners", headers=auth(login(client, "admin.ordan@ejemplo.com")))
    assert [p["empresa_objetivo"] for p in r.json()] == ["ordan"]

    r = client.get(f"{BASE}/partners", headers=auth(login(client, "grupo@ejemplo.com")))
    assert sorted(p["empresa_objetivo"] for p in r.json()) == ["medinter", "ordan"]


def test_admin_empresa_no_aprueba_partner_de_otra_empresa(client, escenario):
    tokens = login(client, "admin.ordan@ejemplo.com")
    otro = escenario["medinter"].id
    r = client.post(f"{BASE}/partners/{otro}/aprobar", json={}, headers=auth(tokens))
    assert r.status_code == 403
    # ...pero si el suyo
    mio = escenario["ordan"].id
    r = client.post(f"{BASE}/partners/{mio}/aprobar", json={}, headers=auth(tokens))
    assert r.status_code == 200, r.text
    assert r.json()["estado"] == "validado"
    assert correo.bandeja_memoria[-1]["para"] == "ordan@ejemplo.com"
    assert "aprobada" in correo.bandeja_memoria[-1]["asunto"]


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


# ---------- usuarios ----------


def test_listado_de_usuarios_respeta_alcance(client, escenario):
    grupo = client.get(f"{BASE}/usuarios", headers=auth(login(client, "grupo@ejemplo.com"))).json()
    assert grupo["total"] == 6

    ordan = client.get(f"{BASE}/usuarios", headers=auth(login(client, "admin.ordan@ejemplo.com"))).json()
    assert [u["email"] for u in ordan["items"]] == ["ordan@ejemplo.com"]

    gabame = client.get(f"{BASE}/usuarios", headers=auth(login(client, "admin.gabame@ejemplo.com"))).json()
    assert [u["email"] for u in gabame["items"]] == ["med@ejemplo.com"]


def test_busqueda_y_filtro_por_rol(client, escenario):
    admin = auth(login(client, "grupo@ejemplo.com"))
    r = client.get(f"{BASE}/usuarios", params={"rol": "partner"}, headers=admin).json()
    assert r["total"] == 2
    r = client.get(f"{BASE}/usuarios", params={"q": "MEDINTER"}, headers=admin).json()
    assert [u["email"] for u in r["items"]] == ["medinter@ejemplo.com"]


# ---------- ecosistema ----------


def test_ecosistema_por_realm(client, db):
    crear_usuario(db, "p@ejemplo.com")
    r = client.get("/api/v1/ecosistema", headers=auth(login(client, "p@ejemplo.com")))
    assert r.status_code == 200
    productos = {p["producto"]: p for p in r.json()}
    assert "gabame" in productos and "tiendagabame" in productos
    assert "medinter" not in productos  # solo partners
    assert productos["aurashop"]["pendiente"] is True and productos["aurashop"]["url"] is None
