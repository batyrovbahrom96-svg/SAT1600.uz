"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BarChart3, BookOpenCheck, Crown, LineChart, Shield } from "lucide-react";
import { ApiError, api } from "@/lib/api";

type Test = { id: string; title: string; description: string; is_premium: boolean };

export default function DashboardPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [history, setHistory] = useState<{ score_history: { score: number; date: string }[]; attempts: number } | null>(null);
  const [message, setMessage] = useState("");

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
      <header className="border-b border-white/10 bg-[#101112]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="flex h-12 w-[210px] items-center border border-white/10 bg-black/30 px-4 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
            <img className="h-auto w-full object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.32)]" src="/assets/brand/sattest-wordmark.png" alt="SATTEST.UZ" />
          </Link>
          <nav className="hidden items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/48 md:flex">
            <Link className="flex items-center gap-2 px-3 py-2 text-white" href="/dashboard">
              <BookOpenCheck size={16} /> Tests
            </Link>
            <Link className="flex items-center gap-2 px-3 py-2 transition-colors hover:text-white" href="/results/demo">
              <BarChart3 size={16} /> Analytics
            </Link>
            <Link className="flex items-center gap-2 px-3 py-2 transition-colors hover:text-white" href="/admin">
              <Shield size={16} /> Admin
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <div className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Student workspace</p>
            <h1 className="mt-5 text-5xl font-light leading-none text-white md:text-7xl">Mock tests</h1>
            <p className="mt-6 max-w-2xl text-lg font-light leading-8 text-white/50">
              Adaptive Digital SAT practice with analytics after submission. Pick a test, start clean, and return here to track the next score move.
            </p>
          </div>
          <div className="grid grid-cols-2 border border-white/10 bg-white/[0.035]">
            <div className="border-r border-white/10 p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">Attempts</div>
              <div className="mt-4 text-4xl font-light text-white">{history?.attempts ?? 0}</div>
            </div>
            <div className="p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">Latest score</div>
              <div className="mt-4 text-4xl font-light text-white">{history?.score_history.at(-1)?.score ?? "none"}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          {message ? <p className="border border-yellow-300/25 bg-yellow-950/20 p-4 font-semibold text-yellow-100">{message}</p> : null}
          {tests.map((test) => (
            <article key={test.id} className="grid gap-5 border border-white/10 bg-white/[0.035] p-5 transition-colors hover:border-white/25 hover:bg-white/[0.055] md:grid-cols-[56px_1fr_auto] md:items-center md:p-6">
              <div className="flex h-14 w-14 items-center justify-center border border-white/10 bg-black/20 text-white/70">
                <LineChart size={24} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-light text-white">{test.title}</h2>
                  {test.is_premium ? (
                    <span className="inline-flex items-center gap-2 border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/58">
                      <Crown size={13} /> Premium
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 max-w-3xl text-sm font-light leading-6 text-white/48">{test.description}</p>
              </div>
              <button onClick={() => start(test.id)} className="flex h-12 items-center justify-center gap-3 border border-white bg-white px-6 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white">
                Start <ArrowRight size={17} />
              </button>
            </article>
          ))}

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
