from enum import StrEnum


class Realm(StrEnum):
    """Los dos realms confirmados en ADR-0001."""

    ID = "id"            # personas: pacientes/consumidores y medicos
    PARTNERS = "partners"  # empresas: distribuidores, mayoristas, institucionales


class Rol(StrEnum):
    PACIENTE = "paciente"
    MEDICO = "medico"
    PARTNER = "partner"
    ADMIN_EMPRESA = "admin_empresa"    # aprueba cuentas y revisa documentos de su empresa
    EDITOR_EMPRESA = "editor_empresa"  # edita contenido y contactos de su empresa; no aprueba
    ADMIN_GRUPO = "admin_grupo"


class Empresa(StrEnum):
    GABAME = "gabame"
    MEDINTER = "medinter"
    ORDAN = "ordan"
    A7 = "a7"


class Producto(StrEnum):
    """Piezas del ecosistema digital del grupo.

    Distinto de `Empresa`: Empresa son las 4 entidades corporativas y sirve para el alcance
    de los admins. Producto son las propiedades digitales, e incluye las tiendas, que no son
    empresas del grupo sino productos de GABAME y de Ordan.
    """

    GABAME = "gabame"                # gabame.com
    MEDINTER = "medinter"            # medinter.com.mx
    ORDAN = "ordan"                  # ordan.com.mx
    A7 = "a7"                        # a7siete.com
    TIENDAGABAME = "tiendagabame"    # tiendagabame.com — Farmacias GABAME
    AURASHOP = "aurashop"            # marketplace de belleza de Ordan
    APP_PACIENTE = "app_paciente"    # MB-V005, aun no existe
    DIRECTO = "directo"              # llego al portal sin pasar por otra pieza


class EventoOrigen(StrEnum):
    """Por que se registro este contacto con una pieza del ecosistema."""

    REGISTRO = "registro"    # primer alta de la cuenta
    LOGIN = "login"          # inicio de sesion entrando desde esa pieza
    RETORNO = "retorno"      # volvio al portal desde esa pieza ya con cuenta


class EstadoValidacion(StrEnum):
    PENDIENTE = "pendiente"
    VALIDADO = "validado"
    RECHAZADO = "rechazado"


class SubtipoPartner(StrEnum):
    DISTRIBUIDOR = "distribuidor"
    MAYORISTA = "mayorista"
    INSTITUCIONAL = "institucional"


class TipoCuenta(StrEnum):
    """Bifurcacion del onboarding (Fase 2). Determina realm, rol y perfil inicial.

    No es un rol: es lo que la persona declara al registrarse. Los admins nunca nacen aqui.
    """

    PACIENTE = "paciente"        # realm id, rol paciente
    PROFESIONAL = "profesional"  # realm id, rol medico + PerfilMedico pendiente
    EMPRESA = "empresa"          # realm partners, rol partner + PerfilPartner pendiente


class TipoToken(StrEnum):
    """Tokens de un solo uso que viajan por correo."""

    EMAIL = "email"
    RESET_PASSWORD = "reset_password"


class Modulo(StrEnum):
    """Modulos que un espacio de empresa puede tener habilitados (ADR-0008)."""

    CUENTAS = "cuentas"            # aprobar vinculos de partners
    DOCUMENTOS = "documentos"      # revisar documentos de partners
    CONTACTOS = "contactos"        # contactos comerciales y portal operativo
    CONTENIDO_RX = "contenido_rx"  # fichas tecnicas para medicos validados (solo GABAME)


class Audiencia(StrEnum):
    """A quien va dirigida una publicacion de un espacio (corte 3)."""

    PACIENTES = "pacientes"  # cualquier persona con sesion
    MEDICOS = "medicos"      # solo medicos validados
    PARTNERS = "partners"    # solo partners con vinculo aprobado con esa empresa
