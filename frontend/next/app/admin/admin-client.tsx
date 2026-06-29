"use client";

import { FormEvent, useEffect, useState } from "react";

export type ChatConfig = {
  brandName: string;
  displayName: string;
  greeting: string;
  systemPrompt: string;
  businessContext: string;
  tone: "Helpful" | "Concise" | "Professional";
  accentColor: "teal" | "blue" | "rose" | "graphite";
  askClarifyingQuestions: boolean;
  collectLeadDetails: boolean;
  showProviderLabels: boolean;
  handoffEmail: string;
  quickPrompts: string[];
};

export type ChatLead = {
  name: string;
  email: string;
  note: string;
  createdAt: string;
};

export const chatConfigStorageKey = "xa-chat-config";
export const chatLeadsStorageKey = "xa-chat-leads";

export const defaultChatConfig: ChatConfig = {
  brandName: "XA",
  displayName: "XA Assistant",
  greeting: "Hi, I am XA. How can I help today?",
  systemPrompt:
    "You are XA Assistant, a customer-facing chatbot. Answer clearly, stay concise, and do not invent business-specific facts.",
  businessContext:
    "XA helps visitors understand services, pricing, booking, support options, and next steps. If the answer depends on private account details, route the visitor to a human.",
  tone: "Helpful",
  accentColor: "teal",
  askClarifyingQuestions: true,
  collectLeadDetails: true,
  showProviderLabels: true,
  handoffEmail: "support@example.com",
  quickPrompts: ["Pricing", "Book a demo", "Support", "Hours"],
};

const toneOptions: ChatConfig["tone"][] = ["Helpful", "Concise", "Professional"];
const accentOptions: { label: string; value: ChatConfig["accentColor"] }[] = [
  { label: "Teal", value: "teal" },
  { label: "Blue", value: "blue" },
  { label: "Rose", value: "rose" },
  { label: "Graphite", value: "graphite" },
];

function normalizeConfig(value: Partial<ChatConfig>): ChatConfig {
  const tone: ChatConfig["tone"] = toneOptions.includes(value.tone as ChatConfig["tone"])
    ? (value.tone as ChatConfig["tone"])
    : defaultChatConfig.tone;
  const accentColor = accentOptions.some((option) => option.value === value.accentColor)
    ? (value.accentColor as ChatConfig["accentColor"])
    : defaultChatConfig.accentColor;
  const quickPrompts = Array.isArray(value.quickPrompts)
    ? value.quickPrompts.filter((prompt) => typeof prompt === "string" && prompt.trim()).slice(0, 8)
    : defaultChatConfig.quickPrompts;

  return {
    ...defaultChatConfig,
    ...value,
    tone,
    accentColor,
    quickPrompts,
  };
}

function readStoredConfig(): ChatConfig {
  if (typeof window === "undefined") {
    return defaultChatConfig;
  }

  const stored = window.localStorage.getItem(chatConfigStorageKey);
  if (!stored) {
    return defaultChatConfig;
  }

  try {
    return normalizeConfig(JSON.parse(stored));
  } catch {
    return defaultChatConfig;
  }
}

function encodeConfig(config: ChatConfig) {
  return encodeURIComponent(JSON.stringify(config));
}

export function AdminClient() {
  const [config, setConfig] = useState<ChatConfig>(defaultChatConfig);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [health, setHealth] = useState<{
    ok: boolean;
    openRouterConfigured: boolean;
    model: string;
  } | null>(null);
  const [leads, setLeads] = useState<ChatLead[]>([]);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    setConfig(readStoredConfig());
    const storedLeads = window.localStorage.getItem(chatLeadsStorageKey);
    if (storedLeads) {
      try {
        const parsed = JSON.parse(storedLeads);
        setLeads(Array.isArray(parsed) ? parsed.slice(-12) : []);
      } catch {
        setLeads([]);
      }
    }
    fetch("/api/health")
      .then((response) => response.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  function updateConfig<Key extends keyof ChatConfig>(key: Key, value: ChatConfig[Key]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function readFormConfig(form: HTMLFormElement) {
    const formData = new FormData(form);
    return normalizeConfig({
      ...config,
      brandName: String(formData.get("brandName") ?? config.brandName),
      displayName: String(formData.get("displayName") ?? config.displayName),
      greeting: String(formData.get("greeting") ?? config.greeting),
      systemPrompt: String(formData.get("systemPrompt") ?? config.systemPrompt),
      businessContext: String(formData.get("businessContext") ?? config.businessContext),
      handoffEmail: String(formData.get("handoffEmail") ?? config.handoffEmail),
      quickPrompts: String(formData.get("quickPrompts") ?? "")
        .split("\n")
        .map((prompt) => prompt.trim())
        .filter(Boolean),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextConfig = readFormConfig(event.currentTarget);
    setConfig(nextConfig);
    window.localStorage.setItem(chatConfigStorageKey, JSON.stringify(nextConfig));
    window.dispatchEvent(new Event("xa-chat-config-updated"));
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  }

  function resetConfig() {
    setConfig(defaultChatConfig);
    window.localStorage.removeItem(chatConfigStorageKey);
    window.dispatchEvent(new Event("xa-chat-config-updated"));
    setSavedAt(null);
  }

  function exportConfig() {
    void navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setSavedAt("configuration copied");
  }

  function importConfig() {
    try {
      const nextConfig = normalizeConfig(JSON.parse(importText));
      setConfig(nextConfig);
      window.localStorage.setItem(chatConfigStorageKey, JSON.stringify(nextConfig));
      window.dispatchEvent(new Event("xa-chat-config-updated"));
      setImportText("");
      setImportError(null);
      setSavedAt("configuration imported");
    } catch {
      setImportError("Paste a valid XA configuration JSON object.");
    }
  }

  const previewHref = `/user?config=${encodeConfig(config)}`;

  return (
    <form className="settings-grid" onSubmit={handleSubmit}>
      <article className="settings-card">
        <h2>Assistant profile</h2>
        <label>
          Brand name
          <input name="brandName" value={config.brandName} onChange={(event) => updateConfig("brandName", event.target.value)} />
        </label>
        <label>
          Display name
          <input
            name="displayName"
            value={config.displayName}
            onChange={(event) => updateConfig("displayName", event.target.value)}
          />
        </label>
        <label>
          Greeting
          <textarea name="greeting" value={config.greeting} onChange={(event) => updateConfig("greeting", event.target.value)} />
        </label>
      </article>

      <article className="settings-card">
        <h2>Experience</h2>
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
        <div className="swatch-row" aria-label="Accent color">
          {accentOptions.map((option) => (
            <button
              className={`swatch swatch-${option.value}${config.accentColor === option.value ? " active" : ""}`}
              type="button"
              key={option.value}
              aria-label={option.label}
              title={option.label}
              onClick={() => updateConfig("accentColor", option.value)}
            />
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
        <label className="toggle-row">
          <span>Show provider labels</span>
          <input
            type="checkbox"
            checked={config.showProviderLabels}
            onChange={(event) => updateConfig("showProviderLabels", event.target.checked)}
          />
        </label>
      </article>

      <article className="settings-card wide">
        <h2>System prompt</h2>
        <label>
          Instructions
          <textarea
            name="systemPrompt"
            className="large-textarea"
            value={config.systemPrompt}
            onChange={(event) => updateConfig("systemPrompt", event.target.value)}
          />
        </label>
        <label>
          Business context
          <textarea
            name="businessContext"
            className="large-textarea"
            value={config.businessContext}
            onChange={(event) => updateConfig("businessContext", event.target.value)}
          />
        </label>
      </article>

      <article className="settings-card wide">
        <h2>Suggested prompts</h2>
        <label>
          One prompt per line
          <textarea
            name="quickPrompts"
            value={config.quickPrompts.join("\n")}
            onChange={(event) =>
              updateConfig(
                "quickPrompts",
                event.target.value
                  .split("\n")
                  .map((prompt) => prompt.trim())
                  .filter(Boolean)
                  .slice(0, 8),
              )
            }
          />
        </label>
      </article>

      <article className="settings-card">
        <h2>Fallback routing</h2>
        <label>
          Human handoff email
          <input
            name="handoffEmail"
            value={config.handoffEmail}
            onChange={(event) => updateConfig("handoffEmail", event.target.value)}
          />
        </label>
      </article>

      <article className="settings-card">
        <h2>Leads</h2>
        <p className="small-copy">{leads.length ? `${leads.length} lead records saved in this browser.` : "No lead records saved in this browser."}</p>
        <div className="lead-list">
          {leads.slice(-3).map((lead) => (
            <div key={`${lead.email}-${lead.createdAt}`}>
              <strong>{lead.name || "Visitor"}</strong>
              <span>{lead.email || "No email"}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="settings-card wide">
        <h2>Configuration transfer</h2>
        <div className="actions compact">
          <button className="button button-secondary" type="button" onClick={exportConfig}>
            Copy config JSON
          </button>
          <button className="button button-primary" type="button" onClick={importConfig}>
            Import config
          </button>
        </div>
        <label>
          Paste configuration JSON
          <textarea name="importText" value={importText} onChange={(event) => setImportText(event.target.value)} />
        </label>
        {importError && <p className="chat-error inline-error">{importError}</p>}
      </article>

      <article className="settings-card publish-card">
        <h2>Launch</h2>
        <p>{savedAt ? `Published locally at ${savedAt}.` : "Publish this configuration, then preview the chatbot."}</p>
        <div className="status-stack">
          <span className={health?.openRouterConfigured ? "status-good" : "status-warn"}>
            {health?.openRouterConfigured ? "OpenRouter live" : "Fallback responder active"}
          </span>
          <span>{health?.model ?? "openrouter/free"}</span>
        </div>
        <div className="actions compact">
          <a className="button button-secondary" href={previewHref}>
            Preview
          </a>
          <button className="button button-secondary" type="button" onClick={resetConfig}>
            Reset
          </button>
          <button className="button button-primary" type="submit">
            Publish
          </button>
        </div>
      </article>
    </form>
  );
}
