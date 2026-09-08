# Staging para validacion del cliente

Ambiente de pruebas (en la VPS del cliente o en una de Mirmibug) para que el cliente valide los flujos y cierre
los pendientes 0.2 a 0.5. **Datos de prueba, no reales.** Produccion va en infraestructura del
cliente (`docs/despliegue.md`).

## Requisitos en la VPS

- Linux con Docker y el plugin `docker compose` (v2).
- Puertos 80 y 443 libres y abiertos en el firewall.
- Un registro DNS tipo A `<DOMINIO>` apuntando a la IP de la VPS (y `www.<DOMINIO>` si se quiere).
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

Al terminar: `https://<DOMINIO>` es el portal y `https://<DOMINIO>/correo` el buzon donde caen
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

## Si 80 y 443 ya los usa Apache/cPanel (VPS del cliente)

No se toca Apache ni sus sitios. Apache termina el HTTPS con AutoSSL y pasa el trafico a nuestro
Caddy en `127.0.0.1:8080` por HTTP interno.

1. En `.env.staging`: `PUERTO_HTTP=8080`, `PUERTO_HTTPS=8443`, `CADDYFILE=./deploy/Caddyfile.detras-de-apache`.
2. `./scripts/staging.sh up` (Caddy queda escuchando en 8080 solo para Apache).
3. En cPanel, con la cuenta que ya tiene otros subdominios de Mirmibug, crear los dominios
   `<DOMINIO>` (cPanel agrega su `www`). El DNS ya debe apuntar a la VPS.
4. Esperar a que AutoSSL emita los certificados (SSL/TLS Status en cPanel, o "Run AutoSSL").
5. Copiar `deploy/apache-proxy.conf.example` como `proxy.conf` en las carpetas `userdata` de cPanel del
   dominio (rutas dentro del archivo), y regenerar: `/scripts/rebuildhttpdconf && /scripts/restartsrv_httpd`.

Con eso `https://<DOMINIO>` y `https://<DOMINIO>/correo` sirven el portal y el buzon con certificado
valido, y Apache sigue sirviendo lo demas como siempre.

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
