import Link from "next/link";
import type { CSSProperties } from "react";

const advantages = [
  {
    number: "01 / 04",
    title: "Diagnostic intelligence",
    body: "See your score level, section gaps, and mistakes before choosing a paid route."
  },
  {
    number: "02 / 04",
    title: "Targeted practice",
    body: "Train Reading, Writing, and Math by the weak topics that matter most."
  },
  {
    number: "03 / 04",
    title: "1400+ roadmap",
    body: "Follow a personal curriculum route built for measurable score growth."
  },
  {
    number: "04 / 04",
    title: "Weekly correction",
    body: "Elite students get structure, review, and focused strategy for serious gains."
  }
];

const plans = [
  {
    kicker: "Free route",
    number: "01",
    name: "Diagnostic Mock",
    price: "0 UZS",
    body: "For students who want to see their real SAT level before choosing a paid route.",
    href: "/mock-test"
  },
  {
    kicker: "Core platform",
    number: "02",
    name: "SATTEST Pro",
    price: "149 000 UZS / month",
    body: "Targeted SAT practice, analytics, and a visible score-growth route.",
    href: "/pricing"
  },
  {
    kicker: "Elite system",
    number: "03",
    name: "1400+ Elite",
    price: "990 000 UZS / month",
    body: "Personal structure, weekly correction, and strategy for serious score improvement.",
    href: "/pricing"
  }
];

function ParticleField() {
  return (
    <div className="wq-particle-field" aria-hidden="true">
      {Array.from({ length: 360 }).map((_, index) => (
        <span key={index} style={{ "--i": index } as CSSProperties} />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="wq-home">
      <ParticleField />

      <header className="wq-header">
        <Link className="wq-brand" href="/">
          <span>SATTEST</span>
          <strong>UZ</strong>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="#method">Why SATTEST</Link>
          <Link href="#pricing">Pricing</Link>
          <Link href="/about-us">Results</Link>
          <a href="https://t.me/FounderSATTESTUZ" target="_blank" rel="noreferrer">
            Contact
          </a>
        </nav>
      </header>

      <section className="wq-hero" id="hero">
        <div className="wq-hero-copy">
          <p className="wq-eyebrow">SAT preparation platform</p>
          <h1>
            <span>Build</span>
            <span>The SAT</span>
            <span>Score That</span>
            <span>Moves You</span>
            <span>Forward</span>
          </h1>
          <Link className="wq-pill-button" href="/pricing">
            View pricing
            <span>+</span>
          </Link>
        </div>
        <p className="wq-hero-text">
          SATTEST.UZ gives serious students a clear diagnostic, targeted practice,
          and a score-growth route from first mock to 1400+ strategy.
        </p>
      </section>

      <section className="wq-statement" id="method">
        <p className="wq-section-label">Our method</p>
        <div className="wq-statement-grid">
          <h2>
            Diagnose precisely.
            <br />
            Practice deliberately.
          </h2>
          <div>
            <p>
              The platform turns every mock and practice set into a map of weak topics,
              priority drills, and visible progress. Students do not just solve more
              questions. They build the exact habits the digital SAT rewards.
            </p>
            <Link className="wq-pill-button is-dark" href="/mock-test">
              Start diagnostic
              <span>+</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="wq-system">
        {advantages.map((item, index) => (
          <article className={index === 0 ? "wq-system-card is-active" : "wq-system-card"} key={item.title}>
            {index === 0 ? <div className="wq-dot-form" aria-hidden="true" /> : null}
            <p>{item.number}</p>
            <h3>{item.title}</h3>
            <span>{item.body}</span>
          </article>
        ))}
      </section>

      <section className="wq-pricing" id="pricing">
        <div className="wq-pricing-head">
          <p className="wq-eyebrow">Pricing</p>
          <h2>Choose your SAT route.</h2>
        </div>
        <div className="wq-price-grid">
          {plans.map((plan) => (
            <Link className="wq-price-card" href={plan.href} key={plan.name}>
              <div className="wq-card-form" aria-hidden="true" />
              <div className="wq-plan-top">
                <p>
                  <span>{plan.kicker}</span>
                  <span>{plan.number}</span>
                </p>
                <h3>{plan.name}</h3>
                <strong>{plan.price}</strong>
                <span>{plan.body}</span>
              </div>
              <em>
                Open route
                <span>+</span>
              </em>
            </Link>
          ))}
        </div>
      </section>

      <section className="wq-contact" id="contact">
        <p className="wq-section-label">Talk to SATTEST</p>
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
