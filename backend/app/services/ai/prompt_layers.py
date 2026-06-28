from app.models.business import Business
from app.models.knowledge import AdditionalKnowledgeEntry, FAQ
from app.models.location import Location
from app.models.personality import AIPersonality


def business_layer(business: Business) -> str:
    return f"You represent {business.name}, a local business."


def personality_layer(personality: AIPersonality | None) -> str:
    if personality is None:
        return ""
    lines = []
    if personality.host_name:
        lines.append(f"Your name is {personality.host_name}.")
    if personality.brand_voice:
        lines.append(f"Brand voice: {personality.brand_voice}")
    if personality.focus_areas:
        lines.append(f"Focus on: {personality.focus_areas}")
    if personality.avoid_topics:
        lines.append(f"Avoid discussing: {personality.avoid_topics}")
    return "\n".join(lines)


def location_layer(location: Location) -> str:
    lines = [f"You are speaking on behalf of the {location.name} location."]
    if location.purpose:
        lines.append(f"Purpose of this AI Host: {location.purpose}")
    if location.goals:
        lines.append(f"Goals: {location.goals}")
    if location.extra_knowledge:
        lines.append(f"Additional context: {location.extra_knowledge}")
    return "\n".join(lines)


def knowledge_layer(faqs: list[FAQ], additional_knowledge: list[AdditionalKnowledgeEntry]) -> str:
    sections = []
    if faqs:
        faq_lines = "\n".join(f"Q: {faq.question}\nA: {faq.answer}" for faq in faqs)
        sections.append(f"## Frequently Asked Questions\n{faq_lines}")
    if additional_knowledge:
        extra_lines = "\n".join(
            f"- {entry.title + ': ' if entry.title else ''}{entry.content}"
            for entry in additional_knowledge
        )
        sections.append(f"## Additional Knowledge\n{extra_lines}")
    return "\n\n".join(sections)


def build_system_prompt(
    business: Business,
    location: Location,
    personality: AIPersonality | None,
    faqs: list[FAQ],
    additional_knowledge: list[AdditionalKnowledgeEntry],
) -> str:
    sections = [
        "## Business",
        business_layer(business),
        "## Personality",
        personality_layer(personality) or "Friendly, helpful, and professional.",
        "## Location",
        location_layer(location),
    ]
    knowledge = knowledge_layer(faqs, additional_knowledge)
    if knowledge:
        sections.append(knowledge)
    sections.append(
        "## Instructions\n"
        "Answer customer questions only using the information given above. "
        "Stay in character as the business's AI host. If you don't know the "
        "answer from the given context, say so honestly and suggest the "
        "customer ask a staff member, rather than making something up."
    )
    return "\n\n".join(sections)
