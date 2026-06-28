import uuid
from datetime import datetime

from pydantic import BaseModel


class ConversationListItem(BaseModel):
    id: uuid.UUID
    location_name: str
    started_at: datetime
    last_message_at: datetime | None
    is_ended: bool
    message_count: int
    unanswered_count: int
    first_question: str | None
    last_message_preview: str | None


class ConversationMessage(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    is_unanswered: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    id: uuid.UUID
    location_name: str
    session_token: str
    started_at: datetime
    last_message_at: datetime | None
    is_ended: bool
    messages: list[ConversationMessage]


class ConversationListResponse(BaseModel):
    items: list[ConversationListItem]
    total: int


class MessageFlagUpdate(BaseModel):
    is_unanswered: bool
