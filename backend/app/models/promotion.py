import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class Promotion(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "promotions"

    business_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)


class PromotionLocation(Base):
    __tablename__ = "promotion_locations"

    promotion_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("promotions.id", ondelete="CASCADE"), primary_key=True
    )
    location_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("locations.id", ondelete="CASCADE"), primary_key=True
    )


class PromotionPhoto(UUIDPKMixin, Base):
    __tablename__ = "promotion_photos"

    promotion_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("promotions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False
    )
    display_order: Mapped[int] = mapped_column(default=0)
