# Deploying AI Host to Render

This repo ships a [`render.yaml`](./render.yaml) Blueprint that deploys all
three services (backend + two frontends) from a single repo. The app uses your
**Supabase** project for the database + auth and **DeepSeek** for the AI, so the
only things you provide are connection strings and API keys.

There's a chicken-and-egg with URLs (the frontends need the backend's URL; the
backend's CORS needs the frontends' URLs), so deploy is a two-pass flow:
create everything, then fill in the cross-service URLs and redeploy.

## Prerequisites

- A **Supabase** project (you have one). You'll need:
  - Project URL — `Project Settings → API → Project URL`
  - Publishable (anon) key and Secret (service_role) key — `Project Settings → API`
  - Postgres connection string — `Project Settings → Database → Connection string → URI`.
    **Use the direct/session connection (port 5432), not the transaction pooler** —
    the backend runs Alembic migrations (DDL) on boot, which the pooler doesn't
    handle well. Change the scheme from `postgresql://` to `postgresql+psycopg://`.
- A **DeepSeek** API key.
- This repo pushed to GitHub, with the branch you want to deploy as the default
  branch (merge `claude/repo-overview-t3g8iu` into `main` first, or point the
  Blueprint at that branch when connecting).

## Step 1 — Create the Blueprint

1. In the Render dashboard: **New → Blueprint**, connect this GitHub repo.
2. Render reads `render.yaml` and shows three services:
   `aihost-backend`, `aihost-dashboard`, `aihost-customer`.
3. It will prompt for every `sync: false` env var. Fill in what you can now
   (see Step 2); leave the cross-service URLs blank for the moment — you'll set
   them in Step 3.

## Step 2 — Backend env vars

On **aihost-backend**, set:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql+psycopg://postgres:PASSWORD@HOST:5432/postgres` (Supabase, port 5432) |
| `SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` |
| `SUPABASE_ANON_KEY` | your `sb_publishable_...` (or legacy anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | your `sb_secret_...` (or legacy service_role) key |
| `SUPABASE_JWT_SECRET` | legacy HS256 secret, or any placeholder if your project uses ES256/JWKS |
| `DEEPSEEK_API_KEY` | your DeepSeek key |
| `CORS_ORIGINS` | leave blank for now (Step 3) |

Let the backend deploy. On boot it runs `alembic upgrade head` against Supabase,
creating all tables, RLS policies, and the tenancy helpers. Confirm it's healthy:
`https://aihost-backend.onrender.com/health` → `{"status":"ok"}`.

## Step 3 — Wire the cross-service URLs, then redeploy

Now that the services exist, their URLs are known (`https://<name>.onrender.com`).

On **aihost-dashboard**:
- `VITE_API_BASE_URL` = `https://aihost-backend.onrender.com`
- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = your publishable/anon key

On **aihost-customer**:
- `VITE_API_BASE_URL` = `https://aihost-backend.onrender.com`

On **aihost-backend**:
- `CORS_ORIGINS` = `https://aihost-dashboard.onrender.com,https://aihost-customer.onrender.com`

> `VITE_*` vars are inlined at build time, so **trigger a fresh deploy** of both
> static sites after setting them ("Manual Deploy → Clear build cache & deploy").
> Redeploy the backend too so the new `CORS_ORIGINS` takes effect.

## Step 4 — Point Supabase Auth at the dashboard

In Supabase: `Authentication → URL Configuration` → set the **Site URL** to your
dashboard URL (`https://aihost-dashboard.onrender.com`) and add it to **Redirect
URLs**, so sign-up/login emails resolve correctly.

## Step 5 — Smoke test

1. Open the dashboard, register a business, add a location + an FAQ.
2. Open `https://aihost-customer.onrender.com/b/<business-slug>/<location-slug>`
   and ask a question — you should get a DeepSeek-powered reply.
3. Back in the dashboard, the **Overview** stats start populating.

## Notes & caveats

- **Free tier**: the backend spins down when idle and cold-starts on the next
  request (a few seconds). Static sites don't sleep. Upgrade the backend to a
  paid instance to keep it warm.
- **Uploads**: the backend writes to a local `/app/uploads` dir, which is
  ephemeral on Render. Media uploads should move to Supabase Storage before
  relying on them in production (not yet wired up).
- **Migrations on boot**: fine for a single backend instance. If you scale to
  multiple instances, run migrations as a one-off job instead of per-boot.
- **Custom domains**: add them per service under `Settings → Custom Domain`, then
  update `CORS_ORIGINS` and the Supabase Site URL to match.
