import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_business_db, get_current_business
from app.models.business import Business
from app.schemas.knowledge import (
    AdditionalKnowledgeCreate,
    AdditionalKnowledgeResponse,
    AdditionalKnowledgeUpdate,
    FAQCreate,
    FAQResponse,
    FAQUpdate,
)
from app.services import knowledge_service

router = APIRouter(prefix="/training", tags=["knowledge"])


@router.get("/faqs", response_model=list[FAQResponse])
def list_faqs(
    business: Business = Depends(get_current_business), db: Session = Depends(get_business_db)
) -> list[FAQResponse]:
    return [FAQResponse.model_validate(faq) for faq in knowledge_service.list_faqs(db, business.id)]


@router.post("/faqs", response_model=FAQResponse)
def create_faq(
    payload: FAQCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> FAQResponse:
    faq = knowledge_service.create_faq(db, business.id, payload)
    return FAQResponse.model_validate(faq)


@router.patch("/faqs/{faq_id}", response_model=FAQResponse)
def update_faq(
    faq_id: uuid.UUID,
    payload: FAQUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> FAQResponse:
    faq = knowledge_service.update_faq(db, business.id, faq_id, payload)
    return FAQResponse.model_validate(faq)


@router.delete("/faqs/{faq_id}", status_code=204)
def delete_faq(
    faq_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> None:
    knowledge_service.delete_faq(db, business.id, faq_id)


@router.get("/additional-knowledge", response_model=list[AdditionalKnowledgeResponse])
def list_additional_knowledge(
    business: Business = Depends(get_current_business), db: Session = Depends(get_business_db)
) -> list[AdditionalKnowledgeResponse]:
    return [
        AdditionalKnowledgeResponse.model_validate(entry)
        for entry in knowledge_service.list_additional_knowledge(db, business.id)
    ]


@router.post("/additional-knowledge", response_model=AdditionalKnowledgeResponse)
def create_additional_knowledge(
    payload: AdditionalKnowledgeCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> AdditionalKnowledgeResponse:
    entry = knowledge_service.create_additional_knowledge(db, business.id, payload)
    return AdditionalKnowledgeResponse.model_validate(entry)


@router.patch("/additional-knowledge/{entry_id}", response_model=AdditionalKnowledgeResponse)
def update_additional_knowledge(
    entry_id: uuid.UUID,
    payload: AdditionalKnowledgeUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> AdditionalKnowledgeResponse:
    entry = knowledge_service.update_additional_knowledge(db, business.id, entry_id, payload)
    return AdditionalKnowledgeResponse.model_validate(entry)


@router.delete("/additional-knowledge/{entry_id}", status_code=204)
def delete_additional_knowledge(
    entry_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> None:
    knowledge_service.delete_additional_knowledge(db, business.id, entry_id)
