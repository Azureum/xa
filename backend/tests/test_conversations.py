import uuid
from datetime import datetime, timedelta, timezone

from app.models.conversation import Conversation, Message


def _setup_business(client, user, name="Pasta Palace"):
    response = client.post(
        "/api/dashboard/auth/setup-business", json={"business_name": name}, headers=user.headers
    )
    assert response.status_code == 200
    return response.json()["business"]


def _make_location(client, user, name):
    return client.post("/api/dashboard/locations", json={"name": name}, headers=user.headers).json()


def _conversation(db_session, business_id, location_id, *, started_at, last_message_at=None,
                  session_token=None):
    convo = Conversation(
        business_id=uuid.UUID(business_id),
        location_id=uuid.UUID(location_id),
        session_token=session_token or uuid.uuid4().hex,
        started_at=started_at,
        last_message_at=last_message_at,
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
    db_session.refresh(msg)
    return msg


def test_conversations_requires_auth(client):
    response = client.get("/api/dashboard/conversations")
    assert response.status_code == 401


def test_conversations_empty(client, make_user):
    user = make_user("owner@pastapalace.com")
    _setup_business(client, user)

    body = client.get("/api/dashboard/conversations", headers=user.headers).json()
    assert body == {"items": [], "total": 0}


def test_conversations_list_aggregates_and_ordering(client, make_user, db_session):
    user = make_user("owner@pastapalace.com")
    business = _setup_business(client, user)
    main = _make_location(client, user, "Main Dining Room")
    bar = _make_location(client, user, "Bar Area")

    now = datetime.now(timezone.utc)
    older = now - timedelta(hours=2)
    newer = now - timedelta(minutes=5)

    # Older conversation at Main with a customer question + assistant reply.
    convo_old = _conversation(
        db_session, business["id"], main["id"], started_at=older, last_message_at=older
    )
    _message(db_session, convo_old.id, "customer", "What are your hours?", created_at=older)
    _message(
        db_session,
        convo_old.id,
        "assistant",
        "We open at 5pm.",
        created_at=older + timedelta(seconds=3),
    )

    # Newer conversation at Bar with an unanswered customer question.
    convo_new = _conversation(
        db_session, business["id"], bar["id"], started_at=newer, last_message_at=newer
    )
    _message(
        db_session, convo_new.id, "customer", "Do you cater?", is_unanswered=True, created_at=newer
    )

    body = client.get("/api/dashboard/conversations", headers=user.headers).json()
    assert body["total"] == 2
    items = body["items"]
    # Most recent (by last_message_at) first.
    assert items[0]["id"] == str(convo_new.id)
    assert items[0]["location_name"] == "Bar Area"
    assert items[0]["message_count"] == 1
    assert items[0]["unanswered_count"] == 1
    assert items[0]["first_question"] == "Do you cater?"
    assert items[0]["last_message_preview"] == "Do you cater?"

    assert items[1]["id"] == str(convo_old.id)
    assert items[1]["message_count"] == 2
    assert items[1]["unanswered_count"] == 0
    assert items[1]["first_question"] == "What are your hours?"
    assert items[1]["last_message_preview"] == "We open at 5pm."


def test_conversations_unanswered_only_filter(client, make_user, db_session):
    user = make_user("owner@pastapalace.com")
    business = _setup_business(client, user)
    loc = _make_location(client, user, "Main")

    now = datetime.now(timezone.utc)
    answered = _conversation(db_session, business["id"], loc["id"], started_at=now, last_message_at=now)
    _message(db_session, answered.id, "customer", "Answered?", created_at=now)

    flagged = _conversation(
        db_session, business["id"], loc["id"], started_at=now, last_message_at=now
    )
    _message(db_session, flagged.id, "customer", "Unanswered?", is_unanswered=True, created_at=now)

    body = client.get(
        "/api/dashboard/conversations",
        params={"unanswered_only": True},
        headers=user.headers,
    ).json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == str(flagged.id)


def test_conversations_pagination(client, make_user, db_session):
    user = make_user("owner@pastapalace.com")
    business = _setup_business(client, user)
    loc = _make_location(client, user, "Main")

    now = datetime.now(timezone.utc)
    for i in range(3):
        _conversation(
            db_session,
            business["id"],
            loc["id"],
            started_at=now - timedelta(minutes=i),
            last_message_at=now - timedelta(minutes=i),
        )

    page = client.get(
        "/api/dashboard/conversations",
        params={"limit": 2, "offset": 0},
        headers=user.headers,
    ).json()
    assert page["total"] == 3
    assert len(page["items"]) == 2

    page2 = client.get(
        "/api/dashboard/conversations",
        params={"limit": 2, "offset": 2},
        headers=user.headers,
    ).json()
    assert page2["total"] == 3
    assert len(page2["items"]) == 1


def test_conversation_detail_returns_ordered_thread(client, make_user, db_session):
    user = make_user("owner@pastapalace.com")
    business = _setup_business(client, user)
    loc = _make_location(client, user, "Main")

    now = datetime.now(timezone.utc)
    convo = _conversation(db_session, business["id"], loc["id"], started_at=now, last_message_at=now)
    _message(db_session, convo.id, "customer", "First?", created_at=now - timedelta(minutes=2))
    _message(db_session, convo.id, "assistant", "Reply.", created_at=now - timedelta(minutes=1))

    body = client.get(f"/api/dashboard/conversations/{convo.id}", headers=user.headers).json()
    assert body["location_name"] == "Main"
    assert [m["content"] for m in body["messages"]] == ["First?", "Reply."]
    assert body["messages"][0]["role"] == "customer"


def test_conversation_detail_404_for_missing(client, make_user):
    user = make_user("owner@pastapalace.com")
    _setup_business(client, user)
    missing = uuid.uuid4()
    response = client.get(f"/api/dashboard/conversations/{missing}", headers=user.headers)
    assert response.status_code == 404


def test_flag_customer_message_moves_metrics(client, make_user, db_session):
    user = make_user("owner@pastapalace.com")
    business = _setup_business(client, user)
    loc = _make_location(client, user, "Main")

    now = datetime.now(timezone.utc)
    convo = _conversation(db_session, business["id"], loc["id"], started_at=now, last_message_at=now)
    # Two customer questions, both answered to start with.
    _message(db_session, convo.id, "customer", "What are your hours?", created_at=now)
    question = _message(db_session, convo.id, "customer", "Do you cater?", created_at=now)
    _message(db_session, convo.id, "assistant", "Not sure.", created_at=now)

    # Baseline: analytics shows a perfect answer rate, nothing unanswered.
    before = client.get("/api/dashboard/analytics/stats", headers=user.headers).json()
    assert before["unanswered_questions"] == 0
    assert before["answer_rate"] == 100.0

    # Flag the customer question as unanswered.
    flag = client.patch(
        f"/api/dashboard/conversations/{convo.id}/messages/{question.id}/flag",
        json={"is_unanswered": True},
        headers=user.headers,
    )
    assert flag.status_code == 200
    assert flag.json()["is_unanswered"] is True

    # The list now reflects the flag, and analytics metrics move.
    listed = client.get("/api/dashboard/conversations", headers=user.headers).json()
    assert listed["items"][0]["unanswered_count"] == 1

    after = client.get("/api/dashboard/analytics/stats", headers=user.headers).json()
    assert after["unanswered_questions"] == 1
    assert after["answer_rate"] == 50.0
    assert after["unanswered_list"] == [{"question": "Do you cater?", "count": 1}]

    # Unflag restores the baseline.
    unflag = client.patch(
        f"/api/dashboard/conversations/{convo.id}/messages/{question.id}/flag",
        json={"is_unanswered": False},
        headers=user.headers,
    )
    assert unflag.status_code == 200
    restored = client.get("/api/dashboard/analytics/stats", headers=user.headers).json()
    assert restored["unanswered_questions"] == 0


def test_flag_assistant_message_rejected(client, make_user, db_session):
    user = make_user("owner@pastapalace.com")
    business = _setup_business(client, user)
    loc = _make_location(client, user, "Main")

    now = datetime.now(timezone.utc)
    convo = _conversation(db_session, business["id"], loc["id"], started_at=now, last_message_at=now)
    reply = _message(db_session, convo.id, "assistant", "We open at 5pm.", created_at=now)

    response = client.patch(
        f"/api/dashboard/conversations/{convo.id}/messages/{reply.id}/flag",
        json={"is_unanswered": True},
        headers=user.headers,
    )
    assert response.status_code == 400


def test_conversations_scoped_to_own_business(client, make_user, db_session):
    owner_a = make_user("a@x.com")
    business_a = _setup_business(client, owner_a, "Alpha")
    loc_a = _make_location(client, owner_a, "Alpha Main")
    now = datetime.now(timezone.utc)
    convo_a = _conversation(
        db_session, business_a["id"], loc_a["id"], started_at=now, last_message_at=now
    )
    question_a = _message(db_session, convo_a.id, "customer", "Secret?", created_at=now)

    owner_b = make_user("b@x.com")
    _setup_business(client, owner_b, "Beta")

    # B cannot see A's conversations...
    listed = client.get("/api/dashboard/conversations", headers=owner_b.headers).json()
    assert listed == {"items": [], "total": 0}
    # ...nor fetch one by id...
    assert (
        client.get(f"/api/dashboard/conversations/{convo_a.id}", headers=owner_b.headers).status_code
        == 404
    )
    # ...nor flag a message in it.
    assert (
        client.patch(
            f"/api/dashboard/conversations/{convo_a.id}/messages/{question_a.id}/flag",
            json={"is_unanswered": True},
            headers=owner_b.headers,
        ).status_code
        == 404
    )
