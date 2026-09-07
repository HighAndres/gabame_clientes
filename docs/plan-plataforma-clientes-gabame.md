# Plan de trabajo — Plataforma de Clientes GABAME (portal unificado)

> Interno Mirmibug. Un solo sitio que concentra a clientes y médicos de las 4 empresas del grupo (GABAME, Medinter, Ordan, A7). Arranque 100% local; repo y despliegue después. Stack estándar Mirmibug: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui; FastAPI + PostgreSQL + SQLAlchemy 2.0 + Alembic.

## Concepto

Los 4 sitios corporativos tienen "Portal de clientes" como placeholder. En lugar de 4 portales, se construye **una plataforma única** que además se convierte, con el tiempo, en la identidad central del grupo ("Cuenta GABAME"). Los sitios corporativos y las tiendas solo enlazan hacia ella; nunca comparten backend (regla de independencia intacta — la plataforma es un servicio más, consumido vía OIDC en el futuro).

Dos realms, como el modelo ya propuesto:

- **GABAME ID** — personas: pacientes/consumidores y médicos validados.
- **GABAME Partners** — empresas: distribuidores, mayoristas, clientes institucionales.

---

## Fase 0 — Decisiones y pendientes

| # | Pendiente | Quién | Bloquea |
|---|-----------|-------|---------|
| 0.1 | Confirmar el modelo de dos realms (GABAME ID / Partners) — estaba propuesto sin confirmar | Andrés | Fase 1 |
| 0.2 | Definir qué ve cada rol por empresa en v1 (matriz roles × empresas × contenido) | Andrés propone, cliente valida | Fase 3 |
| 0.3 | Mecanismo de validación de médicos: captura de cédula + aprobación manual (A) vs. verificación contra registro (B) | Mauricio | Fase 4 |
| 0.4 | Requisitos documentales por tipo de partner (distribuidor Ordan/A7, institucional Medinter, mayorista) | Cliente | Fase 5 |
| 0.5 | Contenido médico (fichas técnicas Rx) — viene del área médica/regulatoria de GABAME | Jimena | Fase 4 (placeholders mientras) |
| 0.6 | Dominio del portal (p.ej. portal.gabame.com o id.gabame.com) | Andrés + cliente | Despliegue, no bloquea local |
| 0.7 | Dónde clasificar a compradores B2B de las tiendas (pregunta abierta del modelo de identidad) | Andrés | Fase 6 |

## Fase 1 — Fundación local

- [ ] Monorepo local: `frontend/` (Next.js 14) + `backend/` (FastAPI) + `docker-compose` con PostgreSQL. Sin credenciales reales; `.env.example` documentado.
- [ ] Modelo de usuario con id estable (UUID), email verificado, realm (`id` / `partners`) y roles como claims — diseñado desde el día uno para emitir OIDC después.
- [ ] Roles v1: `paciente`, `medico` (con estado: pendiente/validado/rechazado), `partner` (con subtipo: distribuidor/mayorista/institucional y estado de aprobación), `admin_grupo`, `admin_empresa` (por cada una de las 4).
- [ ] Regla dura de datos: **cero datos clínicos en la plataforma de identidad**. Farmacovigilancia y recetas viven en sus sistemas propios; aquí solo perfil, validación y permisos (LFPDPPP).
- [ ] Migraciones Alembic desde el inicio; seed local con usuarios dummy de cada rol.

## Fase 2 — Auth y cuentas

- [ ] Registro/login con verificación de email; recuperación de contraseña.
- [ ] Onboarding con bifurcación: "Soy paciente/consumidor" / "Soy profesional de la salud" / "Soy empresa o distribuidor" → asigna realm y flujo.
- [ ] Sesiones y permisos por rol (middleware en Next + dependencias en FastAPI).

## Fase 3 — Dashboard por rol

- [ ] Shell del portal con navegación según rol y empresa (matriz de 0.2).
- [ ] Paciente/consumidor: perfil, marcas del grupo, accesos a tiendas (enlaces, no integración).
- [ ] Médico validado: acceso al contenido técnico (Fase 4).
- [ ] Partner: estado de cuenta/documentos, contactos comerciales por empresa, accesos a portales operativos.
- [ ] Admin por empresa: solo sus usuarios y su contenido; admin de grupo ve todo.

## Fase 4 — Área médica (el "Conocer más" de gabame.com aterriza aquí)

- [ ] Flujo de validación profesional según 0.3, con trazabilidad de quién aprobó y cuándo.
- [ ] Fichas técnicas del portafolio Rx en seis áreas terapéuticas, con placeholders hasta recibir 0.5. Los datos del Acordeón interno no se usan sin validación del cliente.
- [ ] Interstitial "contenido exclusivo para profesionales de la salud".
- [ ] Sin campos de comentarios en el registro (eso vive en Contacto de cada sitio corporativo).

## Fase 5 — Área partners

- [ ] Registro con carga de documentación por subtipo (0.4) y cola de aprobación manual.
- [ ] Vistas por empresa: Medinter (institucional/licitaciones), Ordan y A7 (distribuidores), GABAME (mayoristas).

## Fase 6 — Evolución a SSO del grupo (fase futura, solo se deja preparado)

- [ ] Emitir OIDC (authorization code + PKCE) para que gabame.com, tiendagabame y Aurashop deleguen su login aquí.
- [ ] Migración de cuentas locales de las tiendas → Cuenta GABAME (por eso ids estables y roles como claims desde Fase 1).
- [ ] Resolver 0.7 (B2B de tiendas → realm Partners).

## Fase 7 — QA y salida de local

- [ ] Pruebas de permisos: cada rol solo ve lo suyo; admin de una empresa no ve otra; nadie no-validado ve contenido médico.
- [ ] Verificar cero datos clínicos en la BD de la plataforma.
- [ ] WCAG 2.1 AA; bilingüe preparado (next-intl) aunque v1 sea solo ES.
- [ ] Crear repo, CI básico y despliegue a VPS (infraestructura genérica en docs de cliente, como siempre).

## Orden

1. Fases 1–2 arrancan ya en local; solo necesitan tu confirmación de 0.1.
2. Fase 3 con matriz provisional; se ajusta cuando el cliente valide 0.2.
3. Fase 4 espera 0.3 para el flujo real (estructura con placeholders desde antes); Fase 5 espera 0.4.
4. Fase 6 no se construye ahora — solo se respetan sus prerequisitos de diseño.
