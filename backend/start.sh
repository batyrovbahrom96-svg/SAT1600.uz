#!/usr/bin/env sh
set -eu

python scripts/run_migrations.py

exec gunicorn app.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers "${WEB_CONCURRENCY:-2}" \
  --bind "0.0.0.0:${PORT:-8000}" \
  --timeout "${WEB_TIMEOUT:-120}" \
  --access-logfile "-" \
  --error-logfile "-"
