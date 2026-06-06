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

if [ -z "${SMTP_HOST:-}" ]; then
  echo "WARNING: SMTP_HOST missing; production email verification cannot send codes"
else
  echo "SMTP_HOST EXISTS"
fi

run_bootstrap() {
  if [ -n "${DATABASE_URL:-}" ]; then
    echo "Running migrations..."
    python scripts/run_migrations.py

    if [ "${RUN_SEED_ON_STARTUP:-true}" = "true" ]; then
      echo "Ensuring baseline SAT content..."
      python scripts/seed_demo.py
    else
      echo "Skipping seed because RUN_SEED_ON_STARTUP is not true"
    fi
  else
    echo "Skipping migrations because DATABASE_URL is missing"
  fi
}

run_bootstrap &

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8080}"
