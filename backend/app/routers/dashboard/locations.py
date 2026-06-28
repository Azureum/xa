import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_business_db, get_current_business
from app.models.business import Business
from app.schemas.locations import LocationCreate, LocationResponse, LocationUpdate
from app.services import location_service

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("", response_model=list[LocationResponse])
def list_locations(
    business: Business = Depends(get_current_business), db: Session = Depends(get_business_db)
) -> list[LocationResponse]:
    return [
        LocationResponse.model_validate(location)
        for location in location_service.list_locations(db, business.id)
    ]


@router.post("", response_model=LocationResponse)
def create_location(
    payload: LocationCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> LocationResponse:
    location = location_service.create_location(db, business.id, payload)
    return LocationResponse.model_validate(location)


@router.get("/{location_id}", response_model=LocationResponse)
def get_location(
    location_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> LocationResponse:
    location = location_service.get_location(db, business.id, location_id)
    return LocationResponse.model_validate(location)


@router.patch("/{location_id}", response_model=LocationResponse)
def update_location(
    location_id: uuid.UUID,
    payload: LocationUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> LocationResponse:
    location = location_service.update_location(db, business.id, location_id, payload)
    return LocationResponse.model_validate(location)
