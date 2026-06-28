from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.deps import get_public_session
from app.schemas.public import LandingResponse
from app.services import personality_service, public_service

router = APIRouter(tags=["public-landing"])


@router.get("/{business_slug}/{location_slug}/landing", response_model=LandingResponse)
def get_landing(
    business_slug: str,
    location_slug: str,
    x_session_token: str | None = Header(default=None),
    db: Session = Depends(get_public_session),
) -> LandingResponse:
    business, location = public_service.resolve_location(db, business_slug, location_slug)
    public_service.record_scan(db, business.id, location.id, x_session_token)
    personality = personality_service.get_personality(db, business.id)
    landing_config = public_service.resolve_landing_config(db, business.id, location.id)

    return LandingResponse(
        business_name=business.name,
        location_name=location.name,
        host_name=personality.host_name if personality else None,
        landing_title=landing_config.landing_title if landing_config else None,
        welcome_message=landing_config.welcome_message if landing_config else None,
        suggested_questions=(landing_config.suggested_questions if landing_config else None) or [],
        primary_color=business.primary_color,
        secondary_color=business.secondary_color,
    )
