# ADR-0007 — Salida de local: limites de intentos, cabeceras, i18n y CI

- **Fecha:** 2026-09-07
- **Estado:** Aceptado
- **Decide:** Andres Celis (Mirmibug)

## Contexto

Fase 7 pide QA de permisos, cero datos clinicos, WCAG 2.1 AA, bilingue preparado, repo con CI
y despliegue generico. Ademas el cliente pidio que la interfaz no comunique la centralizacion
de identidad ("una sola cuenta para todo el grupo"): es un asunto interno.

## Decisiones

1. **Limite de intentos en memoria** (`app/core/ratelimit.py`). Ventana deslizante por IP y,
   en login, tambien por cuenta. Las claves viven en RAM el tiempo de la ventana: no se
   persisten, no se loguean y no alimentan `origenes_usuario` ni ninguna tabla. Es proteccion,
   no telemetria (coherente con ADR-0003). Por proceso; un backend compartido es un cambio
   local al modulo.
2. **Guardias de arranque en produccion.** Con `ENVIRONMENT=production`, un `SECRET_KEY` de
   ejemplo o corto, o un `DATABASE_URL` con credenciales de ejemplo, impiden arrancar.
3. **Cabeceras de seguridad en Next** (`next.config.mjs`): `X-Frame-Options`,
   `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, sin `X-Powered-By`.
   CSP queda para el despliegue porque depende de los dominios finales (0.6).
4. **Accesibilidad del shell.** Enlace "saltar al contenido", landmarks `header/nav/main`,
   `aria-current` en el enlace activo, menu movil con `details/summary` (funciona sin JS),
   errores de formulario con `role="alert"`, todos los campos con `label`. El resto de WCAG se
   revisa pantalla por pantalla en QA con el cliente.
5. **next-intl sin enrutado por locale.** Un solo locale `es`; las cadenas del shell salen de
   `src/messages/es.json`. Activar `/en` es agregar `en.json`, un middleware de locale y leer
   el idioma en `src/i18n/request.ts`. Las paginas siguen en ES hardcodeado hasta que exista
   un segundo idioma real.
6. **Pruebas del frontend con vitest** para las funciones de seguridad puras
   (`destinoSeguro`, `leerOrigen`). Sin pruebas de UI por ahora.
7. **CI en GitHub Actions** (`.github/workflows/ci.yml`): backend con Postgres de servicio,
   ruff, migraciones y pytest; frontend con lint, typecheck, vitest y build. El repo se crea
   local con `git init`; el remoto y el despliegue los da de alta Mirmibug con el cliente.
8. **Copy sin arquitectura.** Ninguna pantalla ni correo habla de "una sola cuenta" ni de
   "acceso a todo el grupo". Queda escrito en CLAUDE.md.

## Consecuencias

- `docs/despliegue.md` es la guia generica de salida; no contiene IPs ni herramientas internas.
- Pendientes que siguen siendo del cliente: 0.2, 0.3, 0.4, 0.5, 0.6 y los contactos/URLs.
