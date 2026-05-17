FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY . /app
RUN if [ -f backend/requirements.txt ]; then cp backend/requirements.txt /tmp/requirements.txt; else cp requirements.txt /tmp/requirements.txt; fi \
    && pip install --no-cache-dir -r /tmp/requirements.txt
RUN if [ -d backend/app ]; then cp -a backend/app /app/app; fi \
    && if [ -d backend/scripts ]; then cp -a backend/scripts /app/scripts; fi \
    && if [ -f backend/start.sh ]; then cp backend/start.sh /app/start.sh; fi \
    && mkdir -p static/graphs \
    && chmod +x start.sh
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"8000\")}/api/health', timeout=3)"
CMD ["./start.sh"]
