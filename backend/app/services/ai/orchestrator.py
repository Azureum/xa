from sqlalchemy.orm import Session

from app.models.business import Business
from app.models.conversation import Conversation
from app.models.location import Location
from app.services import knowledge_service, personality_service, public_service
from app.services.ai import deepseek_client, prompt_layers

_HISTORY_LIMIT = 20
_ROLE_MAP = {"customer": "user", "assistant": "assistant"}


def generate_reply(
    db: Session, business: Business, location: Location, conversation: Conversation
) -> tuple[str, int, int]:
    """Builds the prompt from the business's knowledge/personality and calls DeepSeek.

    Assumes the caller has already persisted the customer's latest message onto
    `conversation` -- this re-reads the conversation's history (which now includes
    that message) to build the chat-format message list.
    """
    personality = personality_service.get_personality(db, business.id)
    faqs = [faq for faq in knowledge_service.list_faqs(db, business.id) if faq.is_active]
    additional_knowledge = [
        entry for entry in knowledge_service.list_additional_knowledge(db, business.id) if entry.is_active
    ]
    system_prompt = prompt_layers.build_system_prompt(
        business, location, personality, faqs, additional_knowledge
    )

    history = public_service.list_messages(db, conversation.id)[-_HISTORY_LIMIT:]
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend({"role": _ROLE_MAP[msg.role], "content": msg.content} for msg in history)

    return deepseek_client.chat_completion(messages)
