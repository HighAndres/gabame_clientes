"""Pruebas de permisos — requisito de Fase 7, se completan conforme llegan los endpoints.

Casos obligatorios antes de salir de local:
- cada rol solo ve lo suyo
- admin_empresa de una empresa no ve datos de otra
- usuario no validado no accede al contenido medico
- la BD no contiene ninguna columna de datos clinicos
"""

import pytest

from app.core.enums import Audiencia, Empresa, EstadoValidacion, Realm, Rol
from app.db.base import Base
from app.services import publicaciones
from tests.conftest import auth, crear_usuario, login

CONTENIDO = "/api/v1/medicos/areas"


# ---------- contenido medico: solo profesionales validados ----------


def test_medico_validado_accede_al_contenido_rx(client, db):
    crear_usuario(db, "m@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=EstadoValidacion.VALIDADO)
    r = client.get(CONTENIDO, headers=auth(login(client, "m@ejemplo.com")))
    assert r.status_code == 200


@pytest.mark.parametrize("estado", [EstadoValidacion.PENDIENTE, EstadoValidacion.RECHAZADO])
def test_medico_no_validado_no_ve_contenido_rx(client, db, estado):
    crear_usuario(db, "m@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=estado)
    r = client.get(CONTENIDO, headers=auth(login(client, "m@ejemplo.com")))
    assert r.status_code == 403
    assert r.json()["detail"]["codigo"] == "prohibido"


def test_rol_medico_sin_perfil_no_otorga_nada(client, db):
    crear_usuario(db, "m@ejemplo.com", roles=[(Rol.MEDICO, None)])
    assert client.get(CONTENIDO, headers=auth(login(client, "m@ejemplo.com"))).status_code == 403


@pytest.mark.parametrize(
    "roles",
    [[(Rol.PACIENTE, None)], [(Rol.PARTNER, None)], [(Rol.ADMIN_GRUPO, None)]],
)
def test_otros_roles_no_ven_contenido_rx(client, db, roles):
    """Ni siquiera admin_grupo: el contenido Rx es para profesionales acreditados."""
    crear_usuario(db, "x@ejemplo.com", roles=roles)
    assert client.get(CONTENIDO, headers=auth(login(client, "x@ejemplo.com"))).status_code == 403


def test_rechazo_posterior_corta_el_acceso_aunque_el_token_siga_vigente(client, db):
    u = crear_usuario(db, "m@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=EstadoValidacion.VALIDADO)
    tokens = login(client, "m@ejemplo.com")
    assert client.get(CONTENIDO, headers=auth(tokens)).status_code == 200

    u.perfil_medico.estado = EstadoValidacion.RECHAZADO
    db.commit()
    assert client.get(CONTENIDO, headers=auth(tokens)).status_code == 403


# ---------- alcance por empresa: sobre endpoints reales, no sobre dependencias sueltas ----------
#
# ADR-0010: cada regla se prueba donde se aplica. Una dependencia que no protege ningun endpoint
# no se conserva "por si acaso", porque abre una segunda forma de decidir lo mismo.


def _partner_de_ordan(db, email="partner@ejemplo.com", estado=EstadoValidacion.PENDIENTE):
    return crear_usuario(
        db, email, realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)], vinculos=[(Empresa.ORDAN, estado)]
    )


def test_admin_empresa_no_ve_datos_de_otra_empresa(client, db):
    """La regla vive en el alcance del router de admin, no en una dependencia por empresa."""
    _partner_de_ordan(db)
    crear_usuario(
        db, "medinter@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)],
        vinculos=[(Empresa.MEDINTER, EstadoValidacion.PENDIENTE)],
    )
    crear_usuario(db, "admin.ordan@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_EMPRESA, Empresa.ORDAN)])
    ordan = auth(login(client, "admin.ordan@ejemplo.com"))

    vinculos = client.get("/api/v1/admin/partners", headers=ordan).json()
    assert [v["empresa"] for v in vinculos] == ["ordan"]
    assert [u["email"] for u in client.get("/api/v1/admin/usuarios", headers=ordan).json()["items"]] == [
        "admin.ordan@ejemplo.com",
        "partner@ejemplo.com",
    ]


def test_solo_admin_grupo_ve_pacientes(client, db):
    """Sin dependencia propia: la aplica la consulta de usuarios visibles del router de admin."""
    crear_usuario(db, "paciente@ejemplo.com")
    crear_usuario(db, "admin.ordan@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_EMPRESA, Empresa.ORDAN)])
    crear_usuario(db, "grupo@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_GRUPO, None)])

    def emails(quien: str) -> list[str]:
        r = client.get("/api/v1/admin/usuarios", headers=auth(login(client, quien)))
        return [u["email"] for u in r.json()["items"]]

    assert "paciente@ejemplo.com" not in emails("admin.ordan@ejemplo.com")
    assert "paciente@ejemplo.com" in emails("grupo@ejemplo.com")


# ---------- partners: el area entra sin vinculo aprobado; el detalle no (ADR-0010) ----------


def test_partner_en_revision_entra_y_sube_documentos(client, db):
    """La aprobacion depende de estos documentos: cerrarle el area seria un candado sin llave."""
    _partner_de_ordan(db)
    headers = auth(login(client, "partner@ejemplo.com"))

    estado = client.get("/api/v1/partners/me", headers=headers)
    assert estado.status_code == 200
    assert estado.json()["estado"] == "pendiente"

    r = client.post(
        "/api/v1/partners/me/documentos",
        data={"tipo": "constancia_fiscal"},
        files={"archivo": ("csf.pdf", b"%PDF-1.4\n", "application/pdf")},
        headers=headers,
    )
    assert r.status_code == 201, r.text


def test_partner_en_revision_no_ve_contacto_ni_publicaciones_de_su_empresa(client, db):
    """El control real es por vinculo, no por cuenta: mismo partner, distinto estado."""
    publicaciones.crear(
        db, Empresa.ORDAN,
        {"audiencia": Audiencia.PARTNERS, "titulo": "Solo partners", "resumen": None, "contenido": "x",
         "orden": 0, "publicada": True},
    )
    _partner_de_ordan(db, "pendiente@ejemplo.com", EstadoValidacion.PENDIENTE)
    _partner_de_ordan(db, "aprobado@ejemplo.com", EstadoValidacion.VALIDADO)

    def espacio(quien: str) -> dict:
        return client.get("/api/v1/espacios/ordan/mio", headers=auth(login(client, quien))).json()

    pendiente = espacio("pendiente@ejemplo.com")
    assert pendiente["contacto"] is None
    assert pendiente["audiencias"] == ["pacientes"]
    assert pendiente["publicaciones"] == []

    aprobado = espacio("aprobado@ejemplo.com")
    assert aprobado["contacto"] is not None
    assert "partners" in aprobado["audiencias"]
    assert [p["titulo"] for p in aprobado["publicaciones"]] == ["Solo partners"]


# ---------- cero datos clinicos ----------

PALABRAS_CLINICAS = (
    "receta",
    "diagnos",
    "medicamento",
    "tratamiento",
    "dosis",
    "padecimiento",
    "sintoma",
    "alergia",
    "historial",
    "farmacovigilancia",
    "reaccion_adversa",
)


def test_la_bd_no_contiene_columnas_de_datos_clinicos():
    sospechosas = [
        f"{tabla.name}.{col.name}"
        for tabla in Base.metadata.sorted_tables
        for col in tabla.columns
        if any(p in col.name.lower() for p in PALABRAS_CLINICAS)
    ]
    assert sospechosas == [], f"Columnas con pinta clinica: {sospechosas}"


def test_ninguna_tabla_guarda_rastreo_de_dispositivo():
    prohibidas = ("ip", "user_agent", "useragent", "huella", "fingerprint", "device")
    sospechosas = [
        f"{tabla.name}.{col.name}"
        for tabla in Base.metadata.sorted_tables
        for col in tabla.columns
        if col.name.lower() in prohibidas or any(p in col.name.lower() for p in prohibidas[1:])
    ]
    assert sospechosas == [], f"Columnas de rastreo: {sospechosas}"
