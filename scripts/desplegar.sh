#!/usr/bin/env bash
# Se ejecuta EN LA VPS. Es el unico comando que puede correr la llave de despliegue de GitHub
# (forced command en authorized_keys), asi que no acepta argumentos ni shell.
#
# Trae la ultima version de main, reconstruye y levanta el stack, y verifica salud.
set -euo pipefail

RAIZ="/opt/gabame_clientes"
cd "$RAIZ"

echo "[desplegar] $(date -Is) commit actual: $(git rev-parse --short HEAD)"
git fetch --quiet origin main
git reset --quiet --hard origin/main
echo "[desplegar] commit nuevo: $(git log -1 --format='%h %s')"

chmod +x scripts/staging.sh
./scripts/staging.sh up

# Verificacion final por la ruta publica (pasa por Apache -> Caddy -> Next)
# shellcheck disable=SC1091
. ./.env.staging
codigo=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMINIO}/" || true)
if [ "$codigo" != "200" ]; then
  echo "[desplegar] ERROR: https://${DOMINIO}/ respondio $codigo"
  docker compose --env-file .env.staging -f docker-compose.staging.yml logs --tail=40 backend frontend
  exit 1
fi
echo "[desplegar] OK: https://${DOMINIO}/ responde 200"
