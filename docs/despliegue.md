# Salida de local (Fase 7)

Infraestructura generica, como siempre en docs de cliente: **sin IPs, sin nombres de
herramientas internas, sin secretos**. Los valores reales viven en el gestor de secretos del VPS.

## Topologia minima

```
[navegador] --https--> [proxy inverso] --> frontend (Next, :3000)
                                     \--> backend  (FastAPI, :8000)   --> PostgreSQL 16
                                                                       --> SMTP del grupo
                                                                       --> volumen /uploads
```

- Un solo dominio para el portal (pendiente 0.6). Frontend y backend detras del mismo proxy:
  el frontend en `/`, el backend en `/api` (o un subdominio `api.`; en ese caso ajustar
  `BACKEND_CORS_ORIGINS` y `NEXT_PUBLIC_API_URL`).
- TLS en el proxy. Las cookies de sesion son `Secure` cuando `NODE_ENV=production`.
- El proxy debe mandar `X-Forwarded-For`: el limite de intentos del backend lo usa para
  identificar al cliente (en memoria, nunca persistido).

## Variables obligatorias

| Donde | Variable | Nota |
|---|---|---|
| backend | `ENVIRONMENT=production` | activa las guardias de arranque |
| backend | `SECRET_KEY` | 32+ bytes (`openssl rand -hex 32`). Con valor de ejemplo el backend **no arranca** |
| backend | `DATABASE_URL` | credenciales reales; con `cambiar_en_local` no arranca |
| backend | `BACKEND_CORS_ORIGINS`, `FRONTEND_URL` | dominio final del portal |
| backend | `SMTP_HOST/PORT/USER/PASSWORD`, `EMAIL_FROM` | SMTP del grupo |
| backend | `UPLOADS_DIR` | ruta del volumen persistente de documentos |
| frontend | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_ENVIRONMENT=production` | |
| frontend | `JWT_SECRET` | **identico** a `SECRET_KEY` del backend (ADR-0002) |

`NEXT_PUBLIC_ENVIRONMENT=production` apaga el permiso de `http://localhost` en el redirect
seguro (ADR-0003).

## Pasos

1. `docker compose` o servicios del sistema para Postgres. Crear la BD y el usuario.
2. Backend: `pip install .`, `alembic upgrade head`, `uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2`.
   No correr `seed_dev` en produccion. Crear el primer `admin_grupo` con un script puntual.
3. Frontend: `npm ci && npm run build && npm run start`.
4. Proxy inverso con TLS, `X-Forwarded-For`, y un limite de tamano de cuerpo de al menos
   `UPLOAD_MAX_MB` para la ruta de documentos.
5. Respaldos: BD (diario) y el volumen `UPLOADS_DIR` (mismo ciclo). Los documentos de partners
   son datos personales: cifrado en reposo del volumen y retencion segun el aviso de privacidad.

## Almacenamiento de documentos

Decision de salida: **volumen local persistente** montado en `UPLOADS_DIR` (ADR-0006). Los
archivos se sirven solo a traves del backend con sesion valida; nunca por el proxy como
estaticos. Si el grupo pasa a almacenamiento de objetos, se cambia `app/services/documentos.py`
sin tocar routers.

## Lo que se queda fuera hasta que llegue del cliente

- CSP definitiva (necesita los dominios finales, pendiente 0.6).
- Rate limiting compartido entre workers (hoy por proceso; suficiente para el arranque).
- Cambio de correo con re-verificacion (ADR-0002).
