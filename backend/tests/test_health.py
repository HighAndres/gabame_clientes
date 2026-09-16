from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_sin_esquema_ni_documentacion_en_produccion():
    """El mapa completo de la API no se publica en el portal real."""
    from app.main import documentacion

    assert documentacion("production") == {"openapi_url": None, "docs_url": None, "redoc_url": None}
    assert documentacion("local")["openapi_url"].endswith("/openapi.json")
