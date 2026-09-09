"""Contenido Rx (Fase 4): solo publicado, solo para medicos validados; el admin de contenido edita."""

import pytest

from app.core.enums import Empresa, EstadoValidacion, Realm, Rol
from app.db.base import Base
from tests.conftest import auth, crear_usuario, login

ADMIN = "/api/v1/admin/contenido"
MED = "/api/v1/medicos"


@pytest.fixture
def actores(client, db):
    crear_usuario(db, "med@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=EstadoValidacion.VALIDADO)
    crear_usuario(db, "pend@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=EstadoValidacion.PENDIENTE)
    crear_usuario(db, "gabame@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_EMPRESA, Empresa.GABAME)])
    crear_usuario(db, "ordan@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_EMPRESA, Empresa.ORDAN)])
    crear_usuario(db, "editor@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.EDITOR_EMPRESA, Empresa.GABAME)])
    return {
        "medico": auth(login(client, "med@ejemplo.com")),
        "pendiente": auth(login(client, "pend@ejemplo.com")),
        "admin": auth(login(client, "gabame@ejemplo.com")),
        "ordan": auth(login(client, "ordan@ejemplo.com")),
        "editor": auth(login(client, "editor@ejemplo.com")),
    }


def _area(client, admin, nombre="Cardiologia", publicada=True) -> dict:
    r = client.post(f"{ADMIN}/areas", json={"nombre": nombre, "publicada": publicada, "orden": 1}, headers=admin)
    assert r.status_code == 201, r.text
    return r.json()


def _ficha(client, admin, area_id, nombre="Producto X", publicada=True) -> dict:
    r = client.post(
        f"{ADMIN}/fichas",
        json={"area_id": area_id, "nombre": nombre, "resumen": "Resumen", "contenido": "# Ficha\n\nTexto.", "publicada": publicada},
        headers=admin,
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_solo_admin_con_alcance_de_medicos_edita_contenido(client, actores):
    r = client.post(f"{ADMIN}/areas", json={"nombre": "X"}, headers=actores["ordan"])
    assert r.status_code == 403
    r = client.post(f"{ADMIN}/areas", json={"nombre": "X"}, headers=actores["medico"])
    assert r.status_code == 403
    assert client.get(f"{ADMIN}/areas", headers=actores["admin"]).status_code == 200
    # el editor de GABAME edita contenido aunque no administre cuentas
    assert client.get(f"{ADMIN}/areas", headers=actores["editor"]).status_code == 200
    assert _area(client, actores["editor"], "Por editor")["nombre"] == "Por editor"


def test_contenido_rx_exige_el_modulo_en_el_espacio_de_gabame(client, db, actores):
    from app.services import espacios

    espacios.actualizar(db, Empresa.GABAME, {"modulos": ["cuentas", "documentos", "contactos"]})
    r = client.get(f"{ADMIN}/areas", headers=actores["admin"])
    assert r.status_code == 403 and r.json()["detail"]["codigo"] == "modulo_no_habilitado"


def test_medico_validado_solo_ve_lo_publicado(client, actores):
    admin = actores["admin"]
    area = _area(client, admin)
    _ficha(client, admin, area["id"], "Publicada")
    _ficha(client, admin, area["id"], "Borrador", publicada=False)
    _area(client, admin, "Area oculta", publicada=False)

    r = client.get(f"{MED}/areas", headers=actores["medico"])
    assert r.status_code == 200
    assert [a["slug"] for a in r.json()] == ["cardiologia"]
    assert [f["slug"] for f in r.json()[0]["fichas"]] == ["publicada"]

    # el admin ve todo
    r = client.get(f"{ADMIN}/areas", headers=admin)
    assert sorted(a["slug"] for a in r.json()) == ["area-oculta", "cardiologia"]
    assert len(next(a for a in r.json() if a["slug"] == "cardiologia")["fichas"]) == 2


def test_ficha_publicada_se_lee_y_borrador_es_404(client, actores):
    admin = actores["admin"]
    area = _area(client, admin)
    _ficha(client, admin, area["id"], "Publicada")
    _ficha(client, admin, area["id"], "Borrador", publicada=False)

    r = client.get(f"{MED}/areas/cardiologia/fichas/publicada", headers=actores["medico"])
    assert r.status_code == 200
    assert r.json()["contenido"].startswith("# Ficha")
    assert r.json()["area_nombre"] == "Cardiologia"

    r = client.get(f"{MED}/areas/cardiologia/fichas/borrador", headers=actores["medico"])
    assert r.status_code == 404


def test_medico_pendiente_no_ve_nada_aunque_este_publicado(client, actores):
    area = _area(client, actores["admin"])
    _ficha(client, actores["admin"], area["id"])
    for ruta in ["/areas", "/areas/cardiologia", "/areas/cardiologia/fichas/producto-x"]:
        assert client.get(f"{MED}{ruta}", headers=actores["pendiente"]).status_code == 403
    assert client.get(f"{MED}/areas", headers=actores["admin"]).status_code == 403  # tampoco el admin


def test_despublicar_area_oculta_sus_fichas(client, actores):
    admin = actores["admin"]
    area = _area(client, admin)
    _ficha(client, admin, area["id"])
    assert client.get(f"{MED}/areas/cardiologia/fichas/producto-x", headers=actores["medico"]).status_code == 200
    r = client.patch(f"{ADMIN}/areas/{area['id']}", json={"publicada": False}, headers=admin)
    assert r.status_code == 200 and r.json()["publicada"] is False
    assert client.get(f"{MED}/areas/cardiologia/fichas/producto-x", headers=actores["medico"]).status_code == 404
    assert client.get(f"{MED}/areas", headers=actores["medico"]).json() == []


def test_slugs_unicos_y_sin_acentos(client, actores):
    admin = actores["admin"]
    a1 = _area(client, admin, "Neurología")
    a2 = _area(client, admin, "Neurologia")
    assert a1["slug"] == "neurologia" and a2["slug"] == "neurologia-2"
    f1 = _ficha(client, admin, a1["id"], "Ácido X")
    f2 = _ficha(client, admin, a1["id"], "Acido X")
    assert f1["slug"] == "acido-x" and f2["slug"] == "acido-x-2"


def test_editar_ficha_y_ficha_inexistente(client, actores):
    admin = actores["admin"]
    area = _area(client, admin)
    f = _ficha(client, admin, area["id"])
    r = client.patch(f"{ADMIN}/fichas/{f['id']}", json={"contenido": "nuevo", "resumen": "  r  "}, headers=admin)
    assert r.status_code == 200 and r.json()["contenido"] == "nuevo"
    r = client.patch(f"{ADMIN}/fichas/00000000-0000-0000-0000-000000000000", json={"contenido": "x"}, headers=admin)
    assert r.status_code == 404
    r = client.post(f"{ADMIN}/fichas", json={"area_id": "00000000-0000-0000-0000-000000000000", "nombre": "Producto Y"}, headers=admin)
    assert r.status_code == 404


def test_las_tablas_de_contenido_no_tienen_campos_de_paciente():
    columnas = {
        c.name for t in Base.metadata.sorted_tables if t.name in ("areas_terapeuticas", "fichas_tecnicas") for c in t.columns
    }
    assert "usuario_id" not in columnas and "paciente_id" not in columnas
