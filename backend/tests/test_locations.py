def _setup_business(client, user, name="Pasta Palace"):
    response = client.post(
        "/api/dashboard/auth/setup-business", json={"business_name": name}, headers=user.headers
    )
    assert response.status_code == 200
    return response.json()["business"]


def test_list_locations_requires_auth(client):
    response = client.get("/api/dashboard/locations")
    assert response.status_code == 401


def test_create_and_list_location(client, make_user):
    user = make_user("owner@pastapalace.com")
    _setup_business(client, user)

    create = client.post(
        "/api/dashboard/locations", json={"name": "Downtown"}, headers=user.headers
    )
    assert create.status_code == 200
    body = create.json()
    assert body["name"] == "Downtown"
    assert body["slug"] == "downtown"
    assert body["is_active"] is True

    listed = client.get("/api/dashboard/locations", headers=user.headers)
    assert listed.status_code == 200
    assert [loc["id"] for loc in listed.json()] == [body["id"]]


def test_create_location_slug_deduplicates_within_business(client, make_user):
    user = make_user("owner@pastapalace.com")
    _setup_business(client, user)

    first = client.post("/api/dashboard/locations", json={"name": "Downtown"}, headers=user.headers)
    second = client.post("/api/dashboard/locations", json={"name": "Downtown"}, headers=user.headers)
    assert first.json()["slug"] == "downtown"
    assert second.json()["slug"] == "downtown-2"


def test_get_location_not_found(client, make_user):
    user = make_user("owner@pastapalace.com")
    _setup_business(client, user)

    response = client.get(
        "/api/dashboard/locations/00000000-0000-0000-0000-000000000000", headers=user.headers
    )
    assert response.status_code == 404


def test_update_location(client, make_user):
    user = make_user("owner@pastapalace.com")
    _setup_business(client, user)
    created = client.post(
        "/api/dashboard/locations", json={"name": "Downtown"}, headers=user.headers
    ).json()

    updated = client.patch(
        f"/api/dashboard/locations/{created['id']}",
        json={"description": "Our flagship spot", "is_active": False},
        headers=user.headers,
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["description"] == "Our flagship spot"
    assert body["is_active"] is False
    assert body["slug"] == "downtown"


def test_locations_scoped_to_own_business(client, make_user):
    owner_a = make_user("owner@pastapalace.com")
    _setup_business(client, owner_a, "Pasta Palace")
    location_a = client.post(
        "/api/dashboard/locations", json={"name": "Downtown"}, headers=owner_a.headers
    ).json()

    owner_b = make_user("owner@tacotown.com")
    _setup_business(client, owner_b, "Taco Town")

    response = client.get(f"/api/dashboard/locations/{location_a['id']}", headers=owner_b.headers)
    assert response.status_code == 404

    listed = client.get("/api/dashboard/locations", headers=owner_b.headers)
    assert listed.json() == []
