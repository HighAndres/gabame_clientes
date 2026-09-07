"""Errores de negocio.

Los servicios los lanzan; `app/main.py` los traduce a JSON con la forma
`{"detail": {"codigo": ..., "mensaje": ...}}` para que el frontend decida por `codigo`
y no por texto.
"""


class ErrorNegocio(Exception):
    status: int = 400
    codigo: str = "error"
    mensaje_por_defecto: str = "Error"

    def __init__(self, mensaje: str | None = None) -> None:
        self.mensaje = mensaje or self.mensaje_por_defecto
        super().__init__(self.mensaje)


class CredencialesInvalidas(ErrorNegocio):
    status = 401
    codigo = "credenciales_invalidas"
    mensaje_por_defecto = "Correo o contrasena incorrectos."


class EmailNoVerificado(ErrorNegocio):
    status = 403
    codigo = "email_no_verificado"
    mensaje_por_defecto = "Confirma tu correo antes de iniciar sesion."


class CuentaInactiva(ErrorNegocio):
    status = 403
    codigo = "cuenta_inactiva"
    mensaje_por_defecto = "Esta cuenta esta desactivada."


class EmailYaRegistrado(ErrorNegocio):
    status = 409
    codigo = "email_ya_registrado"
    mensaje_por_defecto = "Ya existe una cuenta con ese correo."


class TokenInvalido(ErrorNegocio):
    status = 400
    codigo = "token_invalido"
    mensaje_por_defecto = "El enlace no es valido o ya expiro."


class SesionInvalida(ErrorNegocio):
    status = 401
    codigo = "sesion_invalida"
    mensaje_por_defecto = "La sesion ya no es valida. Inicia sesion de nuevo."
