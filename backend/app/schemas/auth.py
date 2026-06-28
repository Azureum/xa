import uuid

from pydantic import BaseModel, Field


class SetupBusinessRequest(BaseModel):
    business_name: str = Field(min_length=1, max_length=255)


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    business_id: uuid.UUID

    model_config = {"from_attributes": True}


class BusinessResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    primary_color: str | None = None
    secondary_color: str | None = None

    model_config = {"from_attributes": True}


class MeResponse(BaseModel):
    user: UserResponse
    business: BusinessResponse
