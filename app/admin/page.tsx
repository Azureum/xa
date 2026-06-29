import { AdminClient } from "./admin-client";

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
            Set the assistant prompt, approved context, tone, lead handling, and fallback routing for the customer
            chat experience.
          </p>
        </div>

        <AdminClient />
      </section>
    </main>
  );
}
