"""Proves tenant isolation is enforced by Postgres RLS itself, not just app code.

Each test seeds cross-tenant fixture data through a raw, RLS-bypassing session
(the same role migrations run as), then opens a *real* `authenticated`-role
session for a specific user via `get_authenticated_db` -- the exact code path
`get_business_db` uses in production -- and asserts what Postgres itself does
or doesn't return/allow.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.exc import DBAPIError

from app.database import get_authenticated_db, get_public_db
from app.models import auth_users
from app.models.business import Business, BusinessUser
from app.models.conversation import Conversation, Message
from app.models.location import Location


def _seed_business(db_session, name: str, slug: str, owner_email: str) -> tuple[Business, uuid.UUID]:
    business = Business(name=name, slug=slug)
    db_session.add(business)
    db_session.flush()

    user_id = uuid.uuid4()
    db_session.execute(auth_users.insert().values(id=user_id, email=owner_email))
    db_session.add(
        BusinessUser(business_id=business.id, user_id=user_id, email=owner_email, role="owner")
    )
    db_session.commit()
    return business, user_id


def _authed_session(user_id: uuid.UUID):
    gen = get_authenticated_db({"sub": str(user_id)})
    db = next(gen)
    return db, gen


def test_authenticated_session_only_sees_own_business(db_session):
    business_a, user_a = _seed_business(db_session, "Pasta Palace", "pasta-palace", "a@a.com")
    business_b, user_b = _seed_business(db_session, "Taco Town", "taco-town", "b@b.com")

    db, gen = _authed_session(user_a)
    try:
        visible = db.scalars(select(Business)).all()
        assert [b.id for b in visible] == [business_a.id]
    finally:
        gen.close()


def test_authenticated_session_only_sees_own_locations(db_session):
    business_a, user_a = _seed_business(db_session, "Pasta Palace", "pasta-palace", "a@a.com")
    business_b, _ = _seed_business(db_session, "Taco Town", "taco-town", "b@b.com")

    location_a = Location(business_id=business_a.id, name="Downtown", slug="downtown")
    location_b = Location(business_id=business_b.id, name="Uptown", slug="uptown")
    db_session.add_all([location_a, location_b])
    db_session.commit()

    db, gen = _authed_session(user_a)
    try:
        visible = db.scalars(select(Location)).all()
        assert [loc.id for loc in visible] == [location_a.id]
    finally:
        gen.close()


def test_authenticated_session_cannot_insert_into_other_business(db_session):
    business_a, user_a = _seed_business(db_session, "Pasta Palace", "pasta-palace", "a@a.com")
    business_b, _ = _seed_business(db_session, "Taco Town", "taco-town", "b@b.com")

    db, gen = _authed_session(user_a)
    try:
        db.add(Location(business_id=business_b.id, name="Sneaky", slug="sneaky"))
        try:
            db.commit()
            assert False, "expected the RLS WITH CHECK clause to reject this insert"
        except DBAPIError:
            db.rollback()
    finally:
        gen.close()

    # Confirm nothing leaked through, via the RLS-bypassing seed session.
    db_session.expire_all()
    rows = db_session.scalars(select(Location)).all()
    assert rows == []


def test_authenticated_session_cannot_update_other_business_row(db_session):
    business_a, user_a = _seed_business(db_session, "Pasta Palace", "pasta-palace", "a@a.com")
    business_b, _ = _seed_business(db_session, "Taco Town", "taco-town", "b@b.com")

    location_b = Location(business_id=business_b.id, name="Uptown", slug="uptown")
    db_session.add(location_b)
    db_session.commit()

    db, gen = _authed_session(user_a)
    try:
        result = db.execute(
            select(Location).where(Location.id == location_b.id).execution_options(synchronize_session=False)
        )
        assert result.first() is None

        updated = db.query(Location).filter(Location.id == location_b.id).update({"name": "Hacked"})
        assert updated == 0
        db.commit()
    finally:
        gen.close()

    db_session.expire_all()
    untouched = db_session.get(Location, location_b.id)
    assert untouched.name == "Uptown"


def test_authenticated_session_cannot_delete_other_business_row(db_session):
    business_a, user_a = _seed_business(db_session, "Pasta Palace", "pasta-palace", "a@a.com")
    business_b, _ = _seed_business(db_session, "Taco Town", "taco-town", "b@b.com")

    location_b = Location(business_id=business_b.id, name="Uptown", slug="uptown")
    db_session.add(location_b)
    db_session.commit()

    db, gen = _authed_session(user_a)
    try:
        deleted = db.query(Location).filter(Location.id == location_b.id).delete()
        assert deleted == 0
        db.commit()
    finally:
        gen.close()

    db_session.expire_all()
    assert db_session.get(Location, location_b.id) is not None


def test_indirect_policy_scopes_messages_through_conversation(db_session):
    business_a, user_a = _seed_business(db_session, "Pasta Palace", "pasta-palace", "a@a.com")
    business_b, _ = _seed_business(db_session, "Taco Town", "taco-town", "b@b.com")

    location_b = Location(business_id=business_b.id, name="Uptown", slug="uptown")
    db_session.add(location_b)
    db_session.flush()

    conversation_b = Conversation(
        business_id=business_b.id, location_id=location_b.id, session_token="tok-b"
    )
    db_session.add(conversation_b)
    db_session.flush()

    db_session.add(Message(conversation_id=conversation_b.id, role="customer", content="hi"))
    db_session.commit()

    db, gen = _authed_session(user_a)
    try:
        visible = db.scalars(select(Message)).all()
        assert visible == []
    finally:
        gen.close()


def test_public_service_role_session_bypasses_rls(db_session):
    business_a, _ = _seed_business(db_session, "Pasta Palace", "pasta-palace", "a@a.com")
    business_b, _ = _seed_business(db_session, "Taco Town", "taco-town", "b@b.com")

    gen = get_public_db()
    db = next(gen)
    try:
        visible_ids = {b.id for b in db.scalars(select(Business)).all()}
        assert visible_ids == {business_a.id, business_b.id}
    finally:
        gen.close()
