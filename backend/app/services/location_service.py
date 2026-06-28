import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.location import Location
from app.schemas.locations import LocationCreate, LocationUpdate
from app.services.auth_service import slugify


def list_locations(db: Session, business_id: uuid.UUID) -> list[Location]:
    return list(
        db.scalars(
            select(Location).where(Location.business_id == business_id).order_by(Location.created_at)
        )
    )


def get_location(db: Session, business_id: uuid.UUID, location_id: uuid.UUID) -> Location:
    location = db.scalar(
        select(Location).where(Location.business_id == business_id, Location.id == location_id)
    )
    if location is None:
        raise NotFoundError("Location not found")
    return location


def _unique_location_slug(db: Session, business_id: uuid.UUID, base_name: str) -> str:
    base_slug = slugify(base_name)
    slug = base_slug
    suffix = 1
    while (
        db.scalar(select(Location).where(Location.business_id == business_id, Location.slug == slug))
        is not None
    ):
        suffix += 1
        slug = f"{base_slug}-{suffix}"
    return slug


def create_location(db: Session, business_id: uuid.UUID, payload: LocationCreate) -> Location:
    location = Location(
        business_id=business_id,
        name=payload.name,
        slug=_unique_location_slug(db, business_id, payload.name),
        description=payload.description,
        purpose=payload.purpose,
        goals=payload.goals,
        extra_knowledge=payload.extra_knowledge,
    )
    db.add(location)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("A location with that name already exists")
    db.refresh(location)
    return location


def update_location(
    db: Session, business_id: uuid.UUID, location_id: uuid.UUID, payload: LocationUpdate
) -> Location:
    location = get_location(db, business_id, location_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(location, field, value)
    db.commit()
    db.refresh(location)
    return location
