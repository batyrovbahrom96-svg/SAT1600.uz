#!/usr/bin/env sh
export PYTHONPATH=/app
set -eu

echo "=== ENV CHECK ==="
echo "PORT=${PORT:-}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is EMPTY"
else
  echo "DATABASE_URL exists"
fi

echo "Running migrations..."
python scripts/run_migrations.py

exec gunicorn app.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers "${WEB_CONCURRENCY:-2}" \
  --bind "0.0.0.0:${PORT:-8000}" \
  --timeout "${WEB_TIMEOUT:-120}" \
  --access-logfile "-" \
  --error-logfile "-"
