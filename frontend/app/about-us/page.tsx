import type { CSSProperties } from "react";
import { ArrowRight, BrainCircuit, ChartNoAxesCombined, CheckCircle2, Cpu, LockKeyhole, ShieldCheck, Sparkles, Target } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumText } from "@/components/PremiumText";
import { SplineScene } from "@/components/SplineScene";

const robotSceneUrl = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

const proofCards = [
  {
    title: "Real Diagnostic First",
    text: "Every route starts from a timed SAT-style diagnostic, not from guesswork or a generic worksheet.",
    icon: Target
  },
  {
    title: "AI-Guided Weakness Map",
    text: "The platform classifies mistakes by section, skill, trap pattern, timing pressure, and next study priority.",
    icon: BrainCircuit
  },
  {
    title: "Transparent Progress",
    text: "Students can see scores, section gaps, missed topics, daily work, and the reason behind each practice route.",
    icon: ChartNoAxesCombined
  },
  {
    title: "Secure Student Cabinet",
    text: "Accounts keep attempts, results, curriculum, and practice history connected to the same learner profile.",
    icon: LockKeyhole
  }
];

const values = [
  "Evidence before advice",
  "Practice before promise",
  "Progress that can be checked",
  "Premium SAT preparation for Uzbekistan"
];

const processSteps = [
  {
    number: "01",
    title: "Take the diagnostic SAT mock",
    text: "The student starts with a realistic digital SAT experience so the platform can collect meaningful performance data."
  },
  {
    number: "02",
    title: "Read the score intelligence",
    text: "SATTEST.UZ separates Reading, Writing, and Math into concrete weaknesses instead of showing only a final number."
  },
  {
    number: "03",
    title: "Follow the 1400+ route",
    text: "The study plan is built around weak skills first, then reinforced with section practice and progress checks."
  }
];

const credibility = [
  "Built around SAT-style timing and section logic",
  "Designed for Uzbek students aiming at international universities",
  "Uses partner ecosystem signals and local learning center proof",
  "Focused on measurable improvement, not empty marketing"
];

export default function AboutUsPage() {
  return (
    <main className="about-page">
      <LuxuryNavbar />

      <section className="about-hero">
        <div className="about-orbit" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, index) => (
            <span key={index} style={{ "--orbit": index } as CSSProperties} />
          ))}
        </div>
        <div className="about-hero__content">
          <p className="about-kicker">About SATTEST.UZ</p>
          <PremiumText as="h1" variant="hero">
            An AI-powered SAT organization built to make progress visible.
          </PremiumText>
          <p>
            SATTEST.UZ is not a simple practice website. It is a diagnostic SAT platform that turns every mock test into a personal study route, score report, weakness map, and 1400+ preparation plan.
          </p>
          <div className="about-hero__actions">
            <PremiumButton href="/mock-test" icon={<ArrowRight size={18} />}>
              Start Free Diagnostic
            </PremiumButton>
            <PremiumButton href="/pricing" icon={<ArrowRight size={18} />} variant="glass">
              Choose Plan
            </PremiumButton>
          </div>
        </div>

        <div className="about-ai-card" aria-label="SATTEST AI engine visual">
          <div className="about-ai-card__top">
            <span>AI Diagnostic Engine</span>
            <Cpu size={22} />
          </div>
          <div className="about-ai-core">
            <span />
            <span />
            <span />
            <BrainCircuit size={54} />
          </div>
          <div className="about-ai-grid">
            <span>Reading</span>
            <span>Writing</span>
            <span>Math</span>
            <span>Timing</span>
            <span>Trap Pattern</span>
            <span>Daily Plan</span>
          </div>
        </div>
      </section>

      <section className="about-robot-section" aria-labelledby="about-robot-title">
        <div className="about-robot-section__copy">
          <p className="about-kicker">Interactive AI layer</p>
          <PremiumText as="h2" id="about-robot-title" variant="platform">A smarter study companion for every diagnostic route.</PremiumText>
          <p>
            The 3D assistant represents how SATTEST.UZ reads a mock test, detects weak skills, and turns the next study step into a clear action instead of another guess.
          </p>
        </div>
        <div className="about-robot-section__stage" aria-label="Interactive 3D study assistant">
          <SplineScene scene={robotSceneUrl} className="about-robot-section__scene" />
        </div>
      </section>

      <section className="about-statement">
        <p>Our mission</p>
        <PremiumText as="h2" variant="diagnostic">
          To help ambitious students in Uzbekistan understand exactly why they lose SAT points and what to do next.
        </PremiumText>
      </section>

      <section className="about-proof-grid" aria-label="Why SATTEST.UZ is trustworthy">
        {proofCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="about-proof-card" key={card.title}>
              <div>
                <Icon size={28} />
              </div>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          );
        })}
      </section>

      <section className="about-split">
        <div>
          <p className="about-kicker">Not a shortcut. A system.</p>
          <PremiumText as="h2" variant="proof">Trust is created by showing the work.</PremiumText>
          <p>
            Students do not need vague promises. They need a clear exam attempt, an honest report, a visible curriculum, and practice that is connected to their own mistakes.
          </p>
        </div>
        <div className="about-check-list">
          {credibility.map((item) => (
            <div key={item}>
              <CheckCircle2 size={20} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="about-process">
        <div className="about-section-head">
          <p>How it works</p>
          <PremiumText as="h2" variant="route">One diagnostic. One report. One personal route.</PremiumText>
        </div>
        <div className="about-process__grid">
          {processSteps.map((step) => (
            <article key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-values">
        <div>
          <Sparkles size={28} />
          <p>What we stand for</p>
        </div>
        <div className="about-values__grid">
          {values.map((value) => (
            <span key={value}>{value}</span>
          ))}
        </div>
      </section>

      <section className="about-final">
        <ShieldCheck size={34} />
        <p>Built for serious preparation</p>
        <PremiumText as="h2" variant="contact">
          SATTEST.UZ exists to make SAT preparation measurable, transparent, and worthy of student trust.
        </PremiumText>
        <PremiumButton href="/register" icon={<ArrowRight size={18} />}>
          Create Account
        </PremiumButton>
      </section>
    </main>
  );
}
