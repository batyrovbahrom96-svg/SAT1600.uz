import Link from "next/link";
import { ArrowRight, BarChart3, BrainCircuit, CheckCircle2, Timer } from "lucide-react";

const principles = [
  {
    label: "01",
    title: "Precision",
    body: "Full-length modules that keep the pressure, pacing, and structure close to the real Digital SAT."
  },
  {
    label: "02",
    title: "Execution",
    body: "Bluebook-style testing, locked sections, review marks, auto-submit, and a clean testing workspace."
  },
  {
    label: "03",
    title: "Progress",
    body: "Score reports, topic accuracy, missed-question review, and clear next steps after every test."
  }
];

const metrics = [
  { value: "98", label: "live questions" },
  { value: "4", label: "adaptive modules" },
  { value: "1600", label: "score scale" }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] text-[#d8d8d8]">
      <header className="mx-auto flex max-w-[1440px] items-center justify-between border-b border-white/10 px-6 py-5 md:px-10">
        <Link href="/" className="text-lg font-black tracking-tight text-white">
          SAT1600.uz
        </Link>
        <nav className="hidden items-center gap-8 text-xs font-bold uppercase tracking-[0.22em] text-[#9b9b9b] md:flex">
          <Link className="transition-all duration-200 ease-in-out hover:text-white" href="/login">Login</Link>
          <Link className="transition-all duration-200 ease-in-out hover:text-white" href="/register">Start</Link>
        </nav>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[1440px] lg:grid-cols-[60%_40%]">
        <div className="flex flex-col justify-center px-6 py-16 md:px-10 lg:px-16 xl:px-24">
          <p className="mb-8 text-xs font-black uppercase tracking-[0.36em] text-[#8f8f8f]">
            Digital SAT platform for Uzbekistan
          </p>
          <h1 className="max-w-4xl text-[54px] font-black leading-[0.95] tracking-normal text-white md:text-[86px] lg:text-[102px]">
            Serious SAT practice, built for score growth.
          </h1>
          <p className="mt-8 max-w-2xl text-lg font-semibold leading-8 text-[#a8a8a8] md:text-xl">
            A focused mock-test platform with adaptive modules, Bluebook-style pacing, math grid-ins, and post-test analytics that tell students what to fix next.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-3 border border-white bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-black transition-all duration-200 ease-in-out hover:bg-[#0b0b0b] hover:text-white"
              href="/register"
            >
              Start mock test <ArrowRight size={18} />
            </Link>
            <Link
              className="border border-white/15 bg-transparent px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-white transition-all duration-200 ease-in-out hover:border-white"
              href="/login"
            >
              Login
            </Link>
          </div>
        </div>

        <div className="border-l border-white/10 bg-[#151515] px-6 py-12 md:px-10 lg:px-12">
          <div className="flex h-full flex-col justify-between gap-12">
            <div className="space-y-0">
              {principles.map((item) => (
                <section className="border-b border-white/10 py-8 first:pt-0 last:border-b-0" key={item.title}>
                  <div className="mb-5 flex items-center justify-between gap-6">
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-[#777777]">{item.label}</span>
                    <CheckCircle2 className="text-[#d8d8d8]" size={19} />
                  </div>
                  <h2 className="text-3xl font-black text-white">{item.title}</h2>
                  <p className="mt-4 text-base font-semibold leading-7 text-[#9f9f9f]">{item.body}</p>
                </section>
              ))}
            </div>

            <div className="grid grid-cols-3 border border-white/10">
              {metrics.map((metric) => (
                <div className="border-r border-white/10 p-4 last:border-r-0" key={metric.label}>
                  <div className="text-2xl font-black text-white">{metric.value}</div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8f8f8f]">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#f3f1eb] text-[#171717]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-20 md:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:px-16 xl:px-24">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#66615a]">What students get</p>
            <h2 className="mt-5 text-4xl font-black leading-tight md:text-5xl">A test experience that becomes a study plan.</h2>
          </div>
          <div className="grid gap-0 md:grid-cols-3">
            <Feature Icon={BrainCircuit} title="Adaptive route" body="Module 2 responds to Module 1 performance." />
            <Feature Icon={Timer} title="Timed mode" body="Built for pacing, review, and endurance." />
            <Feature Icon={BarChart3} title="Score report" body="Mistakes, traps, strengths, and weaknesses." />
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({
  Icon,
  title,
  body
}: {
  Icon: typeof BrainCircuit;
  title: string;
  body: string;
}) {
  return (
    <article className="border border-[#d8d1c4] bg-transparent p-6 md:border-r-0 md:last:border-r">
      <Icon size={24} />
      <h3 className="mt-8 text-xl font-black">{title}</h3>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#625d55]">{body}</p>
    </article>
  );
}
