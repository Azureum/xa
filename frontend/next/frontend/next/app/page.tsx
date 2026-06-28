export default function Page() {
  return (
    <main className="page">
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">XA on Vercel</p>
        <h1 id="hero-title">Production starter is live.</h1>
        <p className="lede">
          This is a clean, traditional Next.js app running from the Vercel project
          root so deployment works with the standard GitHub workflow.
        </p>
        <div className="actions">
          <a className="button button-primary" href="https://github.com/Azureum/xa">
            GitHub
          </a>
          <a className="button button-secondary" href="https://vercel.com/docs">
            Vercel Docs
          </a>
        </div>
      </section>
    </main>
  );
}
