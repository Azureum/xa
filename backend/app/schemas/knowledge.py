import uuid

from pydantic import BaseModel, Field


class FAQCreate(BaseModel):
    question: str = Field(min_length=1)
    answer: str = Field(min_length=1)
    display_order: int = 0
    is_active: bool = True


class FAQUpdate(BaseModel):
    question: str | None = Field(default=None, min_length=1)
    answer: str | None = Field(default=None, min_length=1)
    display_order: int | None = None
    is_active: bool | None = None


class FAQResponse(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    question: str
    answer: str
    display_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class AdditionalKnowledgeCreate(BaseModel):
    title: str | None = None
    content: str = Field(min_length=1)
    display_order: int = 0
    is_active: bool = True


class AdditionalKnowledgeUpdate(BaseModel):
    title: str | None = None
    content: str | None = Field(default=None, min_length=1)
    display_order: int | None = None
    is_active: bool | None = None


class AdditionalKnowledgeResponse(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    title: str | None = None
    content: str
    display_order: int
    is_active: bool

    model_config = {"from_attributes": True}
