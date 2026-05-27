"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Play, X } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { studentResults, type StudentResult } from "@/lib/student-results";

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
const videoSources = ["1-2", "1-3", "2-3", "3-1", "3-2"] as const;
const transitionVideoByRoute: Record<string, (typeof videoSources)[number]> = {
  "0-1": "1-2",
  "0-2": "1-3",
  "1-0": "1-2",
  "1-2": "2-3",
  "2-0": "3-1",
  "2-1": "3-2"
};

const loadingSequence = [20, 50, 70, 100];
function getLoaderDigits(value: number) {
  return value
    .toString()
    .padStart(3, " ")
    .split("")
    .map((digit) => (digit === " " ? "\u00a0" : digit));
}

export default function Home() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [currentVideo, setCurrentVideo] = useState<(typeof videoSources)[number]>("1-2");
  const [loadingFrame, setLoadingFrame] = useState({
    previous: loadingSequence[0],
    current: loadingSequence[0],
    step: 0
  });
  const [loadingStage, setLoadingStage] = useState<"numbers" | "brand" | "intro">("numbers");
  const [isLoaderExiting, setIsLoaderExiting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showResultsWall, setShowResultsWall] = useState(false);
  const [activeResultVideo, setActiveResultVideo] = useState<StudentResult | null>(null);
  const activeRef = useRef(active);
  const lockRef = useRef(false);
  const touchStartRef = useRef({ y: 0, time: 0 });
  const introVideoRef = useRef<HTMLVideoElement | null>(null);
  const resultsCardsRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const finishLoading = useCallback(() => {
    setIsLoaderExiting(true);

    window.setTimeout(() => {
      setIsLoading(false);
    }, 1250);
  }, []);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => {
        setLoadingFrame((frame) => ({ previous: frame.current, current: loadingSequence[1], step: frame.step + 1 }));
      }, 1800),
      window.setTimeout(() => {
        setLoadingFrame((frame) => ({ previous: frame.current, current: loadingSequence[2], step: frame.step + 1 }));
      }, 3600),
      window.setTimeout(() => {
        setLoadingFrame((frame) => ({ previous: frame.current, current: loadingSequence[3], step: frame.step + 1 }));
      }, 5400),
      window.setTimeout(() => setLoadingStage("brand"), 7600),
      window.setTimeout(() => setLoadingStage("intro"), 13200)
    ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (loadingStage !== "intro") {
      return undefined;
    }

    const video = introVideoRef.current;
    video?.play().catch(() => undefined);

    const fallbackTimer = window.setTimeout(() => {
      finishLoading();
    }, 6200);

    return () => window.clearTimeout(fallbackTimer);
  }, [finishLoading, loadingStage]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowResultsWall(true);
    }, 1100);

    return () => window.clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    const activeVideo = videoRefs.current[currentVideo];

    if (activeVideo) {
      activeVideo.muted = true;
      activeVideo.currentTime = 0;
      activeVideo.play().catch(() => undefined);
    }

    const retryId = window.setTimeout(() => {
      const video = videoRefs.current[currentVideo];
      video?.play().catch(() => undefined);
    }, 120);

    return () => window.clearTimeout(retryId);
  }, [active, currentVideo]);

  const goTo = useCallback((targetIndex: number) => {
    const total = slides.length;
    const normalized = (targetIndex + total) % total;

    if (isLoading || normalized === activeRef.current || lockRef.current) {
      return;
    }

    lockRef.current = true;
    const current = activeRef.current;
    const nextDirection =
      normalized > current || (current === total - 1 && normalized === 0) ? 1 : -1;

    setDirection(nextDirection);
    setCurrentVideo(transitionVideoByRoute[`${current}-${normalized}`] ?? "1-2");
    setActive(normalized);

    window.setTimeout(() => {
      lockRef.current = false;
    }, transitionMs);
  }, [isLoading]);

  const goNext = useCallback(() => goTo(activeRef.current + 1), [goTo]);
  const goPrev = useCallback(() => goTo(activeRef.current - 1), [goTo]);
  const scrollResults = useCallback((direction: -1 | 1) => {
    const container = resultsCardsRef.current;
    if (!container) return;
    const firstCard = container.querySelector<HTMLElement>(".results-card");
    const distance = firstCard ? firstCard.offsetWidth + 14 : 240;
    const maxLeft = container.scrollWidth - container.clientWidth;
    const target = container.scrollLeft + direction * distance;
    const nextLeft = Math.min(maxLeft, Math.max(0, target));
    container.scrollTo({ left: nextLeft, behavior: "smooth" });
  }, []);

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
    <main
      className={`nex-home ${isLoading && !isLoaderExiting ? "is-loading" : "is-ready"}`}
      data-direction={direction}
    >
      {isLoading ? (
        <div
          className={`sat-count-loader sat-count-loader--${loadingStage} ${
            isLoaderExiting ? "is-exiting" : ""
          }`}
          role="status"
          aria-live="polite"
          aria-label={loadingStage === "numbers" ? `Loading ${loadingFrame.current}` : "Loading SATTEST.UZ"}
        >
          {loadingStage === "numbers" ? (
            <div className="sat-count-loader__window" aria-hidden="true">
              <div
                className={`sat-count-loader__number sat-count-loader__number--previous ${
                  loadingFrame.step === 0 ? "is-hidden" : ""
                }`}
                key={`previous-${loadingFrame.step}`}
              >
                {getLoaderDigits(loadingFrame.previous).map((digit, index) => (
                  <span className="sat-count-loader__digit" key={`${digit}-${index}`}>
                    {digit}
                  </span>
                ))}
              </div>
              <div
                className={`sat-count-loader__number sat-count-loader__number--current ${
                  loadingFrame.step === 0 ? "is-idle" : ""
                }`}
                key={`current-${loadingFrame.step}`}
              >
                {getLoaderDigits(loadingFrame.current).map((digit, index) => (
                  <span className="sat-count-loader__digit" key={`${digit}-${index}`}>
                    {digit}
                  </span>
                ))}
              </div>
            </div>
          ) : loadingStage === "brand" ? (
            <img
              className="sat-count-loader__brand"
              src="/assets/brand/sattest-intro-logo.png"
              alt="SATTEST.UZ"
            />
          ) : (
            <video
              className="sat-count-loader__intro"
              ref={introVideoRef}
              src="/assets/video/intro.mp4"
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={finishLoading}
            />
          )}
        </div>
      ) : null}
      <LuxuryNavbar />

      <div className="nex-backgrounds" aria-hidden="true">
        {videoSources.map((source) => (
          <video
            className={`nex-background-video ${currentVideo === source ? "is-current" : ""}`}
            key={source}
            ref={(node) => {
              videoRefs.current[source] = node;
            }}
            src={`/assets/video/${source}.mp4`}
            autoPlay={source === currentVideo}
            muted
            loop
            playsInline
            preload="auto"
            onLoadedData={(event) => {
              if (source === currentVideo) {
                event.currentTarget.play().catch(() => undefined);
              }
            }}
          />
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

      <section
        className={`results-wall ${showResultsWall ? "is-visible" : ""}`}
        aria-label="Student SAT results"
      >
        <div className="results-wall__copy">
          <p>Student Results</p>
          <h2>Real score growth from SATTEST.UZ students.</h2>
        </div>

        <div className="results-wall__carousel">
          <div
            className="results-wall__cards"
            onWheel={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
              event.currentTarget.scrollLeft += delta;
            }}
            ref={resultsCardsRef}
          >
            {studentResults.map((result) => (
              <button
                className="results-card"
                key={result.name}
                onClick={() => setActiveResultVideo(result)}
                type="button"
              >
                <video
                  className="results-card__video"
                  src={result.video}
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="metadata"
                />
                <span className="results-card__shade" aria-hidden="true" />
                <span className="results-card__play" aria-hidden="true">
                  <Play size={16} fill="currentColor" />
                </span>
                <span className="results-card__meta">
                  <strong>{result.name}</strong>
                  <span>{result.score}</span>
                  <span>{result.improvement}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="results-wall__controls" aria-label="Student result videos">
            <button aria-label="Previous student video" onClick={() => scrollResults(-1)} type="button">
              <ChevronLeft size={18} />
            </button>
            <button aria-label="Next student video" onClick={() => scrollResults(1)} type="button">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <button
          className="results-wall__close"
          onClick={() => setShowResultsWall(false)}
          type="button"
          aria-label="Close student results"
        >
          <X size={16} />
        </button>
      </section>

      {activeResultVideo ? (
        <div
          className="results-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`${activeResultVideo.name} SAT result video`}
        >
          <button
            className="results-modal__backdrop"
            onClick={() => setActiveResultVideo(null)}
            type="button"
            aria-label="Close video"
          />
          <div className="results-modal__dialog">
            <button
              className="results-modal__close"
              onClick={() => setActiveResultVideo(null)}
              type="button"
              aria-label="Close video"
            >
              <X size={18} />
            </button>
            <video
              className="results-modal__video"
              src={activeResultVideo.video}
              controls
              autoPlay
              playsInline
            />
            <div className="results-modal__caption">
              <strong>{activeResultVideo.name}</strong>
              <span>{activeResultVideo.score}</span>
              <span>{activeResultVideo.improvement}</span>
            </div>
          </div>
        </div>
      ) : null}

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
