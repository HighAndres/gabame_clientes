"""Opcion C: buscar en las colas del panel y filtrar la bitacora por tipo de movimiento.

Lo que importa probar es que el filtro no abre nada: buscar dentro de una cola nunca devuelve
filas fuera del alcance ni del estado pedido, y un texto con comodines se busca literal.
"""

from app.core.enums import Empresa, EstadoValidacion, Realm, Rol
from app.models import PerfilMedico, PerfilPartner, Usuario
from tests.conftest import auth, crear_usuario, login

BASE = "/api/v1/admin"


def _grupo(client, db):
    crear_usuario(db, "grupo@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_GRUPO, None)])
    return auth(login(client, "grupo@ejemplo.com"))


def _renombrar(db, email: str, nombre: str, apellidos: str = "Local"):
    u = db.query(Usuario).filter_by(email=email).one()
    u.nombre, u.apellidos = nombre, apellidos
    db.commit()
    return u


# ---------- medicos ----------


def test_buscar_medicos_por_nombre_correo_o_cedula(client, db):
    headers = _grupo(client, db)
    crear_usuario(db, "ana.cardio@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=EstadoValidacion.PENDIENTE)
    crear_usuario(db, "luis@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=EstadoValidacion.PENDIENTE)
    _renombrar(db, "ana.cardio@ejemplo.com", "Ana", "Ruiz")
    luis = _renombrar(db, "luis@ejemplo.com", "Luis", "Paz")
    db.get(PerfilMedico, luis.id).cedula_profesional = "99887766"
    db.commit()

    def correos(buscar: str, estado: str = "pendiente") -> list[str]:
        r = client.get(f"{BASE}/medicos", params={"estado": estado, "buscar": buscar}, headers=headers)
        assert r.status_code == 200, r.text
        return sorted(m["email"] for m in r.json())

    assert correos("ruiz") == ["ana.cardio@ejemplo.com"]  # apellido, sin importar mayusculas
    assert correos("CARDIO") == ["ana.cardio@ejemplo.com"]  # correo
    assert correos("8877") == ["luis@ejemplo.com"]  # parte de la cedula
    assert correos("") == ["ana.cardio@ejemplo.com", "luis@ejemplo.com"]  # vacio = sin filtro
    assert correos("ruiz", estado="validado") == []  # la busqueda no salta el filtro de estado


def test_un_comodin_se_busca_literal(client, db):
    headers = _grupo(client, db)
    crear_usuario(db, "a@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=EstadoValidacion.PENDIENTE)
    _renombrar(db, "a@ejemplo.com", "Ana")
    for comodin in ("%", "_", "\\"):
        r = client.get(f"{BASE}/medicos", params={"buscar": comodin}, headers=headers)
        assert r.status_code == 200 and r.json() == [], comodin


# ---------- partners ----------


def test_buscar_partners_por_razon_social_y_respeta_el_alcance(client, db):
    crear_usuario(db, "admin.ordan@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_EMPRESA, Empresa.ORDAN)])
    headers = auth(login(client, "admin.ordan@ejemplo.com"))
    p1 = crear_usuario(db, "p1@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)],
                       vinculos=[(Empresa.ORDAN, EstadoValidacion.PENDIENTE)])
    p2 = crear_usuario(db, "p2@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)],
                       vinculos=[(Empresa.A7, EstadoValidacion.PENDIENTE)])
    db.get(PerfilPartner, p1.id).razon_social = "Farmacia Norte SA"
    db.get(PerfilPartner, p2.id).razon_social = "Farmacia Sur SA"  # de A7: fuera del alcance de Ordan
    db.commit()

    r = client.get(f"{BASE}/partners", params={"buscar": "farmacia"}, headers=headers)
    assert r.status_code == 200, r.text
    assert [v["razon_social"] for v in r.json()] == ["Farmacia Norte SA"]


# ---------- bitacora ----------


def test_filtrar_bitacora_por_tipo(client, db):
    headers = _grupo(client, db)
    medico = crear_usuario(db, "med@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=EstadoValidacion.PENDIENTE)
    partner = crear_usuario(db, "p@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)],
                            estado_partner=EstadoValidacion.PENDIENTE)
    assert client.post(f"{BASE}/medicos/{medico.id}/validar", json={}, headers=headers).status_code == 200
    vinculo = client.get(f"{BASE}/partners", headers=headers).json()[0]
    assert client.post(f"{BASE}/vinculos/{vinculo['vinculo_id']}/aprobar", json={}, headers=headers).status_code == 200
    assert client.post(f"{BASE}/usuarios/{partner.id}/restablecer", headers=headers).status_code in (200, 202, 204)

    def acciones(tipo: str | None) -> list[str]:
        params = {"tipo": tipo} if tipo else {}
        r = client.get(f"{BASE}/bitacora", params=params, headers=headers)
        assert r.status_code == 200, r.text
        return sorted(b["accion"] for b in r.json()["items"])

    assert acciones("medicos") == ["medico_validado"]
    assert acciones("partners") == ["vinculo_validado"]
    assert acciones("cuentas") == ["restablecimiento_enviado"]
    assert len(acciones(None)) == 3
    assert client.get(f"{BASE}/bitacora", params={"tipo": "otro"}, headers=headers).status_code == 422
