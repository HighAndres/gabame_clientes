"""Registro, verificacion, login, refresh, logout y recuperacion de contrasena."""

from jose import jwt

from app.core.config import settings
from app.services import correo
from tests.conftest import PASSWORD, auth, crear_usuario, login, ultimo_token_de_correo

BASE = "/api/v1/auth"


def _registro(tipo: str = "paciente", email: str = "ana@ejemplo.com", **extra: object) -> dict:
    datos: dict = {
        "tipo_cuenta": tipo,
        "email": email,
        "password": PASSWORD,
        "nombre": "Ana",
        "apellidos": "Prueba",
    }
    datos.update(extra)
    return datos


# ---------- registro con bifurcacion ----------


def test_registro_paciente_va_a_realm_id(client):
    r = client.post(f"{BASE}/registro", json=_registro())
    assert r.status_code == 201, r.text
    cuerpo = r.json()
    assert cuerpo["realm"] == "id"
    assert [x["rol"] for x in cuerpo["roles"]] == ["paciente"]
    assert cuerpo["email_verificado"] is False
    assert cuerpo["estado_medico"] is None and cuerpo["estado_partner"] is None
    assert len(correo.bandeja_memoria) == 1
    assert "/verificar-email?token=" in correo.bandeja_memoria[0]["texto"]


def test_registro_profesional_crea_perfil_medico_pendiente(client):
    r = client.post(
        f"{BASE}/registro",
        json=_registro(
            "profesional",
            perfil_medico={"cedula_profesional": "87654321", "especialidad": "Cardiologia"},
        ),
    )
    assert r.status_code == 201, r.text
    cuerpo = r.json()
    assert cuerpo["realm"] == "id"
    assert [x["rol"] for x in cuerpo["roles"]] == ["medico"]
    assert cuerpo["estado_medico"] == "pendiente"
    # La cedula es dato sensible: no sale en la respuesta.
    assert "87654321" not in r.text


def test_registro_empresa_va_a_realm_partners(client):
    r = client.post(
        f"{BASE}/registro",
        json=_registro(
            "empresa",
            perfil_partner={
                "razon_social": "Distribuidora X",
                "subtipo": "distribuidor",
                "empresa_objetivo": "ordan",
            },
        ),
    )
    assert r.status_code == 201, r.text
    cuerpo = r.json()
    assert cuerpo["realm"] == "partners"
    assert [x["rol"] for x in cuerpo["roles"]] == ["partner"]
    assert cuerpo["estado_partner"] == "pendiente"


def test_registro_profesional_sin_cedula_es_422(client):
    r = client.post(f"{BASE}/registro", json=_registro("profesional"))
    assert r.status_code == 422


def test_registro_no_admite_rol_admin(client):
    """Ningun campo del registro permite pedir un rol: el tipo de cuenta decide."""
    r = client.post(f"{BASE}/registro", json=_registro(roles=[{"rol": "admin_grupo"}]))
    assert r.status_code == 201
    assert [x["rol"] for x in r.json()["roles"]] == ["paciente"]


# ---------- email unico e insensible a mayusculas ----------


def test_email_se_guarda_en_minusculas_y_no_se_duplica(client):
    r = client.post(f"{BASE}/registro", json=_registro(email="Ana.Perez@Ejemplo.COM"))
    assert r.status_code == 201
    assert r.json()["email"] == "ana.perez@ejemplo.com"

    r2 = client.post(f"{BASE}/registro", json=_registro(email="ANA.PEREZ@ejemplo.com"))
    assert r2.status_code == 409
    assert r2.json()["detail"]["codigo"] == "email_ya_registrado"


# ---------- verificacion y login ----------


def test_login_bloqueado_hasta_verificar_y_claims_correctos(client):
    client.post(f"{BASE}/registro", json=_registro())

    r = client.post(f"{BASE}/login", json={"email": "ana@ejemplo.com", "password": PASSWORD})
    assert r.status_code == 403
    assert r.json()["detail"]["codigo"] == "email_no_verificado"

    token = ultimo_token_de_correo()
    r = client.post(f"{BASE}/verificar-email", json={"token": token})
    assert r.status_code == 200, r.text

    tokens = login(client, "ana@ejemplo.com")
    claims = jwt.decode(tokens["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert claims["realm"] == "id"
    assert claims["roles"] == ["paciente"]
    assert claims["empresas"] == []
    assert claims["email_verified"] is True
    assert claims["typ"] == "access"
    me = client.get("/api/v1/usuarios/me", headers=auth(tokens)).json()
    assert claims["sub"] == me["id"]


def test_token_de_verificacion_es_de_un_solo_uso(client):
    client.post(f"{BASE}/registro", json=_registro())
    token = ultimo_token_de_correo()
    assert client.post(f"{BASE}/verificar-email", json={"token": token}).status_code == 200
    r = client.post(f"{BASE}/verificar-email", json={"token": token})
    assert r.status_code == 400
    assert r.json()["detail"]["codigo"] == "token_invalido"


def test_login_con_password_incorrecta_es_401(client, db):
    crear_usuario(db, "u@ejemplo.com")
    r = client.post(f"{BASE}/login", json={"email": "u@ejemplo.com", "password": "otra-cosa-123"})
    assert r.status_code == 401
    assert r.json()["detail"]["codigo"] == "credenciales_invalidas"


def test_login_acepta_email_con_mayusculas(client, db):
    crear_usuario(db, "u@ejemplo.com")
    assert login(client, "U@Ejemplo.com")["access_token"]


def test_claims_de_admin_empresa_llevan_empresas(client, db):
    from app.core.enums import Empresa, Realm, Rol

    crear_usuario(
        db, "admin@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_EMPRESA, Empresa.MEDINTER)]
    )
    tokens = login(client, "admin@ejemplo.com")
    claims = jwt.decode(tokens["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert claims["realm"] == "partners"
    assert claims["roles"] == ["admin_empresa"]
    assert claims["empresas"] == ["medinter"]


# ---------- refresh y logout ----------


def test_refresh_rota_y_detecta_reutilizacion(client, db):
    crear_usuario(db, "u@ejemplo.com")
    t1 = login(client, "u@ejemplo.com")

    r = client.post(f"{BASE}/refresh", json={"refresh_token": t1["refresh_token"]})
    assert r.status_code == 200
    t2 = r.json()
    assert t2["refresh_token"] != t1["refresh_token"]

    # Reusar el refresh viejo es senal de robo: se revoca todo, incluido el nuevo.
    r = client.post(f"{BASE}/refresh", json={"refresh_token": t1["refresh_token"]})
    assert r.status_code == 401
    r = client.post(f"{BASE}/refresh", json={"refresh_token": t2["refresh_token"]})
    assert r.status_code == 401


def test_logout_revoca_el_refresh(client, db):
    crear_usuario(db, "u@ejemplo.com")
    t = login(client, "u@ejemplo.com")
    assert client.post(f"{BASE}/logout", json={"refresh_token": t["refresh_token"]}).status_code == 204
    assert client.post(f"{BASE}/refresh", json={"refresh_token": t["refresh_token"]}).status_code == 401
    # Idempotente
    assert client.post(f"{BASE}/logout", json={"refresh_token": t["refresh_token"]}).status_code == 204


# ---------- recuperar contrasena ----------


def test_recuperar_no_enumera_cuentas(client, db):
    r = client.post(f"{BASE}/recuperar", json={"email": "nadie@ejemplo.com"})
    assert r.status_code == 202
    assert correo.bandeja_memoria == []

    crear_usuario(db, "u@ejemplo.com")
    r = client.post(f"{BASE}/recuperar", json={"email": "u@ejemplo.com"})
    assert r.status_code == 202
    assert len(correo.bandeja_memoria) == 1
    assert "/restablecer?token=" in correo.bandeja_memoria[0]["texto"]


def test_restablecer_cambia_password_y_cierra_sesiones(client, db):
    crear_usuario(db, "u@ejemplo.com")
    sesion_previa = login(client, "u@ejemplo.com")

    client.post(f"{BASE}/recuperar", json={"email": "u@ejemplo.com"})
    token = ultimo_token_de_correo()
    r = client.post(f"{BASE}/restablecer", json={"token": token, "password": "NuevaClave987"})
    assert r.status_code == 200, r.text

    assert client.post(f"{BASE}/login", json={"email": "u@ejemplo.com", "password": PASSWORD}).status_code == 401
    assert login(client, "u@ejemplo.com", "NuevaClave987")["access_token"]
    # las sesiones anteriores quedaron revocadas
    r = client.post(f"{BASE}/refresh", json={"refresh_token": sesion_previa["refresh_token"]})
    assert r.status_code == 401
    # el token de reset no se reusa
    r = client.post(f"{BASE}/restablecer", json={"token": token, "password": "OtraClave654"})
    assert r.status_code == 400


# ---------- /usuarios/me ----------


def test_me_requiere_token(client):
    assert client.get("/api/v1/usuarios/me").status_code == 401


def test_me_no_permite_cambiar_email(client, db):
    crear_usuario(db, "u@ejemplo.com")
    t = login(client, "u@ejemplo.com")
    r = client.patch(
        "/api/v1/usuarios/me",
        json={"nombre": "Nuevo", "email": "otro@ejemplo.com"},
        headers=auth(t),
    )
    assert r.status_code == 200
    assert r.json()["nombre"] == "Nuevo"
    assert r.json()["email"] == "u@ejemplo.com"


def test_refresh_token_no_sirve_como_access(client, db):
    crear_usuario(db, "u@ejemplo.com")
    t = login(client, "u@ejemplo.com")
    r = client.get("/api/v1/usuarios/me", headers={"Authorization": f"Bearer {t['refresh_token']}"})
    assert r.status_code == 401


def test_correos_del_seed_con_tld_test_pasan_en_local(client, db):
    """Los usuarios dummy usan @local.test (TLD reservado); email-validator lo permite fuera de produccion."""
    crear_usuario(db, "medico@local.test")
    assert login(client, "medico@local.test")["access_token"]
