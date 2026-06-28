from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_public_session
from app.schemas.public import (
    ChatMessageRequest,
    ChatMessageResponse,
    ConversationHistoryResponse,
    SendMessageResponse,
)
from app.services import public_service
from app.services.ai import orchestrator

router = APIRouter(tags=["public-chat"])


def _require_session_token(x_session_token: str | None) -> str:
    if not x_session_token:
        raise HTTPException(status_code=400, detail="X-Session-Token header is required")
    return x_session_token


@router.post("/{business_slug}/{location_slug}/messages", response_model=SendMessageResponse)
def send_message(
    business_slug: str,
    location_slug: str,
    payload: ChatMessageRequest,
    x_session_token: str | None = Header(default=None),
    db: Session = Depends(get_public_session),
) -> SendMessageResponse:
    session_token = _require_session_token(x_session_token)
    business, location = public_service.resolve_location(db, business_slug, location_slug)
    conversation = public_service.get_or_create_conversation(
        db, business.id, location.id, session_token
    )

    public_service.record_message(db, conversation, role="customer", content=payload.message)

    reply, prompt_tokens, completion_tokens = orchestrator.generate_reply(
        db, business, location, conversation
    )
    reply_message = public_service.record_message(
        db,
        conversation,
        role="assistant",
        content=reply,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )

    return SendMessageResponse(
        conversation_id=conversation.id,
        reply=ChatMessageResponse.model_validate(reply_message),
    )


@router.get("/{business_slug}/{location_slug}/conversation", response_model=ConversationHistoryResponse)
def get_conversation(
    business_slug: str,
    location_slug: str,
    x_session_token: str | None = Header(default=None),
    db: Session = Depends(get_public_session),
) -> ConversationHistoryResponse:
    if not x_session_token:
        return ConversationHistoryResponse(conversation_id=None, messages=[])

    business, location = public_service.resolve_location(db, business_slug, location_slug)
    conversation = public_service.find_conversation(db, business.id, location.id, x_session_token)
    if conversation is None:
        return ConversationHistoryResponse(conversation_id=None, messages=[])

    messages = public_service.list_messages(db, conversation.id)
    return ConversationHistoryResponse(
        conversation_id=conversation.id,
        messages=[ChatMessageResponse.model_validate(message) for message in messages],
    )
