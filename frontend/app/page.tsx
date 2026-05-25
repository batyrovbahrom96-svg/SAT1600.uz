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

const advantages = [
  {
    label: "01",
    title: "Bluebook-level practice",
    body: "Timed modules, review marks, grid-ins, locked sections, and a calm testing flow that feels familiar before exam day.",
    Icon: ShieldCheck
  },
  {
    label: "02",
    title: "Adaptive score engine",
    body: "Module 1 performance routes the next math module, so students practice under the same pressure pattern as the real SAT.",
    Icon: Gauge
  },
  {
    label: "03",
    title: "Post-test analytics",
    body: "A clear report shows score range, accuracy, missed questions, trap patterns, and the next study priorities.",
    Icon: BarChart3
  },
  {
    label: "04",
    title: "Growth dashboard",
    body: "Students can see where points are being lost and what to fix next, turning every full mock test into a plan.",
    Icon: LineChart
  }
];

const steps = ["Institutional", "Commercial", "Mortgage"];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0b0b0b] text-white">
      <section id="top" className="relative min-h-screen overflow-hidden">
        <RibbedMotionGraphic />
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_22%_26%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(90deg,rgba(11,11,11,0.98)_0%,rgba(11,11,11,0.9)_43%,rgba(11,11,11,0.66)_100%)]" />

        <header className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between px-6 py-8 md:px-12 lg:px-20">
          <Link href="/" className="text-2xl font-black tracking-tight">
            SAT1600.uz
          </Link>
          <nav className="hidden items-center gap-9 text-xs font-black uppercase tracking-[0.24em] text-white/55 md:flex">
            <Link className="transition-all duration-200 hover:text-white" href="#advantages">Advantages</Link>
            <Link className="transition-all duration-200 hover:text-white" href="/login">Login</Link>
            <Link className="transition-all duration-200 hover:text-white" href="/register">Start</Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-104px)] max-w-[1440px] flex-col justify-center px-6 pb-36 pt-8 md:px-12 lg:px-20">
          <div className="max-w-3xl">
            <p className="mb-10 text-xs font-black uppercase tracking-[0.34em] text-white/55">
              Digital SAT platform for Uzbekistan
            </p>
            <h1 className="text-[54px] font-black leading-[0.9] tracking-normal md:text-[88px] lg:text-[116px]">
              Practice moves with your score.
            </h1>
            <p className="mt-10 max-w-2xl text-xl font-semibold leading-9 text-white/54 md:text-2xl">
              Full mock tests, adaptive modules, math grid-ins, and score reports inside one premium SAT training experience.
            </p>
            <div className="mt-12 flex flex-wrap gap-4">
              <Link
                className="inline-flex items-center gap-3 bg-white px-7 py-4 text-sm font-black uppercase tracking-[0.16em] text-black transition-all duration-200 hover:bg-transparent hover:text-white hover:outline hover:outline-1 hover:outline-white"
                href="/register"
              >
                Start mock test <ArrowRight size={18} />
              </Link>
              <Link
                className="inline-flex items-center gap-3 border border-white/20 px-7 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition-all duration-200 hover:border-white"
                href="#advantages"
              >
                Learn more
              </Link>
            </div>
          </div>

          <div className="absolute bottom-9 left-6 right-6 z-10 flex items-end justify-between gap-6 md:left-12 md:right-12 lg:left-20 lg:right-20">
            <div className="hidden items-center gap-10 text-[11px] font-black uppercase tracking-[0.45em] text-white/34 md:flex">
              {steps.map((step, index) => (
                <span className={index === 1 ? "text-white" : ""} key={step}>{step}</span>
              ))}
            </div>
            <div className="flex gap-5">
              <Link className="motion-circle" href="#top" aria-label="Back to top">
                <ChevronUp size={20} />
              </Link>
              <Link className="motion-circle" href="#advantages" aria-label="Scroll to advantages">
                <ChevronDown size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="advantages" className="relative overflow-hidden border-t border-white/10 bg-[#111111]">
        <div className="absolute inset-y-0 right-[-22vw] hidden w-[64vw] opacity-60 lg:block">
          <RibbedMotionGraphic compact />
        </div>
        <div className="relative mx-auto grid max-w-[1440px] gap-12 px-6 py-24 md:px-12 lg:grid-cols-[0.86fr_1.14fr] lg:px-20 lg:py-32">
          <div className="lg:sticky lg:top-20 lg:self-start">
            <p className="text-xs font-black uppercase tracking-[0.34em] text-white/45">Why it wins</p>
            <h2 className="mt-6 max-w-xl text-5xl font-black leading-[0.95] tracking-normal md:text-7xl">
              More than a test. A score machine.
            </h2>
            <p className="mt-8 max-w-lg text-lg font-semibold leading-8 text-white/50">
              The homepage now moves like a premium product. As visitors scroll down, the design reveals the real value: better practice, smarter feedback, and clearer progress.
            </p>
            <div className="mt-10 grid max-w-sm grid-cols-3 border border-white/10">
              <Metric value="98" label="Questions" />
              <Metric value="4" label="Modules" />
              <Metric value="1600" label="Scale" />
            </div>
          </div>

          <div className="grid gap-5">
            {advantages.map((item) => (
              <article className="advantage-card group border border-white/10 bg-[#181818]/86 p-7 backdrop-blur transition-all duration-300 hover:border-white/45 hover:bg-[#202020]" key={item.title}>
                <div className="mb-8 flex items-start justify-between gap-6">
                  <span className="text-xs font-black uppercase tracking-[0.28em] text-white/36">{item.label}</span>
                  <item.Icon className="text-white/70 transition-all duration-300 group-hover:text-white" size={28} />
                </div>
                <h3 className="text-3xl font-black">{item.title}</h3>
                <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-white/50">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#f3f1eb] text-[#141414]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-20 md:px-12 lg:grid-cols-[1fr_1fr] lg:px-20">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#686058]">Ready for students</p>
            <h2 className="mt-5 text-4xl font-black leading-tight md:text-6xl">Turn traffic into paid mock tests.</h2>
          </div>
          <div className="grid gap-4">
            <ActionRow Icon={Target} title="Find weak points" body="Show students the exact areas costing them points." />
            <ActionRow Icon={Trophy} title="Sell improvement" body="A strong report page makes the platform feel valuable after every test." />
            <ActionRow Icon={ArrowRight} title="Start fast" body="The first action stays clear: register, take a mock test, see your score." />
          </div>
        </div>
      </section>
    </main>
  );
}

function RibbedMotionGraphic({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "rotor-stage rotor-stage-compact" : "rotor-stage"} aria-hidden="true">
      {Array.from({ length: 28 }).map((_, index) => (
        <span
          className="rotor-rib"
          key={index}
          style={{
            height: `${56 + index * 3.2}%`,
            width: `${34 + index * 2.45}%`,
            transform: `translate(-50%, -50%) rotate(${index * 5.2}deg) skewY(-12deg)`
          }}
        />
      ))}
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-r border-white/10 p-4 last:border-r-0">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{label}</div>
    </div>
  );
}

function ActionRow({
  Icon,
  title,
  body
}: {
  Icon: typeof Target;
  title: string;
  body: string;
}) {
  return (
    <article className="grid grid-cols-[48px_1fr] gap-5 border border-[#d8d1c4] p-5">
      <div className="flex h-12 w-12 items-center justify-center bg-[#141414] text-white">
        <Icon size={21} />
      </div>
      <div>
        <h3 className="text-xl font-black">{title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#625d55]">{body}</p>
      </div>
    </article>
  );
}
