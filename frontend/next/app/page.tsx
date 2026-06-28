export default function Page() {
  return (
    <main className="page">
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">XA on Next.js</p>
        <h1 id="hero-title">Production starter is live.</h1>
        <p className="lede">
          This is a clean, traditional Next.js app deployed through the
          GitHub-linked Vercel project.
        </p>
        <div className="actions">
          <a className="button button-primary" href="https://github.com/Azureum/xa">
            GitHub
          </a>
          <a className="button button-secondary" href="https://nextjs.org/docs">
            Next.js Docs
          </a>
        </div>
      </section>
    </main>
  );
}
