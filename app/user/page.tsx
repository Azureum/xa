import { ChatClient } from "./chat-client";

export default function UserChatPage() {
  return (
    <main className="app-page">
      <header className="topbar">
        <a className="brand" href="/">
          XA
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="/admin">Admin</a>
        </nav>
      </header>

      <section className="chat-shell" aria-labelledby="chat-title">
        <div className="chat-header">
          <div>
            <p className="eyebrow">Customer chatbot</p>
            <h1 id="chat-title">Ask XA anything.</h1>
          </div>
          <span className="status-pill">Online</span>
        </div>

        <ChatClient />
      </section>
    </main>
  );
}
