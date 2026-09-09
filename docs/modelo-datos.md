# Modelo de datos v1

## Enums

| Enum | Valores |
|---|---|
| `Realm` | `id`, `partners` |
| `Rol` | `paciente`, `medico`, `partner`, `admin_empresa`, `admin_grupo` |
| `Empresa` | `gabame`, `medinter`, `ordan`, `a7` |
| `Producto` | `gabame`, `medinter`, `ordan`, `a7`, `tiendagabame`, `aurashop`, `app_paciente`, `directo` |
| `EventoOrigen` | `registro`, `login`, `retorno` |
| `EstadoValidacion` | `pendiente`, `validado`, `rechazado` |
| `SubtipoPartner` | `distribuidor`, `mayorista`, `institucional` |
| `TipoCuenta` | `paciente`, `profesional`, `empresa` — bifurcacion del onboarding, no es rol |
| `TipoToken` | `email`, `reset_password` |

Los enums de Postgres guardan el **valor** (`paciente`), no el nombre del miembro (`PACIENTE`):
helper `enum_valores()` en `app/db/base.py`. Asi BD, claims del token y frontend hablan igual.

## Tablas

### `usuarios`
| Campo | Tipo | Nota |
|---|---|---|
| `id` | UUID PK | estable, nunca se regenera (prerequisito OIDC) |
| `email` | text | llave de reconciliacion; se normaliza a minusculas al entrar y la BD lo protege con indice unico `lower(email)`. No se cambia sin re-verificar (inmutable en Fase 2) |
| `email_verificado_en` | timestamptz null | |
| `password_hash` | text | argon2 |
| `nombre`, `apellidos` | text | |
| `telefono` | text null | |
| `realm` | Realm | |
| `activo` | bool | |
| `origen_inicial` | Producto | primer contacto; se escribe una vez y no se toca |
| `creado_en`, `actualizado_en` | timestamptz | |

### `usuario_roles`
Un usuario puede tener varios roles (p.ej. admin de dos empresas).
`id`, `usuario_id` FK, `rol` Rol, `empresa` Empresa null (solo para `admin_empresa`), `creado_en`.
Unico: (`usuario_id`, `rol`, `empresa`).

### `perfiles_medico`
`usuario_id` PK/FK, `cedula_profesional`, `especialidad`, `institucion`, `estado` EstadoValidacion,
`validado_por_id` FK null, `validado_en` null, `motivo_rechazo` null.
Trazabilidad obligatoria de quien aprobo y cuando.

### `perfiles_partner`
`usuario_id` PK/FK, `razon_social`, `rfc`. Solo lo que es de la razon social; la relacion con cada
empresa del grupo vive en `vinculos_empresa` (ADR-0008).

### `vinculos_empresa` (ADR-0008)
`id`, `usuario_id` FK, `empresa` Empresa, `tipo` SubtipoPartner, `estado` EstadoValidacion,
`aprobado_por_id` FK null, `aprobado_en` null, `motivo_rechazo` null. Unico por (`usuario_id`, `empresa`).
Un partner puede estar aprobado con una empresa y en revision con otra; cada vinculo lo decide el
admin de esa empresa y deja bitacora `vinculo_<estado>`.

### `espacios` (ADR-0008)
`empresa` PK Empresa, `nombre`, `modulos` JSONB (lista de `Modulo`: `cuentas`, `documentos`, `contactos`,
`contenido_rx`), `contacto_nombre`, `contacto_email`, `contacto_telefono`, `portal_url`. Configuracion de
cada empresa dentro del portal; lo que no esta en `modulos` responde 403 `modulo_no_habilitado`.

### `documentos_partner` (ADR-0006)
`id`, `partner_id` FK, `tipo` (clave del catalogo provisional `requisitos_partner.py`, pendiente 0.4),
`nombre_archivo` (saneado, solo metadato), `ruta` (relativa a `UPLOADS_DIR`, nombre aleatorio), `content_type`,
`tamano_bytes`, `estado` EstadoValidacion, `motivo_rechazo` null, `revisado_por_id` FK null, `revisado_en` null,
`subido_en`. Los archivos van a disco local en dev (gitignored); almacenamiento definitivo en Fase 7.

### `tokens_verificacion`
`id`, `usuario_id` FK, `tipo` (`email` | `reset_password`), `token_hash` (SHA-256, nunca el token),
`expira_en`, `usado_en`. Un solo uso; emitir uno nuevo invalida los previos del mismo tipo.

### `sesiones_refresh` (ADR-0002)
`id`, `usuario_id` FK, `token_hash` unico (SHA-256), `expira_en`, `revocado_en` null,
`reemplazada_por_id` null, `creado_en`. Refresh rotativo: cada uso revoca la fila y crea otra.
Reutilizar un refresh ya rotado revoca todas las sesiones del usuario. Sin IP ni user agent.

### `origenes_usuario`
Append-only. Historial de por qué pieza del ecosistema entró el usuario al portal.
`id`, `usuario_id` FK, `producto` Producto, `evento` EventoOrigen, `ruta_entrada` text null,
`campana` text null, `creado_en`.

Un usuario que llega por gabame.com, vuelve desde tiendagabame.com y luego desde Ordan son
**tres filas**, no un campo sobrescrito. `usuarios.origen_inicial` es el primer contacto,
guardado por comodidad de consulta; la fuente de verdad es esta tabla.

Privacidad: solo pieza de origen, ruta de entrada (path, nunca URL con query string) y campaña.
**Sin IP, sin user agent, sin huella de dispositivo.** Esta tabla explica de dónde vino la persona
dentro del ecosistema del grupo, no la rastrea fuera de él.

### `areas_terapeuticas` (ADR-0005)
`id`, `slug` unico, `nombre`, `descripcion` null, `orden`, `publicada`, timestamps.

### `fichas_tecnicas` (ADR-0005)
`id`, `area_id` FK, `slug` (unico por area), `nombre`, `resumen` null, `contenido` text (markdown),
`publicada`, timestamps. Informacion de PRODUCTO para profesionales validados; sin relacion con
usuarios ni pacientes. La estructura de campos se formaliza cuando llegue 0.5.

### `bitacora_validacion`
Append-only. `id`, `actor_id`, `objetivo_id`, `accion`, `detalle` jsonb, `creado_en`.

## Lo que NO existe aqui

Recetas, diagnosticos, reportes de farmacovigilancia, historial de compra, datos de pago.
Si una tabla necesita uno de estos campos, la decision esta mal planteada.
