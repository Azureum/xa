import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.knowledge import AdditionalKnowledgeEntry, FAQ
from app.schemas.knowledge import (
    AdditionalKnowledgeCreate,
    AdditionalKnowledgeUpdate,
    FAQCreate,
    FAQUpdate,
)


def list_faqs(db: Session, business_id: uuid.UUID) -> list[FAQ]:
    return list(
        db.scalars(select(FAQ).where(FAQ.business_id == business_id).order_by(FAQ.display_order))
    )


def create_faq(db: Session, business_id: uuid.UUID, payload: FAQCreate) -> FAQ:
    faq = FAQ(business_id=business_id, **payload.model_dump())
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq


def get_faq(db: Session, business_id: uuid.UUID, faq_id: uuid.UUID) -> FAQ:
    faq = db.scalar(select(FAQ).where(FAQ.business_id == business_id, FAQ.id == faq_id))
    if faq is None:
        raise NotFoundError("FAQ not found")
    return faq


def update_faq(db: Session, business_id: uuid.UUID, faq_id: uuid.UUID, payload: FAQUpdate) -> FAQ:
    faq = get_faq(db, business_id, faq_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(faq, field, value)
    db.commit()
    db.refresh(faq)
    return faq


def delete_faq(db: Session, business_id: uuid.UUID, faq_id: uuid.UUID) -> None:
    faq = get_faq(db, business_id, faq_id)
    db.delete(faq)
    db.commit()


def list_additional_knowledge(db: Session, business_id: uuid.UUID) -> list[AdditionalKnowledgeEntry]:
    return list(
        db.scalars(
            select(AdditionalKnowledgeEntry)
            .where(AdditionalKnowledgeEntry.business_id == business_id)
            .order_by(AdditionalKnowledgeEntry.display_order)
        )
    )


def create_additional_knowledge(
    db: Session, business_id: uuid.UUID, payload: AdditionalKnowledgeCreate
) -> AdditionalKnowledgeEntry:
    entry = AdditionalKnowledgeEntry(business_id=business_id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def get_additional_knowledge(
    db: Session, business_id: uuid.UUID, entry_id: uuid.UUID
) -> AdditionalKnowledgeEntry:
    entry = db.scalar(
        select(AdditionalKnowledgeEntry).where(
            AdditionalKnowledgeEntry.business_id == business_id,
            AdditionalKnowledgeEntry.id == entry_id,
        )
    )
    if entry is None:
        raise NotFoundError("Additional knowledge entry not found")
    return entry


def update_additional_knowledge(
    db: Session, business_id: uuid.UUID, entry_id: uuid.UUID, payload: AdditionalKnowledgeUpdate
) -> AdditionalKnowledgeEntry:
    entry = get_additional_knowledge(db, business_id, entry_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


def delete_additional_knowledge(db: Session, business_id: uuid.UUID, entry_id: uuid.UUID) -> None:
    entry = get_additional_knowledge(db, business_id, entry_id)
    db.delete(entry)
    db.commit()
