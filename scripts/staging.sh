#!/usr/bin/env bash
# Staging en la VPS (Linux). Uso:
#   ./scripts/staging.sh hash      -> genera el hash de la contrasena del buzon de pruebas
#   ./scripts/staging.sh up        -> construye, levanta, migra y siembra
#   ./scripts/staging.sh logs      -> logs en vivo
#   ./scripts/staging.sh down      -> apaga (conserva datos)
#   ./scripts/staging.sh reset     -> apaga y BORRA datos (BD, documentos, certificados)
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose --env-file .env.staging -f docker-compose.staging.yml"

case "${1:-}" in
  hash)
    read -r -s -p "Contrasena para el buzon /correo: " pw; echo
    docker run --rm caddy:2-alpine caddy hash-password --plaintext "$pw"
    echo "Pega el hash en CORREO_PASSWORD_HASH de .env.staging (entre comillas simples si tiene \$)."
    ;;
  up)
    [ -f .env.staging ] || { echo "Falta .env.staging (copia .env.staging.example)"; exit 1; }
    $COMPOSE build --pull
    $COMPOSE up -d
    echo "Esperando al backend..."
    for _ in $(seq 1 30); do
      if $COMPOSE exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" 2>/dev/null; then
        # shellcheck disable=SC1091
        . ./.env.staging
        echo "Listo: https://${DOMINIO}   buzon: https://${DOMINIO}/correo"
        exit 0
      fi
      sleep 3
    done
    echo "El backend no respondio; revisa: $COMPOSE logs backend"; exit 1
    ;;
  logs) $COMPOSE logs -f --tail=100 ;;
  down) $COMPOSE down ;;
  reset)
    read -r -p "Esto borra BD, documentos y certificados de staging. Escribe BORRAR para confirmar: " ok
    [ "$ok" = "BORRAR" ] && $COMPOSE down -v || echo "Cancelado"
    ;;
  *) echo "Uso: $0 {hash|up|logs|down|reset}"; exit 1 ;;
esac
