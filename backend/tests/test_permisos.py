"""Pruebas de permisos — requisito de Fase 7, se completan conforme llegan los endpoints.

Casos obligatorios antes de salir de local:
- cada rol solo ve lo suyo
- admin_empresa de una empresa no ve datos de otra
- usuario no validado no accede al contenido medico
- la BD no contiene ninguna columna de datos clinicos
"""

import pytest
from fastapi import HTTPException

from app.api.deps import require_empresa, require_role
from app.core.enums import Empresa, EstadoValidacion, Realm, Rol
from app.db.base import Base
from app.models import Usuario, UsuarioRol
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


# ---------- alcance por empresa (dependencias, sin endpoint todavia) ----------


def _usuario_con(roles: list[tuple[Rol, Empresa | None]]) -> Usuario:
    u = Usuario(email="x@ejemplo.com", password_hash="-", nombre="X", apellidos="Y", realm=Realm.PARTNERS)
    u.roles = [UsuarioRol(rol=rol, empresa=empresa) for rol, empresa in roles]
    return u


def test_admin_empresa_no_ve_otra_empresa():
    admin_ordan = _usuario_con([(Rol.ADMIN_EMPRESA, Empresa.ORDAN)])
    assert require_empresa(Empresa.ORDAN)(admin_ordan) is admin_ordan
    with pytest.raises(HTTPException) as exc:
        require_empresa(Empresa.MEDINTER)(admin_ordan)
    assert exc.value.status_code == 403


def test_admin_grupo_ve_todas_las_empresas():
    grupo = _usuario_con([(Rol.ADMIN_GRUPO, None)])
    for empresa in Empresa:
        assert require_empresa(empresa)(grupo) is grupo


def test_require_role_rechaza_rol_ausente():
    paciente = _usuario_con([(Rol.PACIENTE, None)])
    assert require_role(Rol.PACIENTE, Rol.MEDICO)(paciente) is paciente
    with pytest.raises(HTTPException):
        require_role(Rol.ADMIN_EMPRESA)(paciente)


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
