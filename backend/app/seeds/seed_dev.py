"""Seed local: un usuario dummy por rol. Solo para desarrollo. Idempotente.

    python -m app.seeds.seed_dev

Contrasena de todos: Local123!
"""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import Empresa, EstadoValidacion, EventoOrigen, Realm, Rol, SubtipoPartner
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import PerfilMedico, PerfilPartner, Usuario, UsuarioRol
from app.services.origen import registrar_origen

PASSWORD = "Local123!"


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


def main() -> None:
    with SessionLocal() as db:
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
            db.add(
                PerfilPartner(
                    usuario_id=partner.id,
                    razon_social="Distribuidora Demo SA de CV",
                    subtipo=SubtipoPartner.DISTRIBUIDOR,
                    empresa_objetivo=Empresa.ORDAN,
                    estado=EstadoValidacion.VALIDADO,
                )
            )

        for empresa in Empresa:
            admin = _usuario(
                db, f"admin.{empresa.value}@local.test", "Admin", empresa.value.upper(), Realm.PARTNERS
            )
            _rol(db, admin, Rol.ADMIN_EMPRESA, empresa)

        grupo = _usuario(db, "admin.grupo@local.test", "Admin", "Grupo", Realm.PARTNERS)
        _rol(db, grupo, Rol.ADMIN_GRUPO)

        db.commit()
    print(f"Seed listo. Contrasena de todos: {PASSWORD}")


if __name__ == "__main__":
    main()
