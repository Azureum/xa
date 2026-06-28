import uuid

from pydantic import BaseModel


class AIPersonalityUpdate(BaseModel):
    host_name: str | None = None
    brand_voice: str | None = None
    focus_areas: str | None = None
    avoid_topics: str | None = None


class AIPersonalityResponse(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    host_name: str | None = None
    brand_voice: str | None = None
    focus_areas: str | None = None
    avoid_topics: str | None = None

    model_config = {"from_attributes": True}
