"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChatConfig, chatConfigStorageKey, defaultChatConfig } from "../admin/admin-client";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  provider?: "openrouter" | "fallback";
};

const chatHistoryStorageKey = "xa-chat-history";

export function ChatClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: defaultChatConfig.greeting }]);
  const [config, setConfig] = useState<ChatConfig>(defaultChatConfig);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadConfig = () => {
      const stored = window.localStorage.getItem(chatConfigStorageKey);
      if (!stored) {
        setConfig(defaultChatConfig);
        setMessages((current) => (current.length ? current : [{ role: "assistant", content: defaultChatConfig.greeting }]));
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
        setMessages((current) => (current.length ? current : [{ role: "assistant", content: nextConfig.greeting }]));
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

  useEffect(() => {
    const stored = window.localStorage.getItem(chatHistoryStorageKey);
    if (!stored) {
      setMessages([{ role: "assistant", content: defaultChatConfig.greeting }]);
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length) {
        setMessages(parsed);
      }
    } catch {
      setMessages([{ role: "assistant", content: defaultChatConfig.greeting }]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(chatHistoryStorageKey, JSON.stringify(messages.slice(-40)));
  }, [messages]);

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
          provider: payload.provider === "openrouter" ? "openrouter" : "fallback",
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

  function clearChat() {
    const nextMessages = [{ role: "assistant" as const, content: config.greeting }];
    setMessages(nextMessages);
    window.localStorage.setItem(chatHistoryStorageKey, JSON.stringify(nextMessages));
    setError(null);
  }

  async function copyTranscript() {
    const transcript = messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <div className="message-list" aria-label="Conversation">
        {messages.map((message, index) => (
          <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}>
            <p>{message.content}</p>
            {message.provider && <span>{message.provider === "openrouter" ? "OpenRouter" : "Fallback"}</span>}
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
        <button type="button" onClick={copyTranscript}>
          {copied ? "Copied" : "Copy transcript"}
        </button>
        <button type="button" onClick={clearChat}>
          Clear
        </button>
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
