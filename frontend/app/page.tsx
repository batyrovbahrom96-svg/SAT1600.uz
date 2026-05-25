"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Menu } from "lucide-react";

const slides = [
  {
    id: "practice",
    nav: "Practice",
    eyebrow: "Digital SAT platform for Uzbekistan",
    title: ["Practice", "Mode"],
    body: "Full mock tests, adaptive modules, grid-ins, and Bluebook-style timing inside one premium SAT training experience.",
    cta: "Start mock test",
    href: "/register",
    vertical: ["S", "A", "T", "1", "6", "0", "0"],
    stat: "01"
  },
  {
    id: "analytics",
    nav: "Analytics",
    eyebrow: "Score intelligence",
    title: ["Score", "Analytics"],
    body: "Every test becomes a report: accuracy, missed questions, trap patterns, topic weakness, and the next task to fix.",
    cta: "See advantages",
    href: "/register",
    vertical: ["A", "N", "A", "L", "Y", "T", "I", "C", "S"],
    stat: "02"
  },
  {
    id: "growth",
    nav: "Growth",
    eyebrow: "Built to sell improvement",
    title: ["Growth", "Engine"],
    body: "Premium motion, clear progress, and result pages that make students feel the product is worth paying for.",
    cta: "Create account",
    href: "/register",
    vertical: ["P", "R", "O", "G", "R", "E", "S", "S"],
    stat: "03"
  }
];

const transitionMs = 1250;

export default function Home() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const activeRef = useRef(active);
  const lockRef = useRef(false);
  const touchStartRef = useRef({ y: 0, time: 0 });

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const goTo = useCallback((targetIndex: number) => {
    const total = slides.length;
    const normalized = (targetIndex + total) % total;

    if (normalized === activeRef.current || lockRef.current) {
      return;
    }

    lockRef.current = true;
    const current = activeRef.current;
    const nextDirection =
      normalized > current || (current === total - 1 && normalized === 0) ? 1 : -1;

    setDirection(nextDirection);
    setActive(normalized);

    window.setTimeout(() => {
      lockRef.current = false;
    }, transitionMs);
  }, []);

  const goNext = useCallback(() => goTo(activeRef.current + 1), [goTo]);
  const goPrev = useCallback(() => goTo(activeRef.current - 1), [goTo]);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (Math.abs(event.deltaY) < 8) {
        return;
      }
      event.deltaY > 0 ? goNext() : goPrev();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        goNext();
      }
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        goPrev();
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      touchStartRef.current = { y: touch.pageY, time: event.timeStamp };
    };

    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      const distance = touch.pageY - touchStartRef.current.y;
      const elapsed = Math.max(event.timeStamp - touchStartRef.current.time, 1);
      const velocity = distance / elapsed;

      if (Math.abs(distance) > 54 || Math.abs(velocity) > 0.35) {
        distance < 0 ? goNext() : goPrev();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [goNext, goPrev]);

  return (
    <main className="nex-home" data-direction={direction}>
      <header className="nex-header">
        <Link href="/" className="nex-logo" aria-label="SAT1600 home">
          <span className="nex-logo-mark">
            <span />
            <span />
          </span>
          <span>SAT1600</span>
        </Link>
        <nav className="nex-top-links" aria-label="Primary navigation">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/login">Login</Link>
          <Link href="/register">Start</Link>
        </nav>
        <button className="nex-menu" aria-label="Navigation">
          <Menu size={28} strokeWidth={1.5} />
        </button>
      </header>

      <div className="nex-backgrounds" aria-hidden="true">
        {slides.map((slide, index) => (
          <RibbedFigure active={active === index} key={slide.id} variant={index} />
        ))}
      </div>

      <div className="nex-screen-stack">
        {slides.map((slide, index) => (
          <section
            className={`nex-screen ${active === index ? "is-current" : ""}`}
            aria-hidden={active !== index}
            key={slide.id}
          >
            <div className="nex-copy">
              <p className="nex-kicker">{slide.eyebrow}</p>
              <h1 className="nex-title">
                {slide.title.map((word) => (
                  <span className="nex-title-line" key={word}>
                    <span>{word}</span>
                  </span>
                ))}
              </h1>
              <p className="nex-description">{slide.body}</p>
              <Link className="nex-cta" href={slide.href}>
                <span>{slide.cta}</span>
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="nex-index" aria-label={`Slide ${slide.stat} of 03`}>
              <span>{slide.stat}</span>
              <span>/</span>
              <span>03</span>
            </div>

            <div className="nex-vertical-text" aria-hidden="true">
              <div className="nex-vertical-track">
                {[...slide.vertical, ...slide.vertical].map((letter, letterIndex) => (
                  <span className={letter === "1" ? "is-solid" : ""} key={`${letter}-${letterIndex}`}>
                    {letter}
                  </span>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="nex-home-login">
        <span />
        <Link href="/login">Student Login</Link>
      </div>

      <nav className="nex-slide-nav" aria-label="Homepage slides">
        <div className="nex-circ-buttons">
          <button className="nex-circ-button" onClick={goPrev} aria-label="Previous slide" type="button">
            <ChevronUp size={18} />
          </button>
          <button className="nex-circ-button" onClick={goNext} aria-label="Next slide" type="button">
            <ChevronDown size={18} />
          </button>
        </div>

        <div className="nex-slide-tabs">
          {slides.map((slide, index) => (
            <button
              className={active === index ? "is-current" : ""}
              key={slide.id}
              onClick={() => goTo(index)}
              type="button"
            >
              <span>{slide.nav}</span>
              <span>{slide.nav}</span>
            </button>
          ))}
        </div>

        <div className="nex-footer-note">Digital SAT practice engine</div>
      </nav>
    </main>
  );
}

function RibbedFigure({ active, variant }: { active: boolean; variant: number }) {
  return (
    <div className={`nex-figure nex-figure-${variant} ${active ? "is-current" : ""}`}>
      <div className="nex-figure-core" />
      {Array.from({ length: 28 }).map((_, index) => (
        <span
          className="nex-figure-rib"
          key={index}
          style={
            {
              "--rib-width": `${28 + index * 2.85}vw`,
              "--rib-height": `${34 + index * 2.4}vh`,
              "--rib-rotate": `${index * 7.8 + variant * 18}deg`,
              "--rib-delay": `${index * -0.055}s`
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
