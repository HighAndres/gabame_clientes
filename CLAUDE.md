# CLAUDE.md — Plataforma de Clientes GABAME

Contexto permanente del repo. Léelo antes de escribir cualquier código.

## Qué es esto

Portal unificado de clientes y médicos de las 4 empresas del grupo GABAME (GABAME, Medinter, Ordan, A7).
Interno de **Mirmibug IT Solutions** para el cliente **GABAME Human Health**. Desarrollo 100% local;
repo remoto y despliegue vienen después (Fase 7).

En vez de 4 portales de cliente separados se construye **una sola plataforma**, que con el tiempo se
convierte en la identidad central del grupo ("Cuenta GABAME"). Los sitios corporativos y las tiendas
solo enlazan hacia ella.

Plan de trabajo completo: `docs/plan-plataforma-clientes-gabame.md`. Arquitectura: `docs/arquitectura.md`.
Modelo de datos: `docs/modelo-datos.md`. Decisiones cerradas: `docs/decisiones/`. Salida de local: `docs/despliegue.md`.
Staging para validación del cliente (VPS de Mirmibug, datos de prueba): `docs/staging.md`, `docker-compose.staging.yml`,
`deploy/Caddyfile`, `scripts/staging.sh`. Producción va en infraestructura del cliente, nunca en staging.

## El ecosistema: esta plataforma no vive sola

Todo el ecosistema digital del grupo funciona **en conjunto**, y esta plataforma es su columna
vertebral de identidad. Piezas:

| Pieza | Folio | Relación con esta plataforma |
|---|---|---|
| gabame.com | MB-V002 | Sitio ancla del grupo. Su "Conocer más" y su "Portal de clientes" aterrizan aquí. Origen principal del tráfico de médicos |
| medinter.com.mx | MB-V002 | "Portal de clientes" → aquí. Público institucional y de licitaciones |
| ordan.com.mx | MB-V002 | "Portal de clientes" → aquí. Distribuidores de Babé y Sheglam |
| a7siete.com | MB-V002 | "Portal de clientes" → aquí. Socios de logística y distribución |
| tiendagabame.com (Farmacias GABAME) | MB-V004 | Marketplace Rx/OTC, B2C y B2B. Hoy cuentas locales propias; en Fase 6 delega login aquí |
| Aurashop (Ordan) | MB-V003 | Marketplace de belleza. Mismo camino que tiendagabame |
| App de paciente | MB-V005 | Consumirá esta identidad cuando exista |

**Cómo se conectan** (v1): por **enlace**. Cada sitio manda al usuario aquí y esta plataforma lo
devuelve a donde venía. Nada más.

**Cómo se conectarán** (Fase 6): por **OIDC**. Esta plataforma emite; los demás delegan su login.
Por eso el UUID es estable, el email verificado es la llave de reconciliación para migrar las
cuentas locales de las tiendas, y los roles viajan como claims desde hoy.

**Cómo NO se conectan, nunca:** backend compartido, base de datos compartida, tablas cruzadas,
consultas de un producto a la BD de otro. La regla 2 de abajo no se relaja por conveniencia.
Integrar el ecosistema significa identidad común y navegación coherente — no acoplamiento técnico.

Consecuencia práctica para el diseño: el usuario percibe **una sola cuenta** para todo el grupo.
Devuélvelo al sitio del que vino al terminar y no lo hagas sentir que entró a un producto distinto.
**Pero no se lo digas:** que todo esté centralizado es una decisión interna del grupo para su manejo.
Ninguna pantalla ni correo dice "una sola cuenta", "un solo acceso" ni "acceso a todo el grupo". El copy
habla de lo que la persona obtiene (entrar, verificar su correo, marcas y tiendas, área médica), nunca de
la arquitectura de identidad. "Cuenta GABAME" como nombre sí se usa.
La marca del portal es la del **grupo**, no la de una empresa: no adoptes la paleta de Medinter,
Ordan ni A7 aquí.

El recorrido entre piezas se registra en `origenes_usuario` (append-only): cada entrada al portal
desde una pieza del ecosistema es una fila, no un campo que se sobrescribe. `usuarios.origen_inicial`
guarda el primer contacto por comodidad, pero la fuente de verdad es la tabla. Se registra pieza,
ruta de entrada y campaña; **nunca** IP, user agent ni huella de dispositivo — esto explica de dónde
vino la persona dentro del grupo, no la rastrea fuera de él.

Ojo con la distinción: `Empresa` son las 4 entidades corporativas y sirve para el alcance de los
admins. `Producto` son las propiedades digitales e incluye las tiendas, que no son empresas del grupo
sino productos de GABAME y de Ordan. No los mezcles.

## Reglas duras (no negociables)

1. **Cero datos clínicos en esta base de datos.** Nada de recetas, diagnósticos, farmacovigilancia ni
   historial de medicación. Eso vive en los sistemas de las tiendas y en el módulo de farmacovigilancia,
   que son independientes. Aquí solo: identidad, perfil, validación profesional, documentos de partner
   y permisos (LFPDPPP). Si una tabla necesita uno de esos campos, la decisión está mal planteada — dilo
   en vez de implementarlo.
2. **Independencia total entre productos.** Esta plataforma nunca comparte backend ni base de datos con
   gabame.com, medinter.com.mx, ordan.com.mx, a7siete.com, tiendagabame.com ni Aurashop. Es un servicio
   más, que en Fase 6 se consumirá vía OIDC.
3. **Ids estables y roles como claims desde el día uno.** `usuarios.id` es UUID, nunca se regenera ni se
   reusa. `realm`, `roles` y `empresas` se emiten como claims del token. Ninguna decisión de Fases 1–5
   puede cerrar la puerta al OIDC de Fase 6.
4. **Cero credenciales reales en el repo.** Solo `.env.example`. Nada de IPs de servidor, nombres de
   herramientas internas ni secretos en código o docs.
5. **Los permisos se resuelven en dependencias**, nunca con `if` sueltos dentro de un handler. Backend:
   `app/api/deps.py`. Frontend: `src/middleware.ts` + guardas de layout.
6. **Farmacovigilancia aislada** de cualquier flujo comercial de leads y de cualquier agente IA de ventas.

## Stack (homologado Mirmibug, no cambiar sin decisión explícita)

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, next-intl |
| Backend | FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, argon2 |
| BD | PostgreSQL 16 vía docker-compose (puerto 5433) |
| Correo local | Mailhog (`http://localhost:8025`) |

## Modelo de identidad (ADR-0001, confirmado)

Dos realms en una sola plataforma. Un usuario pertenece a **un solo** realm:

- `id` — **GABAME ID**: pacientes/consumidores y médicos validados.
- `partners` — **GABAME Partners**: distribuidores, mayoristas, clientes institucionales.

Autorización = tres ejes combinados: **realm** × **rol** × **empresa**.

- Roles: `paciente`, `medico`, `partner`, `admin_empresa`, `admin_grupo`.
- Empresas: `gabame`, `medinter`, `ordan`, `a7`.
- `admin_empresa` solo ve usuarios y contenido de su empresa. `admin_grupo` ve todo.
- Un `medico` con estado distinto de `validado` **no** ve contenido técnico Rx. Sin excepciones.

Los enums viven en `backend/app/core/enums.py` y su espejo en `frontend/src/types/auth.ts`.
**Si cambias uno, cambia el otro en el mismo commit.** En BD se guarda el *valor* del enum
(`paciente`, no `PACIENTE`): usa siempre `enum_valores()` de `app/db/base.py` en los modelos. Los tipos
enum de Postgres compartidos por varias tablas se crean una sola vez en la migración (`create_type=False`
en las columnas).

### El rol `medico` es el crítico del proyecto

Es la razón de ser del portal: el "Conocer más" de gabame.com aterriza aquí y el contenido técnico Rx
solo existe para profesionales de la salud acreditados. Es también el único rol con **ciclo de vida**
propio — los demás nacen con sus permisos, este los gana. Tratarlo como un rol más es el error
de diseño más probable de este proyecto.

- Un `medico` **no** es un usuario con una casilla marcada: es un usuario + un `PerfilMedico` con
  estado `pendiente` | `validado` | `rechazado`. El rol sin perfil validado no otorga nada.
- La única puerta al contenido técnico es `require_medico_validado` en `app/api/deps.py`.
  Ningún endpoint de contenido Rx se expone sin ella, ni "temporalmente" para probar.
- El frontend **no** es la puerta. Ocultar un enlace no es un permiso: el backend rechaza igual.
- Toda transición de estado (validar, rechazar) deja registro en `bitacora_validacion`: quién aprobó,
  cuándo y por qué. Es requisito, no auditoría opcional.
- La cédula profesional es dato personal sensible: se guarda, no se expone en respuestas públicas ni
  en tokens, y nunca se loguea.
- Ni el perfil médico ni ninguna tabla relacionada guarda pacientes, recetas o diagnósticos. La
  acreditación del profesional es lo único que vive aquí.
- **Pendiente 0.3**: el mecanismo real de validación (captura de cédula + aprobación manual vs.
  verificación contra registro) no está decidido. Construye el flujo con aprobación manual y el punto
  de verificación aislado en un servicio (`app/services/`) para poder cambiarlo sin tocar el resto.

## Estructura

```
backend/          FastAPI
  app/core/       config, enums, security (hashing + JWT con claims OIDC-ready)
  app/db/         Base declarativa, sesión
  app/models/     usuario, medico, partner, auditoria, token, sesion, origen, contenido
  app/schemas/    Pydantic v2 (auth, usuario, comun)
  app/api/deps.py require_role / require_empresa / require_medico_validado
  app/core/errores.py  ErrorNegocio -> {detail: {codigo, mensaje}}; el frontend decide por codigo
  app/core/matriz.py   alcance provisional de admins (ADR-0004, pendiente 0.2); espejo en src/lib/matriz-roles.ts
  app/core/ecosistema.py catálogo de piezas del grupo (solo enlaces), expuesto en GET /ecosistema
  app/core/requisitos_partner.py requisitos documentales por subtipo (provisional 0.4) y contactos por empresa (placeholder)
  app/core/ratelimit.py  límite de intentos en memoria por IP y por cuenta; nunca persistido ni logueado (ADR-0007)
  app/services/   cuentas, sesion, tokens, origen, correo, validacion (transiciones + bitácora), validacion_medica (criterio 0.3), contenido (áreas/fichas Rx), documentos (archivos de partners en UPLOADS_DIR)
  app/api/v1/     router.py + routers/{auth,usuarios,medicos,partners,admin}.py
  app/seeds/      seed_dev.py — un usuario dummy por rol
  alembic/        migraciones
frontend/         Next.js 14
  src/app/(auth)/    login, registro, verificar-email, recuperar
  src/app/(portal)/  dashboard, perfil, medico, partner, admin
  src/middleware.ts  puerta de sesión y rol (verifica JWT con jose, rota refresh)
  src/lib/api.ts     cliente HTTP del backend (ApiError con codigo)
  src/lib/redirect.ts   destinoSeguro(): única función que decide un redirect (ADR-0003)
  src/lib/dominios-grupo.ts allowlist de dominios del grupo
  src/lib/origen.ts  lee ?origen=&ruta=&campana= (espejo de la validación del backend)
  src/lib/sesion.ts  cookies httpOnly, leerSesion / leerUsuarioActual (server-only)
  src/lib/matriz-roles.ts espejo de app/core/matriz.py: navegación y alcance para renderizar
  src/i18n/request.ts + src/messages/es.json  next-intl sin enrutado por locale; cadenas del shell
  src/app/api/sesion/route.ts  único lugar del frontend que ve tokens en claro
  src/app/api/backend/[...path]  proxy genérico al backend con el token de la cookie (lo usan los componentes cliente)
  src/types/auth.ts  espejo de los enums del backend
docs/             plan, arquitectura, modelo de datos, ADRs
scripts/          bootstrap.ps1 (una vez), dev.ps1 (uso diario), staging.sh (VPS)
```

## Comandos

```powershell
docker compose up -d                    # Postgres + Mailhog
cd backend
.\.venv\Scripts\Activate.ps1
alembic revision --autogenerate -m "..."  # tras tocar modelos
alembic upgrade head
python -m app.seeds.seed_dev            # usuarios dummy; password Local123!
uvicorn app.main:app --reload           # http://localhost:8000/docs
pytest
ruff check .

cd frontend
npm run dev                             # http://localhost:3000
npm run typecheck
npm test                                # vitest: destinoSeguro, leerOrigen
npm run build                           # build de produccion (lo corre el CI)
npx shadcn@latest add button input form  # componentes bajo demanda
```

## Estado por fase

| Fase | Estado |
|---|---|
| 0 — Decisiones | **0.1 cerrado** (dos realms). Abiertos: 0.2 matriz roles×empresas, 0.3 validación de médicos, 0.4 documentos de partner, 0.5 contenido médico, 0.6 dominio, 0.7 B2B de tiendas |
| 1 — Fundación local | **Cerrada.** Migración inicial, seed idempotente, pytest contra BD `_test` |
| 2 — Auth y cuentas | **Cerrada** (ADR-0002, ADR-0003). Registro con bifurcación, verificación de email obligatoria, login/refresh rotativo/logout, recuperación, origen append-only, `?redirect=` con allowlist. Email inmutable (cambio con re-verificación queda como pieza aparte) |
| 3 — Dashboard por rol | **Cerrada con matriz provisional** (ADR-0004). Colas de validación de médicos y partners con bitácora y correo, usuarios por alcance, catálogo del ecosistema por enlace. Falta que el cliente valide 0.2 y entregue URLs/contactos |
| 4 — Área médica | **Estructura cerrada** (ADR-0005): áreas y fichas como datos con bandera `publicada`, admin de contenido, render markdown, interstitial. Vacía hasta que el cliente entregue 0.5; criterio de validación sigue en 0.3 |
| 5 — Área partners | **Estructura cerrada** (ADR-0006): carga de documentos con catálogo provisional por subtipo, revisión del admin con alcance y bitácora, contactos y portales como placeholders. Falta que el cliente entregue 0.4, contactos y URLs |
| 6 — SSO del grupo | No se construye. Solo se respetan sus prerrequisitos de diseño |
| 7 — QA y salida de local | **Cerrada en local** (ADR-0007): rate limiting en memoria, guardias de arranque, cabeceras de seguridad, accesibilidad del shell, next-intl preparado, vitest, CI y `docs/despliegue.md`. Faltan del cliente: dominio (0.6) para CSP, y dar de alta el remoto y el VPS |

## Bloqueos: qué hacer

Fases 4 y 5 dependen de decisiones del cliente que aún no llegan. **No inventes el criterio.**
Construye la estructura con placeholders explícitos, marca el punto con un comentario
`# Pendiente 0.X — <qué falta>` y sigue. Los datos clínicos del "Acordeón del Control Gabame"
(material interno de la fuerza de ventas) **no se usan** sin validación del cliente.

## Cómo trabajar aquí

- **Plan antes de código.** Para cualquier cambio no trivial, presenta el plan u opciones nombradas
  (Opción A / Opción B con trade-offs) y espera aprobación antes de generar código.
- Cambios estructurales, no parches cosméticos, cuando algo no funciona.
- Español en código, comentarios, nombres de tabla y UI. Los términos técnicos quedan en inglés.
- Cada decisión de arquitectura que se cierre se escribe como ADR nuevo en `docs/decisiones/`.
  Una decisión no se edita cuando cambia: se supersede.
- Antes de dar algo por terminado: `pytest`, `ruff check .`, `npm run typecheck`, `npm test`, `npm run lint`.
- Los errores de negocio se lanzan como `ErrorNegocio` desde `app/services/`; los routers son delgados.
- Cualquier redirect del frontend pasa por `destinoSeguro()`. Cualquier origen pasa por `OrigenIn`.
- Pruebas de backend: `tests/conftest.py` crea `clientes_gabame_test`; el correo va a `correo.bandeja_memoria`.
