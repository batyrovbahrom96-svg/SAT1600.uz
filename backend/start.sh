#!/usr/bin/env sh
export PYTHONPATH=/app
set -eu

echo "=== ENV CHECK ==="
echo "PORT=${PORT:-}"
echo "ENVIRONMENT=${ENVIRONMENT:-production}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "WARNING: DATABASE_URL missing; DB-backed endpoints will fail until Railway variables are fixed"
else
  echo "DATABASE_URL EXISTS"
fi

if [ -z "${JWT_SECRET:-}" ]; then
  echo "WARNING: JWT_SECRET missing; auth endpoints will fail until Railway variables are fixed"
else
  echo "JWT_SECRET EXISTS"
fi

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Running migrations..."
  python scripts/run_migrations.py
else
  echo "Skipping migrations because DATABASE_URL is missing"
fi

exec gunicorn app.main:app \
  -k uvicorn.workers.UvicornWorker \
  --workers "${WEB_CONCURRENCY:-2}" \
  --bind "0.0.0.0:${PORT:-8000}" \
  --timeout "${WEB_TIMEOUT:-120}" \
  --access-logfile "-" \
  --error-logfile "-"
