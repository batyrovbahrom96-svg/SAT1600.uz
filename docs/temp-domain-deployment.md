# Temporary Domain Deployment Runbook

Use this while `sattest.uz` is not active yet.

## Backend: Railway Temporary URL

Deploy the backend from GitHub using the root `railway.toml`.

Set Railway variables:

```bash
ENVIRONMENT=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<32+ random chars>
FRONTEND_URL=https://YOUR-VERCEL-PROJECT.vercel.app
CORS_ORIGINS=https://YOUR-VERCEL-PROJECT.vercel.app,https://sattest.uz,https://www.sattest.uz
# Optional only while validating Vercel previews:
# CORS_ORIGIN_REGEX=https://.*\\.vercel\\.app
GRAPH_OUTPUT_DIR=static/graphs
RATE_LIMIT_PER_MINUTE=120
LOG_LEVEL=INFO
WEB_CONCURRENCY=2
WEB_TIMEOUT=120
```

Railway PostgreSQL setup:

1. Railway project -> New -> Database -> PostgreSQL.
2. Confirm PostgreSQL service name is `Postgres`.
3. Confirm backend service name is `SAT1600.uz`.
4. Open Backend Service -> Variables.
5. Add:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Alternative: manually paste the full Railway PostgreSQL URL into `DATABASE_URL`.

After Railway deploys, copy the temporary backend URL:

```text
https://YOUR-RAILWAY-SERVICE.up.railway.app
```

Check:

```bash
curl https://YOUR-RAILWAY-SERVICE.up.railway.app/api/health
curl https://YOUR-RAILWAY-SERVICE.up.railway.app/api/ready
```

Create an admin user in Railway shell:

```bash
ADMIN_EMAIL=admin@sattest.uz ADMIN_PASSWORD='<strong password>' python scripts/create_admin.py
```

Run backend smoke validation:

```bash
API_BASE_URL=https://YOUR-RAILWAY-SERVICE.up.railway.app \
SMOKE_ADMIN_EMAIL=admin@sattest.uz \
SMOKE_ADMIN_PASSWORD='<strong password>' \
python scripts/deployment_smoke.py
```

## Frontend: Vercel Temporary URL

Deploy frontend from GitHub.

Vercel settings:

```text
Root Directory: frontend
Build Command: npm run build
Install Command: npm install
```

Set:

```bash
NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-SERVICE.up.railway.app
```

Deploy and open:

```text
https://YOUR-VERCEL-PROJECT.vercel.app
```

## End-to-End Temporary URL Checklist

- Register student
- Login student
- Start SAT test
- Complete Module 1
- Confirm Module 2 route
- Answer Module 2 questions
- Finish full test
- View results
- Confirm telemetry saved
- Confirm graph images render
- Login admin
- Open admin dashboard
- Confirm question quality metrics load
- Generate SAT graph set

## Domain Switch Later

When `sattest.uz` is active:

Backend Railway env:

```bash
FRONTEND_URL=https://sattest.uz
CORS_ORIGINS=https://sattest.uz,https://www.sattest.uz
```

Frontend Vercel env:

```bash
NEXT_PUBLIC_API_URL=https://api.sattest.uz
```

Then redeploy frontend and backend. No code changes needed.
