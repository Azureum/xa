"use client";

import { type CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import {
  ChatConfig,
  ChatLead,
  chatConfigStorageKey,
  chatHistoryStorageKey,
  chatLeadsStorageKey,
  defaultChatConfig,
} from "../admin/admin-client";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  provider?: "openrouter" | "fallback";
};

const accentStyles: Record<ChatConfig["accentColor"], { accent: string; accentStrong: string; soft: string }> = {
  teal: { accent: "#0f766e", accentStrong: "#115e59", soft: "#edf7f4" },
  blue: { accent: "#2563eb", accentStrong: "#1d4ed8", soft: "#eff6ff" },
  rose: { accent: "#be123c", accentStrong: "#9f1239", soft: "#fff1f2" },
  graphite: { accent: "#374151", accentStrong: "#111827", soft: "#f3f4f6" },
};

function decodeConfig(value: string) {
  return JSON.parse(value);
}

export function ChatClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: defaultChatConfig.greeting }]);
  const [config, setConfig] = useState<ChatConfig>(defaultChatConfig);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lead, setLead] = useState<ChatLead>({ name: "", email: "", note: "", createdAt: "" });
  const [leadSaved, setLeadSaved] = useState(false);

  useEffect(() => {
    const loadConfig = () => {
      const configParam = new URLSearchParams(window.location.search).get("config");
      if (configParam) {
        try {
          const parsed = decodeConfig(configParam);
          const nextConfig = {
            ...defaultChatConfig,
            ...parsed,
            accentColor: parsed.accentColor ?? defaultChatConfig.accentColor,
            quickPrompts: Array.isArray(parsed.quickPrompts) ? parsed.quickPrompts : defaultChatConfig.quickPrompts,
            faqItems: Array.isArray(parsed.faqItems) ? parsed.faqItems : defaultChatConfig.faqItems,
          };
          const greetingMessages = [{ role: "assistant" as const, content: nextConfig.greeting }];
          window.localStorage.setItem(chatConfigStorageKey, JSON.stringify(nextConfig));
          window.localStorage.setItem(chatHistoryStorageKey, JSON.stringify(greetingMessages));
          setConfig(nextConfig);
          setMessages(greetingMessages);
          window.history.replaceState(null, "", window.location.pathname);
          return;
        } catch {
          window.history.replaceState(null, "", window.location.pathname);
        }
      }

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
          accentColor: parsed.accentColor ?? defaultChatConfig.accentColor,
          quickPrompts: Array.isArray(parsed.quickPrompts) ? parsed.quickPrompts : defaultChatConfig.quickPrompts,
          faqItems: Array.isArray(parsed.faqItems) ? parsed.faqItems : defaultChatConfig.faqItems,
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

  function saveLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextLead = { ...lead, createdAt: new Date().toISOString() };
    const stored = window.localStorage.getItem(chatLeadsStorageKey);
    let leads: ChatLead[] = [];
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        leads = Array.isArray(parsed) ? parsed : [];
      } catch {
        leads = [];
      }
    }
    window.localStorage.setItem(chatLeadsStorageKey, JSON.stringify([...leads, nextLead].slice(-50)));
    setLead({ name: "", email: "", note: "", createdAt: "" });
    setLeadSaved(true);
    window.setTimeout(() => setLeadSaved(false), 1800);
  }

  const accentStyle = {
    "--accent": accentStyles[config.accentColor].accent,
    "--accent-strong": accentStyles[config.accentColor].accentStrong,
    "--soft": accentStyles[config.accentColor].soft,
  } as CSSProperties;

  return (
    <div className="chat-client" style={accentStyle}>
      <div className="message-list" aria-label="Conversation">
        {messages.map((message, index) => (
          <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}>
            <p>{message.content}</p>
            {config.showProviderLabels && message.provider && (
              <span>{message.provider === "openrouter" ? "OpenRouter" : "Fallback"}</span>
            )}
          </div>
        ))}
        {isSending && (
          <div className="message-row assistant">
            <p>Thinking...</p>
          </div>
        )}
      </div>

      <div className="config-strip">
        <span>{config.brandName}</span>
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

      {config.collectLeadDetails && (
        <form className="lead-capture" onSubmit={saveLead}>
          <label>
            Name
            <input value={lead.name} onChange={(event) => setLead((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            Email
            <input
              type="email"
              value={lead.email}
              onChange={(event) => setLead((current) => ({ ...current, email: event.target.value }))}
            />
          </label>
          <label className="lead-note">
            Note
            <input value={lead.note} onChange={(event) => setLead((current) => ({ ...current, note: event.target.value }))} />
          </label>
          <button type="submit" disabled={!lead.name.trim() && !lead.email.trim() && !lead.note.trim()}>
            {leadSaved ? "Saved" : "Save lead"}
          </button>
        </form>
      )}

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
    </div>
  );
}
