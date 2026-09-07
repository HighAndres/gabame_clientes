from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Plataforma de Clientes GABAME"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "local"

    DATABASE_URL: str = "postgresql+psycopg://gabame:cambiar_en_local@localhost:5433/clientes_gabame"

    SECRET_KEY: str = "cambiar_en_local"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14

    # Vigencia de los tokens de un solo uso que viajan por correo
    EMAIL_TOKEN_EXPIRE_HOURS: int = 24
    RESET_TOKEN_EXPIRE_MINUTES: int = 60

    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"
    # Base de los enlaces que van en los correos (verificar email, restablecer contrasena)
    FRONTEND_URL: str = "http://localhost:3000"

    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    # STARTTLS cuando hay usuario (SMTP real); Mailhog va sin TLS
    SMTP_TLS: bool = True
    EMAIL_FROM: str = "no-reply@localhost"
    # "smtp" en local (Mailhog); "memoria" en pruebas: los correos se guardan en una lista
    EMAIL_MODO: str = "smtp"

    # Documentos de partners: disco local en dev (fuera del repo); almacenamiento definitivo en despliegue
    UPLOADS_DIR: str = "uploads"
    UPLOAD_MAX_MB: int = 10

    # Limite de intentos en auth (memoria de proceso, nunca persistido). Ver app/core/ratelimit.py
    RATE_LIMIT_ACTIVO: bool = True

    # Aceptar correos @*.test (usuarios del seed). None = solo fuera de produccion; staging lo fuerza a 1
    PERMITIR_TLD_TEST: bool | None = None

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

_SECRETOS_DE_EJEMPLO = {"cambiar_en_local", "generar_con_openssl_rand_hex_32", ""}

if settings.ENVIRONMENT == "production":
    # Salida de local (Fase 7): un despliegue con secretos de ejemplo no arranca.
    if settings.SECRET_KEY in _SECRETOS_DE_EJEMPLO or len(settings.SECRET_KEY) < 32:
        raise RuntimeError("SECRET_KEY invalida para produccion: genera una de 32+ bytes")
    if "cambiar_en_local" in settings.DATABASE_URL:
        raise RuntimeError("DATABASE_URL de produccion con credenciales de ejemplo")

# Los correos del seed usan el TLD reservado `.test` (@local.test), que email-validator rechaza
# por defecto. Se permite en local y, explicitamente, en staging (PERMITIR_TLD_TEST=1).
# En produccion real no: ninguna cuenta de prueba debe poder entrar.
_permitir_tld_test = (
    settings.PERMITIR_TLD_TEST
    if settings.PERMITIR_TLD_TEST is not None
    else settings.ENVIRONMENT != "production"
)
if _permitir_tld_test:
    import email_validator

    email_validator.TEST_ENVIRONMENT = True
