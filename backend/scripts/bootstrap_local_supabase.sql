-- Local-dev-only emulation of pieces a real Supabase project already provides
-- out of the box: the `auth` schema, `auth.users`, the `auth.uid()` helper,
-- and the anon/authenticated/service_role Postgres roles.
--
-- Never run this against a real Supabase project -- it already has all of
-- this, and CREATE ROLE/CREATE SCHEMA AUTH would conflict.
--
-- Idempotent: safe to re-run against the same local database.
-- Must run as a superuser (e.g. `sudo -u postgres psql -d <db> -f ...`) --
-- the `aihost` app role doesn't have CREATEROLE.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY,
    email text
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
    SELECT
        COALESCE(
            NULLIF(current_setting('request.jwt.claim.sub', true), ''),
            (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
        )::uuid
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN NOBYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN NOBYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN BYPASSRLS;
    END IF;
END
$$;

GRANT anon, authenticated, service_role TO aihost;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Real Supabase projects grant these by default so RLS policies (which call
-- auth.uid()) work for the anon/authenticated roles.
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

-- Mirrors the real Supabase `postgres` superuser, which always bypasses RLS
-- and is what migrations run as in production. Locally, our migrations run
-- as `aihost`, so it needs the same attribute for the business_ids_for_current_user()
-- SECURITY DEFINER function (owned by aihost) to avoid recursing into RLS on
-- business_users when looking up the caller's own memberships.
ALTER ROLE aihost BYPASSRLS;
