def _setup_business(client, user, name="Pasta Palace"):
    response = client.post(
        "/api/dashboard/auth/setup-business", json={"business_name": name}, headers=user.headers
    )
    assert response.status_code == 200
    return response.json()["business"]


def test_get_personality_before_set_returns_null(client, make_user):
    user = make_user("owner@pastapalace.com")
    _setup_business(client, user)

    response = client.get("/api/dashboard/personality", headers=user.headers)
    assert response.status_code == 200
    assert response.json() is None


def test_upsert_personality_creates_then_updates(client, make_user):
    user = make_user("owner@pastapalace.com")
    _setup_business(client, user)

    created = client.put(
        "/api/dashboard/personality",
        json={"host_name": "Gio", "brand_voice": "Warm and proud of our family recipes."},
        headers=user.headers,
    )
    assert created.status_code == 200
    body = created.json()
    assert body["host_name"] == "Gio"

    updated = client.put(
        "/api/dashboard/personality",
        json={"focus_areas": "Recommend pasta dishes and wine pairings."},
        headers=user.headers,
    )
    assert updated.status_code == 200
    updated_body = updated.json()
    assert updated_body["id"] == body["id"]
    assert updated_body["host_name"] == "Gio"
    assert updated_body["focus_areas"] == "Recommend pasta dishes and wine pairings."

    fetched = client.get("/api/dashboard/personality", headers=user.headers)
    assert fetched.json()["id"] == body["id"]
