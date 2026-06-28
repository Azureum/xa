import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.deps import get_business_db, get_current_business
from app.models.business import Business
from app.schemas.conversations import (
    ConversationDetail,
    ConversationListResponse,
    ConversationMessage,
    MessageFlagUpdate,
)
from app.services import conversation_service

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=ConversationListResponse)
def list_conversations(
    unanswered_only: bool = False,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> ConversationListResponse:
    return conversation_service.list_conversations(
        db, business.id, unanswered_only=unanswered_only, limit=limit, offset=offset
    )


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> ConversationDetail:
    return conversation_service.get_conversation(db, business.id, conversation_id)


@router.patch(
    "/{conversation_id}/messages/{message_id}/flag", response_model=ConversationMessage
)
def flag_message(
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
    payload: MessageFlagUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> ConversationMessage:
    message = conversation_service.set_message_flag(
        db, business.id, conversation_id, message_id, payload.is_unanswered
    )
    return ConversationMessage.model_validate(message)
