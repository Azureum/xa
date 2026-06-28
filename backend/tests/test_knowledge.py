def _setup_business(client, user, name="Pasta Palace"):
    response = client.post(
        "/api/dashboard/auth/setup-business", json={"business_name": name}, headers=user.headers
    )
    assert response.status_code == 200
    return response.json()["business"]


def test_faq_crud(client, make_user):
    user = make_user("owner@pastapalace.com")
    _setup_business(client, user)

    create = client.post(
        "/api/dashboard/training/faqs",
        json={"question": "Are you open Sundays?", "answer": "Yes, 11am-9pm."},
        headers=user.headers,
    )
    assert create.status_code == 200
    faq = create.json()
    assert faq["question"] == "Are you open Sundays?"
    assert faq["is_active"] is True

    listed = client.get("/api/dashboard/training/faqs", headers=user.headers)
    assert [f["id"] for f in listed.json()] == [faq["id"]]

    updated = client.patch(
        f"/api/dashboard/training/faqs/{faq['id']}",
        json={"answer": "Yes, 11am-10pm on Sundays."},
        headers=user.headers,
    )
    assert updated.status_code == 200
    assert updated.json()["answer"] == "Yes, 11am-10pm on Sundays."

    deleted = client.delete(f"/api/dashboard/training/faqs/{faq['id']}", headers=user.headers)
    assert deleted.status_code == 204

    listed_after = client.get("/api/dashboard/training/faqs", headers=user.headers)
    assert listed_after.json() == []


def test_faq_update_not_found(client, make_user):
    user = make_user("owner@pastapalace.com")
    _setup_business(client, user)

    response = client.patch(
        "/api/dashboard/training/faqs/00000000-0000-0000-0000-000000000000",
        json={"answer": "anything"},
        headers=user.headers,
    )
    assert response.status_code == 404


def test_additional_knowledge_crud(client, make_user):
    user = make_user("owner@pastapalace.com")
    _setup_business(client, user)

    create = client.post(
        "/api/dashboard/training/additional-knowledge",
        json={"title": "Parking", "content": "Free lot behind the building."},
        headers=user.headers,
    )
    assert create.status_code == 200
    entry = create.json()
    assert entry["title"] == "Parking"

    listed = client.get("/api/dashboard/training/additional-knowledge", headers=user.headers)
    assert [e["id"] for e in listed.json()] == [entry["id"]]

    updated = client.patch(
        f"/api/dashboard/training/additional-knowledge/{entry['id']}",
        json={"is_active": False},
        headers=user.headers,
    )
    assert updated.status_code == 200
    assert updated.json()["is_active"] is False

    deleted = client.delete(
        f"/api/dashboard/training/additional-knowledge/{entry['id']}", headers=user.headers
    )
    assert deleted.status_code == 204


def test_knowledge_scoped_to_own_business(client, make_user):
    owner_a = make_user("owner@pastapalace.com")
    _setup_business(client, owner_a, "Pasta Palace")
    client.post(
        "/api/dashboard/training/faqs",
        json={"question": "Q?", "answer": "A."},
        headers=owner_a.headers,
    )

    owner_b = make_user("owner@tacotown.com")
    _setup_business(client, owner_b, "Taco Town")

    listed = client.get("/api/dashboard/training/faqs", headers=owner_b.headers)
    assert listed.json() == []
