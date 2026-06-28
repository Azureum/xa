import pytest

from app.services.ai import deepseek_client


def _setup_business_and_location(client, user, business_name="Pasta Palace", location_name="Downtown"):
    business = client.post(
        "/api/dashboard/auth/setup-business",
        json={"business_name": business_name},
        headers=user.headers,
    ).json()["business"]
    location = client.post(
        "/api/dashboard/locations", json={"name": location_name}, headers=user.headers
    ).json()
    return business["slug"], location["slug"]


@pytest.fixture()
def fake_deepseek(monkeypatch):
    calls = []

    def _fake_chat_completion(messages, temperature=0.7, max_tokens=500):
        calls.append(messages)
        return "Sure, we're open until 9pm!", 42, 7

    monkeypatch.setattr(deepseek_client, "chat_completion", _fake_chat_completion)
    return calls


def test_landing_not_found_for_unknown_business(client):
    response = client.get("/api/public/no-such-biz/no-such-loc/landing")
    assert response.status_code == 404


def test_landing_returns_business_and_location_info(client, make_user):
    user = make_user("owner@pastapalace.com")
    business_slug, location_slug = _setup_business_and_location(client, user)

    response = client.get(f"/api/public/{business_slug}/{location_slug}/landing")
    assert response.status_code == 200
    body = response.json()
    assert body["business_name"] == "Pasta Palace"
    assert body["location_name"] == "Downtown"
    assert body["suggested_questions"] == []


def test_landing_records_a_scan_event(client, make_user, db_session):
    from app.models.analytics import ScanEvent

    user = make_user("owner@pastapalace.com")
    business_slug, location_slug = _setup_business_and_location(client, user)

    response = client.get(
        f"/api/public/{business_slug}/{location_slug}/landing",
        headers={"X-Session-Token": "scan-session-1"},
    )
    assert response.status_code == 200

    scans = db_session.query(ScanEvent).all()
    assert len(scans) == 1
    assert scans[0].session_token == "scan-session-1"


def test_landing_records_a_scan_event_without_session_token(client, make_user, db_session):
    from app.models.analytics import ScanEvent

    user = make_user("owner@pastapalace.com")
    business_slug, location_slug = _setup_business_and_location(client, user)

    response = client.get(f"/api/public/{business_slug}/{location_slug}/landing")
    assert response.status_code == 200

    scans = db_session.query(ScanEvent).all()
    assert len(scans) == 1
    assert scans[0].session_token is None


def test_send_message_without_session_token_rejected(client, make_user):
    user = make_user("owner@pastapalace.com")
    business_slug, location_slug = _setup_business_and_location(client, user)

    response = client.post(
        f"/api/public/{business_slug}/{location_slug}/messages", json={"message": "Hi"}
    )
    assert response.status_code == 400


def test_send_message_creates_conversation_and_replies(client, make_user, fake_deepseek):
    user = make_user("owner@pastapalace.com")
    business_slug, location_slug = _setup_business_and_location(client, user)
    client.post(
        "/api/dashboard/training/faqs",
        json={"question": "What time do you close?", "answer": "9pm every day."},
        headers=user.headers,
    )

    response = client.post(
        f"/api/public/{business_slug}/{location_slug}/messages",
        json={"message": "What time do you close?"},
        headers={"X-Session-Token": "session-1"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["reply"]["role"] == "assistant"
    assert body["reply"]["content"] == "Sure, we're open until 9pm!"
    assert len(fake_deepseek) == 1

    history = client.get(
        f"/api/public/{business_slug}/{location_slug}/conversation",
        headers={"X-Session-Token": "session-1"},
    )
    assert history.status_code == 200
    history_body = history.json()
    assert history_body["conversation_id"] == body["conversation_id"]
    roles = [m["role"] for m in history_body["messages"]]
    assert roles == ["customer", "assistant"]


def test_conversation_history_without_token_is_empty(client, make_user):
    user = make_user("owner@pastapalace.com")
    business_slug, location_slug = _setup_business_and_location(client, user)

    response = client.get(f"/api/public/{business_slug}/{location_slug}/conversation")
    assert response.status_code == 200
    assert response.json() == {"conversation_id": None, "messages": []}


def test_conversation_history_unknown_session_token_is_empty(client, make_user):
    user = make_user("owner@pastapalace.com")
    business_slug, location_slug = _setup_business_and_location(client, user)

    response = client.get(
        f"/api/public/{business_slug}/{location_slug}/conversation",
        headers={"X-Session-Token": "never-seen"},
    )
    assert response.status_code == 200
    assert response.json() == {"conversation_id": None, "messages": []}


def test_second_message_resumes_same_conversation(client, make_user, fake_deepseek):
    user = make_user("owner@pastapalace.com")
    business_slug, location_slug = _setup_business_and_location(client, user)

    first = client.post(
        f"/api/public/{business_slug}/{location_slug}/messages",
        json={"message": "Hi"},
        headers={"X-Session-Token": "session-1"},
    ).json()

    second = client.post(
        f"/api/public/{business_slug}/{location_slug}/messages",
        json={"message": "Are you open now?"},
        headers={"X-Session-Token": "session-1"},
    ).json()

    assert first["conversation_id"] == second["conversation_id"]
    assert len(fake_deepseek) == 2
