type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatConfig = {
  displayName?: unknown;
  systemPrompt?: unknown;
  businessContext?: unknown;
  tone?: unknown;
  askClarifyingQuestions?: unknown;
  collectLeadDetails?: unknown;
  handoffEmail?: unknown;
};

const defaultSystemPrompt =
  "You are XA Assistant, a customer-facing chatbot. Answer clearly, stay concise, and do not invent business-specific facts.";

type NormalizedChatConfig = {
  displayName: string;
  instructions: string;
  businessContext: string;
  tone: string;
  handoffEmail: string;
  askClarifyingQuestions: boolean;
  collectLeadDetails: boolean;
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function normalizeConfig(config: ChatConfig | undefined): NormalizedChatConfig {
  return {
    displayName: cleanText(config?.displayName, "XA Assistant", 80),
    instructions: cleanText(config?.systemPrompt, defaultSystemPrompt, 1200),
    businessContext: cleanText(config?.businessContext, "", 2000),
    tone: cleanText(config?.tone, "Helpful", 40),
    handoffEmail: cleanText(config?.handoffEmail, "support@example.com", 160),
    askClarifyingQuestions: config?.askClarifyingQuestions !== false,
    collectLeadDetails: config?.collectLeadDetails !== false,
  };
}

function buildSystemPrompt(config: NormalizedChatConfig) {
  return [
    `Assistant name: ${config.displayName}.`,
    `Tone: ${config.tone}.`,
    config.instructions,
    config.businessContext ? `Business context: ${config.businessContext}` : "",
    config.askClarifyingQuestions
      ? "Ask one clarifying question when the request is ambiguous."
      : "Avoid clarifying questions unless required.",
    config.collectLeadDetails
      ? "When a visitor wants follow-up, ask for the minimum useful contact details."
      : "Do not collect lead details.",
    `If a human is needed, direct the visitor to ${config.handoffEmail}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildFallbackReply(config: NormalizedChatConfig, userMessage: string) {
  const lowerMessage = userMessage.toLowerCase();
  const contextSentence = config.businessContext
    ? `Based on the current admin context: ${config.businessContext}`
    : "The admin has not added business-specific context yet.";

  if (lowerMessage.includes("price") || lowerMessage.includes("pricing") || lowerMessage.includes("cost")) {
    return `${contextSentence} For exact pricing, share what you need and I can help route the request to ${config.handoffEmail}.`;
  }

  if (lowerMessage.includes("demo") || lowerMessage.includes("book") || lowerMessage.includes("appointment")) {
    return `I can help with next steps. Send your preferred time and contact details, or reach the team at ${config.handoffEmail}.`;
  }

  if (lowerMessage.includes("support") || lowerMessage.includes("help") || lowerMessage.includes("issue")) {
    return `For support, describe the issue and include the best contact method. If it needs a human, use ${config.handoffEmail}.`;
  }

  if (lowerMessage.includes("hour") || lowerMessage.includes("open") || lowerMessage.includes("schedule")) {
    return `${contextSentence} If hours are not listed there, contact ${config.handoffEmail} for the current schedule.`;
  }

  return `${contextSentence} ${config.askClarifyingQuestions ? "What specific outcome are you looking for?" : `For a human follow-up, contact ${config.handoffEmail}.`}`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { messages?: unknown; config?: ChatConfig } | null;
  const messages: ChatMessage[] = Array.isArray(body?.messages)
    ? body.messages.filter(isChatMessage)
    : [];
  const lastUserMessage = messages.filter((message: ChatMessage) => message.role === "user").at(-1);

  if (!lastUserMessage?.content.trim()) {
    return Response.json({ error: "A user message is required." }, { status: 400 });
  }

  const config = normalizeConfig(body?.config);
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({
      reply: buildFallbackReply(config, lastUserMessage.content),
      provider: "fallback",
      notice: "OpenRouter is not configured on the server, so XA used the built-in fallback responder.",
    });
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": siteUrl,
      "X-OpenRouter-Title": "XA Chatbot",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? "openrouter/free",
      messages: [{ role: "system", content: buildSystemPrompt(config) }, ...messages],
      temperature: 0.4,
      max_tokens: 450,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : "OpenRouter request failed.";
    return Response.json({ error: message }, { status: response.status });
  }

  const reply = payload?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) {
    return Response.json({ error: "OpenRouter returned an empty response." }, { status: 502 });
  }

  return Response.json({ reply, provider: "openrouter" });
}
