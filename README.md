# Plataforma de Clientes GABAME

Portal unificado de clientes y medicos de las 4 empresas del grupo (GABAME, Medinter, Ordan, A7).
Interno **Mirmibug IT Solutions**. Desarrollo 100% local; repo y despliegue despues.

- Plan de trabajo: [`docs/plan-plataforma-clientes-gabame.md`](docs/plan-plataforma-clientes-gabame.md)
- Arquitectura: [`docs/arquitectura.md`](docs/arquitectura.md)
- Modelo de datos: [`docs/modelo-datos.md`](docs/modelo-datos.md)
- Decisiones (ADR): [`docs/decisiones/`](docs/decisiones/)
- Staging para el cliente: [`docs/staging.md`](docs/staging.md)
- Salida de local: [`docs/despliegue.md`](docs/despliegue.md)

## Reglas duras del proyecto

1. **Cero datos clinicos** en esta plataforma. Solo perfil, validacion y permisos (LFPDPPP).
2. **Independencia de sitios y tiendas**: nunca comparten backend. La plataforma es un servicio mas, consumido via OIDC en el futuro.
3. **Ids estables (UUID) y roles como claims** desde el dia uno, para poder emitir OIDC en Fase 6 sin migrar identidades.
4. Nada de credenciales reales en el repo. Solo `.env.example`.

## Stack

| Capa | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, next-intl |
| Backend | FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2 |
| BD | PostgreSQL 16 (docker-compose) |
| Correo local | Mailhog (`http://localhost:8025`) |

## Arranque local

Prerequisitos: Docker Desktop, Node 20+, Python 3.11+.

Si el puerto 5433 ya esta ocupado en tu maquina, cambia `POSTGRES_PORT` en `.env` y el puerto
de `DATABASE_URL` en `backend/.env` (ambos locales, no se versionan).

`JWT_SECRET` (frontend) debe ser identico a `SECRET_KEY` (backend): el middleware de Next
verifica la firma del access token (ADR-0002).

```powershell
# 0. Entorno
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.local.example frontend\.env.local

# 1. Base de datos y correo
docker compose up -d

# 2. Backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
alembic upgrade head                # crea el esquema
python -m app.seeds.seed_dev        # usuarios dummy de cada rol (password Local123!)
pytest                              # usa la BD clientes_gabame_test, la crea si no existe
uvicorn app.main:app --reload       # http://localhost:8000/docs

# 3. Frontend (otra terminal)
cd frontend
npm install
npm run dev                         # http://localhost:3000
```

## Estructura

```
clientes_gabame/
├─ backend/      FastAPI + SQLAlchemy + Alembic
├─ frontend/     Next.js 14 App Router
├─ docs/         plan, arquitectura, modelo de datos, ADRs
├─ scripts/      utilidades de desarrollo local
└─ docker-compose.yml
```

## Estado por fase

| Fase | Estado |
|---|---|
| 0 — Decisiones | 0.1 confirmado (dos realms). 0.2–0.7 abiertos |
| 1 — Fundacion local | Cerrada: migracion inicial + seed |
| 2 — Auth y cuentas | Cerrada: registro con bifurcacion, verificacion de email, login/refresh/logout, recuperacion, origen y redirect seguro (ADR-0002, ADR-0003) |
| 3 — Dashboard por rol | Cerrada con matriz provisional (ADR-0004): colas de validacion, usuarios por alcance, ecosistema por enlace |
| 4 — Area medica | Estructura cerrada (ADR-0005): contenido Rx como datos, admin de contenido, solo publicado y solo validados. Vacia hasta 0.5 |
| 5 — Area partners | Estructura cerrada (ADR-0006): documentos con catalogo provisional, revision admin, contactos placeholder. Falta 0.4 |
| 6 — SSO del grupo | Solo prerequisitos de diseno |
| 7 — QA y salida de local | Cerrada en local (ADR-0007). Guia: [`docs/despliegue.md`](docs/despliegue.md). Falta dar de alta remoto y VPS |
