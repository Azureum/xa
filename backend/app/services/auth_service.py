import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError
from app.models.business import Business, BusinessUser

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    slug = _SLUG_RE.sub("-", value.lower()).strip("-")
    return slug or "business"


def _unique_business_slug(db: Session, base_name: str) -> str:
    base_slug = slugify(base_name)
    slug = base_slug
    suffix = 1
    while db.scalar(select(Business).where(Business.slug == slug)) is not None:
        suffix += 1
        slug = f"{base_slug}-{suffix}"
    return slug


def setup_business(
    db: Session, user_id: str, email: str, business_name: str
) -> tuple[Business, BusinessUser]:
    existing = db.scalar(select(BusinessUser).where(BusinessUser.user_id == user_id))
    if existing is not None:
        raise ConflictError("This account already has a business set up")

    business = Business(name=business_name, slug=_unique_business_slug(db, business_name))
    db.add(business)
    db.flush()

    business_user = BusinessUser(
        business_id=business.id, user_id=user_id, email=email, role="owner"
    )
    db.add(business_user)
    db.commit()
    db.refresh(business)
    db.refresh(business_user)
    return business, business_user
