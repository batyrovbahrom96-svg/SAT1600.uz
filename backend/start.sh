#!/usr/bin/env sh
export PYTHONPATH=/app
set -eu

echo "=== ENV CHECK ==="
echo "PORT=${PORT:-}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL EMPTY"
else
  echo "DATABASE_URL EXISTS"
fi

if [ -z "${JWT_SECRET:-}" ]; then
  echo "JWT_SECRET EMPTY"
else
  echo "JWT_SECRET EXISTS"
fi

echo "Starting migrations..."
python scripts/run_migrations.py

exec gunicorn app.main:app \
  -k uvicorn.workers.UvicornWorker \
  --workers "${WEB_CONCURRENCY:-2}" \
  --bind "0.0.0.0:${PORT:-8000}" \
  --timeout "${WEB_TIMEOUT:-120}" \
  --access-logfile "-" \
  --error-logfile "-"
