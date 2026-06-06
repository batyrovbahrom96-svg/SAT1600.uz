import Link from "next/link";
import type { CSSProperties } from "react";

const tags = ["Digital SAT", "Mock tests", "Analytics", "1400+ route"];

const technologyCards = [
  {
    title: "Diagnostic engine",
    body: "A mock test becomes a score map, weakness report, and first route for improvement."
  },
  {
    title: "Adaptive practice",
    body: "Reading, Writing, and Math tasks are grouped around the mistakes holding the score down."
  },
  {
    title: "Growth tracking",
    body: "Students and parents see progress, repeated traps, and what to study next."
  }
];

const highlights = [
  "Bluebook-style mock pressure",
  "Weak-topic practice plan",
  "Mistake pattern explanations",
  "Telegram payment confirmation"
];

const plans = [
  {
    name: "Diagnostic Mock",
    price: "Free",
    body: "One diagnostic route for students who need to see their real SAT level first.",
    href: "/mock-test"
  },
  {
    name: "SATTEST Pro",
    price: "149 000 UZS",
    body: "Monthly targeted practice, analytics, and a visible 1400+ study direction.",
    href: "/pricing"
  },
  {
    name: "1400+ Elite",
    price: "990 000 UZS",
    body: "High-touch roadmap, review, and weekly correction for serious score growth.",
    href: "/pricing"
  }
];

function Dashes() {
  return (
    <div className="critical-dashes" aria-hidden="true">
      {Array.from({ length: 46 }).map((_, index) => (
        <span key={index} style={{ "--i": index } as CSSProperties} />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="critical-home">
      <Dashes />

      <header className="critical-nav">
        <Link className="critical-logo" href="/">
          sattest.uz
        </Link>
        <nav aria-label="Main navigation">
          <Link href="#method">Method</Link>
          <Link href="#pricing">Pricing</Link>
          <Link href="/about-us">References</Link>
          <a className="critical-nav-cta" href="https://t.me/FounderSATTESTUZ" target="_blank" rel="noreferrer">
            Let&apos;s talk
          </a>
        </nav>
      </header>

      <section className="critical-hero" id="hero">
        <div className="critical-year">2026</div>
        <div className="critical-badge">SAT preparation platform</div>
        <h1>
          Build The SAT
          <br />
          Score That
          <br />
          Moves You
          <br />
          Forward
        </h1>
        <div className="critical-hero-bottom">
          <p>
            SATTEST.UZ turns diagnostic mocks into weakness analytics, targeted practice,
            and a clear route toward serious score growth.
          </p>
          <div className="critical-actions">
            <Link className="critical-button is-green" href="/mock-test">
              Start diagnostic
            </Link>
            <Link className="critical-button" href="/pricing">
              View pricing
            </Link>
          </div>
        </div>
        <div className="critical-tags">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </section>

      <section className="critical-section" id="method">
        <span className="critical-label">Technology</span>
        <div className="critical-section-head">
          <h2>Built for focused SAT improvement.</h2>
          <p>
            The platform is not random practice. It is a simple loop: diagnose,
            target, repeat, and measure the score movement.
          </p>
        </div>
        <div className="critical-card-grid">
          {technologyCards.map((card) => (
            <article className="critical-card" key={card.title}>
              <div className="critical-card-mark" />
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="critical-section">
        <span className="critical-label">Highlights</span>
        <div className="critical-highlight-grid">
          {highlights.map((item) => (
            <div className="critical-highlight" key={item}>
              <span />
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="critical-section" id="pricing">
        <span className="critical-label">Pricing</span>
        <div className="critical-section-head">
          <h2>Choose your SAT route.</h2>
          <p>Start free, upgrade when the weak areas are clear, or move into personal correction.</p>
        </div>
        <div className="critical-pricing-grid">
          {plans.map((plan) => (
            <Link className="critical-price-card" href={plan.href} key={plan.name}>
              <span>{plan.name}</span>
              <strong>{plan.price}</strong>
              <p>{plan.body}</p>
              <em>Open route</em>
            </Link>
          ))}
        </div>
      </section>

      <section className="critical-contact" id="contact">
        <span className="critical-label">Contact</span>
        <h2>
          Ready to build
          <br />
          your route?
        </h2>
        <a href="https://t.me/FounderSATTESTUZ" target="_blank" rel="noreferrer">
          @FounderSATTESTUZ
        </a>
      </section>
    </main>
  );
}
