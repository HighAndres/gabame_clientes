# Arquitectura — Plataforma de Clientes GABAME

## Vision

Un solo portal para las 4 empresas. Los sitios corporativos y las tiendas **enlazan** hacia el;
no comparten backend ni base de datos. Hoy la plataforma autentica solo a si misma; en Fase 6
emite OIDC y los demas productos delegan su login aqui.

```
gabame.com   medinter.com.mx   ordan.com.mx   a7siete.com   tiendagabame.com
     |               |               |              |               |
     └───────────────┴───── enlace (v1) / OIDC (Fase 6) ────────────┘
                                     |
                     Plataforma de Clientes GABAME
                     Next.js 14  ──REST──  FastAPI  ──  PostgreSQL
```

## Capas

- **frontend/** — Next.js 14 App Router. Grupos de ruta `(auth)` y `(portal)`. `middleware.ts`
  resuelve sesion y rol antes de renderizar. UI con shadcn/ui sobre Tailwind.
- **backend/** — FastAPI. Routers versionados en `app/api/v1/`. Permisos como dependencias
  (`require_role`, `require_empresa`), nunca chequeos sueltos dentro del handler.
- **BD** — PostgreSQL. Migraciones Alembic desde la primera tabla.

## Aislamiento de datos (regla dura)

Cero datos clinicos. Nada de recetas, diagnosticos, farmacovigilancia ni historial de
medicacion vive en esta BD. Eso pertenece a los sistemas de las tiendas y al modulo de
farmacovigilancia, que son independientes. Aqui solo: identidad, perfil, validacion
profesional, documentos de partner y permisos.

## Autorizacion

Tres ejes que se combinan:

1. **realm** — `id` | `partners`.
2. **rol** — `paciente`, `medico`, `partner`, `admin_empresa`, `admin_grupo`.
3. **empresa** — `gabame`, `medinter`, `ordan`, `a7` (solo para admins y para el alcance de partners).

Reglas: un `admin_empresa` solo ve usuarios y contenido de su empresa. `admin_grupo` ve todo.
Un `medico` con estado distinto de `validado` no ve contenido tecnico Rx.

## Preparacion para OIDC (Fase 6, no se construye ahora)

- `usuario.id` es UUID estable y nunca se reusa ni se regenera.
- Rol, realm y empresa se emiten como claims, no como joins ad-hoc.
- El email verificado es la llave de reconciliacion para migrar cuentas de las tiendas.
- No se construye el authorization server todavia, pero ninguna decision de Fase 1-5 debe cerrarlo.
