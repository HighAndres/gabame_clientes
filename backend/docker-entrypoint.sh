#!/bin/sh
# Aplica migraciones antes de arrancar. Falla rapido si la BD no responde.
set -e

echo "[backend] esperando a la base de datos..."
i=0
until python -c "import sqlalchemy, os; sqlalchemy.create_engine(os.environ['DATABASE_URL']).connect().close()" 2>/dev/null; do
  i=$((i+1))
  if [ "$i" -ge 30 ]; then echo "[backend] la base de datos no respondio"; exit 1; fi
  sleep 2
done

echo "[backend] alembic upgrade head"
alembic upgrade head

if [ "${SEED_AL_ARRANCAR:-0}" = "1" ]; then
  echo "[backend] seed de usuarios de prueba"
  python -m app.seeds.seed_dev
fi

exec "$@"
