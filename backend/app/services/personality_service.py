import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.personality import AIPersonality
from app.schemas.personality import AIPersonalityUpdate


def get_personality(db: Session, business_id: uuid.UUID) -> AIPersonality | None:
    return db.scalar(select(AIPersonality).where(AIPersonality.business_id == business_id))


def upsert_personality(db: Session, business_id: uuid.UUID, payload: AIPersonalityUpdate) -> AIPersonality:
    personality = get_personality(db, business_id)
    if personality is None:
        personality = AIPersonality(business_id=business_id)
        db.add(personality)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(personality, field, value)

    db.commit()
    db.refresh(personality)
    return personality
