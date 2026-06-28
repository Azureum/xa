import jwt

from app.config import settings

_jwks_client: jwt.PyJWKClient | None = None


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = jwt.PyJWKClient(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json")
    return _jwks_client


def decode_supabase_jwt(token: str) -> dict:
    """Verify and decode an access token issued by Supabase Auth.

    Older Supabase projects (and all local-dev/test tokens) sign with a
    shared HS256 secret. Projects migrated to Supabase's asymmetric signing
    keys sign with ES256 instead, verified against the project's published
    JWKS rather than a secret. The unverified header's `alg` tells us which.
    """
    alg = jwt.get_unverified_header(token).get("alg")
    if alg == "HS256":
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )

    signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256"],
        audience="authenticated",
    )
