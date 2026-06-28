import os
import time
import uuid
from collections.abc import Generator
from dataclasses import dataclass

# Point the app at the dedicated test database before anything imports
# app.config -- environment variables take priority over the dev .env file,
# so this keeps tests from ever truncating real dev data.
os.environ["DATABASE_URL"] = (
    "postgresql+psycopg://aihost:change-me-dev-password@localhost:5432/aihost_test"
)

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.main import app
from app.models import Base, auth_users

engine = create_engine(settings.database_url, pool_pre_ping=True)
TestSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

_TABLE_NAMES = [
    f"{table.schema}.{table.name}" if table.schema else table.name
    for table in Base.metadata.tables.values()
]


@pytest.fixture(autouse=True)
def _clean_db() -> Generator[None, None, None]:
    """Truncate everything before each test so tests stay isolated.

    Runs as the `aihost` login role, which has BYPASSRLS (mirroring how a
    real Supabase project's migrations run as `postgres`), so this always
    succeeds regardless of RLS policies.
    """
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE TABLE {', '.join(_TABLE_NAMES)} CASCADE"))
    yield


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    """A raw, RLS-bypassing session for seeding/asserting fixture data directly."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


def make_access_token(user_id: uuid.UUID | str, email: str) -> str:
    """Craft a Supabase-shaped access token signed with the test JWT secret."""
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": now,
        "exp": now + 3600,
    }
    return jwt.encode(payload, settings.supabase_jwt_secret, algorithm="HS256")


@dataclass
class AuthedUser:
    id: uuid.UUID
    email: str
    token: str

    @property
    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"}


@pytest.fixture()
def make_user(db_session: Session):
    """Factory fixture: seeds a fake Supabase auth.users row + matching access token."""

    def _make(email: str) -> AuthedUser:
        user_id = uuid.uuid4()
        db_session.execute(auth_users.insert().values(id=user_id, email=email))
        db_session.commit()
        return AuthedUser(id=user_id, email=email, token=make_access_token(user_id, email))

    return _make
