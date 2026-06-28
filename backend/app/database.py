import json
from collections.abc import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

_RLS_ROLES = {"authenticated", "service_role"}


@event.listens_for(SessionLocal, "after_begin")
def _apply_rls_context(session: Session, transaction, connection) -> None:
    """Re-applies the session's Postgres role + JWT claims on every transaction.

    `SET LOCAL ROLE`/`set_config(..., true)` only last for the transaction
    they're issued in. A request handler that calls `db.commit()` mid-request
    (e.g. create-then-refresh) would otherwise silently fall back to the
    session's underlying login role -- `aihost`, which has BYPASSRLS -- for
    every statement after that commit, defeating RLS. Hooking `after_begin`
    means it's reapplied for every transaction the session opens, including
    ones that autobegin after a prior commit.
    """
    role = session.info.get("rls_role")
    if role is None:
        return
    if role not in _RLS_ROLES:
        raise ValueError(f"Unexpected RLS role: {role!r}")
    connection.execute(text(f"SET LOCAL ROLE {role}"))
    claims = session.info.get("rls_claims")
    if claims is not None:
        connection.execute(
            text("SELECT set_config('request.jwt.claims', :claims, true)"),
            {"claims": json.dumps(claims)},
        )


def get_db() -> Generator[Session, None, None]:
    """Plain session with no role switch. Used for app startup / non-tenant code."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_authenticated_db(claims: dict) -> Generator[Session, None, None]:
    """Session scoped to a verified Supabase JWT, enforced at the DB layer via RLS.

    Switches the Postgres role to `authenticated` and sets the JWT claims GUC
    that `auth.uid()` reads, so every query in this session is subject to the
    same row-level security a real Supabase client connection would see.
    """
    db = SessionLocal()
    db.info["rls_role"] = "authenticated"
    db.info["rls_claims"] = claims
    try:
        yield db
    finally:
        db.close()


def get_public_db() -> Generator[Session, None, None]:
    """Session for anonymous customer-facing endpoints.

    Switches to `service_role` (bypasses RLS) because access here is scoped
    anonymously via business/location slugs in the URL, not a logged-in user
    -- the same model the original app-layer tenancy plan used.
    """
    db = SessionLocal()
    db.info["rls_role"] = "service_role"
    try:
        yield db
    finally:
        db.close()
