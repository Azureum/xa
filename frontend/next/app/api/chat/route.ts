type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const systemPrompt =
  "You are XA Assistant, a concise and helpful customer-facing chatbot. Answer clearly, ask one useful follow-up question when needed, and do not invent business-specific facts.";

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant" || message.role === "system") &&
    typeof message.content === "string"
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OpenRouter is not configured. Set OPENROUTER_API_KEY on the server." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as { messages?: unknown } | null;
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
      messages: [{ role: "system", content: systemPrompt }, ...messages],
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
