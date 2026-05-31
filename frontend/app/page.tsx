"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Play, Volume2, VolumeX, X } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { studentResults, type StudentResult } from "@/lib/student-results";

const slides = [
  {
    id: "practice",
    nav: "Practice",
    eyebrow: "Diagnostic first. Clear plan next.",
    title: ["Your SAT", "Growth Plan"],
    body: "Take one mock test and get a personal route for steady score growth.",
    cta: "Start diagnostic test",
    href: "/register",
    vertical: ["S", "A", "T", "1", "6", "0", "0"],
    stat: "01"
  },
  {
    id: "analytics",
    nav: "Analytics",
    eyebrow: "Know every lost point",
    title: ["Weakness", "Analytics"],
    body: "See weak skills, trap patterns, timing pressure, and the next task to fix.",
    cta: "View diagnostic preview",
    href: "/register",
    vertical: ["A", "N", "A", "L", "Y", "T", "I", "C", "S"],
    stat: "02"
  },
  {
    id: "growth",
    nav: "Growth",
    eyebrow: "Built for steady score growth",
    title: ["30-Day", "Improvement"],
    body: "Daily Reading, Writing, and Math work built from diagnostic mistakes.",
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
const skipHomeIntroKey = "sattest_skip_home_intro";
const skipHomeIntroEvent = "sattest:skip-home-intro";
const partnerLogos = [
  { logo: "/assets/partners/khan-academy.svg", name: "Khan Academy" },
  { logo: "/assets/partners/college-board.svg", name: "College Board" },
  { logo: "/assets/partners/sat.svg", name: "SAT Exam" },
  { logo: "/assets/partners/british-council.svg", name: "British Council" },
  { logo: "/assets/partners/idp.svg", name: "IELTS IDP" },
  { logo: "/assets/partners/mr-doniyor.svg", name: "Mr. Doniyor School" },
  { logo: "/assets/partners/result.svg", name: "Result Learning Center" },
  { logo: "/assets/partners/thompson.svg", name: "Thompson Learning Center" },
  { logo: "/assets/partners/azamath.svg", name: "AzaMath" }
];

function shouldSkipHomeIntro() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const shouldSkipFromUrl = params.get("skipIntro") === "1";
  let shouldSkipFromStorage = false;

  try {
    shouldSkipFromStorage = window.sessionStorage.getItem(skipHomeIntroKey) === "1";
  } catch {
    shouldSkipFromStorage = false;
  }

  const shouldSkip = shouldSkipFromUrl || shouldSkipFromStorage;
  if (shouldSkip) {
    try {
      window.sessionStorage.removeItem(skipHomeIntroKey);
    } catch {
      // Ignore storage access issues; URL-based skip still works.
    }
  }
  if (shouldSkipFromUrl) {
    window.history.replaceState(null, "", "/");
  }
  return shouldSkip;
}

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
  const [isLoading, setIsLoading] = useState(() => !shouldSkipHomeIntro());
  const [showResultsWall, setShowResultsWall] = useState(false);
  const [activeResultVideo, setActiveResultVideo] = useState<StudentResult | null>(null);
  const [isPlatformVideoMuted, setIsPlatformVideoMuted] = useState(true);
  const activeRef = useRef(active);
  const lockRef = useRef(false);
  const touchStartRef = useRef({ y: 0, time: 0 });
  const introVideoRef = useRef<HTMLVideoElement | null>(null);
  const platformVideoRef = useRef<HTMLVideoElement | null>(null);
  const resultsCardsRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const skipIntroNow = useCallback(() => {
    window.history.replaceState(null, "", "/");
    setIsLoaderExiting(false);
    setIsLoading(false);
    setLoadingStage("numbers");
    setLoadingFrame({
      previous: loadingSequence[0],
      current: loadingSequence[0],
      step: 0
    });
  }, []);

  useEffect(() => {
    if (shouldSkipHomeIntro()) {
      skipIntroNow();
    }
  }, [skipIntroNow]);

  useEffect(() => {
    window.addEventListener(skipHomeIntroEvent, skipIntroNow);

    return () => {
      window.removeEventListener(skipHomeIntroEvent, skipIntroNow);
    };
  }, [skipIntroNow]);

  const finishLoading = useCallback(() => {
    setIsLoaderExiting(true);

    window.setTimeout(() => {
      setIsLoading(false);
    }, 1250);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      return undefined;
    }

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
  }, [isLoading]);

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
    const previousOverflowX = document.body.style.overflowX;
    document.body.style.overflowX = "hidden";

    return () => {
      document.body.style.overflowX = previousOverflowX;
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
  const togglePlatformVideoSound = useCallback(() => {
    const nextMuted = !isPlatformVideoMuted;
    const video = platformVideoRef.current;
    if (video) {
      video.muted = nextMuted;
      video.volume = nextMuted ? 0 : 1;
      video.play().catch(() => undefined);
    }
    setIsPlatformVideoMuted(nextMuted);
  }, [isPlatformVideoMuted]);

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
      if (Math.abs(event.deltaY) < 8) {
        return;
      }
      const canScrollToPlatformAd = activeRef.current === slides.length - 1 && event.deltaY > 0;
      const isPastHero = window.scrollY > 24;
      if (canScrollToPlatformAd || isPastHero) {
        return;
      }
      event.preventDefault();
      event.deltaY > 0 ? goNext() : goPrev();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        if (activeRef.current === slides.length - 1) {
          return;
        }
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
        if (activeRef.current === slides.length - 1 && distance < 0) {
          return;
        }
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

      <section className="partner-marquee" aria-label="SAT learning and exam partners">
        <p className="partner-marquee__label">Trusted Our Partners</p>
        <div className="partner-marquee__track" aria-hidden="true">
          {[...partnerLogos, ...partnerLogos, ...partnerLogos, ...partnerLogos].map((partner, index) => (
            <span className="partner-marquee__item" key={`${partner.name}-${index}`}>
              <img className="partner-marquee__logo" src={partner.logo} alt={partner.name} />
            </span>
          ))}
        </div>
      </section>

      <div className="nex-hero-stage">
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
                <Link className="nex-cta" href={slide.href}>
                  <span>{slide.cta}</span>
                  <ArrowRight size={18} />
                </Link>
                <p className="nex-description">{slide.body}</p>
              </div>

              <div className="nex-index" aria-label={`Slide ${slide.stat} of 03`}>
                <span>{slide.stat}</span>
                <span>/</span>
                <span>03</span>
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
      </div>

      <section className="platform-ad-section" aria-labelledby="platform-ad-title">
        <video
          className="platform-ad-section__backgroundVideo"
          src="/assets/video/platform-rolling-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className="platform-ad-section__copy">
          <p className="platform-ad-section__eyebrow">Why SATTEST.UZ works</p>
          <h2 id="platform-ad-title">A diagnostic SAT platform that turns mistakes into a plan.</h2>
          <p className="platform-ad-section__body">
            Students do not just finish a mock test. They receive score reports, weakness maps,
            mistake analysis, and targeted practice routes built around Reading, Writing, and Math.
          </p>
          <div className="platform-ad-section__advantages">
            <div>
              <strong>Bluebook-style mock tests</strong>
              <span>Timed modules, review flow, and realistic SAT pressure.</span>
            </div>
            <div>
              <strong>Personal weakness tracking</strong>
              <span>Every missed pattern becomes a focused practice target.</span>
            </div>
            <div>
              <strong>1400+ curriculum direction</strong>
              <span>Students know exactly what to study after the diagnostic.</span>
            </div>
          </div>
          <Link className="platform-ad-section__cta" href="/mock-test">
            <span>Start diagnostic mock test</span>
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="platform-ad-section__videoWrap">
          <video
            className="platform-ad-section__video"
            ref={platformVideoRef}
            src="/assets/video/sattest-platform-ad.mp4"
            autoPlay
            muted={isPlatformVideoMuted}
            loop
            playsInline
            preload="auto"
          />
          <button
            className="platform-ad-section__sound"
            onClick={togglePlatformVideoSound}
            type="button"
            aria-label={isPlatformVideoMuted ? "Turn platform video sound on" : "Turn platform video sound off"}
          >
            {isPlatformVideoMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            <span>{isPlatformVideoMuted ? "Sound on" : "Sound off"}</span>
          </button>
          <div className="platform-ad-section__videoGlow" aria-hidden="true" />
        </div>
      </section>

      <section className="diagnostic-preview-section" aria-labelledby="diagnostic-preview-title">
        <div className="diagnostic-preview-section__intro">
          <p className="diagnostic-preview-section__eyebrow">Diagnostic preview</p>
          <h2 id="diagnostic-preview-title">Before a student practices, SATTEST.UZ shows exactly what is holding the score down.</h2>
          <p>
            The mock test becomes a personal report: section scores, weak question types, repeated
            mistake patterns, timing pressure, and the first study tasks needed to start improving.
          </p>
        </div>

        <div className="diagnostic-preview-section__report" aria-label="Example diagnostic report preview">
          <div className="diagnostic-preview-section__scoreBand">
            <div>
              <span>Overall</span>
              <strong>1050</strong>
            </div>
            <div>
              <span>Reading and Writing</span>
              <strong>520</strong>
            </div>
            <div>
              <span>Math</span>
              <strong>530</strong>
            </div>
          </div>

          <div className="diagnostic-preview-section__columns">
            <div className="diagnostic-preview-section__block">
              <span className="diagnostic-preview-section__label">Weak areas</span>
              <div className="diagnostic-preview-section__skill">
                <span>Inference</span>
                <strong>42%</strong>
              </div>
              <div className="diagnostic-preview-section__bar">
                <span style={{ width: "42%" }} />
              </div>
              <div className="diagnostic-preview-section__skill">
                <span>Algebra</span>
                <strong>50%</strong>
              </div>
              <div className="diagnostic-preview-section__bar">
                <span style={{ width: "50%" }} />
              </div>
              <div className="diagnostic-preview-section__skill">
                <span>Grammar precision</span>
                <strong>58%</strong>
              </div>
              <div className="diagnostic-preview-section__bar">
                <span style={{ width: "58%" }} />
              </div>
            </div>

            <div className="diagnostic-preview-section__block">
              <span className="diagnostic-preview-section__label">Mistake patterns</span>
              <div className="diagnostic-preview-section__tag">Causal gap trap</div>
              <div className="diagnostic-preview-section__tag">Comma boundary error</div>
              <div className="diagnostic-preview-section__tag">Linear equation setup</div>
              <p className="diagnostic-preview-section__explain">
                The report does not only mark answers wrong. It explains why the wrong choice looked
                tempting and what rule the student must use next time.
              </p>
            </div>
          </div>

          <div className="diagnostic-preview-section__plan">
            <span className="diagnostic-preview-section__label">First 7 days generated from this report</span>
            <div>
              <strong>Day 1</strong>
              <span>Inference drills + explanation review</span>
            </div>
            <div>
              <strong>Day 2</strong>
              <span>Algebra equation setup and timed practice</span>
            </div>
            <div>
              <strong>Day 3</strong>
              <span>Grammar punctuation targets and mixed review</span>
            </div>
          </div>
        </div>
      </section>

      <section className="study-growth-section" aria-labelledby="study-growth-title">
        <div className="study-growth-section__copy">
          <p className="study-growth-section__eyebrow">Personal study plan</p>
          <h2 id="study-growth-title">A 30-day route built from the exact mistakes in the diagnostic test.</h2>
          <p className="study-growth-section__body">
            SATTEST.UZ does not give random practice. After the mock test, every wrong answer becomes
            a weakness target, every weakness becomes a daily task, and every task is connected to
            Reading, Writing, or Math drills that move the score upward.
          </p>
          <div className="study-growth-section__promise">
            <span>30-day minimum target</span>
            <strong>+100 SAT points</strong>
            <p>Built for steady improvement when the student completes the assigned daily work.</p>
          </div>
        </div>

        <div className="study-growth-section__panel" aria-label="SAT score growth plan">
          <div className="study-growth-section__panelHeader">
            <span>Projected growth</span>
            <strong>Diagnostic to 30 days</strong>
          </div>

          <div className="study-growth-chart" aria-hidden="true">
            <div className="study-growth-chart__grid" />
            <svg className="study-growth-chart__svg" viewBox="0 0 680 320" role="img">
              <defs>
                <linearGradient id="growthLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#9aa0a6" />
                  <stop offset="48%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#8ff1c6" />
                </linearGradient>
                <linearGradient id="growthFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#8ff1c6" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#8ff1c6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                className="study-growth-chart__area"
                d="M36 248 C124 232 160 214 214 198 C282 176 314 158 376 136 C462 104 520 84 644 54 L644 286 L36 286 Z"
              />
              <path
                className="study-growth-chart__line"
                d="M36 248 C124 232 160 214 214 198 C282 176 314 158 376 136 C462 104 520 84 644 54"
              />
              {[
                [36, 248],
                [214, 198],
                [376, 136],
                [644, 54]
              ].map(([cx, cy]) => (
                <circle className="study-growth-chart__dot" cx={cx} cy={cy} key={`${cx}-${cy}`} r="7" />
              ))}
            </svg>
            <div className="study-growth-chart__labels">
              <span>Diagnostic</span>
              <span>Day 7</span>
              <span>Day 14</span>
              <span>Day 30</span>
            </div>
          </div>

          <div className="study-growth-section__scores">
            <div>
              <span>Start</span>
              <strong>1050</strong>
            </div>
            <div>
              <span>Week 1</span>
              <strong>1080</strong>
            </div>
            <div>
              <span>Week 2</span>
              <strong>1120</strong>
            </div>
            <div className="is-target">
              <span>Day 30</span>
              <strong>1150+</strong>
            </div>
          </div>
        </div>

        <div className="study-growth-section__steps">
          <div>
            <span>01</span>
            <strong>Diagnose</strong>
            <p>Find the exact question types, traps, timing issues, and weak topics holding the student back.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Assign</strong>
            <p>Convert mistakes into daily Reading, Writing, and Math work with a clear hour-by-hour plan.</p>
          </div>
          <div>
            <span>03</span>
            <strong>Improve</strong>
            <p>Repeat targeted drills, review explanations, and confirm progress with section tests.</p>
          </div>
        </div>
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
    </main>
  );
}
