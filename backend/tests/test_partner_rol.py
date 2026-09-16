"""Rol partner (ADR-0014): volver a solicitar tras un rechazo y corregir razon social y RFC."""

import pytest
from sqlalchemy import select

from app.core.enums import Empresa, EstadoValidacion, Realm, Rol
from app.models import BitacoraValidacion, VinculoEmpresa
from tests.conftest import auth, crear_usuario, login

ME = "/api/v1/partners/me"


def _partner(db, email="p@ejemplo.com", vinculos=None):
    return crear_usuario(
        db, email, realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)],
        vinculos=vinculos or [(Empresa.ORDAN, EstadoValidacion.RECHAZADO)],
    )


def _vinculo(db, usuario, empresa=Empresa.ORDAN) -> VinculoEmpresa:
    return db.scalar(select(VinculoEmpresa).where(VinculoEmpresa.usuario_id == usuario.id, VinculoEmpresa.empresa == empresa))


# ---------- A: volver a solicitar ----------


def test_rechazado_vuelve_a_la_cola_de_esa_empresa(client, db):
    u = _partner(db)
    v = _vinculo(db, u)
    v.motivo_rechazo = "Falta la constancia fiscal"
    db.commit()
    headers = auth(login(client, "p@ejemplo.com"))

    r = client.post(f"{ME}/vinculos/{v.id}/reenviar", json={"tipo": "mayorista"}, headers=headers)
    assert r.status_code == 200, r.text
    ordan = next(x for x in r.json()["vinculos"] if x["empresa"] == "ordan")
    assert ordan["estado"] == "pendiente" and ordan["motivo_rechazo"] is None and ordan["tipo"] == "mayorista"

    # El admin de Ordan lo vuelve a ver pendiente.
    crear_usuario(db, "admin.ordan@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_EMPRESA, Empresa.ORDAN)])
    cola = client.get("/api/v1/admin/partners", headers=auth(login(client, "admin.ordan@ejemplo.com"))).json()
    assert [x["email"] for x in cola] == ["p@ejemplo.com"]

    fila = db.scalar(select(BitacoraValidacion).where(BitacoraValidacion.accion == "vinculo_reenviado"))
    assert fila.detalle["empresa"] == "ordan" and fila.detalle["motivo_anterior"] == "Falta la constancia fiscal"


def test_sin_tipo_se_conserva_el_que_tenia(client, db):
    u = _partner(db)
    v = _vinculo(db, u)
    r = client.post(f"{ME}/vinculos/{v.id}/reenviar", json={}, headers=auth(login(client, "p@ejemplo.com")))
    assert r.status_code == 200 and r.json()["vinculos"][0]["tipo"] == "distribuidor"


@pytest.mark.parametrize("estado", [EstadoValidacion.PENDIENTE, EstadoValidacion.VALIDADO])
def test_solo_se_reenvia_lo_rechazado(client, db, estado):
    u = _partner(db, vinculos=[(Empresa.ORDAN, estado)])
    r = client.post(f"{ME}/vinculos/{_vinculo(db, u).id}/reenviar", json={}, headers=auth(login(client, "p@ejemplo.com")))
    assert r.status_code == 409 and r.json()["detail"]["codigo"] == "vinculo_no_rechazado"


def test_no_se_reenvia_el_vinculo_de_otro(client, db):
    ajeno = _partner(db, "otro@ejemplo.com")
    _partner(db)
    r = client.post(
        f"{ME}/vinculos/{_vinculo(db, ajeno).id}/reenviar", json={}, headers=auth(login(client, "p@ejemplo.com"))
    )
    assert r.status_code == 404
    assert _vinculo(db, ajeno).estado == EstadoValidacion.RECHAZADO


# ---------- B: razon social y RFC ----------


def test_corrige_sus_datos_mientras_nadie_los_aprobo(client, db):
    u = _partner(db, vinculos=[(Empresa.ORDAN, EstadoValidacion.PENDIENTE)])
    headers = auth(login(client, "p@ejemplo.com"))
    assert client.get(ME, headers=headers).json()["puede_editar_datos"] is True

    r = client.patch(ME, json={"razon_social": "  Distribuidora Norte SA de CV ", "rfc": "dno010101ab1"}, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["razon_social"] == "Distribuidora Norte SA de CV"
    assert r.json()["rfc"] == "DNO010101AB1"

    r = client.patch(ME, json={"rfc": ""}, headers=headers)  # el RFC es opcional: vacio lo borra
    assert r.status_code == 200 and r.json()["rfc"] is None

    filas = db.scalars(select(BitacoraValidacion).where(BitacoraValidacion.objetivo_id == u.id)).all()
    assert [f.detalle["campos"] for f in filas] == [["razon_social", "rfc"], ["rfc"]]
    assert "DNO010101AB1" not in str([f.detalle for f in filas])


def test_con_un_vinculo_aprobado_los_datos_quedan_fijos(client, db):
    _partner(db, vinculos=[(Empresa.ORDAN, EstadoValidacion.VALIDADO), (Empresa.A7, EstadoValidacion.PENDIENTE)])
    headers = auth(login(client, "p@ejemplo.com"))
    assert client.get(ME, headers=headers).json()["puede_editar_datos"] is False

    r = client.patch(ME, json={"razon_social": "Otra SA"}, headers=headers)
    assert r.status_code == 409 and r.json()["detail"]["codigo"] == "datos_partner_bloqueados"
    # Mandar lo mismo que ya tiene no es un cambio y no falla.
    assert client.patch(ME, json={"razon_social": "Prueba SA"}, headers=headers).status_code == 200


def test_razon_social_nula_o_corta_no_se_acepta(client, db):
    _partner(db, vinculos=[(Empresa.ORDAN, EstadoValidacion.PENDIENTE)])
    headers = auth(login(client, "p@ejemplo.com"))
    assert client.patch(ME, json={"razon_social": "X"}, headers=headers).status_code == 422
    r = client.patch(ME, json={"razon_social": None}, headers=headers)
    assert r.status_code == 200 and r.json()["razon_social"] == "Prueba SA"
    assert client.patch(ME, json={"rfc": "CORTO"}, headers=headers).status_code == 422
