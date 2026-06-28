import { useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { fetchLanding } from "../api/public";
import { useConversation } from "../hooks/useConversation";
import { useSession } from "../hooks/useSession";

export function ChatView() {
  const { businessSlug = "", locationSlug = "" } = useParams();
  const sessionToken = useSession(businessSlug, locationSlug);
  const [draft, setDraft] = useState("");

  const landingQuery = useQuery({
    queryKey: ["landing", businessSlug, locationSlug],
    queryFn: () => fetchLanding(businessSlug, locationSlug, sessionToken),
  });

  const { messages, isLoading, sendMessage, isSending } = useConversation(
    businessSlug,
    locationSlug,
    sessionToken,
  );

  function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    sendMessage(trimmed);
    setDraft("");
  }

  if (landingQuery.isLoading) {
    return (
      <div className="app-shell-placeholder">
        <p className="app-shell-note">Loading...</p>
      </div>
    );
  }

  if (landingQuery.isError || !landingQuery.data) {
    return (
      <div className="app-shell-placeholder">
        <p className="app-shell-eyebrow">AI Host</p>
        <h1>We couldn&apos;t find this location</h1>
      </div>
    );
  }

  const landing = landingQuery.data;
  const hasStartedChat = isLoading || messages.length > 0;
  const hostInitial = (landing.host_name ?? "AI").charAt(0).toUpperCase();

  const themeStyle = {
    "--accent": landing.secondary_color ?? "#8fa37c",
    "--accent-strong": landing.primary_color ?? "#1f3d2b",
  } as CSSProperties;

  return (
    <div className="chat-view" style={themeStyle}>
      <header className="chat-view-header">
        <div className="chat-view-avatar chat-view-avatar-lg">{hostInitial}</div>
        <p className="app-shell-eyebrow">{landing.business_name}</p>
        <h1>{landing.landing_title ?? landing.location_name}</h1>
        {landing.welcome_message && <p className="chat-view-welcome">{landing.welcome_message}</p>}
      </header>

      {!hasStartedChat && landing.suggested_questions.length > 0 && (
        <div className="chat-view-suggestions">
          {landing.suggested_questions.map((question) => (
            <button
              key={question}
              type="button"
              className="chat-view-suggestion-chip"
              onClick={() => handleSend(question)}
            >
              {question}
            </button>
          ))}
        </div>
      )}

      <div className="chat-view-messages">
        {messages.map((message) =>
          message.role === "customer" ? (
            <div key={message.id} className="chat-view-row chat-view-row-customer">
              <div className="chat-view-message chat-view-message-customer">{message.content}</div>
            </div>
          ) : (
            <div key={message.id} className="chat-view-row chat-view-row-assistant">
              <div className="chat-view-avatar">{hostInitial}</div>
              <div className="chat-view-message chat-view-message-assistant">{message.content}</div>
            </div>
          ),
        )}
        {isSending && (
          <div className="chat-view-row chat-view-row-assistant">
            <div className="chat-view-avatar">{hostInitial}</div>
            <div className="chat-view-message chat-view-message-assistant chat-view-typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      <form
        className="chat-view-form"
        onSubmit={(event) => {
          event.preventDefault();
          handleSend(draft);
        }}
      >
        <input
          className="chat-view-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message ${landing.host_name ?? "AI Host"}…`}
        />
        <button
          type="submit"
          className="chat-view-send"
          disabled={isSending || draft.trim().length === 0}
          aria-label="Send message"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </form>
    </div>
  );
}
