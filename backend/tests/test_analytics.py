import uuid
from datetime import datetime, timedelta, timezone

from app.models.analytics import ScanEvent
from app.models.conversation import Conversation, Message


def _setup_business(client, user, name="Pasta Palace"):
    response = client.post(
        "/api/dashboard/auth/setup-business", json={"business_name": name}, headers=user.headers
    )
    assert response.status_code == 200
    return response.json()["business"]


def _make_location(client, user, name):
    return client.post("/api/dashboard/locations", json={"name": name}, headers=user.headers).json()


def _scan(db_session, business_id, location_id, *, created_at, session_token=None):
    scan = ScanEvent(
        business_id=uuid.UUID(business_id),
        location_id=uuid.UUID(location_id),
        session_token=session_token,
        created_at=created_at,
    )
    db_session.add(scan)
    db_session.commit()
    return scan


def _conversation(db_session, business_id, location_id, *, started_at, session_token=None):
    convo = Conversation(
        business_id=uuid.UUID(business_id),
        location_id=uuid.UUID(location_id),
        session_token=session_token or uuid.uuid4().hex,
        started_at=started_at,
    )
    db_session.add(convo)
    db_session.commit()
    db_session.refresh(convo)
    return convo


def _message(db_session, conversation_id, role, content, *, is_unanswered=False, created_at=None):
    msg = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        is_unanswered=is_unanswered,
        created_at=created_at or datetime.now(timezone.utc),
    )
    db_session.add(msg)
    db_session.commit()
    return msg


def test_analytics_requires_auth(client):
    response = client.get("/api/dashboard/analytics/stats")
    assert response.status_code == 401


def test_analytics_empty_returns_zeros(client, make_user):
    user = make_user("owner@pastapalace.com")
    _setup_business(client, user)

    body = client.get("/api/dashboard/analytics/stats", headers=user.headers).json()
    assert body["range_days"] == 30
    assert body["total_scans"] == 0
    assert body["scans_delta_pct"] is None
    assert body["conversations_started"] == 0
    assert body["unique_visitors"] == 0
    assert body["conversion_rate"] is None
    assert body["unanswered_questions"] == 0
    assert body["answer_rate"] is None
    # Always exactly `days` zero-filled points, and all 24 hours.
    assert len(body["scans_over_time"]) == 30
    assert all(point["count"] == 0 for point in body["scans_over_time"])
    assert len(body["hourly_traffic"]) == 24
    assert all(point["count"] == 0 for point in body["hourly_traffic"])
    assert body["scans_by_location"] == []
    assert body["top_questions"] == []
    assert body["unanswered_list"] == []


def test_analytics_respects_days_query_param(client, make_user):
    user = make_user("owner@pastapalace.com")
    _setup_business(client, user)

    body = client.get(
        "/api/dashboard/analytics/stats", params={"days": 7}, headers=user.headers
    ).json()
    assert body["range_days"] == 7
    assert len(body["scans_over_time"]) == 7


def test_analytics_aggregates_real_data(client, make_user, db_session):
    user = make_user("owner@pastapalace.com")
    business = _setup_business(client, user)
    main = _make_location(client, user, "Main Dining Room")
    bar = _make_location(client, user, "Bar Area")

    now = datetime.now(timezone.utc)
    in_range = now - timedelta(days=1)
    out_of_range = now - timedelta(days=40)

    # Scans: 3 in range at Main (one with a session that converts), 1 in range at Bar,
    # plus 1 out-of-range scan that must not be counted.
    converting_token = uuid.uuid4().hex
    _scan(db_session, business["id"], main["id"], created_at=in_range, session_token=converting_token)
    _scan(db_session, business["id"], main["id"], created_at=in_range, session_token=uuid.uuid4().hex)
    _scan(db_session, business["id"], bar["id"], created_at=in_range)
    _scan(db_session, business["id"], main["id"], created_at=out_of_range)

    # A conversation matching the converting scan's session token, in range.
    convo = _conversation(
        db_session, business["id"], main["id"], started_at=in_range, session_token=converting_token
    )
    # Another conversation with no matching scan.
    _conversation(db_session, business["id"], bar["id"], started_at=in_range)

    _message(db_session, convo.id, "customer", "What are your hours?", created_at=in_range)
    _message(db_session, convo.id, "assistant", "We open at 5pm.", created_at=in_range)
    _message(
        db_session, convo.id, "customer", "Do you cater?", is_unanswered=True, created_at=in_range
    )
    # Out-of-range message must not be counted.
    _message(db_session, convo.id, "customer", "Old question?", created_at=out_of_range)

    body = client.get("/api/dashboard/analytics/stats", headers=user.headers).json()

    assert body["total_scans"] == 3
    assert body["conversations_started"] == 2
    assert body["unique_visitors"] == 2
    # 1 of the 2 scanning sessions converted to a conversation.
    assert body["conversion_rate"] == 50.0

    assert body["unanswered_questions"] == 1
    assert body["answer_rate"] == round(1 / 2 * 100, 1)

    assert {"location_name": "Main Dining Room", "count": 2} in body["scans_by_location"]
    assert {"location_name": "Bar Area", "count": 1} in body["scans_by_location"]

    assert {"question": "What are your hours?", "count": 1} in body["top_questions"]
    assert body["unanswered_list"] == [{"question": "Do you cater?", "count": 1}]


def test_analytics_scoped_to_own_business(client, make_user, db_session):
    owner_a = make_user("a@x.com")
    business_a = _setup_business(client, owner_a, "Alpha")
    loc_a = _make_location(client, owner_a, "Alpha Main")
    _scan(db_session, business_a["id"], loc_a["id"], created_at=datetime.now(timezone.utc))

    owner_b = make_user("b@x.com")
    _setup_business(client, owner_b, "Beta")

    body = client.get("/api/dashboard/analytics/stats", headers=owner_b.headers).json()
    assert body["total_scans"] == 0
    assert body["scans_by_location"] == []
