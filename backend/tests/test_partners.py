"""Area Partners (Fase 5): documentos por subtipo, revision con alcance por empresa, contactos."""

from pathlib import Path

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.enums import Empresa, EstadoValidacion, Realm, Rol
from app.models import BitacoraValidacion
from tests.conftest import auth, crear_usuario, login

ME = "/api/v1/partners/me"
ADMIN = "/api/v1/admin/partners"
PDF = b"%PDF-1.4\n%fake\n"


@pytest.fixture
def actores(client, db):
    pend = crear_usuario(db, "pend@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)], estado_partner=EstadoValidacion.PENDIENTE)
    ok = crear_usuario(db, "ok@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)], estado_partner=EstadoValidacion.VALIDADO)
    crear_usuario(db, "paciente@ejemplo.com")
    crear_usuario(db, "admin.ordan@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_EMPRESA, Empresa.ORDAN)])
    crear_usuario(db, "admin.a7@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_EMPRESA, Empresa.A7)])
    return {
        "pend_id": pend.id,
        "ok_id": ok.id,
        "pend": auth(login(client, "pend@ejemplo.com")),
        "ok": auth(login(client, "ok@ejemplo.com")),
        "paciente": auth(login(client, "paciente@ejemplo.com")),
        "ordan": auth(login(client, "admin.ordan@ejemplo.com")),
        "a7": auth(login(client, "admin.a7@ejemplo.com")),
    }


def _subir(client, headers, tipo="constancia_fiscal", nombre="csf.pdf", content_type="application/pdf", contenido=PDF):
    return client.post(ME + "/documentos", data={"tipo": tipo}, files={"archivo": (nombre, contenido, content_type)}, headers=headers)


# ---------- acceso ----------


def test_solo_partners_entran(client, actores):
    assert client.get(ME, headers=actores["paciente"]).status_code == 403
    assert client.get(ME, headers=actores["pend"]).status_code == 200


def test_estado_pendiente_trae_requisitos_pero_no_contactos(client, actores):
    r = client.get(ME, headers=actores["pend"]).json()
    assert r["estado"] == "pendiente"
    assert [q["tipo"] for q in r["requisitos"]] == [
        "constancia_fiscal", "identificacion_representante", "comprobante_domicilio", "otro",
    ]
    assert r["contactos"] == []
    assert r["limite_mb"] == settings.UPLOAD_MAX_MB


def test_estado_aprobado_trae_contactos_placeholder(client, actores):
    r = client.get(ME, headers=actores["ok"]).json()
    assert [c["empresa"] for c in r["contactos"]] == ["gabame", "medinter", "ordan", "a7"]
    assert all(c["pendiente"] for c in r["contactos"])  # el cliente aun no entrega contactos


# ---------- carga ----------


def test_subir_documento_valido(client, actores):
    r = _subir(client, actores["pend"], nombre="mi constancia (2026).pdf")
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["tipo"] == "constancia_fiscal" and d["estado"] == "pendiente"
    assert d["nombre_archivo"] == "mi_constancia_2026.pdf"
    assert d["tamano_bytes"] == len(PDF)
    # el archivo vive en UPLOADS_DIR con nombre aleatorio, no con el original
    archivos = list(Path(settings.UPLOADS_DIR).rglob("*.pdf"))
    assert len(archivos) == 1 and archivos[0].name != "mi_constancia_2026.pdf"

    estado = client.get(ME, headers=actores["pend"]).json()
    csf = next(q for q in estado["requisitos"] if q["tipo"] == "constancia_fiscal")
    assert [x["id"] for x in csf["documentos"]] == [d["id"]]


@pytest.mark.parametrize(
    "caso",
    [
        {"tipo": "acta_inexistente"},
        {"nombre": "virus.exe", "content_type": "application/x-msdownload"},
        {"contenido": b""},
        {"contenido": b"x" * (settings.UPLOAD_MAX_MB * 1024 * 1024 + 1)},
    ],
)
def test_archivos_invalidos_se_rechazan(client, actores, caso):
    r = _subir(client, actores["pend"], **caso)
    assert r.status_code == 422, r.text
    assert r.json()["detail"]["codigo"] == "archivo_invalido"
    assert list(Path(settings.UPLOADS_DIR).rglob("*.*")) == []


def test_descarga_solo_del_propio_partner(client, actores):
    d = _subir(client, actores["pend"]).json()
    r = client.get(f"{ME}/documentos/{d['id']}/archivo", headers=actores["pend"])
    assert r.status_code == 200 and r.content == PDF
    assert r.headers["content-type"].startswith("application/pdf")
    assert client.get(f"{ME}/documentos/{d['id']}/archivo", headers=actores["ok"]).status_code == 404


def test_eliminar_solo_si_sigue_pendiente(client, actores):
    d = _subir(client, actores["pend"]).json()
    assert client.delete(f"{ME}/documentos/{d['id']}", headers=actores["pend"]).status_code == 204
    assert list(Path(settings.UPLOADS_DIR).rglob("*.pdf")) == []

    d = _subir(client, actores["pend"]).json()
    r = client.post(f"{ADMIN}/{actores['pend_id']}/documentos/{d['id']}/validar", json={}, headers=actores["ordan"])
    assert r.status_code == 200
    r = client.delete(f"{ME}/documentos/{d['id']}", headers=actores["pend"])
    assert r.status_code == 409
    assert r.json()["detail"]["codigo"] == "documento_bloqueado"


# ---------- revision del admin ----------


def test_admin_revisa_dentro_de_su_alcance_y_deja_bitacora(client, db, actores):
    d = _subir(client, actores["pend"]).json()
    pid = actores["pend_id"]

    # A7 no tiene alcance sobre un partner de Ordan
    assert client.get(f"{ADMIN}/{pid}/documentos", headers=actores["a7"]).status_code == 403
    assert client.post(f"{ADMIN}/{pid}/documentos/{d['id']}/validar", json={}, headers=actores["a7"]).status_code == 403

    r = client.get(f"{ADMIN}/{pid}/documentos", headers=actores["ordan"])
    assert [x["id"] for x in r.json()] == [d["id"]]
    r = client.get(f"{ADMIN}/{pid}/documentos/{d['id']}/archivo", headers=actores["ordan"])
    assert r.status_code == 200 and r.content == PDF

    r = client.post(f"{ADMIN}/{pid}/documentos/{d['id']}/rechazar", json={}, headers=actores["ordan"])
    assert r.status_code == 422 and r.json()["detail"]["codigo"] == "motivo_requerido"
    r = client.post(f"{ADMIN}/{pid}/documentos/{d['id']}/rechazar", json={"motivo": "Ilegible"}, headers=actores["ordan"])
    assert r.status_code == 200 and r.json()["estado"] == "rechazado" and r.json()["motivo_rechazo"] == "Ilegible"

    filas = db.scalars(select(BitacoraValidacion).where(BitacoraValidacion.objetivo_id == pid)).all()
    assert [f.accion for f in filas] == ["documento_rechazado"]
    assert filas[0].detalle["documento_id"] == d["id"] and filas[0].detalle["tipo"] == "constancia_fiscal"

    # el partner ve el motivo en su estado
    estado = client.get(ME, headers=actores["pend"]).json()
    doc = estado["requisitos"][0]["documentos"][0]
    assert doc["estado"] == "rechazado" and doc["motivo_rechazo"] == "Ilegible"

    # misma transicion dos veces
    r = client.post(f"{ADMIN}/{pid}/documentos/{d['id']}/rechazar", json={"motivo": "x"}, headers=actores["ordan"])
    assert r.status_code == 409


def test_conteo_de_documentos_en_cola_de_partners(client, actores):
    _subir(client, actores["pend"])
    _subir(client, actores["pend"], tipo="otro", nombre="extra.png", content_type="image/png", contenido=b"\x89PNG\r\n")
    r = client.get(ADMIN, headers=actores["ordan"]).json()
    assert next(p for p in r if p["email"] == "pend@ejemplo.com")["documentos"] == 2


def test_las_tablas_de_documentos_no_guardan_contenido_clinico():
    from app.models import DocumentoPartner

    columnas = {c.name for c in DocumentoPartner.__table__.columns}
    assert columnas == {
        "id", "partner_id", "tipo", "nombre_archivo", "ruta", "content_type", "tamano_bytes",
        "estado", "motivo_rechazo", "revisado_por_id", "revisado_en", "subido_en",
    }


def test_detalle_de_partner_respeta_alcance(client, actores):
    pid = actores["pend_id"]
    assert client.get(f"{ADMIN}/{pid}", headers=actores["a7"]).status_code == 403
    r = client.get(f"{ADMIN}/{pid}", headers=actores["ordan"])
    assert r.status_code == 200 and r.json()["email"] == "pend@ejemplo.com"
