"""Envio de correo. En local sale por SMTP a Mailhog; en pruebas se guarda en memoria.

Los tokens que viajan en los enlaces nunca se loguean.
"""

import smtplib
from email.message import EmailMessage

from app.core.config import settings
from app.models import Usuario

# Solo se usa cuando EMAIL_MODO == "memoria" (pruebas).
bandeja_memoria: list[dict[str, str]] = []


def enviar_correo(destinatario: str, asunto: str, texto: str) -> None:
    if settings.EMAIL_MODO == "memoria":
        bandeja_memoria.append({"para": destinatario, "asunto": asunto, "texto": texto})
        return

    msg = EmailMessage()
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = destinatario
    msg["Subject"] = asunto
    msg.set_content(texto)
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
        smtp.send_message(msg)


def enviar_verificacion_email(usuario: Usuario, token: str) -> None:
    enlace = f"{settings.FRONTEND_URL}/verificar-email?token={token}"
    texto = (
        f"Hola {usuario.nombre},\n\n"
        "Gracias por crear tu Cuenta GABAME. Confirma tu correo con este enlace:\n\n"
        f"{enlace}\n\n"
        f"El enlace vence en {settings.EMAIL_TOKEN_EXPIRE_HOURS} horas. "
        "Si no creaste esta cuenta, ignora este mensaje.\n"
    )
    enviar_correo(usuario.email, "Confirma tu correo - Cuenta GABAME", texto)


def enviar_reset_password(usuario: Usuario, token: str) -> None:
    enlace = f"{settings.FRONTEND_URL}/restablecer?token={token}"
    texto = (
        f"Hola {usuario.nombre},\n\n"
        "Recibimos una solicitud para restablecer tu contrasena. Usa este enlace:\n\n"
        f"{enlace}\n\n"
        f"El enlace vence en {settings.RESET_TOKEN_EXPIRE_MINUTES} minutos. "
        "Si no fuiste tu, ignora este mensaje: tu contrasena no cambia.\n"
    )
    enviar_correo(usuario.email, "Restablecer contrasena - Cuenta GABAME", texto)


def enviar_medico_validado(usuario: Usuario) -> None:
    texto = (
        f"Hola {usuario.nombre},\n\n"
        "Tu acreditacion como profesional de la salud fue validada. Ya tienes acceso al area "
        f"medica de tu Cuenta GABAME:\n\n{settings.FRONTEND_URL}/medico\n"
    )
    enviar_correo(usuario.email, "Acreditacion validada - Cuenta GABAME", texto)


def enviar_medico_rechazado(usuario: Usuario, motivo: str) -> None:
    texto = (
        f"Hola {usuario.nombre},\n\n"
        "No pudimos validar tu acreditacion como profesional de la salud.\n"
        f"Motivo: {motivo}\n\n"
        "Si crees que es un error, responde a este correo o contacta al equipo del grupo.\n"
    )
    enviar_correo(usuario.email, "Acreditacion no validada - Cuenta GABAME", texto)


def enviar_partner_aprobado(usuario: Usuario) -> None:
    texto = (
        f"Hola {usuario.nombre},\n\n"
        "Tu cuenta GABAME Partners fue aprobada. Ya puedes entrar a tu area:\n\n"
        f"{settings.FRONTEND_URL}/partner\n"
    )
    enviar_correo(usuario.email, "Cuenta Partners aprobada - Cuenta GABAME", texto)


def enviar_partner_rechazado(usuario: Usuario, motivo: str) -> None:
    texto = (
        f"Hola {usuario.nombre},\n\n"
        "Tu solicitud de cuenta GABAME Partners no fue aprobada.\n"
        f"Motivo: {motivo}\n\n"
        "Si crees que es un error, contacta al equipo comercial de la empresa correspondiente.\n"
    )
    enviar_correo(usuario.email, "Cuenta Partners no aprobada - Cuenta GABAME", texto)
