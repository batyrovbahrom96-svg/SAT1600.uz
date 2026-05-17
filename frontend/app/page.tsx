import Link from "next/link";
import { ArrowRight, BarChart3, BrainCircuit, Timer } from "lucide-react";

export default function Home() {
  const features = [
    { title: "Adaptive engine", body: "Module 1 performance routes Module 2 difficulty.", Icon: BrainCircuit },
    { title: "Timed Bluebook mode", body: "Locked modules, review marks, navigator, and auto-submit.", Icon: Timer },
    { title: "Analytics layer", body: "Strengths, pitfalls, careless mistakes, graph performance.", Icon: BarChart3 }
  ];

  return (
    <main className="bluebook-shell">
      <section className="mx-auto grid min-h-screen max-w-7xl content-center gap-10 px-6 py-10 lg:grid-cols-[1fr_0.9fr]">
        <div className="flex flex-col justify-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-brand">Digital SAT platform for Uzbekistan</p>
          <h1 className="max-w-3xl text-5xl font-black leading-tight text-ink md:text-7xl">SAT1600.uz</h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-slate-600">
            Full mock tests, adaptive modules, topic analytics, graph questions, and score history in one production-ready platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="flex items-center gap-2 rounded-md bg-brand px-5 py-3 font-bold text-white shadow-sm hover:bg-blue-700" href="/register">
              Start mock test <ArrowRight size={18} />
            </Link>
            <Link className="rounded-md border border-slate-300 bg-white px-5 py-3 font-bold text-ink hover:bg-slate-50" href="/login">
              Login
            </Link>
          </div>
        </div>
        <div className="grid content-center gap-4">
          {features.map(({ title, body, Icon }) => (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={title}>
              <div className="mb-3 flex size-11 items-center justify-center rounded-md bg-blue-50 text-brand">
                <Icon size={22} />
              </div>
              <h2 className="text-lg font-black text-ink">{title}</h2>
              <p className="mt-1 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
