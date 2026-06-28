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


def _conversation(db_session, business_id, location_id, *, started_at, is_ended=False):
    convo = Conversation(
        business_id=uuid.UUID(business_id),
        location_id=uuid.UUID(location_id),
        session_token=uuid.uuid4().hex,
        started_at=started_at,
        is_ended=is_ended,
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


def test_overview_requires_auth(client):
    response = client.get("/api/dashboard/overview/stats")
    assert response.status_code == 401


def test_overview_empty_returns_zeros(client, make_user):
    user = make_user("owner@pastapalace.com")
    _setup_business(client, user)

    body = client.get("/api/dashboard/overview/stats", headers=user.headers).json()
    assert body["total_conversations"] == 0
    assert body["qr_scans"] == 0
    assert body["active_locations"] == 0
    assert body["total_locations"] == 0
    assert body["answer_rate"] is None
    assert body["question_count"] == 0
    assert body["conversations_delta_pct"] is None
    # Always exactly 7 zero-filled days, even with no data.
    assert len(body["conversations_over_time"]) == 7
    assert all(point["count"] == 0 for point in body["conversations_over_time"])
    assert body["top_questions"] == []
    assert body["location_performance"] == []
    assert body["recent_conversations"] == []


def test_overview_aggregates_real_data(client, make_user, db_session):
    user = make_user("owner@pastapalace.com")
    business = _setup_business(client, user)
    main = _make_location(client, user, "Main Dining Room")
    bar = _make_location(client, user, "Bar Area")
    # Deactivate one location to exercise active vs total.
    client.patch(
        f"/api/dashboard/locations/{bar['id']}", json={"is_active": False}, headers=user.headers
    )

    now = datetime.now(timezone.utc)
    # Two conversations at Main today, one at Bar two days ago.
    c1 = _conversation(db_session, business["id"], main["id"], started_at=now, is_ended=True)
    c2 = _conversation(db_session, business["id"], main["id"], started_at=now)
    c3 = _conversation(
        db_session, business["id"], bar["id"], started_at=now - timedelta(days=2), is_ended=True
    )

    # Customer questions: two identical ("hours") + one other; one unanswered.
    _message(db_session, c1.id, "customer", "What are your hours?")
    _message(db_session, c1.id, "assistant", "We open at 5pm.")
    _message(db_session, c2.id, "customer", "What are your hours?")
    _message(db_session, c3.id, "customer", "Do you cater?", is_unanswered=True)

    # Scans
    for _ in range(3):
        db_session.add(
            ScanEvent(business_id=uuid.UUID(business["id"]), location_id=uuid.UUID(main["id"]))
        )
    db_session.commit()

    body = client.get("/api/dashboard/overview/stats", headers=user.headers).json()

    assert body["total_conversations"] == 3
    assert body["qr_scans"] == 3
    assert body["active_locations"] == 1
    assert body["total_locations"] == 2

    # 3 customer questions, 1 unanswered -> 2/3 answered.
    assert body["question_count"] == 3
    assert body["answered_count"] == 2
    assert body["answer_rate"] == round(2 / 3 * 100, 1)

    # Top questions: "hours" (2) ranks above "cater" (1).
    assert body["top_questions"][0] == {"question": "What are your hours?", "count": 2}
    assert {"question": "Do you cater?", "count": 1} in body["top_questions"]

    # Location performance: Main (2) above Bar (1).
    assert body["location_performance"][0] == {
        "location_name": "Main Dining Room",
        "conversation_count": 2,
    }

    # Recent conversations newest-first, status from is_ended.
    recent = body["recent_conversations"]
    assert len(recent) == 3
    assert recent[0]["location_name"] == "Main Dining Room"
    statuses = {(r["location_name"], r["status"]) for r in recent}
    assert ("Bar Area", "resolved") in statuses
    assert ("Main Dining Room", "open") in statuses


def test_overview_scoped_to_own_business(client, make_user, db_session):
    owner_a = make_user("a@x.com")
    business_a = _setup_business(client, owner_a, "Alpha")
    loc_a = _make_location(client, owner_a, "Alpha Main")
    _conversation(
        db_session, business_a["id"], loc_a["id"], started_at=datetime.now(timezone.utc)
    )

    owner_b = make_user("b@x.com")
    _setup_business(client, owner_b, "Beta")

    body = client.get("/api/dashboard/overview/stats", headers=owner_b.headers).json()
    assert body["total_conversations"] == 0
    assert body["location_performance"] == []
