"""A stub for Supabase's auth.users table.

We never create, alter, or drop this -- Supabase Auth owns it entirely (and
our local dev bootstrap emulates it). It only needs to exist in our metadata
so SQLAlchemy can resolve the business_users.user_id foreign key. Alembic
autogenerate is told to ignore anything in the `auth` schema (see env.py).
"""

from sqlalchemy import Column, String, Table, Uuid

from app.models.base import Base

auth_users = Table(
    "users",
    Base.metadata,
    Column("id", Uuid, primary_key=True),
    Column("email", String, nullable=True),
    schema="auth",
)
