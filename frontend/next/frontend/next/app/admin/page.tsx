const knowledgeItems = [
  "Business hours and holiday schedule",
  "Pricing, packages, and qualification rules",
  "Escalation path for support requests",
];

const toneOptions = ["Helpful", "Concise", "Professional"];

export default function AdminPage() {
  return (
    <main className="app-page">
      <header className="topbar">
        <a className="brand" href="/">
          XA
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="/user">Chatbot</a>
        </nav>
      </header>

      <section className="admin-layout" aria-labelledby="admin-title">
        <div className="admin-heading">
          <p className="eyebrow">Admin panel</p>
          <h1 id="admin-title">Configure the chatbot.</h1>
          <p className="lede">
            Manage the assistant personality, approved knowledge, routing, and
            launch controls from one production-ready workspace.
          </p>
        </div>

        <div className="settings-grid">
          <article className="settings-card">
            <h2>Assistant profile</h2>
            <label>
              Display name
              <input defaultValue="XA Assistant" />
            </label>
            <label>
              Greeting
              <textarea defaultValue="Hi, I am XA. How can I help today?" />
            </label>
          </article>

          <article className="settings-card">
            <h2>Tone</h2>
            <div className="segmented" aria-label="Tone options">
              {toneOptions.map((option, index) => (
                <button className={index === 0 ? "active" : ""} type="button" key={option}>
                  {option}
                </button>
              ))}
            </div>
            <label className="toggle-row">
              <span>Ask clarifying questions</span>
              <input type="checkbox" defaultChecked />
            </label>
            <label className="toggle-row">
              <span>Collect lead details</span>
              <input type="checkbox" defaultChecked />
            </label>
          </article>

          <article className="settings-card wide">
            <h2>Knowledge base</h2>
            <ul className="knowledge-list">
              {knowledgeItems.map((item) => (
                <li key={item}>
                  <span>{item}</span>
                  <button type="button">Edit</button>
                </li>
              ))}
            </ul>
            <button className="button button-primary" type="button">
              Add knowledge
            </button>
          </article>

          <article className="settings-card">
            <h2>Fallback routing</h2>
            <label>
              Human handoff email
              <input defaultValue="support@example.com" />
            </label>
            <label>
              Confidence threshold
              <input defaultValue="70%" />
            </label>
          </article>

          <article className="settings-card publish-card">
            <h2>Launch</h2>
            <p>Preview the customer experience, then publish the latest configuration.</p>
            <div className="actions compact">
              <a className="button button-secondary" href="/user">
                Preview
              </a>
              <button className="button button-primary" type="button">
                Publish
              </button>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
