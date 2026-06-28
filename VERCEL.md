# Vercel + Supabase Deployment

This repo includes a Vercel-friendly entrypoint:

- `frontend/next/` is the Next.js frontend. It combines the dashboard routes and public customer chat route.
- `api/index.py` exposes the existing FastAPI app as a Vercel Python function.
- `vercel.json` builds the Next app and rewrites `/api/*` to the FastAPI function.

Production routes:

- `/` serves the public AI Host landing page.
- `/dashboard` serves the authenticated business dashboard.
- `/b/:businessSlug/:locationSlug` serves the public customer chat experience.

## Supabase Setup

Create a Supabase project, then set these variables in Vercel:

```text
DATABASE_URL=postgresql+psycopg://postgres:<password>@<host>:5432/postgres
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_JWT_SECRET=<jwt-secret-if-your-project-uses-HS256>
DEEPSEEK_API_KEY=<deepseek-key>
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

Leave `NEXT_PUBLIC_API_BASE_URL` unset in Vercel so the browser uses same-origin `/api/...`.

## Database Migrations

Run migrations against Supabase before using the app:

```powershell
cd backend
$env:DATABASE_URL="postgresql+psycopg://postgres:<password>@<host>:5432/postgres"
alembic upgrade head
```

Use the direct/session Supabase database connection for migrations, not the transaction pooler.

## Local Next Development

Run the backend:

```powershell
cd backend
python -m uvicorn app.main:app --reload
```

Run the Next app:

```powershell
cd frontend/next
npm install
$env:NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
$env:NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
npm run dev
```

The Vercel build uses pinned Next.js and React versions from `frontend/next/package-lock.json`.
