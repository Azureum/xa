import uuid

from pydantic import BaseModel, Field


class LocationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    purpose: str | None = None
    goals: str | None = None
    extra_knowledge: str | None = None


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    purpose: str | None = None
    goals: str | None = None
    extra_knowledge: str | None = None
    is_active: bool | None = None


class LocationResponse(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    purpose: str | None = None
    goals: str | None = None
    extra_knowledge: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}
