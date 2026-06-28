from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_business_db, get_current_business
from app.models.business import Business
from app.schemas.personality import AIPersonalityResponse, AIPersonalityUpdate
from app.services import personality_service

router = APIRouter(prefix="/personality", tags=["personality"])


@router.get("", response_model=AIPersonalityResponse | None)
def get_personality(
    business: Business = Depends(get_current_business), db: Session = Depends(get_business_db)
) -> AIPersonalityResponse | None:
    personality = personality_service.get_personality(db, business.id)
    return AIPersonalityResponse.model_validate(personality) if personality else None


@router.put("", response_model=AIPersonalityResponse)
def upsert_personality(
    payload: AIPersonalityUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> AIPersonalityResponse:
    personality = personality_service.upsert_personality(db, business.id, payload)
    return AIPersonalityResponse.model_validate(personality)
