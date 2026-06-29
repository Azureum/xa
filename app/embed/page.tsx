import { ChatClient } from "../user/chat-client";

export default function EmbedChatPage() {
  return (
    <main className="embed-page">
      <section className="chat-shell embed-shell" aria-labelledby="embed-title">
        <div className="chat-header compact-header">
          <div>
            <p className="eyebrow">XA chatbot</p>
            <h1 id="embed-title">Chat with XA.</h1>
          </div>
          <span className="status-pill">Online</span>
        </div>

        <ChatClient />
      </section>
    </main>
  );
}
