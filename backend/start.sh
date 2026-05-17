#!/usr/bin/env sh
export PYTHONPATH=/app
set -eu

echo "=== ENV CHECK ==="
echo "PORT=${PORT:-}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "FATAL: DATABASE_URL missing"
  exit 1
else
  echo "DATABASE_URL EXISTS"
fi

if [ -z "${JWT_SECRET:-}" ]; then
  echo "FATAL: JWT_SECRET missing"
  exit 1
else
  echo "JWT_SECRET EXISTS"
fi

echo "Running migrations..."
# python scripts/run_migrations.py

exec gunicorn app.main:app \
  -k uvicorn.workers.UvicornWorker \
  --workers "${WEB_CONCURRENCY:-2}" \
  --bind "0.0.0.0:${PORT:-8000}" \
  --timeout "${WEB_TIMEOUT:-120}" \
  --access-logfile "-" \
  --error-logfile "-"
