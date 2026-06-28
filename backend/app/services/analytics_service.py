import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.analytics import ScanEvent
from app.models.conversation import Conversation, Message
from app.models.location import Location
from app.schemas.analytics import (
    AnalyticsResponse,
    DayPoint,
    HourPoint,
    LocationScan,
    QuestionCount,
)

TOP_QUESTIONS_LIMIT = 5


def _delta_pct(current: int, previous: int) -> float | None:
    """Percent change of current period vs previous period; None when previous has no data."""
    if previous == 0:
        return None
    return round((current - previous) / previous * 100, 1)


def _count_in_window(db: Session, model, column, start: datetime, end: datetime | None) -> int:
    stmt = select(func.count()).select_from(model).where(column >= start)
    if end is not None:
        stmt = stmt.where(column < end)
    return db.scalar(stmt) or 0


def _distinct_sessions_in_window(db: Session, start: datetime, end: datetime | None) -> set[str]:
    stmt = select(ScanEvent.session_token).where(
        ScanEvent.session_token.is_not(None), ScanEvent.created_at >= start
    )
    if end is not None:
        stmt = stmt.where(ScanEvent.created_at < end)
    return set(db.scalars(stmt.distinct()))


def get_analytics_stats(db: Session, business_id: uuid.UUID, range_days: int) -> AnalyticsResponse:
    now = datetime.now(timezone.utc)
    today_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    current_start = today_start - timedelta(days=range_days - 1)
    previous_start = current_start - timedelta(days=range_days)

    # --- Totals + current/previous period deltas ---
    total_scans = _count_in_window(db, ScanEvent, ScanEvent.created_at, current_start, None)
    scans_previous = _count_in_window(
        db, ScanEvent, ScanEvent.created_at, previous_start, current_start
    )

    conversations_started = _count_in_window(
        db, Conversation, Conversation.started_at, current_start, None
    )
    conversations_previous = _count_in_window(
        db, Conversation, Conversation.started_at, previous_start, current_start
    )

    # --- Unique visitors + conversion rate (scan sessions that went on to start a conversation) ---
    current_sessions = _distinct_sessions_in_window(db, current_start, None)
    previous_sessions = _distinct_sessions_in_window(db, previous_start, current_start)
    unique_visitors = len(current_sessions)

    converted_sessions = 0
    if current_sessions:
        converted_sessions = (
            db.scalar(
                select(func.count(Conversation.session_token.distinct())).where(
                    Conversation.session_token.in_(current_sessions),
                    Conversation.started_at >= current_start,
                )
            )
            or 0
        )
    conversion_rate = (
        round(converted_sessions / unique_visitors * 100, 1) if unique_visitors else None
    )

    # --- Answer rate (from customer questions + is_unanswered flag), scoped to current window ---
    question_count = (
        db.scalar(
            select(func.count())
            .select_from(Message)
            .where(Message.role == "customer", Message.created_at >= current_start)
        )
        or 0
    )
    answered_count = (
        db.scalar(
            select(func.count())
            .select_from(Message)
            .where(
                Message.role == "customer",
                Message.created_at >= current_start,
                Message.is_unanswered.is_(False),
            )
        )
        or 0
    )
    answer_rate = round(answered_count / question_count * 100, 1) if question_count else None
    unanswered_questions = question_count - answered_count

    # --- Scans over time (zero-filled, range_days points ending today) ---
    day_col = func.date(ScanEvent.created_at)
    day_rows = db.execute(
        select(day_col, func.count())
        .where(ScanEvent.created_at >= current_start)
        .group_by(day_col)
    ).all()
    scans_by_day: dict[date, int] = {}
    for day_value, count in day_rows:
        # func.date() yields a date on Postgres, but a string on SQLite.
        if isinstance(day_value, str):
            day_value = date.fromisoformat(day_value)
        scans_by_day[day_value] = count
    window_start_day = current_start.date()
    scans_over_time = [
        DayPoint(
            date=(d := (window_start_day + timedelta(days=offset))).isoformat(),
            count=scans_by_day.get(d, 0),
        )
        for offset in range(range_days)
    ]

    # --- Hourly traffic (zero-filled, all 24 hours) ---
    hour_col = func.extract("hour", ScanEvent.created_at)
    hour_rows = db.execute(
        select(hour_col, func.count())
        .where(ScanEvent.created_at >= current_start)
        .group_by(hour_col)
    ).all()
    counts_by_hour = {int(hour): count for hour, count in hour_rows}
    hourly_traffic = [HourPoint(hour=h, count=counts_by_hour.get(h, 0)) for h in range(24)]

    # --- Scans by location ---
    location_rows = db.execute(
        select(Location.name, func.count(ScanEvent.id).label("n"))
        .join(ScanEvent, ScanEvent.location_id == Location.id)
        .where(ScanEvent.created_at >= current_start)
        .group_by(Location.name)
        .order_by(func.count(ScanEvent.id).desc(), Location.name)
    ).all()
    scans_by_location = [LocationScan(location_name=name, count=n) for name, n in location_rows]

    # --- Top questions / unanswered questions ---
    top_rows = db.execute(
        select(Message.content, func.count().label("n"))
        .where(Message.role == "customer", Message.created_at >= current_start)
        .group_by(Message.content)
        .order_by(func.count().desc(), Message.content)
        .limit(TOP_QUESTIONS_LIMIT)
    ).all()
    top_questions = [QuestionCount(question=content, count=n) for content, n in top_rows]

    unanswered_rows = db.execute(
        select(Message.content, func.count().label("n"))
        .where(
            Message.role == "customer",
            Message.is_unanswered.is_(True),
            Message.created_at >= current_start,
        )
        .group_by(Message.content)
        .order_by(func.count().desc(), Message.content)
        .limit(TOP_QUESTIONS_LIMIT)
    ).all()
    unanswered_list = [QuestionCount(question=content, count=n) for content, n in unanswered_rows]

    return AnalyticsResponse(
        range_days=range_days,
        total_scans=total_scans,
        scans_delta_pct=_delta_pct(total_scans, scans_previous),
        conversations_started=conversations_started,
        conversations_delta_pct=_delta_pct(conversations_started, conversations_previous),
        unique_visitors=unique_visitors,
        visitors_delta_pct=_delta_pct(unique_visitors, len(previous_sessions)),
        conversion_rate=conversion_rate,
        unanswered_questions=unanswered_questions,
        answer_rate=answer_rate,
        scans_over_time=scans_over_time,
        hourly_traffic=hourly_traffic,
        scans_by_location=scans_by_location,
        top_questions=top_questions,
        unanswered_list=unanswered_list,
    )
