const messages = [
  {
    author: "assistant",
    text: "Hi, I am XA. Ask me about hours, services, pricing, or next steps.",
  },
  {
    author: "user",
    text: "Can you help me choose the right plan?",
  },
  {
    author: "assistant",
    text: "Yes. Tell me your goal and expected volume, and I will suggest a setup.",
  },
];

const quickPrompts = ["Pricing", "Book a demo", "Support", "Hours"];

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

        <div className="message-list" aria-label="Conversation preview">
          {messages.map((message, index) => (
            <div className={`message-row ${message.author}`} key={`${message.author}-${index}`}>
              <p>{message.text}</p>
            </div>
          ))}
        </div>

        <div className="prompt-row" aria-label="Quick prompts">
          {quickPrompts.map((prompt) => (
            <button className="chip" type="button" key={prompt}>
              {prompt}
            </button>
          ))}
        </div>

        <form className="composer">
          <label className="sr-only" htmlFor="chat-message">
            Message
          </label>
          <input id="chat-message" placeholder="Type your message..." />
          <button type="submit">Send</button>
        </form>
      </section>
    </main>
  );
}
