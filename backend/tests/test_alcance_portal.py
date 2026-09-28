"""Que empresas del grupo existen para cada cuenta dentro del portal (ADR-0015).

Solo el administrador del grupo ve las cuatro. Lo que se prueba aqui es que el alcance es el
mismo por todas las puertas: la lista de espacios, el detalle de uno, sus publicaciones y el
catalogo del ecosistema.
"""

from app.core.enums import Empresa, EstadoValidacion, EventoOrigen, Producto, Realm, Rol
from app.models import OrigenUsuario, Usuario
from app.services import publicaciones
from tests.conftest import auth, crear_usuario, login


def _origen(db, usuario: Usuario, producto: Producto) -> None:
    db.add(OrigenUsuario(usuario_id=usuario.id, producto=producto, evento=EventoOrigen.RETORNO))
    usuario.origen_inicial = producto
    db.commit()
    db.refresh(usuario)


def _empresas(client, email: str) -> list[str]:
    r = client.get("/api/v1/espacios/mios", headers=auth(login(client, email)))
    assert r.status_code == 200, r.text
    return sorted(e["empresa"] for e in r.json())


def _piezas(client, email: str) -> list[str]:
    r = client.get("/api/v1/ecosistema", headers=auth(login(client, email)))
    assert r.status_code == 200, r.text
    return sorted(p["producto"] for p in r.json())


# ---------- paciente: las empresas por las que entro ----------


def test_paciente_sin_origen_ve_el_sitio_ancla(client, db):
    crear_usuario(db, "directo@ejemplo.com")
    assert _empresas(client, "directo@ejemplo.com") == ["gabame"]


def test_paciente_que_llego_por_ordan_ve_ordan_y_no_las_demas(client, db):
    u = crear_usuario(db, "ana@ejemplo.com")
    _origen(db, u, Producto.ORDAN)
    assert _empresas(client, "ana@ejemplo.com") == ["ordan"]


def test_la_tienda_cuenta_como_su_empresa_y_los_origenes_se_acumulan(client, db):
    """Farmacias GABAME no es una empresa: es producto de GABAME (regla del cliente)."""
    u = crear_usuario(db, "luis@ejemplo.com")
    _origen(db, u, Producto.TIENDAGABAME)
    assert _empresas(client, "luis@ejemplo.com") == ["gabame"]
    _origen(db, u, Producto.MEDINTER)  # mas tarde vuelve desde otro sitio del grupo
    assert _empresas(client, "luis@ejemplo.com") == ["gabame", "medinter"]


def test_a_cada_quien_su_tienda(client, db):
    gabame = crear_usuario(db, "g@ejemplo.com")
    _origen(db, gabame, Producto.GABAME)
    ordan = crear_usuario(db, "o@ejemplo.com")
    _origen(db, ordan, Producto.ORDAN)

    # La app de paciente es del grupo, no de una empresa: se muestra siempre.
    assert _piezas(client, "g@ejemplo.com") == ["app_paciente", "gabame", "tiendagabame"]
    assert _piezas(client, "o@ejemplo.com") == ["app_paciente", "aurashop", "ordan"]


# ---------- medico, partner y admins ----------


def test_el_medico_queda_en_gabame_aunque_haya_llegado_por_otro_sitio(client, db):
    u = crear_usuario(db, "med@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=EstadoValidacion.VALIDADO)
    _origen(db, u, Producto.A7)
    assert _empresas(client, "med@ejemplo.com") == ["gabame"]
    assert _piezas(client, "med@ejemplo.com") == ["app_paciente", "gabame", "tiendagabame"]


def test_el_partner_ve_solo_las_empresas_con_las_que_tiene_vinculo(client, db):
    crear_usuario(
        db, "p@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)],
        vinculos=[(Empresa.ORDAN, EstadoValidacion.VALIDADO), (Empresa.A7, EstadoValidacion.RECHAZADO)],
    )
    # El rechazado se queda: es donde ve el motivo y desde donde vuelve a solicitar (ADR-0014).
    assert _empresas(client, "p@ejemplo.com") == ["a7", "ordan"]


def test_los_admins_ven_su_alcance_y_solo_el_del_grupo_ve_todo(client, db):
    crear_usuario(db, "admin.ordan@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_EMPRESA, Empresa.ORDAN)])
    crear_usuario(db, "editor.gabame@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.EDITOR_EMPRESA, Empresa.GABAME)])
    crear_usuario(db, "grupo@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_GRUPO, None)])

    assert _empresas(client, "admin.ordan@ejemplo.com") == ["ordan"]
    assert _empresas(client, "editor.gabame@ejemplo.com") == ["gabame"]
    assert _empresas(client, "grupo@ejemplo.com") == ["a7", "gabame", "medinter", "ordan"]


# ---------- la misma regla por todas las puertas ----------


def test_una_empresa_fuera_de_alcance_no_se_lee_por_ninguna_via(client, db):
    publicaciones.crear(
        db, Empresa.A7,
        {"audiencia": "pacientes", "titulo": "Para todos", "resumen": None, "contenido": "x",
         "orden": 0, "publicada": True},
    )
    u = crear_usuario(db, "ana@ejemplo.com")
    _origen(db, u, Producto.GABAME)
    headers = auth(login(client, "ana@ejemplo.com"))

    assert client.get("/api/v1/espacios/a7/mio", headers=headers).status_code == 403
    assert client.get("/api/v1/espacios/a7/publicaciones/pacientes", headers=headers).status_code == 403
    assert client.get("/api/v1/espacios/a7/publicaciones/pacientes/para-todos", headers=headers).status_code == 403
    assert [e["empresa"] for e in client.get("/api/v1/espacios", headers=headers).json()] == ["gabame"]

    # Y por la puerta de su propia empresa entra igual que siempre.
    assert client.get("/api/v1/espacios/gabame/mio", headers=headers).status_code == 200
