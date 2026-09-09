"""Seed: un usuario dummy por rol. Idempotente. Para local y staging, nunca produccion.

    python -m app.seeds.seed_dev

Contrasena de todos: SEED_PASSWORD si esta definida; si no, Local123! (solo local).

Cuentas:
- paciente@local.test, medico@local.test (validado), medico.pendiente@local.test
- partner@local.test: vinculo con Ordan aprobado y con A7 en revision (ADR-0008)
- admin.<empresa>@local.test por cada empresa, editor.gabame@local.test, admin.grupo@local.test
"""

import os
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import (
    Audiencia,
    Empresa,
    EstadoValidacion,
    EventoOrigen,
    Realm,
    Rol,
    SubtipoPartner,
)
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import PerfilMedico, PerfilPartner, Publicacion, Usuario, UsuarioRol, VinculoEmpresa
from app.services import espacios, requisitos
from app.services.origen import registrar_origen

PASSWORD = os.environ.get("SEED_PASSWORD") or "Local123!"


def _usuario(db: Session, email: str, nombre: str, apellidos: str, realm: Realm) -> Usuario:
    existente = db.scalar(select(Usuario).where(Usuario.email == email))
    if existente:
        return existente
    u = Usuario(
        email=email,
        nombre=nombre,
        apellidos=apellidos,
        realm=realm,
        password_hash=hash_password(PASSWORD),
        email_verificado_en=datetime.now(UTC),
    )
    db.add(u)
    db.flush()
    registrar_origen(db, u, EventoOrigen.REGISTRO, None)
    return u


def _rol(db: Session, usuario: Usuario, rol: Rol, empresa: Empresa | None = None) -> None:
    if any(r.rol == rol and r.empresa == empresa for r in usuario.roles):
        return
    db.add(UsuarioRol(usuario_id=usuario.id, rol=rol, empresa=empresa))


def _vinculo(
    db: Session, usuario: Usuario, empresa: Empresa, tipo: SubtipoPartner, estado: EstadoValidacion
) -> None:
    existente = db.scalar(
        select(VinculoEmpresa).where(VinculoEmpresa.usuario_id == usuario.id, VinculoEmpresa.empresa == empresa)
    )
    if existente:
        return
    db.add(
        VinculoEmpresa(
            usuario_id=usuario.id,
            empresa=empresa,
            tipo=tipo,
            estado=estado,
            aprobado_en=datetime.now(UTC) if estado == EstadoValidacion.VALIDADO else None,
        )
    )


def _publicacion(db: Session, empresa: Empresa, audiencia: Audiencia, slug: str, titulo: str, resumen: str) -> None:
    existe = db.scalar(select(Publicacion.id).where(Publicacion.empresa == empresa, Publicacion.slug == slug))
    if existe:
        return
    db.add(
        Publicacion(
            empresa=empresa, audiencia=audiencia, slug=slug, titulo=titulo, resumen=resumen,
            contenido=f"# {titulo}\n\n{resumen}\n\nContenido de ejemplo del espacio de {espacios.NOMBRES[empresa]}.",
            publicada=True,
        )
    )


def main() -> None:
    with SessionLocal() as db:
        espacios.listar(db)  # espacios con modulos por defecto
        for empresa in Empresa:
            requisitos.listar(db, empresa)  # catalogo generico de documentos
            _publicacion(
                db, empresa, Audiencia.PARTNERS, "bienvenida-partners", f"Bienvenido a {espacios.NOMBRES[empresa]}",
                "Como trabajamos con nuestros distribuidores y clientes.",
            )
        _publicacion(
            db, Empresa.GABAME, Audiencia.PACIENTES, "nuestras-marcas", "Nuestras marcas",
            "Las marcas de GABAME y donde encontrarlas.",
        )

        paciente = _usuario(db, "paciente@local.test", "Ana", "Paciente", Realm.ID)
        _rol(db, paciente, Rol.PACIENTE)

        medico = _usuario(db, "medico@local.test", "Hugo", "Medico", Realm.ID)
        _rol(db, medico, Rol.MEDICO)
        if db.get(PerfilMedico, medico.id) is None:
            db.add(
                PerfilMedico(
                    usuario_id=medico.id,
                    cedula_profesional="00000000",
                    especialidad="Medicina interna",
                    estado=EstadoValidacion.VALIDADO,
                )
            )

        medico_pend = _usuario(db, "medico.pendiente@local.test", "Iris", "Pendiente", Realm.ID)
        _rol(db, medico_pend, Rol.MEDICO)
        if db.get(PerfilMedico, medico_pend.id) is None:
            db.add(
                PerfilMedico(
                    usuario_id=medico_pend.id,
                    cedula_profesional="11111111",
                    estado=EstadoValidacion.PENDIENTE,
                )
            )

        partner = _usuario(db, "partner@local.test", "Distribuidora", "Demo", Realm.PARTNERS)
        _rol(db, partner, Rol.PARTNER)
        if db.get(PerfilPartner, partner.id) is None:
            db.add(PerfilPartner(usuario_id=partner.id, razon_social="Distribuidora Demo SA de CV"))
        _vinculo(db, partner, Empresa.ORDAN, SubtipoPartner.DISTRIBUIDOR, EstadoValidacion.VALIDADO)
        _vinculo(db, partner, Empresa.A7, SubtipoPartner.MAYORISTA, EstadoValidacion.PENDIENTE)

        for empresa in Empresa:
            admin = _usuario(
                db, f"admin.{empresa.value}@local.test", "Admin", empresa.value.upper(), Realm.PARTNERS
            )
            _rol(db, admin, Rol.ADMIN_EMPRESA, empresa)

        editor = _usuario(db, "editor.gabame@local.test", "Editora", "GABAME", Realm.PARTNERS)
        _rol(db, editor, Rol.EDITOR_EMPRESA, Empresa.GABAME)

        grupo = _usuario(db, "admin.grupo@local.test", "Admin", "Grupo", Realm.PARTNERS)
        _rol(db, grupo, Rol.ADMIN_GRUPO)

        db.commit()
    print(f"Seed listo. Contrasena de todos: {PASSWORD}")


if __name__ == "__main__":
    main()
