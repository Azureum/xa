import uuid

from sqlalchemy import JSON, ForeignKey, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class AIPersonality(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "ai_personalities"

    business_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    host_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    brand_voice: Mapped[str | None] = mapped_column(Text, nullable=True)
    focus_areas: Mapped[str | None] = mapped_column(Text, nullable=True)
    avoid_topics: Mapped[str | None] = mapped_column(Text, nullable=True)


class LandingConfig(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "landing_configs"
    __table_args__ = (
        UniqueConstraint("business_id", "location_id", name="uq_landing_business_location"),
    )

    business_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("locations.id", ondelete="CASCADE"), nullable=True
    )
    landing_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    welcome_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_questions: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)


class LandingPhoto(UUIDPKMixin, Base):
    __tablename__ = "landing_photos"

    landing_config_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("landing_configs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False
    )
    caption: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_order: Mapped[int] = mapped_column(default=0)
