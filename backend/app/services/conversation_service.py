import uuid

from fastapi import HTTPException
from sqlalchemy import func, nullslast, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.conversation import Conversation, Message
from app.models.location import Location
from app.schemas.conversations import (
    ConversationDetail,
    ConversationListItem,
    ConversationListResponse,
    ConversationMessage,
)
from app.services import public_service


def _first_question(db: Session, conversation_id: uuid.UUID) -> str | None:
    """Earliest customer message in the conversation (mirrors overview_service)."""
    return db.scalar(
        select(Message.content)
        .where(Message.conversation_id == conversation_id, Message.role == "customer")
        .order_by(Message.created_at)
        .limit(1)
    )


def _last_message_preview(db: Session, conversation_id: uuid.UUID) -> str | None:
    return db.scalar(
        select(Message.content)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(1)
    )


def list_conversations(
    db: Session,
    business_id: uuid.UUID,
    *,
    unanswered_only: bool = False,
    limit: int = 20,
    offset: int = 0,
) -> ConversationListResponse:
    filters = [Conversation.business_id == business_id]
    if unanswered_only:
        unanswered_exists = (
            select(Message.id)
            .where(
                Message.conversation_id == Conversation.id,
                Message.is_unanswered.is_(True),
            )
            .exists()
        )
        filters.append(unanswered_exists)

    total = db.scalar(select(func.count()).select_from(Conversation).where(*filters)) or 0

    rows = db.execute(
        select(Conversation, Location.name)
        .join(Location, Location.id == Conversation.location_id)
        .where(*filters)
        .order_by(
            nullslast(Conversation.last_message_at.desc()),
            Conversation.started_at.desc(),
        )
        .limit(limit)
        .offset(offset)
    ).all()

    items: list[ConversationListItem] = []
    for convo, location_name in rows:
        message_count = (
            db.scalar(
                select(func.count())
                .select_from(Message)
                .where(Message.conversation_id == convo.id)
            )
            or 0
        )
        unanswered_count = (
            db.scalar(
                select(func.count())
                .select_from(Message)
                .where(Message.conversation_id == convo.id, Message.is_unanswered.is_(True))
            )
            or 0
        )
        items.append(
            ConversationListItem(
                id=convo.id,
                location_name=location_name,
                started_at=convo.started_at,
                last_message_at=convo.last_message_at,
                is_ended=convo.is_ended,
                message_count=message_count,
                unanswered_count=unanswered_count,
                first_question=_first_question(db, convo.id),
                last_message_preview=_last_message_preview(db, convo.id),
            )
        )

    return ConversationListResponse(items=items, total=total)


def get_conversation(
    db: Session, business_id: uuid.UUID, conversation_id: uuid.UUID
) -> ConversationDetail:
    row = db.execute(
        select(Conversation, Location.name)
        .join(Location, Location.id == Conversation.location_id)
        .where(Conversation.business_id == business_id, Conversation.id == conversation_id)
    ).first()
    if row is None:
        raise NotFoundError("Conversation not found")
    convo, location_name = row

    messages = public_service.list_messages(db, convo.id)
    return ConversationDetail(
        id=convo.id,
        location_name=location_name,
        session_token=convo.session_token,
        started_at=convo.started_at,
        last_message_at=convo.last_message_at,
        is_ended=convo.is_ended,
        messages=[ConversationMessage.model_validate(message) for message in messages],
    )


def set_message_flag(
    db: Session,
    business_id: uuid.UUID,
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
    is_unanswered: bool,
) -> Message:
    """Flag/unflag a customer question as unanswered.

    The unanswered flag lives on the *customer* message because that is the unit
    Overview/Analytics count against ("answer rate" = answered customer questions
    over total). Flagging here is what feeds those metrics with real, curated data.
    """
    # Scope to the business explicitly (RLS enforces this too, belt-and-suspenders).
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.business_id == business_id, Conversation.id == conversation_id
        )
    )
    if conversation is None:
        raise NotFoundError("Conversation not found")

    message = db.scalar(
        select(Message).where(
            Message.id == message_id, Message.conversation_id == conversation_id
        )
    )
    if message is None:
        raise NotFoundError("Message not found")
    if message.role != "customer":
        raise HTTPException(
            status_code=400, detail="Only customer questions can be flagged as unanswered"
        )

    message.is_unanswered = is_unanswered
    db.commit()
    db.refresh(message)
    return message
