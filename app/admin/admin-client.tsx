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
  faqItems: string[];
};

export type ChatLead = {
  name: string;
  email: string;
  note: string;
  createdAt: string;
};

export type ChatRating = {
  score: "up" | "down";
  note: string;
  createdAt: string;
};

export const chatConfigStorageKey = "xa-chat-config";
export const chatLeadsStorageKey = "xa-chat-leads";
export const chatHistoryStorageKey = "xa-chat-history";
export const chatRatingsStorageKey = "xa-chat-ratings";

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
  faqItems: [
    "Pricing: Pricing starts after a discovery call and depends on scope.",
    "Support: Support requests should include the issue, timeline, and best contact method.",
    "Booking: Visitors can request a demo or discovery call through the chat.",
  ],
};

const toneOptions: ChatConfig["tone"][] = ["Helpful", "Concise", "Professional"];
const accentOptions: { label: string; value: ChatConfig["accentColor"] }[] = [
  { label: "Teal", value: "teal" },
  { label: "Blue", value: "blue" },
  { label: "Rose", value: "rose" },
  { label: "Graphite", value: "graphite" },
];

const configTemplates: { label: string; config: Partial<ChatConfig> }[] = [
  {
    label: "Sales",
    config: {
      tone: "Helpful",
      accentColor: "teal",
      greeting: "Hi, I can help with pricing, demos, and next steps.",
      quickPrompts: ["Pricing", "Book a demo", "Compare options", "Talk to sales"],
      faqItems: [
        "Pricing: Pricing depends on scope and starts after a discovery call.",
        "Demo: Visitors can request a demo with their preferred time and contact details.",
        "Sales: A specialist can help compare options and prepare next steps.",
      ],
    },
  },
  {
    label: "Support",
    config: {
      tone: "Professional",
      accentColor: "blue",
      greeting: "Hi, I can help route support issues and gather the right details.",
      quickPrompts: ["Report an issue", "Contact support", "Check status", "Escalate"],
      faqItems: [
        "Support: Include the issue, timeline, account details, and best contact method.",
        "Escalation: Urgent issues should be routed to the handoff email.",
        "Status: Ask for the ticket or request details before giving a status answer.",
      ],
    },
  },
  {
    label: "Concierge",
    config: {
      tone: "Concise",
      accentColor: "graphite",
      greeting: "Welcome. Tell me what you need and I will route it cleanly.",
      quickPrompts: ["Start a request", "Book time", "Ask a question", "Need a human"],
      faqItems: [
        "Requests: Start with the desired outcome, timeline, and contact details.",
        "Booking: A human can follow up after the visitor shares preferred times.",
        "Human handoff: Route visitors to the handoff email when a request needs judgment.",
      ],
    },
  },
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
  const faqItems = Array.isArray(value.faqItems)
    ? value.faqItems.filter((item) => typeof item === "string" && item.trim()).slice(0, 12)
    : defaultChatConfig.faqItems;

  return {
    ...defaultChatConfig,
    ...value,
    tone,
    accentColor,
    quickPrompts,
    faqItems,
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

function downloadText(filename: string, text: string, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
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
  const [ratings, setRatings] = useState<ChatRating[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [testQuestion, setTestQuestion] = useState("How does pricing work?");
  const [testResult, setTestResult] = useState<{
    reply: string;
    provider: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

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
    const storedHistory = window.localStorage.getItem(chatHistoryStorageKey);
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory);
        setMessageCount(Array.isArray(parsed) ? parsed.length : 0);
      } catch {
        setMessageCount(0);
      }
    }
    const storedRatings = window.localStorage.getItem(chatRatingsStorageKey);
    if (storedRatings) {
      try {
        const parsed = JSON.parse(storedRatings);
        setRatings(Array.isArray(parsed) ? parsed.slice(-20) : []);
      } catch {
        setRatings([]);
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
      faqItems: String(formData.get("faqItems") ?? "")
        .split("\n")
        .map((item) => item.trim())
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

  function applyTemplate(template: Partial<ChatConfig>) {
    const nextConfig = normalizeConfig({ ...config, ...template });
    setConfig(nextConfig);
    setSavedAt("template applied");
  }

  function exportConfig() {
    void navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setSavedAt("configuration copied");
  }

  function downloadConfig() {
    downloadText("xa-chat-config.json", JSON.stringify(config, null, 2), "application/json");
    setSavedAt("configuration downloaded");
  }

  function exportLeadsCsv() {
    const header = ["Name", "Email", "Note", "Created At"];
    const rows = leads.map((lead) => [lead.name, lead.email, lead.note, lead.createdAt]);
    const csv = [header, ...rows].map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\n");
    downloadText("xa-leads.csv", csv, "text/csv");
    setSavedAt("leads exported");
  }

  function exportTranscript() {
    const storedHistory = window.localStorage.getItem(chatHistoryStorageKey);
    const transcript = storedHistory ? JSON.parse(storedHistory) : [];
    const text = Array.isArray(transcript)
      ? transcript.map((message) => `${String(message.role ?? "message").toUpperCase()}: ${String(message.content ?? "")}`).join("\n\n")
      : "";
    downloadText("xa-transcript.txt", text || "No transcript is saved in this browser.");
    setSavedAt("transcript exported");
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

  async function testAssistant() {
    const question = testQuestion.trim();
    if (!question || isTesting) {
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: question }],
          config,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "The test request failed.");
      }
      setTestResult({
        reply: payload.reply,
        provider: payload.provider ?? "unknown",
      });
    } catch (error) {
      setTestResult({
        reply: error instanceof Error ? error.message : "The test request failed.",
        provider: "error",
      });
    } finally {
      setIsTesting(false);
    }
  }

  const previewHref = `/user?config=${encodeConfig(config)}`;
  const embedHref = `/embed?config=${encodeConfig(config)}`;
  const siteOrigin = typeof window === "undefined" ? "" : window.location.origin;
  const embedUrl = `${siteOrigin}${embedHref}`;
  const embedSnippet = `<iframe src="${embedUrl}" title="${config.brandName} chatbot" width="420" height="720" style="border:0;border-radius:8px;max-width:100%;"></iframe>`;
  const launcherSnippet = `<script>
(function () {
  var frameUrl = "${embedUrl}";
  var button = document.createElement("button");
  var frame = document.createElement("iframe");
  button.textContent = "${config.brandName} chat";
  button.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:9999;border:0;border-radius:999px;background:#111827;color:#fff;padding:12px 16px;font:600 14px system-ui;box-shadow:0 12px 30px rgba(0,0,0,.2);";
  frame.src = frameUrl;
  frame.title = "${config.brandName} chatbot";
  frame.style.cssText = "position:fixed;right:20px;bottom:76px;width:min(420px,calc(100vw - 32px));height:min(720px,calc(100vh - 112px));z-index:9999;border:0;border-radius:8px;box-shadow:0 24px 70px rgba(0,0,0,.24);display:none;background:#fff;";
  button.onclick = function () {
    frame.style.display = frame.style.display === "none" ? "block" : "none";
  };
  document.body.appendChild(frame);
  document.body.appendChild(button);
})();
</script>`;

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
        <div className="template-row" aria-label="Templates">
          {configTemplates.map((template) => (
            <button type="button" key={template.label} onClick={() => applyTemplate(template.config)}>
              {template.label}
            </button>
          ))}
        </div>
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

      <article className="settings-card wide">
        <h2>Knowledge snippets</h2>
        <label>
          One snippet per line
          <textarea
            name="faqItems"
            className="large-textarea"
            value={config.faqItems.join("\n")}
            onChange={(event) =>
              updateConfig(
                "faqItems",
                event.target.value
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .slice(0, 12),
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
        <button className="button button-secondary" type="button" onClick={exportLeadsCsv} disabled={!leads.length}>
          Export leads CSV
        </button>
      </article>

      <article className="settings-card">
        <h2>Activity</h2>
        <div className="metric-grid">
          <div>
            <strong>{messageCount}</strong>
            <span>messages</span>
          </div>
          <div>
            <strong>{leads.length}</strong>
            <span>leads</span>
          </div>
          <div>
            <strong>{config.faqItems.length}</strong>
            <span>snippets</span>
          </div>
          <div>
            <strong>{ratings.filter((rating) => rating.score === "up").length}</strong>
            <span>upvotes</span>
          </div>
          <div>
            <strong>{ratings.filter((rating) => rating.score === "down").length}</strong>
            <span>downvotes</span>
          </div>
        </div>
        <button className="button button-secondary" type="button" onClick={exportTranscript}>
          Export transcript
        </button>
      </article>

      <article className="settings-card wide test-console">
        <h2>Test assistant</h2>
        <label>
          Test question
          <input value={testQuestion} onChange={(event) => setTestQuestion(event.target.value)} />
        </label>
        <div className="actions compact">
          <button className="button button-primary" type="button" onClick={testAssistant} disabled={isTesting}>
            {isTesting ? "Testing" : "Run test"}
          </button>
        </div>
        {testResult && (
          <div className="test-result">
            <span>{testResult.provider}</span>
            <p>{testResult.reply}</p>
          </div>
        )}
      </article>

      <article className="settings-card wide">
        <h2>Configuration transfer</h2>
        <div className="actions compact">
          <button className="button button-secondary" type="button" onClick={exportConfig}>
            Copy config JSON
          </button>
          <button className="button button-secondary" type="button" onClick={downloadConfig}>
            Download config
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

      <article className="settings-card wide">
        <h2>Install widget</h2>
        <div className="actions compact">
          <a className="button button-secondary" href={embedHref}>
            Open embed
          </a>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(embedSnippet);
              setSavedAt("embed code copied");
            }}
          >
            Copy embed code
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(launcherSnippet);
              setSavedAt("launcher code copied");
            }}
          >
            Copy launcher code
          </button>
        </div>
        <label>
          Iframe snippet
          <textarea className="code-textarea" readOnly value={embedSnippet} />
        </label>
        <label>
          Floating launcher snippet
          <textarea className="code-textarea large-code-textarea" readOnly value={launcherSnippet} />
        </label>
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
