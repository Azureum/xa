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

function buildSystemPrompt(config: ChatConfig | undefined) {
  const displayName = cleanText(config?.displayName, "XA Assistant", 80);
  const instructions = cleanText(config?.systemPrompt, defaultSystemPrompt, 1200);
  const businessContext = cleanText(config?.businessContext, "", 2000);
  const tone = cleanText(config?.tone, "Helpful", 40);
  const handoffEmail = cleanText(config?.handoffEmail, "support@example.com", 160);
  const askClarifyingQuestions = config?.askClarifyingQuestions !== false;
  const collectLeadDetails = config?.collectLeadDetails !== false;

  return [
    `Assistant name: ${displayName}.`,
    `Tone: ${tone}.`,
    instructions,
    businessContext ? `Business context: ${businessContext}` : "",
    askClarifyingQuestions ? "Ask one clarifying question when the request is ambiguous." : "Avoid clarifying questions unless required.",
    collectLeadDetails ? "When a visitor wants follow-up, ask for the minimum useful contact details." : "Do not collect lead details.",
    `If a human is needed, direct the visitor to ${handoffEmail}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OpenRouter is not configured. Set OPENROUTER_API_KEY on the server." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as { messages?: unknown; config?: ChatConfig } | null;
  const messages: ChatMessage[] = Array.isArray(body?.messages)
    ? body.messages.filter(isChatMessage)
    : [];
  const lastUserMessage = messages.filter((message: ChatMessage) => message.role === "user").at(-1);

  if (!lastUserMessage?.content.trim()) {
    return Response.json({ error: "A user message is required." }, { status: 400 });
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
      messages: [{ role: "system", content: buildSystemPrompt(body?.config) }, ...messages],
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

  return Response.json({ reply });
}
