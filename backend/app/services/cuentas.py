"""Alta de cuentas, verificacion de email y recuperacion de contrasena."""

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.enums import EventoOrigen, Realm, Rol, TipoCuenta, TipoToken
from app.core.errores import EmailYaRegistrado, TokenInvalido
from app.core.security import hash_password
from app.models import PerfilMedico, PerfilPartner, Usuario, UsuarioRol
from app.schemas.auth import RegistroIn
from app.services import correo, validacion_medica
from app.services.origen import registrar_origen
from app.services.sesion import revocar_todas_las_sesiones
from app.services.tokens import consumir_token, emitir_token

# tipo de cuenta declarado -> (realm, rol). Los admins no nacen por registro.
_BIFURCACION: dict[TipoCuenta, tuple[Realm, Rol]] = {
    TipoCuenta.PACIENTE: (Realm.ID, Rol.PACIENTE),
    TipoCuenta.PROFESIONAL: (Realm.ID, Rol.MEDICO),
    TipoCuenta.EMPRESA: (Realm.PARTNERS, Rol.PARTNER),
}


def buscar_por_email(db: Session, email: str) -> Usuario | None:
    return db.scalar(select(Usuario).where(func.lower(Usuario.email) == email.strip().lower()))


def registrar(db: Session, datos: RegistroIn) -> Usuario:
    if buscar_por_email(db, datos.email) is not None:
        raise EmailYaRegistrado()

    realm, rol = _BIFURCACION[datos.tipo_cuenta]
    usuario = Usuario(
        email=datos.email,
        password_hash=hash_password(datos.password),
        nombre=datos.nombre,
        apellidos=datos.apellidos,
        telefono=datos.telefono,
        realm=realm,
    )
    db.add(usuario)
    try:
        db.flush()
    except IntegrityError as exc:
        # Carrera entre dos registros con el mismo email: gana el indice lower(email).
        db.rollback()
        raise EmailYaRegistrado() from exc

    db.add(UsuarioRol(usuario_id=usuario.id, rol=rol))

    if datos.tipo_cuenta == TipoCuenta.PROFESIONAL and datos.perfil_medico:
        resultado = validacion_medica.verificar_cedula(datos.perfil_medico.cedula_profesional)
        db.add(
            PerfilMedico(
                usuario_id=usuario.id,
                cedula_profesional=datos.perfil_medico.cedula_profesional,
                especialidad=datos.perfil_medico.especialidad,
                institucion=datos.perfil_medico.institucion,
                estado=resultado.estado_inicial,
            )
        )
    elif datos.tipo_cuenta == TipoCuenta.EMPRESA and datos.perfil_partner:
        db.add(
            PerfilPartner(
                usuario_id=usuario.id,
                razon_social=datos.perfil_partner.razon_social,
                rfc=datos.perfil_partner.rfc,
                subtipo=datos.perfil_partner.subtipo,
                empresa_objetivo=datos.perfil_partner.empresa_objetivo,
            )
        )

    registrar_origen(db, usuario, EventoOrigen.REGISTRO, datos.origen)
    token = emitir_token(db, usuario, TipoToken.EMAIL)
    db.commit()
    db.refresh(usuario)

    correo.enviar_verificacion_email(usuario, token)
    return usuario


def verificar_email(db: Session, token_plano: str) -> Usuario:
    token = consumir_token(db, token_plano, TipoToken.EMAIL)
    usuario = db.get(Usuario, token.usuario_id)
    if usuario is None:
        raise TokenInvalido()
    if usuario.email_verificado_en is None:
        usuario.email_verificado_en = datetime.now(UTC)
    db.commit()
    return usuario


def reenviar_verificacion(db: Session, email: str) -> None:
    """Silencioso si el correo no existe o ya esta verificado: no se enumeran cuentas."""
    usuario = buscar_por_email(db, email)
    if usuario is None or usuario.email_verificado or not usuario.activo:
        return
    token = emitir_token(db, usuario, TipoToken.EMAIL)
    db.commit()
    correo.enviar_verificacion_email(usuario, token)


def solicitar_reset(db: Session, email: str) -> None:
    """Silencioso si el correo no existe: no se enumeran cuentas."""
    usuario = buscar_por_email(db, email)
    if usuario is None or not usuario.activo:
        return
    token = emitir_token(db, usuario, TipoToken.RESET_PASSWORD)
    db.commit()
    correo.enviar_reset_password(usuario, token)


def restablecer_password(db: Session, token_plano: str, password: str) -> Usuario:
    token = consumir_token(db, token_plano, TipoToken.RESET_PASSWORD)
    usuario = db.get(Usuario, token.usuario_id)
    if usuario is None or not usuario.activo:
        raise TokenInvalido()
    usuario.password_hash = hash_password(password)
    # Abrir el enlace demuestra control del buzon: cuenta como verificacion del email.
    if usuario.email_verificado_en is None:
        usuario.email_verificado_en = datetime.now(UTC)
    # Cambiar la contrasena cierra todas las sesiones abiertas.
    revocar_todas_las_sesiones(db, usuario.id)
    db.commit()
    return usuario
