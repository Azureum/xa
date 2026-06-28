import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class LandingResponse(BaseModel):
    business_name: str
    location_name: str
    host_name: str | None = None
    landing_title: str | None = None
    welcome_message: str | None = None
    suggested_questions: list[str] = Field(default_factory=list)
    primary_color: str | None = None
    secondary_color: str | None = None


class ChatMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SendMessageResponse(BaseModel):
    conversation_id: uuid.UUID
    reply: ChatMessageResponse


class ConversationHistoryResponse(BaseModel):
    conversation_id: uuid.UUID | None = None
    messages: list[ChatMessageResponse]
