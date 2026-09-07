"""Historial de origen dentro del ecosistema: append-only, sin datos de rastreo."""

from sqlalchemy import select

from app.models import OrigenUsuario, Usuario
from tests.conftest import PASSWORD, auth, crear_usuario, login, ultimo_token_de_correo

BASE = "/api/v1"


def _filas(db, email: str) -> list[OrigenUsuario]:
    u = db.scalar(select(Usuario).where(Usuario.email == email))
    db.refresh(u)
    return list(db.scalars(select(OrigenUsuario).where(OrigenUsuario.usuario_id == u.id).order_by(OrigenUsuario.creado_en)))


def _registro(origen: dict | None) -> dict:
    return {
        "tipo_cuenta": "paciente",
        "email": "ana@ejemplo.com",
        "password": PASSWORD,
        "nombre": "Ana",
        "apellidos": "Prueba",
        "origen": origen,
    }


def test_recorrido_por_el_ecosistema_se_acumula_y_nunca_se_sobrescribe(client, db):
    # 1) llega desde gabame.com
    r = client.post(
        f"{BASE}/auth/registro",
        json=_registro({"producto": "gabame", "ruta_entrada": "/conocer-mas", "campana": "lanzamiento"}),
    )
    assert r.status_code == 201, r.text
    assert r.json()["origen_inicial"] == "gabame"
    client.post(f"{BASE}/auth/verificar-email", json={"token": ultimo_token_de_correo()})

    filas = _filas(db, "ana@ejemplo.com")
    assert [(f.producto.value, f.evento.value, f.ruta_entrada, f.campana) for f in filas] == [
        ("gabame", "registro", "/conocer-mas", "lanzamiento")
    ]

    # 2) vuelve a entrar desde tiendagabame
    tokens = login(client, "ana@ejemplo.com", origen={"producto": "tiendagabame", "ruta_entrada": "/cuenta"})
    filas = _filas(db, "ana@ejemplo.com")
    assert [(f.producto.value, f.evento.value) for f in filas] == [
        ("gabame", "registro"),
        ("tiendagabame", "login"),
    ]

    # 3) login sin origen: no agrega ruido
    login(client, "ana@ejemplo.com")
    assert len(_filas(db, "ana@ejemplo.com")) == 2

    # 4) ya con sesion, regresa desde Ordan
    r = client.post(
        f"{BASE}/usuarios/me/origen",
        json={"producto": "ordan", "ruta_entrada": "/portal-de-clientes"},
        headers=auth(tokens),
    )
    assert r.status_code == 201
    filas = _filas(db, "ana@ejemplo.com")
    assert [(f.producto.value, f.evento.value) for f in filas] == [
        ("gabame", "registro"),
        ("tiendagabame", "login"),
        ("ordan", "retorno"),
    ]

    # origen_inicial no cambio
    u = db.scalar(select(Usuario).where(Usuario.email == "ana@ejemplo.com"))
    db.refresh(u)
    assert u.origen_inicial.value == "gabame"


def test_registro_sin_origen_es_directo_y_deja_fila(client, db):
    r = client.post(f"{BASE}/auth/registro", json=_registro(None))
    assert r.status_code == 201
    assert r.json()["origen_inicial"] == "directo"
    filas = _filas(db, "ana@ejemplo.com")
    assert [(f.producto.value, f.evento.value, f.ruta_entrada) for f in filas] == [("directo", "registro", None)]


def test_ruta_entrada_solo_admite_paths_internos(client):
    for ruta in ["/x?utm=1", "//evil.com", "https://evil.com/a", "sin-barra", "/a#frag", "/\\evil"]:
        r = client.post(f"{BASE}/auth/registro", json=_registro({"producto": "gabame", "ruta_entrada": ruta}))
        assert r.status_code == 422, ruta


def test_producto_fuera_del_enum_es_422(client):
    r = client.post(f"{BASE}/auth/registro", json=_registro({"producto": "competidor"}))
    assert r.status_code == 422


def test_no_se_guarda_ip_ni_user_agent(client, db):
    """Aunque el cliente los mande, se ignoran: ni el schema ni la tabla los conocen."""
    r = client.post(
        f"{BASE}/auth/registro",
        json=_registro({"producto": "a7", "ip": "1.2.3.4", "user_agent": "X", "huella": "abc"}),
    )
    assert r.status_code == 201
    columnas = {c.name for c in OrigenUsuario.__table__.columns}
    assert columnas == {"id", "usuario_id", "producto", "evento", "ruta_entrada", "campana", "creado_en"}


def test_retorno_requiere_sesion(client):
    r = client.post(f"{BASE}/usuarios/me/origen", json={"producto": "ordan"})
    assert r.status_code == 401


def test_crear_usuario_directo_no_rompe_el_historial(client, db):
    """Helper de pruebas: usuarios creados sin /registro no tienen filas; el flujo real siempre deja una."""
    crear_usuario(db, "u@ejemplo.com")
    assert _filas(db, "u@ejemplo.com") == []
