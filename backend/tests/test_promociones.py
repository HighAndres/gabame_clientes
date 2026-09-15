"""Promociones: una publicacion con fecha de fin y con enlace a la tienda del grupo.

Son publicaciones normales con dos campos mas, asi que lo que se prueba aqui es justo lo que
cambia: que la vigencia retire sola la promocion vencida y que el enlace no pueda salir del grupo.
"""

from datetime import UTC, date, datetime, timedelta

import pytest

from app.core.enums import EstadoValidacion, Realm, Rol
from tests.conftest import auth, crear_usuario, login

BASE = "/api/v1/admin"
TIENDA = "https://farmaciasgabame.com/es/promociones"


@pytest.fixture
def grupo(client, db):
    crear_usuario(db, "grupo@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_GRUPO, None)])
    crear_usuario(db, "med@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=EstadoValidacion.VALIDADO)
    return auth(login(client, "grupo@ejemplo.com"))


def _promo(client, headers, titulo: str, *, hasta: date | None = None, url: str | None = TIENDA):
    return client.post(
        f"{BASE}/espacios/gabame/publicaciones",
        json={
            "audiencia": "medicos", "titulo": titulo, "publicada": True,
            "vigencia_hasta": hasta.isoformat() if hasta else None, "url_externa": url,
        },
        headers=headers,
    )


def _titulos_del_medico(client) -> list[str]:
    headers = auth(login(client, "med@ejemplo.com"))
    r = client.get("/api/v1/espacios/gabame/publicaciones/medicos", headers=headers)
    assert r.status_code == 200, r.text
    return [p["titulo"] for p in r.json()]


# ---------- vigencia ----------


def test_la_promocion_vencida_deja_de_verse_sola(client, grupo):
    hoy = datetime.now(UTC).date()
    _promo(client, grupo, "Vence manana", hasta=hoy + timedelta(days=1))
    _promo(client, grupo, "Vence hoy", hasta=hoy)  # el ultimo dia todavia cuenta
    vencida = _promo(client, grupo, "Vencio ayer", hasta=hoy - timedelta(days=1)).json()
    _promo(client, grupo, "Sin caducidad", hasta=None)

    assert sorted(_titulos_del_medico(client)) == ["Sin caducidad", "Vence hoy", "Vence manana"]

    # No se borro: el admin la sigue viendo, marcada como vencida, para renovarla o retirarla.
    lista = client.get(f"{BASE}/espacios/gabame/publicaciones", headers=grupo).json()
    porTitulo = {p["titulo"]: p for p in lista}
    assert porTitulo["Vencio ayer"]["vencida"] is True and porTitulo["Vencio ayer"]["publicada"] is True
    assert porTitulo["Sin caducidad"]["vencida"] is False

    # Y su detalle tampoco se sirve por la puerta de la audiencia.
    headers = auth(login(client, "med@ejemplo.com"))
    r = client.get(f"/api/v1/espacios/gabame/publicaciones/medicos/{vencida['slug']}", headers=headers)
    assert r.status_code == 404


def test_renovar_la_fecha_la_devuelve_a_la_vista(client, grupo):
    ayer = datetime.now(UTC).date() - timedelta(days=1)
    p = _promo(client, grupo, "Promocion de temporada", hasta=ayer).json()
    assert _titulos_del_medico(client) == []

    nueva = (datetime.now(UTC).date() + timedelta(days=30)).isoformat()
    r = client.patch(f"{BASE}/publicaciones/{p['id']}", json={"vigencia_hasta": nueva}, headers=grupo)
    assert r.status_code == 200 and r.json()["vencida"] is False
    assert _titulos_del_medico(client) == ["Promocion de temporada"]


# ---------- el enlace no sale del grupo ----------


@pytest.mark.parametrize(
    "url",
    [
        "https://ejemplo-ajeno.com/oferta",
        "https://farmaciasgabame.com.ejemplo-ajeno.com/oferta",  # sufijo pegado, no subdominio
        "http://farmaciasgabame.com/oferta",  # sin https
        "javascript:alert(1)",
        "//farmaciasgabame.com/oferta",  # sin esquema, el navegador lo resolveria solo
    ],
)
def test_un_enlace_fuera_del_grupo_no_se_guarda(client, grupo, url):
    assert _promo(client, grupo, "Oferta", url=url).status_code == 422


@pytest.mark.parametrize(
    "url",
    ["https://farmaciasgabame.com/es", "https://www.gabame.com/algo", "https://ordan.com.mx"],
)
def test_los_destinos_del_grupo_si(client, grupo, url):
    r = _promo(client, grupo, f"Oferta {url}", url=url)
    assert r.status_code == 201, r.text
    assert r.json()["url_externa"] == url


def test_el_enlace_configurable_de_la_tienda_tambien_vale(client, grupo, monkeypatch):
    """Farmacias GABAME vive hoy en un entorno de pruebas; su host entra por configuracion."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "URL_FARMACIAS", "https://farmaciasgabame.mirmiapps.com/es")
    r = _promo(client, grupo, "Oferta sandbox", url="https://farmaciasgabame.mirmiapps.com/es/ofertas")
    assert r.status_code == 201, r.text


def test_sin_enlace_sigue_siendo_una_publicacion_normal(client, grupo):
    r = _promo(client, grupo, "Comunicado", url=None)
    assert r.status_code == 201 and r.json()["url_externa"] is None
