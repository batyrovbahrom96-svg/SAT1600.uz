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
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<random secret; 32+ characters recommended>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_MINUTES=1440
FRONTEND_URL=https://sattest.uz
CORS_ORIGINS=["https://sattest.uz","https://www.sattest.uz"]
GRAPH_OUTPUT_DIR=static/graphs
RATE_LIMIT_PER_MINUTE=120
LOG_LEVEL=INFO
WEB_CONCURRENCY=2
WEB_TIMEOUT=120
SMTP_HOST=<smtp host for your SATTEST.UZ email account>
SMTP_PORT=587
SMTP_USERNAME=<smtp username>
SMTP_PASSWORD=<smtp password or app password>
SMTP_FROM_EMAIL=no-reply@sattest.uz
SMTP_FROM_NAME=SATTEST.UZ Email Bot
RESEND_API_KEY=<Resend API key, preferred for signup email codes>
RESEND_FROM_EMAIL=SATTEST.UZ Email Bot <no-reply@sattest.uz>
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
3. Backend service name should be `SAT1600.uz`.
4. Use Dockerfile deployment. The root `railway.toml` points to `backend/Dockerfile`.
5. Add a Railway PostgreSQL service named `Postgres`.
6. Open Backend Service -> Variables.
7. Delete any broken `DATABASE_URL` value.
8. Create `DATABASE_URL` with Railway's Add Reference UI: select `Postgres` -> `DATABASE_URL`.
9. Click the eye icon and confirm the resolved value starts with `postgresql://` or `postgresql+psycopg://`, not `${{...}}`.
10. Alternatively, manually paste the full Railway PostgreSQL URL into `DATABASE_URL`.
11. Set all backend environment variables above.
12. Deploy.
13. Open backend logs and verify:
   - migrations complete
   - Gunicorn starts
   - startup logs show `DATABASE_URL EXISTS`
   - startup logs show `JWT_SECRET EXISTS`
   - startup logs show `SMTP_HOST EXISTS`
   - database log shows `exists=True`, a Railway host, and driver `postgresql+psycopg`
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

1. Railway -> `SAT1600.uz` -> Settings -> Networking.
2. Generate a Railway public domain if one does not exist.
3. Verify `https://<generated-domain>/api/health` returns `{"status":"ok"}`.
4. Add custom domain `api.sattest.uz`.
5. Use the DNS target Railway shows for the CNAME record.

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

Telegram payment bot operations:

- Receipt caption can be plain: full name, phone number, and registered email. Plan defaults to Pro automatically.
- The bot activates Pro immediately for 30 days after a valid receipt caption reaches the live database.
- The bot stores subscription start/end dates and sends the student the exact dates after activation.
- Founder can type `/pro_report` in the bot to receive the current Pro-user report.
- Configure a daily scheduler to `POST https://api.sattest.uz/api/telegram/daily-report` with header `X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>`.
- The daily report endpoint sends the Founder active Pro count, same-day activations, expiring subscriptions, and expired/revoked count.
- The same daily endpoint sends renewal reminders during the final 3 days, then marks expired subscriptions inactive after the end date.
- Manual fraud cancellation remains Founder-only through the Telegram revoke button or the admin dashboard after checking Paynet/payment records.

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
- Recommended Railway value: `DATABASE_URL=${{Postgres.DATABASE_URL}}`.
- Manual URL format: `postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`.
- Include `?sslmode=require` for Railway PostgreSQL when required.
- Check `/api/ready` logs for connection errors.
- If logs show `127.0.0.1` or `localhost`, the Railway backend service is missing `DATABASE_URL`.

JWT startup error:

- `JWT_SECRET` must be present.
- Use at least 32 random characters for production security.
- Do not use `change-me-in-production`.

CORS errors:

- Confirm backend has:

```bash
CORS_ORIGINS=["https://sattest.uz","https://www.sattest.uz"]
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

## QR Payment + Telegram Approval Flow

The diagnostic results page now sends students to `/payment`. The flow is:

1. Student sees Uzbek Pro payment page with estimated score, weak areas, `300,000 UZS / month`, `900,000 UZS / 3 months`, Payme QR, and Click QR.
2. Student pays and clicks `To'lovni tasdiqlash`.
3. Backend creates an order reference like `SAT-123456`.
4. Student lands on `/payment/confirm?ref=SAT-123456` and opens `@SATTESTUZBot`.
5. Bot receives the payment screenshot and forwards it to the Founder/admin with `✅ Tasdiqlash` and `❌ Rad etish`.
6. Approval creates an active Pro subscription and sends the student a result/pro access link.
7. `/admin` shows pending payment orders, activated orders, rejected orders, and total revenue.

Required backend environment variables:

```bash
TELEGRAM_BOT_TOKEN=123456789:botfather-token
ADMIN_CHAT_ID=123456789
TELEGRAM_ADMIN_CHAT_ID=123456789
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
PAYME_QR_URL=https://your-cdn/payme-qr.png
CLICK_QR_URL=https://your-cdn/click-qr.png
FRONTEND_URL=https://www.sattest.uz
```

`ADMIN_CHAT_ID` is included for clarity, but the app reads `TELEGRAM_ADMIN_CHAT_ID`.

How to get a Telegram bot token:

1. Open Telegram and message `@BotFather`.
2. Send `/newbot`.
3. Choose name: `SATTEST.UZ Bot`.
4. Choose username: `SATTESTUZBot`.
5. Copy the token into `TELEGRAM_BOT_TOKEN`.

How to set `TELEGRAM_ADMIN_CHAT_ID`:

1. Message your bot once from the Founder Telegram account.
2. Temporarily open `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates`.
3. Find `message.chat.id`.
4. Put that number into `TELEGRAM_ADMIN_CHAT_ID`.

How to deploy on Railway:

1. Push this repository to GitHub.
2. In Railway, create a project from the GitHub repo.
3. Add a PostgreSQL database service.
4. Set `DATABASE_URL=${{Postgres.DATABASE_URL}}` or the manual PostgreSQL URL.
5. Add all variables listed above.
6. Confirm Railway uses `railway.toml`; it builds `backend/Dockerfile`.
7. Deploy.
8. In Railway shell or deploy logs, confirm migrations ran, including `009_payment_orders.sql`.
9. Set the Telegram webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://api.sattest.uz/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Local verification:

```bash
cd frontend
npm install
npm run build
```

Backend syntax check:

```bash
python3 -m py_compile backend/app/models/sat.py backend/app/api/routes.py backend/app/services/telegram_payments.py
```
