"""Limite de intentos en auth (Fase 7). En memoria, por IP y por cuenta; nunca persistido."""

from app.core import ratelimit
from app.db.base import Base
from tests.conftest import PASSWORD, crear_usuario

BASE = "/api/v1/auth"


def test_recuperar_se_frena_por_ip(client):
    for _ in range(5):
        assert client.post(f"{BASE}/recuperar", json={"email": "x@ejemplo.com"}).status_code == 202
    r = client.post(f"{BASE}/recuperar", json={"email": "x@ejemplo.com"})
    assert r.status_code == 429
    assert r.json()["detail"]["codigo"] == "demasiados_intentos"
    assert r.headers["Retry-After"]


def test_login_se_frena_por_cuenta_aunque_cambie_la_ip(client, db):
    crear_usuario(db, "u@ejemplo.com")
    for i in range(10):
        r = client.post(
            f"{BASE}/login",
            json={"email": "U@ejemplo.com", "password": "mala-clave-123"},
            headers={"X-Forwarded-For": f"10.0.0.{i}"},
        )
        assert r.status_code == 401
    r = client.post(
        f"{BASE}/login",
        json={"email": "u@ejemplo.com", "password": PASSWORD},
        headers={"X-Forwarded-For": "10.0.0.99"},
    )
    assert r.status_code == 429


def test_el_freno_se_libera_al_reiniciar_y_no_toca_la_bd(client):
    for _ in range(5):
        client.post(f"{BASE}/recuperar", json={"email": "x@ejemplo.com"})
    assert client.post(f"{BASE}/recuperar", json={"email": "x@ejemplo.com"}).status_code == 429
    ratelimit.reiniciar()
    assert client.post(f"{BASE}/recuperar", json={"email": "x@ejemplo.com"}).status_code == 202
    # ninguna tabla guarda intentos, IPs ni contadores
    assert not any("intento" in t.name or "rate" in t.name for t in Base.metadata.sorted_tables)
