import base64
import time
import uuid

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec

import app.core.security as security_module
from app.core.security import decode_supabase_jwt
from tests.conftest import make_access_token


def _b64url_uint(value: int) -> str:
    raw = value.to_bytes(32, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _jwks_for(public_key: ec.EllipticCurvePublicKey, kid: str) -> dict:
    numbers = public_key.public_numbers()
    return {
        "keys": [
            {
                "kty": "EC",
                "crv": "P-256",
                "alg": "ES256",
                "key_ops": ["verify"],
                "kid": kid,
                "x": _b64url_uint(numbers.x),
                "y": _b64url_uint(numbers.y),
            }
        ]
    }


def _supabase_payload(user_id: str, email: str) -> dict:
    now = int(time.time())
    return {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": now,
        "exp": now + 3600,
    }


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_me_requires_auth(client):
    response = client.get("/api/dashboard/auth/me")
    assert response.status_code == 401


def test_setup_business_requires_auth(client):
    response = client.post(
        "/api/dashboard/auth/setup-business", json={"business_name": "Pasta Palace"}
    )
    assert response.status_code == 401


def test_me_before_setup_business_rejected(client, make_user):
    user = make_user("owner@pastapalace.com")
    response = client.get("/api/dashboard/auth/me", headers=user.headers)
    assert response.status_code == 401


def test_setup_business_creates_business_and_membership(client, make_user):
    user = make_user("owner@pastapalace.com")
    response = client.post(
        "/api/dashboard/auth/setup-business",
        json={"business_name": "Pasta Palace"},
        headers=user.headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == "owner@pastapalace.com"
    assert body["user"]["business_id"] == body["business"]["id"]
    assert body["business"]["name"] == "Pasta Palace"
    assert body["business"]["slug"] == "pasta-palace"


def test_setup_business_twice_rejected(client, make_user):
    user = make_user("owner@pastapalace.com")
    first = client.post(
        "/api/dashboard/auth/setup-business",
        json={"business_name": "Pasta Palace"},
        headers=user.headers,
    )
    assert first.status_code == 200

    second = client.post(
        "/api/dashboard/auth/setup-business",
        json={"business_name": "Second Business"},
        headers=user.headers,
    )
    assert second.status_code == 409


def test_me_after_setup_business(client, make_user):
    user = make_user("owner@pastapalace.com")
    client.post(
        "/api/dashboard/auth/setup-business",
        json={"business_name": "Pasta Palace"},
        headers=user.headers,
    )

    response = client.get("/api/dashboard/auth/me", headers=user.headers)
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == "owner@pastapalace.com"
    assert body["business"]["name"] == "Pasta Palace"
    assert body["business"]["slug"] == "pasta-palace"


def test_forged_token_for_nonexistent_user_rejected(client):
    fake_token = make_access_token(uuid.uuid4(), "nobody@nowhere.com")
    response = client.get(
        "/api/dashboard/auth/me", headers={"Authorization": f"Bearer {fake_token}"}
    )
    assert response.status_code == 401


def test_tampered_token_rejected(client, make_user):
    user = make_user("owner@pastapalace.com")
    tampered = user.token[:-1] + ("a" if user.token[-1] != "a" else "b")
    response = client.get(
        "/api/dashboard/auth/me", headers={"Authorization": f"Bearer {tampered}"}
    )
    assert response.status_code == 401


def test_decode_supabase_jwt_verifies_es256_via_jwks(monkeypatch):
    """Newer Supabase projects sign with ES256, verified via the project's JWKS."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    kid = str(uuid.uuid4())
    jwks = _jwks_for(private_key.public_key(), kid)
    monkeypatch.setattr(jwt.PyJWKClient, "fetch_data", lambda self: jwks)
    monkeypatch.setattr(security_module, "_jwks_client", None)

    user_id = str(uuid.uuid4())
    token = jwt.encode(
        _supabase_payload(user_id, "owner@pastapalace.com"),
        private_key,
        algorithm="ES256",
        headers={"kid": kid},
    )

    claims = decode_supabase_jwt(token)
    assert claims["sub"] == user_id
    assert claims["email"] == "owner@pastapalace.com"


def test_decode_supabase_jwt_rejects_es256_signed_by_wrong_key(monkeypatch):
    """A token signed by a key other than the one published in the JWKS is rejected."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    other_key = ec.generate_private_key(ec.SECP256R1())
    kid = str(uuid.uuid4())
    jwks = _jwks_for(private_key.public_key(), kid)
    monkeypatch.setattr(jwt.PyJWKClient, "fetch_data", lambda self: jwks)
    monkeypatch.setattr(security_module, "_jwks_client", None)

    token = jwt.encode(
        _supabase_payload(str(uuid.uuid4()), "nobody@nowhere.com"),
        other_key,
        algorithm="ES256",
        headers={"kid": kid},
    )

    with pytest.raises(jwt.PyJWTError):
        decode_supabase_jwt(token)
