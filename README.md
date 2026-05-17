# SATTEST.UZ Production Deployment Guide

SATTEST.UZ is a production-grade Digital SAT adaptive testing platform.

## Architecture

```text
sattest.uz / www.sattest.uz
  -> Vercel
  -> frontend/ Next.js 15, TypeScript, Tailwind

api.sattest.uz
  -> Railway
  -> backend/ FastAPI, SQLAlchemy, matplotlib graph generation
  -> Railway PostgreSQL
```

Monorepo:

```text
frontend/   Next.js app for students and admin quality dashboard
backend/    FastAPI API, SAT engine, telemetry, calibration, graph service
db/         SQL schema and ordered migrations 001-005
docs/       launch and pilot validation notes
```

## Required Environment Variables

Frontend, Vercel project with root directory `frontend`:

```bash
NEXT_PUBLIC_API_URL=https://api.sattest.uz
```

Backend, Railway service:

```bash
ENVIRONMENT=production
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
JWT_SECRET=<at least 32 random characters>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_MINUTES=1440
FRONTEND_URL=https://sattest.uz
CORS_ORIGINS=https://sattest.uz,https://www.sattest.uz
GRAPH_OUTPUT_DIR=static/graphs
RATE_LIMIT_PER_MINUTE=120
LOG_LEVEL=INFO
WEB_CONCURRENCY=2
WEB_TIMEOUT=120
```

Examples are stored in:

- `frontend/.env.example`
- `backend/.env.example`
- `.env.example`

## Migration System

Migrations are ordered and tracked in `schema_migrations`:

```text
001_initial_schema.sql
002_hybrid_adaptive_questions.sql
003_calibration_trap_intelligence.sql
004_telemetry_admin_validation.sql
005_quality_signals_confidence.sql
```

The Railway startup script runs:

```bash
python scripts/run_migrations.py
```

This applies only migrations that are not already listed in `schema_migrations`, preventing duplicate execution.

Manual migration command:

```bash
cd backend
DATABASE_URL=... python scripts/run_migrations.py
```

## Deployment Order

The system can be deployed and validated on temporary Railway/Vercel URLs before `sattest.uz` is active. Use [Temporary Domain Deployment Runbook](docs/temp-domain-deployment.md) for the no-domain workflow.

1. Push the monorepo to GitHub.
2. Create Railway PostgreSQL.
3. Deploy backend to Railway from the same GitHub repo using `backend/Dockerfile`.
4. Set Railway backend environment variables.
5. Confirm `/api/health` and `/api/ready`.
6. Add `api.sattest.uz` custom domain to Railway.
7. Deploy frontend to Vercel with root directory `frontend`.
8. Set Vercel `NEXT_PUBLIC_API_URL=https://api.sattest.uz`.
9. Add `sattest.uz` and `www.sattest.uz` to Vercel.
10. Configure DNS records.
11. Run the production launch checklist below.

## Railway Backend Steps

1. Railway -> New Project -> Deploy from GitHub repo.
2. Select the SATTEST.UZ repo.
3. Use Dockerfile deployment. The root `railway.toml` points to `backend/Dockerfile`.
4. Add a Railway PostgreSQL plugin.
5. Copy PostgreSQL connection URL into `DATABASE_URL`.
6. Set all backend environment variables above.
7. Deploy.
8. Open backend logs and verify:
   - migrations complete
   - Gunicorn starts
   - `/api/health` returns `{"status":"ok"}`
   - `/api/ready` returns `{"status":"ready"}`

## Vercel Frontend Steps

1. Vercel -> Add New Project -> import GitHub repo.
2. Set root directory to `frontend`.
3. Framework preset: Next.js.
4. Build command: `npm run build`.
5. Install command: `npm install`.
6. Set environment variable:

```bash
NEXT_PUBLIC_API_URL=https://api.sattest.uz
```

7. Deploy.
8. Add custom domains:
   - `sattest.uz`
   - `www.sattest.uz`

## DNS Records

Use your domain registrar DNS panel.

For Vercel frontend:

```text
Type: A
Name: @
Value: 76.76.21.21
Proxy: DNS only if using Cloudflare
```

```text
Type: CNAME
Name: www
Value: cname.vercel-dns.com
Proxy: DNS only if using Cloudflare
```

For Railway backend:

```text
Type: CNAME
Name: api
Value: <Railway-provided target for api.sattest.uz>
Proxy: DNS only if using Cloudflare
```

Railway gives the exact CNAME target after you add `api.sattest.uz` in Railway Domains.

SSL expectations:

- Vercel automatically provisions SSL for `sattest.uz` and `www.sattest.uz`.
- Railway automatically provisions SSL for `api.sattest.uz`.
- Certificates usually issue within minutes after DNS is correct.

Propagation expectations:

- Typical: 5-60 minutes.
- Worst case: 24-48 hours depending on registrar TTL and DNS cache.

## Security Review

Implemented:

- Production-only JWT secret validation.
- JWT expiration via `ACCESS_TOKEN_MINUTES`.
- Production CORS restricted to `sattest.uz` and `www.sattest.uz`.
- Secure headers on frontend and backend.
- Backend rate limiting.
- Structured request, failed request, and performance timing logs.
- SQL injection protection through SQLAlchemy ORM and parameterized SQL in migration runner.
- Pydantic API input validation for auth, answers, telemetry, and admin updates.
- Disabled questions are excluded from adaptive selection.

Operational notes:

- Do not expose `/docs` in production. It is disabled when `ENVIRONMENT=production`.
- Keep `JWT_SECRET` out of GitHub and Vercel/Railway logs.
- Railway filesystem is ephemeral; graph images are fine for MVP but should move to object storage when traffic grows.
- In-memory rate limiting is per Railway instance. Use Redis later if scaling to multiple instances.

## Production Validation Checklist

Frontend:

- `cd frontend && npm install`
- `npm run build`
- Visit `https://sattest.uz`
- Visit `https://www.sattest.uz`
- Confirm mobile layouts for home, auth, dashboard, test, results, admin.

Backend:

- Railway build succeeds.
- `/api/health` returns ok.
- `/api/ready` confirms DB connection.
- Logs show migrations applied or skipped.
- Static graph route serves `/static/...`.

Product flow:

- Register a new student.
- Login.
- Start a mock test.
- Answer questions.
- Refresh during a module and confirm answers restore.
- Confirm timer enforcement.
- Submit module and confirm previous module is locked.
- Confirm adaptive routing appears in attempt route data.
- Complete test and view results.
- Confirm telemetry logs are created.
- Confirm graph questions render.
- Login as admin.
- Open admin dashboard.
- Review question quality metrics.
- Flag, approve, disable, and manually adjust difficulty.

## Common Deployment Failure Fixes

Backend cannot connect to database:

- Confirm `DATABASE_URL` is set in Railway.
- Use `postgresql+psycopg://...`.
- Include `?sslmode=require` for Railway PostgreSQL when required.
- Check `/api/ready` logs for connection errors.

JWT startup error:

- In production, `JWT_SECRET` must be at least 32 characters.
- Do not use `change-me-in-production`.

CORS errors:

- Confirm backend has:

```bash
CORS_ORIGINS=https://sattest.uz,https://www.sattest.uz
FRONTEND_URL=https://sattest.uz
```

- Confirm frontend has:

```bash
NEXT_PUBLIC_API_URL=https://api.sattest.uz
```

Frontend calls localhost:

- Rebuild Vercel after setting `NEXT_PUBLIC_API_URL`.
- Environment variables with `NEXT_PUBLIC_` are baked into the frontend build.

Migrations fail:

- Check `schema_migrations`.
- Run `python scripts/run_migrations.py` manually inside the Railway shell.
- Do not run raw migration files repeatedly outside the migration runner.

Graph rendering fails:

- Confirm `matplotlib` and `numpy` installed during Docker build.
- Confirm `GRAPH_OUTPUT_DIR=static/graphs`.
- Remember Railway filesystem is ephemeral across redeploys.

Admin dashboard empty:

- Seed or create questions.
- Login with an admin user.
- Confirm `/api/admin/question-quality` returns data.

## Local Development

```bash
docker compose up --build
docker compose exec backend python scripts/seed_demo.py
```

Open:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/api/health`

Demo seed accounts:

- Student: `student@sat1600.uz` / `student123`
- Admin: `admin@sat1600.uz` / `admin123`

## Private Pilot

Do not launch publicly before a private test with 5-10 real students.

Use:

- `docs/pilot_validation.md`
- Admin question quality dashboard
- Telemetry and quality flags

Look for weird wording, guessing patterns, excessive hesitation, bad distractors, and graph questions that do not require reasoning.
