"""Corte 3: cuentas administrativas, requisitos editables, publicaciones por audiencia y bitacora."""

import pytest

from app.core.enums import Empresa, EstadoValidacion, Realm, Rol
from app.services import correo
from tests.conftest import PASSWORD, auth, crear_usuario, login, ultimo_token_de_correo

BASE = "/api/v1/admin"


@pytest.fixture
def actores(client, db):
    crear_usuario(db, "grupo@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_GRUPO, None)])
    crear_usuario(db, "admin.ordan@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.ADMIN_EMPRESA, Empresa.ORDAN)])
    crear_usuario(db, "editor.gabame@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.EDITOR_EMPRESA, Empresa.GABAME)])
    crear_usuario(db, "paciente@ejemplo.com")
    crear_usuario(db, "med@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=EstadoValidacion.VALIDADO)
    crear_usuario(db, "med.pend@ejemplo.com", roles=[(Rol.MEDICO, None)], estado_medico=EstadoValidacion.PENDIENTE)
    crear_usuario(
        db, "partner@ejemplo.com", realm=Realm.PARTNERS, roles=[(Rol.PARTNER, None)],
        vinculos=[(Empresa.ORDAN, EstadoValidacion.VALIDADO), (Empresa.A7, EstadoValidacion.PENDIENTE)],
    )
    return {k: auth(login(client, f"{k}@ejemplo.com")) for k in ("grupo", "admin.ordan", "editor.gabame", "paciente", "med", "med.pend", "partner")}


def _usuario_por_email(client, headers, email: str) -> dict:
    r = client.get(f"{BASE}/usuarios", params={"q": email}, headers=headers)
    assert r.status_code == 200, r.text
    return next(u for u in r.json()["items"] if u["email"] == email)


# ---------- alta de administradores ----------


def test_admin_grupo_crea_admin_de_empresa_y_este_fija_su_contrasena(client, actores):
    r = client.post(
        f"{BASE}/usuarios",
        json={"email": "nuevo@ejemplo.com", "nombre": "Nadia", "apellidos": "Nueva", "roles": [{"rol": "admin_empresa", "empresa": "medinter"}]},
        headers=actores["grupo"],
    )
    assert r.status_code == 201, r.text
    assert r.json()["roles"] == [{"rol": "admin_empresa", "empresa": "medinter"}]
    assert r.json()["realm"] == "partners" and r.json()["email_verificado"] is False
    assert correo.bandeja_memoria[-1]["para"] == "nuevo@ejemplo.com" and "/restablecer?token=" in correo.bandeja_memoria[-1]["texto"]

    # con el enlace fija contrasena, queda verificado y entra al panel
    token = ultimo_token_de_correo()
    r = client.post("/api/v1/auth/restablecer", json={"token": token, "password": PASSWORD})
    assert r.status_code == 200, r.text
    tokens = login(client, "nuevo@ejemplo.com")
    assert client.get(f"{BASE}/resumen", headers=auth(tokens)).json()["empresas"] == ["medinter"]


def test_admin_empresa_solo_crea_dentro_de_su_empresa(client, actores):
    fuera = {"email": "x@ejemplo.com", "nombre": "X", "apellidos": "Y", "roles": [{"rol": "editor_empresa", "empresa": "a7"}]}
    r = client.post(f"{BASE}/usuarios", json=fuera, headers=actores["admin.ordan"])
    assert r.status_code == 403 and r.json()["detail"]["codigo"] == "rol_fuera_de_alcance"
    grupo = {**fuera, "roles": [{"rol": "admin_grupo"}]}
    assert client.post(f"{BASE}/usuarios", json=grupo, headers=actores["admin.ordan"]).status_code == 403
    dentro = {**fuera, "roles": [{"rol": "editor_empresa", "empresa": "ordan"}]}
    r = client.post(f"{BASE}/usuarios", json=dentro, headers=actores["admin.ordan"])
    assert r.status_code == 201, r.text
    # y lo ve en su listado de usuarios
    assert _usuario_por_email(client, actores["admin.ordan"], "x@ejemplo.com")["roles"] == [{"rol": "editor_empresa", "empresa": "ordan"}]


def test_editor_no_administra_cuentas(client, actores):
    datos = {"email": "x@ejemplo.com", "nombre": "X", "apellidos": "Y", "roles": [{"rol": "editor_empresa", "empresa": "gabame"}]}
    assert client.post(f"{BASE}/usuarios", json=datos, headers=actores["editor.gabame"]).status_code == 403
    assert client.get(f"{BASE}/bitacora", headers=actores["editor.gabame"]).status_code == 403


def test_email_repetido_y_roles_invalidos_son_422_o_409(client, actores):
    base = {"email": "paciente@ejemplo.com", "nombre": "X", "apellidos": "Y"}
    r = client.post(f"{BASE}/usuarios", json={**base, "roles": [{"rol": "admin_grupo"}]}, headers=actores["grupo"])
    assert r.status_code == 409 and r.json()["detail"]["codigo"] == "email_ya_registrado"
    r = client.post(f"{BASE}/usuarios", json={**base, "email": "z@ejemplo.com", "roles": [{"rol": "admin_empresa"}]}, headers=actores["grupo"])
    assert r.status_code == 422
    r = client.post(f"{BASE}/usuarios", json={**base, "email": "z@ejemplo.com", "roles": [{"rol": "paciente"}]}, headers=actores["grupo"])
    assert r.status_code == 403


# ---------- roles ----------


def test_roles_se_ajustan_solo_dentro_del_alcance(client, db, actores):
    u = crear_usuario(
        db, "multi@ejemplo.com", realm=Realm.PARTNERS,
        roles=[(Rol.EDITOR_EMPRESA, Empresa.ORDAN), (Rol.ADMIN_EMPRESA, Empresa.A7)],
    )
    # admin de Ordan: sube a admin de Ordan; el rol de A7 no es suyo y se conserva aunque no lo mande
    r = client.put(f"{BASE}/usuarios/{u.id}/roles", json={"roles": [{"rol": "admin_empresa", "empresa": "ordan"}]}, headers=actores["admin.ordan"])
    assert r.status_code == 200, r.text
    assert sorted((x["rol"], x["empresa"]) for x in r.json()["roles"]) == [("admin_empresa", "a7"), ("admin_empresa", "ordan")]
    # ...y no puede asignar admin_grupo ni tocar A7
    r = client.put(f"{BASE}/usuarios/{u.id}/roles", json={"roles": [{"rol": "admin_grupo"}]}, headers=actores["admin.ordan"])
    assert r.status_code == 403
    # admin_grupo deja solo editor de Ordan
    r = client.put(f"{BASE}/usuarios/{u.id}/roles", json={"roles": [{"rol": "editor_empresa", "empresa": "ordan"}]}, headers=actores["grupo"])
    assert [(x["rol"], x["empresa"]) for x in r.json()["roles"]] == [("editor_empresa", "ordan")]
    # la bitacora registra agregados y retirados
    r = client.get(f"{BASE}/bitacora", params={"objetivo_id": str(u.id)}, headers=actores["grupo"]).json()
    assert [b["accion"] for b in r["items"]] == ["roles_actualizados", "roles_actualizados"]
    assert r["items"][0]["detalle"]["retirados"] == [{"rol": "admin_empresa", "empresa": "a7"}, {"rol": "admin_empresa", "empresa": "ordan"}]
    assert r["items"][0]["actor"]["email"] == "grupo@ejemplo.com"


def test_admin_grupo_no_se_retira_a_si_mismo(client, actores):
    yo = _usuario_por_email(client, actores["grupo"], "grupo@ejemplo.com")
    r = client.put(f"{BASE}/usuarios/{yo['id']}/roles", json={"roles": []}, headers=actores["grupo"])
    assert r.status_code == 409 and r.json()["detail"]["codigo"] == "accion_sobre_uno_mismo"
    r = client.patch(f"{BASE}/usuarios/{yo['id']}/activo", json={"activo": False}, headers=actores["grupo"])
    assert r.status_code == 409


# ---------- activar / desactivar / restablecer ----------


def test_desactivar_cierra_sesion_y_reactivar_la_devuelve(client, actores):
    p = _usuario_por_email(client, actores["grupo"], "paciente@ejemplo.com")
    r = client.patch(f"{BASE}/usuarios/{p['id']}/activo", json={"activo": False}, headers=actores["grupo"])
    assert r.status_code == 200 and r.json()["activo"] is False
    # el token vigente deja de servir y el login se rechaza
    assert client.get("/api/v1/usuarios/me", headers=actores["paciente"]).status_code == 401
    r = client.post("/api/v1/auth/login", json={"email": "paciente@ejemplo.com", "password": PASSWORD})
    assert r.status_code in (401, 403)
    r = client.patch(f"{BASE}/usuarios/{p['id']}/activo", json={"activo": True}, headers=actores["grupo"])
    assert r.json()["activo"] is True
    assert login(client, "paciente@ejemplo.com")["access_token"]
    # admin de Ordan no ve al paciente: 404
    assert client.patch(f"{BASE}/usuarios/{p['id']}/activo", json={"activo": False}, headers=actores["admin.ordan"]).status_code == 404


def test_restablecimiento_desde_el_panel_manda_correo_y_deja_bitacora(client, actores):
    p = _usuario_por_email(client, actores["admin.ordan"], "partner@ejemplo.com")
    r = client.post(f"{BASE}/usuarios/{p['id']}/restablecer", headers=actores["admin.ordan"])
    assert r.status_code == 204, r.text
    assert correo.bandeja_memoria[-1]["para"] == "partner@ejemplo.com"
    r = client.get(f"{BASE}/bitacora", params={"objetivo_id": p["id"]}, headers=actores["admin.ordan"]).json()
    assert r["items"][0]["accion"] == "restablecimiento_enviado"


# ---------- requisitos documentales ----------


def test_requisitos_por_defecto_y_edicion_por_empresa(client, actores):
    r = client.get(f"{BASE}/espacios/ordan/requisitos", headers=actores["admin.ordan"])
    assert r.status_code == 200 and [x["clave"] for x in r.json()] == ["constancia_fiscal", "identificacion_representante", "comprobante_domicilio", "otro"]
    # A7 esta fuera de su alcance
    assert client.get(f"{BASE}/espacios/a7/requisitos", headers=actores["admin.ordan"]).status_code == 403
    # el editor de GABAME los ve pero no los edita
    assert client.get(f"{BASE}/espacios/gabame/requisitos", headers=actores["editor.gabame"]).status_code == 200
    assert client.put(f"{BASE}/espacios/gabame/requisitos", json={"requisitos": []}, headers=actores["editor.gabame"]).status_code == 403

    nuevos = {"requisitos": [
        {"clave": "constancia_fiscal", "nombre": "Constancia fiscal", "obligatorio": True},
        {"nombre": "Licencia sanitaria", "descripcion": "Solo distribuidores", "obligatorio": True, "tipo": "distribuidor"},
    ]}
    r = client.put(f"{BASE}/espacios/ordan/requisitos", json=nuevos, headers=actores["admin.ordan"])
    assert r.status_code == 200, r.text
    por_clave = {x["clave"]: x for x in r.json()}
    assert por_clave["licencia_sanitaria"]["tipo"] == "distribuidor" and por_clave["licencia_sanitaria"]["activo"]
    assert por_clave["constancia_fiscal"]["nombre"] == "Constancia fiscal"
    assert por_clave["otro"]["activo"] is False  # se desactiva, no se borra

    # el partner (distribuidor de Ordan, pendiente con A7) ve la union: Ordan activos + A7 por defecto
    r = client.get("/api/v1/partners/me", headers=actores["partner"]).json()
    claves = [q["tipo"] for q in r["requisitos"]]
    assert claves[:2] == ["constancia_fiscal", "licencia_sanitaria"]
    assert "otro" in claves and "identificacion_representante" in claves  # los pide A7
    # una clave desactivada en todas las empresas ya no se acepta al subir
    client.put(f"{BASE}/espacios/a7/requisitos", json={"requisitos": [{"clave": "constancia_fiscal", "nombre": "CSF"}]}, headers=actores["grupo"])
    r = client.post("/api/v1/partners/me/documentos", data={"tipo": "otro"}, files={"archivo": ("x.pdf", b"%PDF-1.4", "application/pdf")}, headers=actores["partner"])
    assert r.status_code == 422


def test_clave_repetida_es_422(client, actores):
    dup = {"requisitos": [{"nombre": "Acta"}, {"nombre": "acta"}]}
    r = client.put(f"{BASE}/espacios/ordan/requisitos", json=dup, headers=actores["admin.ordan"])
    assert r.status_code == 422 and r.json()["detail"]["codigo"] == "requisito_invalido"


# ---------- publicaciones por audiencia ----------


def _crear_publicacion(client, headers, empresa: str, audiencia: str, titulo: str, publicada=True) -> dict:
    r = client.post(
        f"{BASE}/espacios/{empresa}/publicaciones",
        json={"audiencia": audiencia, "titulo": titulo, "resumen": "Resumen", "contenido": "# Hola", "publicada": publicada},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_publicaciones_se_editan_dentro_del_alcance(client, actores):
    p = _crear_publicacion(client, actores["editor.gabame"], "gabame", "pacientes", "Nuestras marcas")
    assert p["slug"] == "nuestras-marcas"
    assert client.post(f"{BASE}/espacios/ordan/publicaciones", json={"audiencia": "pacientes", "titulo": "Otra"}, headers=actores["editor.gabame"]).status_code == 403
    r = client.patch(f"{BASE}/publicaciones/{p['id']}", json={"publicada": False}, headers=actores["editor.gabame"])
    assert r.status_code == 200 and r.json()["publicada"] is False
    assert client.patch(f"{BASE}/publicaciones/{p['id']}", json={"titulo": "Otro"}, headers=actores["admin.ordan"]).status_code == 403
    assert [x["id"] for x in client.get(f"{BASE}/espacios/gabame/publicaciones", headers=actores["grupo"]).json()] == [p["id"]]
    assert client.delete(f"{BASE}/publicaciones/{p['id']}", headers=actores["editor.gabame"]).status_code == 204
    assert client.get(f"{BASE}/publicaciones/{p['id']}", headers=actores["grupo"]).status_code == 404


def test_lectura_por_audiencia(client, actores):
    _crear_publicacion(client, actores["grupo"], "gabame", "pacientes", "Para todos")
    _crear_publicacion(client, actores["grupo"], "gabame", "medicos", "Solo medicos")
    _crear_publicacion(client, actores["grupo"], "ordan", "partners", "Solo partners de Ordan")
    _crear_publicacion(client, actores["grupo"], "a7", "partners", "Solo partners de A7")
    _crear_publicacion(client, actores["grupo"], "gabame", "pacientes", "Borrador", publicada=False)

    def leer(headers, empresa, audiencia):
        return client.get(f"/api/v1/espacios/{empresa}/publicaciones/{audiencia}", headers=headers)

    # pacientes: cualquier sesion, solo lo publicado
    r = leer(actores["paciente"], "gabame", "pacientes")
    assert r.status_code == 200 and [p["titulo"] for p in r.json()] == ["Para todos"]
    # medicos: solo validados
    assert leer(actores["paciente"], "gabame", "medicos").status_code == 403
    assert leer(actores["med.pend"], "gabame", "medicos").status_code == 403
    assert [p["titulo"] for p in leer(actores["med"], "gabame", "medicos").json()] == ["Solo medicos"]
    # partners: solo con vinculo aprobado con ESA empresa
    assert [p["titulo"] for p in leer(actores["partner"], "ordan", "partners").json()] == ["Solo partners de Ordan"]
    assert leer(actores["partner"], "a7", "partners").status_code == 403  # pendiente
    assert leer(actores["paciente"], "ordan", "partners").status_code == 403
    # detalle por slug
    r = client.get("/api/v1/espacios/ordan/publicaciones/partners/solo-partners-de-ordan", headers=actores["partner"])
    assert r.status_code == 200 and r.json()["contenido"] == "# Hola"
    assert client.get("/api/v1/espacios/gabame/publicaciones/pacientes/borrador", headers=actores["paciente"]).status_code == 404


def test_listado_de_espacios_no_expone_contacto(client, db, actores):
    from app.services import espacios

    espacios.actualizar(db, Empresa.ORDAN, {"contacto_email": "ventas@ordan.test", "portal_url": "https://portal.ordan.test"})
    r = client.get("/api/v1/espacios", headers=actores["paciente"])
    assert r.status_code == 200
    ordan = next(e for e in r.json() if e["empresa"] == "ordan")
    assert ordan["contacto_email"] is None and ordan["portal_url"] == "https://portal.ordan.test"


# ---------- bitacora ----------


def test_bitacora_respeta_alcance(client, db, actores):
    med = _usuario_por_email(client, actores["grupo"], "med.pend@ejemplo.com")
    client.post(f"{BASE}/medicos/{med['id']}/validar", json={}, headers=actores["grupo"])
    partner = _usuario_por_email(client, actores["grupo"], "partner@ejemplo.com")
    client.post(f"{BASE}/usuarios/{partner['id']}/restablecer", headers=actores["grupo"])

    todo = client.get(f"{BASE}/bitacora", headers=actores["grupo"]).json()
    assert todo["total"] == 2 and {b["accion"] for b in todo["items"]} == {"medico_validado", "restablecimiento_enviado"}
    assert todo["items"][0]["objetivo"]["email"] in ("partner@ejemplo.com", "med.pend@ejemplo.com")

    # admin de Ordan solo ve lo que toca a sus usuarios
    ordan = client.get(f"{BASE}/bitacora", headers=actores["admin.ordan"]).json()
    assert [b["accion"] for b in ordan["items"]] == ["restablecimiento_enviado"]
    assert client.get(f"{BASE}/bitacora", params={"limit": 1, "offset": 1}, headers=actores["grupo"]).json()["items"][0]["accion"] == "medico_validado"
