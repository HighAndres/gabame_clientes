"""Infraestructura de pruebas.

- BD propia `<nombre>_test` en el mismo Postgres de docker-compose (se crea si no existe).
- Esquema desde los modelos (create_all) al inicio de la sesion; tablas vaciadas tras cada test.
- Correo en memoria: `correo.bandeja_memoria` guarda lo que se habria enviado.
"""

import re
import shutil
import tempfile
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

settings.EMAIL_MODO = "memoria"  # antes de importar la app
settings.UPLOADS_DIR = str(Path(tempfile.gettempdir()) / "clientes_gabame_test_uploads")

from app.core import ratelimit
from app.core.enums import Empresa, EstadoValidacion, Realm, Rol, SubtipoPartner
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import PerfilMedico, PerfilPartner, Usuario, UsuarioRol
from app.services import correo

PASSWORD = "Prueba123!"

_url = make_url(settings.DATABASE_URL)
URL_TEST = _url.set(database=f"{_url.database}_test")


def _asegurar_bd_de_prueba() -> None:
    admin = create_engine(_url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as con:
        existe = con.execute(
            text("select 1 from pg_database where datname = :n"), {"n": URL_TEST.database}
        ).scalar()
        if not existe:
            con.execute(text(f'create database "{URL_TEST.database}"'))
    admin.dispose()


_asegurar_bd_de_prueba()
engine_test = create_engine(URL_TEST, pool_pre_ping=True)
SessionTest = sessionmaker(bind=engine_test, autoflush=False, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
def _esquema() -> Iterator[None]:
    Base.metadata.drop_all(engine_test)
    Base.metadata.create_all(engine_test)
    yield
    engine_test.dispose()


@pytest.fixture(autouse=True)
def _limpiar() -> Iterator[None]:
    correo.bandeja_memoria.clear()
    ratelimit.reiniciar()
    shutil.rmtree(settings.UPLOADS_DIR, ignore_errors=True)
    yield
    with engine_test.begin() as con:
        tablas = ", ".join(t.name for t in reversed(Base.metadata.sorted_tables))
        con.execute(text(f"truncate {tablas} restart identity cascade"))


@pytest.fixture
def db() -> Iterator[Session]:
    sesion = SessionTest()
    try:
        yield sesion
    finally:
        sesion.close()


@pytest.fixture
def client() -> Iterator[TestClient]:
    def _get_db() -> Iterator[Session]:
        sesion = SessionTest()
        try:
            yield sesion
        finally:
            sesion.close()

    app.dependency_overrides[get_db] = _get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------- helpers ----------


def ultimo_token_de_correo() -> str:
    """Extrae el token del ultimo correo enviado (verificar-email o restablecer)."""
    assert correo.bandeja_memoria, "no se envio ningun correo"
    m = re.search(r"token=([A-Za-z0-9_\-]+)", correo.bandeja_memoria[-1]["texto"])
    assert m, "el correo no trae token"
    return m.group(1)


def crear_usuario(
    db: Session,
    email: str,
    *,
    realm: Realm = Realm.ID,
    roles: list[tuple[Rol, Empresa | None]] | None = None,
    verificado: bool = True,
    estado_medico: EstadoValidacion | None = None,
    estado_partner: EstadoValidacion | None = None,
    password: str = PASSWORD,
) -> Usuario:
    """Crea un usuario directo en BD (sin pasar por /registro) para pruebas de permisos."""
    u = Usuario(
        email=email,
        password_hash=hash_password(password),
        nombre="Prueba",
        apellidos="Local",
        realm=realm,
        email_verificado_en=datetime.now(UTC) if verificado else None,
    )
    db.add(u)
    db.flush()
    for rol, empresa in roles or [(Rol.PACIENTE, None)]:
        db.add(UsuarioRol(usuario_id=u.id, rol=rol, empresa=empresa))
    if estado_medico is not None:
        db.add(PerfilMedico(usuario_id=u.id, cedula_profesional="12345678", estado=estado_medico))
    if estado_partner is not None:
        db.add(
            PerfilPartner(
                usuario_id=u.id,
                razon_social="Prueba SA",
                subtipo=SubtipoPartner.DISTRIBUIDOR,
                empresa_objetivo=Empresa.ORDAN,
                estado=estado_partner,
            )
        )
    db.commit()
    db.refresh(u)
    return u


def login(client: TestClient, email: str, password: str = PASSWORD, origen: dict | None = None) -> dict:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password, "origen": origen})
    assert r.status_code == 200, r.text
    return r.json()


def auth(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}
