"""La acreditacion vista por el propio medico: consultarla, corregirla y reenviarla tras un rechazo."""

import pytest
from sqlalchemy import select

from app.core.enums import EstadoValidacion, Realm, Rol
from app.models import BitacoraValidacion
from app.services.acreditacion import enmascarar
from tests.conftest import auth, crear_usuario, login

ACR = "/api/v1/medicos/me/acreditacion"


def _medico(db, email="med@ejemplo.com", estado=EstadoValidacion.PENDIENTE):
    return crear_usuario(db, email, roles=[(Rol.MEDICO, None)], estado_medico=estado)


# ---------- la cedula nunca sale completa ----------


@pytest.mark.parametrize(
    ("cedula", "esperado"),
    [
        ("12345678", "••••5678"),   # 8 digitos: los ultimos 4
        ("1234567", "••••567"),     # 7: nunca mas de la mitad, asi que 3
        ("123456", "•••456"),
        ("12345", "•••••"),         # por debajo de 6 no se revela nada
        ("1234", "••••"),
        ("12", "••"),
        ("", ""),
    ],
)
def test_enmascarar_nunca_revela_mas_de_la_mitad(cedula, esperado):
    assert enmascarar(cedula) == esperado
    if cedula:
        # La regla que importa: jamas sale entera.
        assert enmascarar(cedula) != cedula


def test_el_medico_ve_su_acreditacion_sin_la_cedula_en_claro(client, db):
    _medico(db, estado=EstadoValidacion.VALIDADO)
    r = client.get(ACR, headers=auth(login(client, "med@ejemplo.com")))
    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert cuerpo["cedula_enmascarada"] == "••••5678"  # conftest usa 12345678
    assert "12345678" not in r.text
    assert cuerpo["estado"] == "validado"
    assert cuerpo["solicitada_en"] is not None
    assert cuerpo["puede_editar_cedula"] is False and cuerpo["puede_reenviar"] is False


def test_quien_no_es_medico_no_entra(client, db):
    crear_usuario(db, "paciente@ejemplo.com")
    crear_usuario(db, "grupo@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_GRUPO, None)])
    for quien in ("paciente@ejemplo.com", "grupo@ejemplo.com"):
        assert client.get(ACR, headers=auth(login(client, quien))).status_code == 403


# ---------- corregir ----------


def test_en_revision_puede_corregir_su_cedula(client, db):
    _medico(db, estado=EstadoValidacion.PENDIENTE)
    headers = auth(login(client, "med@ejemplo.com"))
    assert client.get(ACR, headers=headers).json()["puede_editar_cedula"] is True

    r = client.patch(ACR, json={"cedula_profesional": "87654321", "especialidad": "Cardiología"}, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["cedula_enmascarada"] == "••••4321"
    assert r.json()["especialidad"] == "Cardiología"
    assert r.json()["estado"] == "pendiente"  # corregir no aprueba nada


def test_validado_ya_no_cambia_su_cedula_pero_si_su_especialidad(client, db):
    _medico(db, estado=EstadoValidacion.VALIDADO)
    headers = auth(login(client, "med@ejemplo.com"))

    r = client.patch(ACR, json={"cedula_profesional": "99999999"}, headers=headers)
    assert r.status_code == 409 and r.json()["detail"]["codigo"] == "cedula_bloqueada"

    r = client.patch(ACR, json={"especialidad": "Medicina interna"}, headers=headers)
    assert r.status_code == 200 and r.json()["especialidad"] == "Medicina interna"
    assert r.json()["cedula_enmascarada"] == "••••5678"  # intacta


def test_la_bitacora_registra_que_campos_cambiaron_y_nunca_la_cedula(client, db):
    u = _medico(db, estado=EstadoValidacion.PENDIENTE)
    headers = auth(login(client, "med@ejemplo.com"))
    client.patch(ACR, json={"cedula_profesional": "87654321", "institucion": "Hospital General"}, headers=headers)

    filas = db.scalars(select(BitacoraValidacion).where(BitacoraValidacion.objetivo_id == u.id)).all()
    assert [f.accion for f in filas] == ["acreditacion_actualizada"]
    assert filas[0].detalle["campos"] == ["cedula_profesional", "institucion"]
    assert "87654321" not in str(filas[0].detalle)


# ---------- reenviar tras un rechazo ----------


def test_el_rechazado_corrige_y_vuelve_a_la_cola(client, db):
    u = _medico(db, estado=EstadoValidacion.RECHAZADO)
    u.perfil_medico.motivo_rechazo = "La cedula no coincide con el registro"
    db.commit()
    headers = auth(login(client, "med@ejemplo.com"))

    antes = client.get(ACR, headers=headers).json()
    assert antes["motivo_rechazo"] == "La cedula no coincide con el registro"
    assert antes["puede_reenviar"] is True and antes["puede_editar_cedula"] is True

    client.patch(ACR, json={"cedula_profesional": "87654321"}, headers=headers)
    r = client.post(f"{ACR}/reenviar", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["estado"] == "pendiente"
    assert r.json()["motivo_rechazo"] is None
    assert r.json()["puede_reenviar"] is False

    # y el admin lo vuelve a ver en su cola
    crear_usuario(db, "grupo@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_GRUPO, None)])
    cola = client.get("/api/v1/admin/medicos", headers=auth(login(client, "grupo@ejemplo.com"))).json()
    assert [m["email"] for m in cola] == ["med@ejemplo.com"]

    filas = db.scalars(select(BitacoraValidacion).where(BitacoraValidacion.objetivo_id == u.id)).all()
    assert [f.accion for f in filas] == ["acreditacion_actualizada", "acreditacion_reenviada"]
    assert filas[-1].detalle["de"] == "rechazado" and filas[-1].detalle["a"] == "pendiente"


@pytest.mark.parametrize("estado", [EstadoValidacion.PENDIENTE, EstadoValidacion.VALIDADO])
def test_solo_se_reenvia_lo_rechazado(client, db, estado):
    _medico(db, estado=estado)
    r = client.post(f"{ACR}/reenviar", headers=auth(login(client, "med@ejemplo.com")))
    assert r.status_code == 409 and r.json()["detail"]["codigo"] == "nada_que_reenviar"


def test_reenviar_no_abre_el_contenido_rx(client, db):
    """La puerta del contenido sigue siendo el estado validado, no el reenvio."""
    u = _medico(db, estado=EstadoValidacion.RECHAZADO)
    db.commit()
    headers = auth(login(client, "med@ejemplo.com"))
    assert client.get("/api/v1/medicos/areas", headers=headers).status_code == 403
    client.post(f"{ACR}/reenviar", headers=headers)
    assert client.get("/api/v1/medicos/areas", headers=headers).status_code == 403
    db.refresh(u.perfil_medico)  # la peticion escribio en otra sesion
    assert u.perfil_medico.estado == EstadoValidacion.PENDIENTE
