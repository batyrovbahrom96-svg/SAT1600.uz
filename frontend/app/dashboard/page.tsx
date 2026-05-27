"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2, Clock3, Crown, LineChart, Target, TrendingUp } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { ApiError, api } from "@/lib/api";

type Test = { id: string; title: string; description: string; is_premium: boolean };

export default function DashboardPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [history, setHistory] = useState<{ score_history: { score: number; date: string }[]; attempts: number } | null>(null);
  const [message, setMessage] = useState("");
  const attempts = history?.attempts ?? 0;
  const latestScore = history?.score_history.at(-1)?.score;
  const hasDiagnostic = attempts > 0;
  const diagnosticTest = tests[0];

  useEffect(() => {
    api<Test[]>("/api/tests").then(setTests).catch((error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        router.push("/login");
        return;
      }
      console.log("API unavailable, continue");
      setMessage("Practice tests are temporarily unavailable.");
    });
    api<{ score_history: { score: number; date: string }[]; attempts: number }>("/api/analytics/me").then(setHistory).catch(() => {
      console.log("API unavailable, continue");
    });
  }, [router]);

  async function start(testId: string) {
    try {
      const result = await api<{ attempt_id: string }>(`/api/tests/${testId}/attempts`, { method: "POST" });
      router.push(`/test/${result.attempt_id}`);
    } catch (error) {
      console.log("API unavailable, continue");
      setMessage(error instanceof Error ? error.message : "Unable to start test.");
    }
  }

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <div className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Student cabinet</p>
            <h1 className="mt-5 text-5xl font-light leading-none text-white md:text-7xl">Personal SAT track</h1>
            <p className="mt-6 max-w-2xl text-lg font-light leading-8 text-white/50">
              Start with the diagnostic mock test. After submission, this cabinet becomes your personal 1400+ roadmap with weaknesses, daily hours, and practice curriculum.
            </p>
          </div>
          <div className="grid grid-cols-2 border border-white/10 bg-white/[0.035]">
            <div className="border-r border-white/10 p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">Attempts</div>
              <div className="mt-4 text-4xl font-light text-white">{attempts}</div>
            </div>
            <div className="p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">Diagnostic score</div>
              <div className="mt-4 text-4xl font-light text-white">{latestScore ?? "none"}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5">
          {message ? <p className="border border-yellow-300/25 bg-yellow-950/20 p-4 font-semibold text-yellow-100">{message}</p> : null}

          <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="border border-white/10 bg-white/[0.035] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] md:p-8">
              <div className="flex h-14 w-14 items-center justify-center border border-white/10 bg-black/25 text-white/75">
                {hasDiagnostic ? <TrendingUp size={24} /> : <Target size={24} />}
              </div>
              <p className="mt-7 text-[10px] font-black uppercase tracking-[0.42em] text-white/42">
                {hasDiagnostic ? "Diagnostic completed" : "Step 1"}
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl font-light leading-tight text-white md:text-5xl">
                {hasDiagnostic ? "Your personal study plan is ready to grow here." : "Take your diagnostic mock test first."}
              </h2>
              <p className="mt-5 max-w-2xl text-base font-light leading-7 text-white/50">
                {hasDiagnostic
                  ? "The next version of this cabinet will turn your missed questions into a daily 30-day curriculum, with practice by topic and progress by hour."
                  : "The diagnostic test unlocks your personal SAT track. Your score, weak skills, daily study hours, and 30-day 1400+ roadmap will appear here after the test."}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                {diagnosticTest ? (
                  <button onClick={() => start(diagnosticTest.id)} className="flex h-12 items-center justify-center gap-3 border border-white bg-white px-6 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white">
                    {hasDiagnostic ? "Retake diagnostic" : "Start diagnostic"} <ArrowRight size={17} />
                  </button>
                ) : (
                  <div className="border border-white/10 bg-black/20 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-white/45">
                    Loading diagnostic
                  </div>
                )}
                <button className="flex h-12 items-center justify-center gap-3 border border-white/15 bg-black/20 px-6 text-xs font-black uppercase tracking-[0.2em] text-white/45" type="button">
                  30-day plan locked
                </button>
              </div>
            </article>

            <aside className="grid gap-4">
              {[
                { label: "Target", value: "1400+", icon: Target },
                { label: "Study plan", value: hasDiagnostic ? "30 days" : "Locked", icon: CalendarDays },
                { label: "Daily hours", value: hasDiagnostic ? "Calculated soon" : "After mock", icon: Clock3 }
              ].map((item) => (
                <div className="grid grid-cols-[52px_1fr] items-center gap-4 border border-white/10 bg-white/[0.03] p-5" key={item.label}>
                  <div className="flex h-13 w-13 items-center justify-center border border-white/10 bg-black/20 text-white/60">
                    <item.icon size={22} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">{item.label}</div>
                    <div className="mt-2 text-2xl font-light text-white">{item.value}</div>
                  </div>
                </div>
              ))}
            </aside>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <article className="border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-center gap-3 text-white/70">
                <LineChart size={20} />
                <h3 className="text-lg font-light text-white">Progress track</h3>
              </div>
              <p className="mt-4 text-sm font-light leading-6 text-white/45">
                Score history, completed hours, weekly growth, and readiness for 1400+ will be tracked here after the diagnostic.
              </p>
              <div className="mt-6 h-2 bg-white/[0.06]">
                <div className="h-full w-[12%] bg-white/70" />
              </div>
            </article>

            <article className="border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-center gap-3 text-white/70">
                <BookOpenCheck size={20} />
                <h3 className="text-lg font-light text-white">Practice curriculum</h3>
              </div>
              <p className="mt-4 text-sm font-light leading-6 text-white/45">
                Practice will become personal: algebra, grammar, reading, timing, and mistake review by the student’s own weak skills.
              </p>
              <div className="mt-6 grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/35">
                <span>Diagnostic required</span>
                <span>Skill tags required</span>
              </div>
            </article>

            <article className="border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-center gap-3 text-white/70">
                <CheckCircle2 size={20} />
                <h3 className="text-lg font-light text-white">Weakness report</h3>
              </div>
              <p className="mt-4 text-sm font-light leading-6 text-white/45">
                Missed questions will be grouped into biggest score leaks, careless mistakes, timing problems, and high-impact topics.
              </p>
              <div className="mt-6 border border-white/10 bg-black/20 p-4 text-sm font-light text-white/45">
                Waiting for first diagnostic result.
              </div>
            </article>
          </section>

          <section className="border border-white/10 bg-white/[0.03] p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/38">Available mock tests</p>
                <h2 className="mt-2 text-2xl font-light text-white">Diagnostic and practice attempts</h2>
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-white/35">{tests.length || 0} tests</span>
            </div>

            <div className="mt-5 grid gap-4">
              {tests.map((test, index) => (
                <article key={test.id} className="grid gap-5 border border-white/10 bg-black/20 p-5 transition-colors hover:border-white/25 hover:bg-white/[0.045] md:grid-cols-[56px_1fr_auto] md:items-center md:p-6">
                  <div className="flex h-14 w-14 items-center justify-center border border-white/10 bg-black/30 text-white/70">
                    <LineChart size={24} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-light text-white">{index === 0 ? "Diagnostic Mock Test" : test.title}</h3>
                      {index === 0 ? (
                        <span className="inline-flex items-center gap-2 border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/58">
                          Required
                        </span>
                      ) : null}
                      {test.is_premium ? (
                        <span className="inline-flex items-center gap-2 border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/58">
                          <Crown size={13} /> Premium
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 max-w-3xl text-sm font-light leading-6 text-white/48">
                      {index === 0 ? "Take this first so SATTEST.UZ can build your personal cabinet, progress track, and study curriculum." : test.description}
                    </p>
                  </div>
                  <button onClick={() => start(test.id)} className="flex h-12 items-center justify-center gap-3 border border-white bg-white px-6 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white">
                    Start <ArrowRight size={17} />
                  </button>
                </article>
              ))}
            </div>
          </section>

          {!message && tests.length === 0 ? (
            <div className="border border-white/10 bg-white/[0.03] p-8 text-white/50">
              Loading available mock tests...
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
