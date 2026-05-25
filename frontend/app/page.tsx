import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Gauge,
  LineChart,
  ShieldCheck,
  Target,
  Trophy
} from "lucide-react";

const slides = [
  {
    id: "practice",
    eyebrow: "Digital SAT platform for Uzbekistan",
    title: "Practice moves with your score.",
    body: "Full mock tests, adaptive modules, math grid-ins, and Bluebook-style timing inside one premium SAT training experience.",
    cta: "Start mock test",
    href: "/register",
    active: "Practice",
    prev: "growth",
    next: "analytics",
    tone: "hero"
  },
  {
    id: "analytics",
    eyebrow: "Score intelligence",
    title: "Every test becomes a report.",
    body: "Students see accuracy, missed questions, trap patterns, topic weakness, and what to fix before the next mock test.",
    cta: "See advantages",
    href: "#growth",
    active: "Analytics",
    prev: "practice",
    next: "growth",
    tone: "middle"
  },
  {
    id: "growth",
    eyebrow: "Built to sell improvement",
    title: "Turn visitors into paid students.",
    body: "A premium first impression, strong result pages, and clear progress feedback make the product feel worth paying for.",
    cta: "Create account",
    href: "/register",
    active: "Growth",
    prev: "analytics",
    next: "practice",
    tone: "final"
  }
];

const advantages = [
  { title: "Bluebook-level practice", body: "Timed sections, review marks, grid-ins, locked modules.", Icon: ShieldCheck },
  { title: "Adaptive score engine", body: "Module routing follows real SAT pressure patterns.", Icon: Gauge },
  { title: "Post-test analytics", body: "Mistakes, traps, explanations, and next steps.", Icon: BarChart3 },
  { title: "Growth dashboard", body: "Progress signals that keep students returning.", Icon: LineChart }
];

const navItems = ["Practice", "Analytics", "Growth"];

export default function Home() {
  return (
    <main className="sat-home-motion h-screen overflow-y-auto overflow-x-hidden bg-[#0b0b0b] text-white">
      <header className="fixed left-0 right-0 top-0 z-40 mx-auto flex max-w-[1440px] items-center justify-between px-6 py-8 md:px-12 lg:px-20">
        <Link href="#practice" className="text-2xl font-black tracking-tight">
          SAT1600.uz
        </Link>
        <nav className="hidden items-center gap-9 text-xs font-black uppercase tracking-[0.24em] text-white/55 md:flex">
          <Link className="transition-all duration-200 hover:text-white" href="#analytics">Advantages</Link>
          <Link className="transition-all duration-200 hover:text-white" href="/login">Login</Link>
          <Link className="transition-all duration-200 hover:text-white" href="/register">Start</Link>
        </nav>
      </header>

      {slides.map((slide, index) => (
        <section className={`motion-slide motion-slide-${slide.tone}`} id={slide.id} key={slide.id}>
          <RibbedMotionGraphic variant={index} />
          <div className="motion-vignette" />

          <div className="relative z-10 mx-auto flex min-h-screen max-w-[1440px] flex-col justify-center px-6 pb-36 pt-28 md:px-12 lg:px-20">
            <div className="max-w-4xl">
              <p className="mb-10 text-xs font-black uppercase tracking-[0.34em] text-white/55">
                {slide.eyebrow}
              </p>
              <h1 className="max-w-5xl text-[58px] font-black leading-[0.88] tracking-normal md:text-[92px] lg:text-[118px]">
                {slide.title}
              </h1>
              <p className="mt-10 max-w-2xl text-xl font-semibold leading-9 text-white/56 md:text-2xl">
                {slide.body}
              </p>
              <div className="mt-12 flex flex-wrap gap-4">
                <Link
                  className="inline-flex items-center gap-3 bg-white px-7 py-4 text-sm font-black uppercase tracking-[0.16em] text-black transition-all duration-200 hover:bg-transparent hover:text-white hover:outline hover:outline-1 hover:outline-white"
                  href={slide.href}
                >
                  {slide.cta} <ArrowRight size={18} />
                </Link>
                <Link
                  className="inline-flex items-center gap-3 border border-white/20 px-7 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition-all duration-200 hover:border-white"
                  href={`#${slide.next}`}
                >
                  Move down
                </Link>
              </div>
            </div>

            {slide.id !== "practice" && (
              <div className="mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
                {advantages.slice(index - 1, index + 1).map((item) => (
                  <article className="motion-benefit-card group border border-white/10 bg-white/[0.055] p-6 backdrop-blur-md transition-all duration-300 hover:border-white/45 hover:bg-white/[0.09]" key={item.title}>
                    <item.Icon className="mb-8 text-white/70 transition-all duration-300 group-hover:text-white" size={30} />
                    <h2 className="text-2xl font-black">{item.title}</h2>
                    <p className="mt-4 text-sm font-semibold leading-7 text-white/52">{item.body}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <SlideControls active={slide.active} previous={slide.prev} next={slide.next} />
        </section>
      ))}
    </main>
  );
}

function SlideControls({
  active,
  previous,
  next
}: {
  active: string;
  previous: string;
  next: string;
}) {
  return (
    <div className="pointer-events-none absolute bottom-8 left-6 right-6 z-30 mx-auto flex max-w-[1440px] items-end justify-between gap-6 md:left-12 md:right-12 lg:left-20 lg:right-20">
      <div className="hidden items-center gap-10 text-[11px] font-black uppercase tracking-[0.45em] text-white/34 md:flex">
        {navItems.map((item) => (
          <Link className={`pointer-events-auto transition-all duration-200 hover:text-white ${item === active ? "text-white" : ""}`} href={`#${item.toLowerCase()}`} key={item}>
            {item}
          </Link>
        ))}
      </div>
      <div className="pointer-events-auto flex gap-5">
        <Link className="motion-circle" href={`#${previous}`} aria-label="Move up">
          <ChevronUp size={20} />
        </Link>
        <Link className="motion-circle" href={`#${next}`} aria-label="Move down">
          <ChevronDown size={20} />
        </Link>
      </div>
    </div>
  );
}

function RibbedMotionGraphic({ variant }: { variant: number }) {
  return (
    <div className={`revolving-figure revolving-figure-${variant}`} aria-hidden="true">
      <div className="revolving-core" />
      {Array.from({ length: 42 }).map((_, index) => (
        <span
          className="revolving-rib"
          key={index}
          style={{
            height: `${42 + index * 2.45}%`,
            width: `${25 + index * 1.82}%`,
            transform: `translate(-50%, -50%) rotate(${index * 4.8}deg) skewY(-15deg)`
          }}
        />
      ))}
    </div>
  );
}
