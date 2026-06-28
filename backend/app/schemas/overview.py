from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class DayPoint(BaseModel):
    date: str  # ISO date (YYYY-MM-DD)
    count: int


class TopQuestion(BaseModel):
    question: str
    count: int


class LocationStat(BaseModel):
    location_name: str
    conversation_count: int


class RecentConversation(BaseModel):
    question: str | None
    location_name: str
    started_at: datetime
    status: Literal["resolved", "open"]


class OverviewStatsResponse(BaseModel):
    total_conversations: int
    conversations_delta_pct: float | None

    qr_scans: int
    qr_scans_delta_pct: float | None

    active_locations: int
    total_locations: int

    answer_rate: float | None  # 0-100
    answered_count: int
    question_count: int

    conversations_over_time: list[DayPoint]
    top_questions: list[TopQuestion]
    location_performance: list[LocationStat]
    recent_conversations: list[RecentConversation]
