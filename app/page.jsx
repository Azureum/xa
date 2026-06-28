const stackItems = [
  "Next.js app router",
  "Vercel-ready build scripts",
  "Responsive shell",
  "Clean CSS baseline"
];

export default function Home() {
  return (
    <main className="page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__content">
          <p className="eyebrow">XA Webapp Base</p>
          <h1 id="hero-title">Ship the first useful screen.</h1>
          <p className="lede">
            A compact starter for building and deploying a modern webapp on
            Vercel with Next.js.
          </p>
          <div className="actions" aria-label="Primary actions">
            <a className="button button--primary" href="https://vercel.com/new">
              Deploy
            </a>
            <a className="button button--secondary" href="https://nextjs.org/docs">
              Docs
            </a>
          </div>
        </div>

        <div className="panel" aria-label="Starter stack">
          <div className="panel__header">
            <span className="status-dot" />
            <span>Base included</span>
          </div>
          <ul className="stack-list">
            {stackItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
