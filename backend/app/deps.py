from collections.abc import Generator
from dataclasses import dataclass

import jwt
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import UnauthorizedError
from app.core.security import decode_supabase_jwt
from app.database import get_authenticated_db, get_public_db
from app.models.business import Business, BusinessUser

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/dashboard/auth/me", auto_error=False)


@dataclass
class SupabaseUser:
    id: str
    email: str
    claims: dict


def get_current_user(token: str | None = Depends(oauth2_scheme)) -> SupabaseUser:
    if token is None:
        raise UnauthorizedError("Not authenticated")
    try:
        claims = decode_supabase_jwt(token)
    except jwt.PyJWTError:
        raise UnauthorizedError("Could not validate credentials")

    user_id = claims.get("sub")
    if not user_id:
        raise UnauthorizedError("Could not validate credentials")
    return SupabaseUser(id=user_id, email=claims.get("email", ""), claims=claims)


def get_business_db(user: SupabaseUser = Depends(get_current_user)) -> Generator[Session, None, None]:
    """The RLS-enforced session for any authenticated dashboard route."""
    yield from get_authenticated_db({"sub": user.id, "role": "authenticated"})


def get_current_business(
    user: SupabaseUser = Depends(get_current_user), db: Session = Depends(get_business_db)
) -> Business:
    business_user = db.scalar(select(BusinessUser).where(BusinessUser.user_id == user.id))
    if business_user is None:
        raise UnauthorizedError("No business set up for this account yet")
    business = db.get(Business, business_user.business_id)
    if business is None:
        raise UnauthorizedError("Could not validate credentials")
    return business


def get_public_session() -> Generator[Session, None, None]:
    """The RLS-bypassing session for anonymous, slug-resolved public routes."""
    yield from get_public_db()


def get_bootstrap_db() -> Generator[Session, None, None]:
    """RLS-bypassing session for the one-time setup-business bootstrap.

    Creating a business and its owner's first business_users row is a
    chicken-and-egg case for RLS: until that row exists, no SELECT policy
    (all of which call business_ids_for_current_user()) can see the row
    being inserted -- and Postgres evaluates SELECT policies against
    RETURNING clauses too, so even the INSERT's own RETURNING fails under
    RLS. Authorization for this endpoint comes entirely from the verified
    Supabase JWT (get_current_user), not from RLS.
    """
    yield from get_public_db()
