from pydantic import BaseModel


class DayPoint(BaseModel):
    date: str  # ISO date (YYYY-MM-DD)
    count: int


class HourPoint(BaseModel):
    hour: int  # 0-23
    count: int


class LocationScan(BaseModel):
    location_name: str
    count: int


class QuestionCount(BaseModel):
    question: str
    count: int


class AnalyticsResponse(BaseModel):
    range_days: int

    total_scans: int
    scans_delta_pct: float | None
    conversations_started: int
    conversations_delta_pct: float | None
    unique_visitors: int
    visitors_delta_pct: float | None
    conversion_rate: float | None  # 0-100
    unanswered_questions: int
    answer_rate: float | None  # 0-100

    scans_over_time: list[DayPoint]
    hourly_traffic: list[HourPoint]
    scans_by_location: list[LocationScan]
    top_questions: list[QuestionCount]
    unanswered_list: list[QuestionCount]
