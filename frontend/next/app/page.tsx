export default function Page() {
  return (
    <main className="page">
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">XA on Next.js</p>
        <h1 id="hero-title">Production starter is live.</h1>
        <p className="lede">
          This is a clean, traditional Next.js app with a customer chatbot
          interface and an admin configuration panel.
        </p>
        <div className="actions">
          <a className="button button-primary" href="/user">
            Open chatbot
          </a>
          <a className="button button-secondary" href="/admin">
            Admin panel
          </a>
        </div>
      </section>
    </main>
  );
}
