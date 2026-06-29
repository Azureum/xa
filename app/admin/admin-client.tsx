"use client";

import { FormEvent, useEffect, useState } from "react";

export type ChatConfig = {
  displayName: string;
  greeting: string;
  systemPrompt: string;
  businessContext: string;
  tone: "Helpful" | "Concise" | "Professional";
  askClarifyingQuestions: boolean;
  collectLeadDetails: boolean;
  handoffEmail: string;
};

export const chatConfigStorageKey = "xa-chat-config";

export const defaultChatConfig: ChatConfig = {
  displayName: "XA Assistant",
  greeting: "Hi, I am XA. How can I help today?",
  systemPrompt:
    "You are XA Assistant, a customer-facing chatbot. Answer clearly, stay concise, and do not invent business-specific facts.",
  businessContext:
    "XA helps visitors understand services, pricing, booking, support options, and next steps. If the answer depends on private account details, route the visitor to a human.",
  tone: "Helpful",
  askClarifyingQuestions: true,
  collectLeadDetails: true,
  handoffEmail: "support@example.com",
};

const toneOptions: ChatConfig["tone"][] = ["Helpful", "Concise", "Professional"];

function readStoredConfig(): ChatConfig {
  if (typeof window === "undefined") {
    return defaultChatConfig;
  }

  const stored = window.localStorage.getItem(chatConfigStorageKey);
  if (!stored) {
    return defaultChatConfig;
  }

  try {
    return { ...defaultChatConfig, ...JSON.parse(stored) };
  } catch {
    return defaultChatConfig;
  }
}

export function AdminClient() {
  const [config, setConfig] = useState<ChatConfig>(defaultChatConfig);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setConfig(readStoredConfig());
  }, []);

  function updateConfig<Key extends keyof ChatConfig>(key: Key, value: ChatConfig[Key]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem(chatConfigStorageKey, JSON.stringify(config));
    window.dispatchEvent(new Event("xa-chat-config-updated"));
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  }

  return (
    <form className="settings-grid" onSubmit={handleSubmit}>
      <article className="settings-card">
        <h2>Assistant profile</h2>
        <label>
          Display name
          <input value={config.displayName} onChange={(event) => updateConfig("displayName", event.target.value)} />
        </label>
        <label>
          Greeting
          <textarea value={config.greeting} onChange={(event) => updateConfig("greeting", event.target.value)} />
        </label>
      </article>

      <article className="settings-card">
        <h2>Tone</h2>
        <div className="segmented" aria-label="Tone options">
          {toneOptions.map((option) => (
            <button
              className={config.tone === option ? "active" : ""}
              type="button"
              key={option}
              onClick={() => updateConfig("tone", option)}
            >
              {option}
            </button>
          ))}
        </div>
        <label className="toggle-row">
          <span>Ask clarifying questions</span>
          <input
            type="checkbox"
            checked={config.askClarifyingQuestions}
            onChange={(event) => updateConfig("askClarifyingQuestions", event.target.checked)}
          />
        </label>
        <label className="toggle-row">
          <span>Collect lead details</span>
          <input
            type="checkbox"
            checked={config.collectLeadDetails}
            onChange={(event) => updateConfig("collectLeadDetails", event.target.checked)}
          />
        </label>
      </article>

      <article className="settings-card wide">
        <h2>System prompt</h2>
        <label>
          Instructions
          <textarea
            className="large-textarea"
            value={config.systemPrompt}
            onChange={(event) => updateConfig("systemPrompt", event.target.value)}
          />
        </label>
        <label>
          Business context
          <textarea
            className="large-textarea"
            value={config.businessContext}
            onChange={(event) => updateConfig("businessContext", event.target.value)}
          />
        </label>
      </article>

      <article className="settings-card">
        <h2>Fallback routing</h2>
        <label>
          Human handoff email
          <input value={config.handoffEmail} onChange={(event) => updateConfig("handoffEmail", event.target.value)} />
        </label>
      </article>

      <article className="settings-card publish-card">
        <h2>Launch</h2>
        <p>{savedAt ? `Published locally at ${savedAt}.` : "Publish this configuration, then preview the chatbot."}</p>
        <div className="actions compact">
          <a className="button button-secondary" href="/user">
            Preview
          </a>
          <button className="button button-primary" type="submit">
            Publish
          </button>
        </div>
      </article>
    </form>
  );
}
