#!/usr/bin/env sh
set -eu

export PYTHONPATH=/app

echo "=== SATTEST combined startup ==="

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
  echo "Starting Telegram bot worker in background..."
  python backend/bot.py &
  BOT_PID="$!"
  echo "Telegram bot worker started with pid ${BOT_PID}"
else
  echo "Skipping Telegram bot worker because TELEGRAM_BOT_TOKEN or DATABASE_URL is missing"
fi

echo "Starting FastAPI web server..."
exec ./start.sh
