import { CheckIcon, ConversationsIcon, LocationsIcon, ScanIcon } from "../dashboard/components/icons";

const workflow = [
  {
    title: "Publish a customer link",
    body: "Create branded QR and NFC entry points for each location.",
    icon: ScanIcon,
  },
  {
    title: "Answer guest questions",
    body: "Use trained business knowledge, personality, and promotions in chat.",
    icon: ConversationsIcon,
  },
  {
    title: "Improve every location",
    body: "Review conversations, unanswered questions, and location trends.",
    icon: LocationsIcon,
  },
];

const productionItems = [
  "Next.js frontend configured for Vercel",
  "FastAPI exposed through the Vercel Python function",
  "Same-origin API routing for production",
  "Supabase-ready authentication and data storage",
];

export function LandingPage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Primary">
        <a className="landing-brand" href="/">
          <span className="landing-brand-mark">A</span>
          <span>AI Host</span>
        </a>
        <div className="landing-nav-actions">
          <a className="landing-link" href="/login">
            Log in
          </a>
          <a className="landing-button landing-button-secondary" href="/register">
            Create account
          </a>
        </div>
      </nav>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Restaurant AI concierge</p>
          <h1 id="landing-title">Turn every QR scan into a helpful conversation.</h1>
          <p className="landing-lede">
            AI Host gives restaurants and small businesses a trained customer chat agent,
            owner dashboard, location controls, and production deployment path.
          </p>
          <div className="landing-actions">
            <a className="landing-button landing-button-primary" href="/register">
              Start
            </a>
            <a className="landing-button landing-button-secondary" href="/login">
              Dashboard
            </a>
          </div>
        </div>

        <div className="landing-product" aria-label="Production readiness">
          <div className="landing-product-header">
            <span className="landing-live-dot" />
            <span>Production base</span>
          </div>
          <ul className="landing-checks">
            {productionItems.map((item) => (
              <li key={item}>
                <CheckIcon className="landing-check-icon" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="landing-workflow" aria-label="How AI Host works">
        {workflow.map((item) => {
          const Icon = item.icon;
          return (
            <article className="landing-step" key={item.title}>
              <Icon className="landing-step-icon" />
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
