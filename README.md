# AI Host

AI Host is a multi-tenant SaaS platform for restaurants and small businesses. Each business configures an AI chat agent that its customers reach anonymously via a QR code, NFC tag, or shared link — customers ask questions, get recommendations, and hear about promotions, while the business gets analytics on what's being asked.

## Architecture

- **Backend** (`backend/`) — FastAPI + PostgreSQL. Multi-tenancy is enforced with real Postgres Row-Level Security (not application-layer filtering); the backend only verifies Supabase-issued JWTs, it doesn't manage identity itself. Media is stored in Supabase Storage. The AI agent is powered by DeepSeek (OpenAI-compatible API).
- **Dashboard** (`frontend/dashboard/`) — Vite + React + TypeScript app where business owners log in (via Supabase Auth) to manage locations, FAQs, AI personality, and (eventually) promotions, media, and analytics.
- **Customer** (`frontend/customer/`) — Vite + React + TypeScript app served at `/b/:businessSlug/:locationSlug`, the public chat experience customers land on after scanning a QR code or NFC tag.
- **Next/Vercel** (`frontend/next/` + `api/index.py`) - Next.js frontend plus the existing FastAPI backend exposed as a Vercel Python function. The production app serves `/` as a public landing page, `/dashboard` as the authenticated owner dashboard, and `/b/:businessSlug/:locationSlug` as the public customer chat.
## Repository layout

```
backend/             FastAPI app, SQLAlchemy models, Alembic migrations, pytest tests
frontend/dashboard/   Business-owner dashboard (authenticated)
frontend/customer/    Public customer chat UI (anonymous)
frontend/next/        Combined Next.js frontend for Vercel
api/index.py          Vercel Python entrypoint for FastAPI
docker-compose.yml    Local dev stack: db, backend, dashboard, customer
```

## Local setup

1. Copy `.env.example` to `.env` and fill in a Supabase project's credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`) and a `DEEPSEEK_API_KEY`.
2. Run `docker compose up`. This boots:
   - `db` — Postgres 16, with a bootstrap script emulating Supabase's `auth` schema for local dev
   - `backend` — FastAPI on `:8000` (runs `alembic upgrade head` automatically before starting)
   - `dashboard` — the business dashboard on `:5173`
   - `customer` — the public chat app on `:5174`

## Running tests

```
cd backend
pytest
```

## Deployment

A [`render.yaml`](./render.yaml) Blueprint deploys all three services (backend +
both frontends) to [Render](https://render.com), backed by your Supabase project
and DeepSeek. See [`DEPLOY.md`](./DEPLOY.md) for the step-by-step.

For Vercel, use the included Next.js app and Python API function. See [`VERCEL.md`](./VERCEL.md).

## Status

Auth/tenancy (Supabase Auth + Postgres RLS), locations, FAQs/additional knowledge, AI personality, and the public landing + chat experience (DeepSeek-backed) are implemented and tested end to end. The dashboard UI for managing locations, training content, and personality is in progress. Still to come: answer classification/unanswered-question flagging, promotions, media uploads, and analytics.
