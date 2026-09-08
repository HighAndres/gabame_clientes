# Staging para validacion del cliente

Ambiente de pruebas (en la VPS del cliente o en una de Mirmibug) para que el cliente valide los flujos y cierre
los pendientes 0.2 a 0.5. **Datos de prueba, no reales.** Produccion va en infraestructura del
cliente (`docs/despliegue.md`).

## Requisitos en la VPS

- Linux con Docker y el plugin `docker compose` (v2).
- Puertos 80 y 443 libres y abiertos en el firewall.
- Tres registros DNS tipo A apuntando a la IP de la VPS: `<DOMINIO>`, `www.<DOMINIO>` y `correo.<DOMINIO>`.
  El dominio puede ser de Mirmibug aunque la VPS sea del cliente (por ejemplo
  `clientesgabame.mirmiapps.com` apuntando a la IP del cliente): Let's Encrypt valida por HTTP en esa IP.
  Cuando exista el dominio definitivo (0.6) se cambia `DOMINIO` y el DNS; BD y documentos no se tocan.

## Levantar

```bash
git clone git@github.com:HighAndres/gabame_clientes.git && cd gabame_clientes
cp .env.staging.example .env.staging
./scripts/staging.sh hash          # contrasena del buzon de pruebas -> CORREO_PASSWORD_HASH
openssl rand -hex 32               # -> SECRET_KEY
nano .env.staging                  # DOMINIO, SECRET_KEY, POSTGRES_PASSWORD, SEED_PASSWORD, hash
chmod +x scripts/staging.sh
./scripts/staging.sh up
```

Al terminar: `https://<DOMINIO>` es el portal y `https://correo.<DOMINIO>` el buzon donde caen
todos los correos (verificacion, recuperacion, decisiones), con el usuario y contrasena de
`CORREO_USUARIO`. Caddy obtiene el certificado solo; la primera vez tarda un minuto.

## Que entregar al cliente

- URL del portal y del buzon con su usuario y contrasena.
- Cuentas de prueba (contrasena = `SEED_PASSWORD`): `paciente@local.test`, `medico@local.test`
  (validado), `medico.pendiente@local.test`, `partner@local.test`, `admin.gabame@local.test`,
  `admin.ordan@local.test`, `admin.grupo@local.test`.
- Guion de prueba: registrarse como paciente, profesional y empresa; verificar correo desde el
  buzon; como admin validar medico y partner; como medico validado entrar al area medica; como
  partner subir documentos y como admin revisarlos; probar `?origen=gabame&ruta=/conocer-mas` y
  `?redirect=https://gabame.com`.

## Si 80 y 443 ya estan ocupados (Apache o cPanel en la VPS)

No se toca ese servidor. En `.env.staging` se ponen `PUERTO_HTTP=8080`, `PUERTO_HTTPS=8443` y
`CADDYFILE=./deploy/Caddyfile.puertos-alternos`. Caddy ya no puede pedir certificados a Let's Encrypt
(eso exige 80/443), asi que hay dos formas de tener HTTPS valido:

1. **Cloudflare delante (recomendado).** El DNS de `<DOMINIO>` en Cloudflare con el proxy activado,
   SSL en modo *Full*, y una regla de origen que mande el trafico al puerto 8443. El cliente entra por
   `https://<DOMINIO>` sin puerto y con certificado valido; Apache no se entera.
2. **Directo con puerto.** `https://<DOMINIO>:8443` con certificado interno de Caddy: el navegador
   avisa la primera vez. Sirve para una demo interna, no para entregarselo al cliente.

## Operar

```bash
./scripts/staging.sh logs     # ver que pasa
git pull && ./scripts/staging.sh up   # actualizar a la ultima version
./scripts/staging.sh reset    # empezar de cero (borra BD y documentos)
```

## Notas

- El backend arranca con `ENVIRONMENT=production`: aplican las guardias de secretos, los limites
  de intentos y las cookies `Secure`.
- Los documentos de partners viven en el volumen `staging-uploads`. Son datos de prueba; al
  cerrar staging se borra con `reset`.
- Si el cliente quiere recibir los correos en su propio buzon, llena `SMTP_*` en `.env.staging`
  y reinicia; Mailhog deja de usarse.
