import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.analytics import ScanEvent
from app.models.conversation import Conversation, Message
from app.models.location import Location
from app.schemas.overview import (
    DayPoint,
    LocationStat,
    OverviewStatsResponse,
    RecentConversation,
    TopQuestion,
)

OVER_TIME_DAYS = 7
TOP_QUESTIONS_LIMIT = 5
RECENT_CONVERSATIONS_LIMIT = 6


def _delta_pct(today: int, yesterday: int) -> float | None:
    """Percent change of today vs yesterday; None when yesterday has no data."""
    if yesterday == 0:
        return None
    return round((today - yesterday) / yesterday * 100, 1)


def _count_in_window(db: Session, model, column, start: datetime, end: datetime | None) -> int:
    stmt = select(func.count()).select_from(model).where(column >= start)
    if end is not None:
        stmt = stmt.where(column < end)
    return db.scalar(stmt) or 0


def get_overview_stats(db: Session, business_id: uuid.UUID) -> OverviewStatsResponse:
    now = datetime.now(timezone.utc)
    today_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    yesterday_start = today_start - timedelta(days=1)

    # --- Totals + today/yesterday deltas ---
    total_conversations = db.scalar(select(func.count()).select_from(Conversation)) or 0
    conv_today = _count_in_window(db, Conversation, Conversation.started_at, today_start, None)
    conv_yesterday = _count_in_window(
        db, Conversation, Conversation.started_at, yesterday_start, today_start
    )

    qr_scans = db.scalar(select(func.count()).select_from(ScanEvent)) or 0
    scans_today = _count_in_window(db, ScanEvent, ScanEvent.created_at, today_start, None)
    scans_yesterday = _count_in_window(
        db, ScanEvent, ScanEvent.created_at, yesterday_start, today_start
    )

    # --- Locations ---
    total_locations = db.scalar(select(func.count()).select_from(Location)) or 0
    active_locations = (
        db.scalar(select(func.count()).select_from(Location).where(Location.is_active.is_(True)))
        or 0
    )

    # --- Answer rate (from customer questions + is_unanswered flag) ---
    question_count = (
        db.scalar(select(func.count()).select_from(Message).where(Message.role == "customer")) or 0
    )
    answered_count = (
        db.scalar(
            select(func.count())
            .select_from(Message)
            .where(Message.role == "customer", Message.is_unanswered.is_(False))
        )
        or 0
    )
    answer_rate = round(answered_count / question_count * 100, 1) if question_count else None

    # --- Conversations over time (last 7 days, zero-filled) ---
    window_start = today_start - timedelta(days=OVER_TIME_DAYS - 1)
    day_col = func.date(Conversation.started_at)
    rows = db.execute(
        select(day_col, func.count())
        .where(Conversation.started_at >= window_start)
        .group_by(day_col)
    ).all()
    counts_by_day: dict[date, int] = {}
    for day_value, count in rows:
        # func.date() yields a date on Postgres, but a string on SQLite.
        if isinstance(day_value, str):
            day_value = date.fromisoformat(day_value)
        counts_by_day[day_value] = count
    conversations_over_time = [
        DayPoint(
            date=(d := (window_start + timedelta(days=offset)).date()).isoformat(),
            count=counts_by_day.get(d, 0),
        )
        for offset in range(OVER_TIME_DAYS)
    ]

    # --- Top questions ---
    top_rows = db.execute(
        select(Message.content, func.count().label("n"))
        .where(Message.role == "customer")
        .group_by(Message.content)
        .order_by(func.count().desc(), Message.content)
        .limit(TOP_QUESTIONS_LIMIT)
    ).all()
    top_questions = [TopQuestion(question=content, count=n) for content, n in top_rows]

    # --- Location performance ---
    perf_rows = db.execute(
        select(Location.name, func.count(Conversation.id).label("n"))
        .join(Conversation, Conversation.location_id == Location.id)
        .group_by(Location.name)
        .order_by(func.count(Conversation.id).desc(), Location.name)
    ).all()
    location_performance = [
        LocationStat(location_name=name, conversation_count=n) for name, n in perf_rows
    ]

    # --- Recent conversations ---
    recent_convos = list(
        db.scalars(
            select(Conversation)
            .order_by(Conversation.started_at.desc())
            .limit(RECENT_CONVERSATIONS_LIMIT)
        )
    )
    location_names = dict(db.execute(select(Location.id, Location.name)).all())
    recent_conversations: list[RecentConversation] = []
    for convo in recent_convos:
        first_question = db.scalar(
            select(Message.content)
            .where(Message.conversation_id == convo.id, Message.role == "customer")
            .order_by(Message.created_at)
            .limit(1)
        )
        recent_conversations.append(
            RecentConversation(
                question=first_question,
                location_name=location_names.get(convo.location_id, "Unknown"),
                started_at=convo.started_at,
                status="resolved" if convo.is_ended else "open",
            )
        )

    return OverviewStatsResponse(
        total_conversations=total_conversations,
        conversations_delta_pct=_delta_pct(conv_today, conv_yesterday),
        qr_scans=qr_scans,
        qr_scans_delta_pct=_delta_pct(scans_today, scans_yesterday),
        active_locations=active_locations,
        total_locations=total_locations,
        answer_rate=answer_rate,
        answered_count=answered_count,
        question_count=question_count,
        conversations_over_time=conversations_over_time,
        top_questions=top_questions,
        location_performance=location_performance,
        recent_conversations=recent_conversations,
    )
