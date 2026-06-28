import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.analytics import ScanEvent
from app.models.business import Business
from app.models.conversation import Conversation, Message
from app.models.location import Location
from app.models.personality import LandingConfig


def resolve_location(db: Session, business_slug: str, location_slug: str) -> tuple[Business, Location]:
    business = db.scalar(select(Business).where(Business.slug == business_slug))
    if business is None:
        raise NotFoundError("Business not found")

    location = db.scalar(
        select(Location).where(
            Location.business_id == business.id,
            Location.slug == location_slug,
            Location.is_active.is_(True),
        )
    )
    if location is None:
        raise NotFoundError("Location not found")

    return business, location


def resolve_landing_config(
    db: Session, business_id: uuid.UUID, location_id: uuid.UUID
) -> LandingConfig | None:
    """Location-level override takes priority; falls back to the business-level default."""
    location_config = db.scalar(
        select(LandingConfig).where(
            LandingConfig.business_id == business_id, LandingConfig.location_id == location_id
        )
    )
    if location_config is not None:
        return location_config

    return db.scalar(
        select(LandingConfig).where(
            LandingConfig.business_id == business_id, LandingConfig.location_id.is_(None)
        )
    )


def record_scan(
    db: Session, business_id: uuid.UUID, location_id: uuid.UUID, session_token: str | None
) -> ScanEvent:
    scan = ScanEvent(business_id=business_id, location_id=location_id, session_token=session_token)
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan


def find_conversation(
    db: Session, business_id: uuid.UUID, location_id: uuid.UUID, session_token: str
) -> Conversation | None:
    return db.scalar(
        select(Conversation).where(
            Conversation.business_id == business_id,
            Conversation.location_id == location_id,
            Conversation.session_token == session_token,
        )
    )


def get_or_create_conversation(
    db: Session, business_id: uuid.UUID, location_id: uuid.UUID, session_token: str
) -> Conversation:
    conversation = find_conversation(db, business_id, location_id, session_token)
    if conversation is None:
        conversation = Conversation(
            business_id=business_id, location_id=location_id, session_token=session_token
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    return conversation


def list_messages(db: Session, conversation_id: uuid.UUID) -> list[Message]:
    return list(
        db.scalars(
            select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)
        )
    )


def record_message(
    db: Session,
    conversation: Conversation,
    role: str,
    content: str,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
) -> Message:
    message = Message(
        conversation_id=conversation.id,
        role=role,
        content=content,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )
    db.add(message)
    conversation.last_message_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(message)
    return message
