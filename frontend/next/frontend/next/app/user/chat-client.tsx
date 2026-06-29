"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChatConfig, chatConfigStorageKey, defaultChatConfig } from "../admin/admin-client";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content: "Hi, I am XA. Ask me about hours, services, pricing, or next steps.",
  },
];

export function ChatClient() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [config, setConfig] = useState<ChatConfig>(defaultChatConfig);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const loadConfig = () => {
      const stored = window.localStorage.getItem(chatConfigStorageKey);
      if (!stored) {
        setConfig(defaultChatConfig);
        setMessages([{ role: "assistant", content: defaultChatConfig.greeting }]);
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        const nextConfig = {
          ...defaultChatConfig,
          ...parsed,
          quickPrompts: Array.isArray(parsed.quickPrompts) ? parsed.quickPrompts : defaultChatConfig.quickPrompts,
        };
        setConfig(nextConfig);
        setMessages([{ role: "assistant", content: nextConfig.greeting }]);
      } catch {
        setConfig(defaultChatConfig);
      }
    };

    loadConfig();
    window.addEventListener("storage", loadConfig);
    window.addEventListener("xa-chat-config-updated", loadConfig);
    return () => {
      window.removeEventListener("storage", loadConfig);
      window.removeEventListener("xa-chat-config-updated", loadConfig);
    };
  }, []);

  const apiMessages = useMemo(
    () =>
      messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    [messages],
  );

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isSending) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...apiMessages, { role: "user", content: trimmed }],
          config,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "The chatbot could not respond.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: payload.reply,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The chatbot could not respond.");
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  return (
    <>
      <div className="message-list" aria-label="Conversation">
        {messages.map((message, index) => (
          <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}>
            <p>{message.content}</p>
          </div>
        ))}
        {isSending && (
          <div className="message-row assistant">
            <p>Thinking...</p>
          </div>
        )}
      </div>

      <div className="config-strip">
        <span>{config.displayName}</span>
        <span>{config.tone} tone</span>
      </div>

      <div className="prompt-row" aria-label="Quick prompts">
        {config.quickPrompts.map((prompt) => (
          <button className="chip" type="button" key={prompt} onClick={() => void sendMessage(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      {error && <p className="chat-error">{error}</p>}

      <form className="composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="chat-message">
          Message
        </label>
        <input
          id="chat-message"
          placeholder="Type your message..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" disabled={isSending}>
          {isSending ? "Sending" : "Send"}
        </button>
      </form>
    </>
  );
}
