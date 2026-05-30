"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, Route } from "lucide-react";
import { useRouter } from "next/navigation";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { ApiError, api, getToken } from "@/lib/api";

type ScoreHistoryItem = { attempt_id: string; score: number; date: string };
type AnalyticsHistory = { score_history: ScoreHistoryItem[]; attempts: number };

export default function My1400Page() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "login" | "diagnostic">("checking");

  useEffect(() => {
    if (!getToken()) {
      setState("login");
      return;
    }

    api<AnalyticsHistory>("/api/analytics/me")
      .then((history) => {
        const latestAttemptId = history.score_history.at(-1)?.attempt_id;
        if (latestAttemptId) {
          router.replace(`/curriculum/${latestAttemptId}`);
          return;
        }
        setState("diagnostic");
      })
      .catch((error) => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          setState("login");
          return;
        }
        setState("diagnostic");
      });
  }, [router]);

  if (state === "login") {
    return (
      <main className="min-h-screen bg-[#101112] text-white">
        <LuxuryNavbar />
        <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl gap-10 px-5 py-14 md:px-8 lg:grid-cols-[1fr_440px] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Student login required</p>
            <h1 className="mt-6 max-w-4xl text-5xl font-light leading-none text-white md:text-7xl">
              Sign in to open your 1400+ curriculum.
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-light leading-8 text-white/50">
              Your personal route is built from your diagnostic SAT mock test. Log in first so SATTEST.UZ can connect the curriculum to your own score, mistakes, and weak topics.
            </p>
          </div>

          <div className="border border-white/10 bg-white/[0.035] p-5">
            <div className="flex h-12 w-12 items-center justify-center border border-white/10 bg-black/20 text-white/70">
              <LockKeyhole size={22} />
            </div>
            <h2 className="mt-5 text-2xl font-light text-white">Open My 1400+</h2>
            <p className="mt-3 text-sm font-light leading-6 text-white/48">
              Sign in or create an account. After the diagnostic, this button opens the curriculum directly.
            </p>
            <div className="mt-6 grid gap-3">
              <Link className="flex h-13 items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/login">
                Sign in <ArrowRight size={18} />
              </Link>
              <Link className="flex h-13 items-center justify-between border border-white/15 bg-black/20 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-white/35 hover:text-white" href="/register">
                Create account <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (state === "diagnostic") {
    return (
      <main className="min-h-screen bg-[#101112] text-white">
        <LuxuryNavbar />
        <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl gap-10 px-5 py-14 md:px-8 lg:grid-cols-[1fr_440px] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Diagnostic required</p>
            <h1 className="mt-6 max-w-4xl text-5xl font-light leading-none text-white md:text-7xl">
              Your 1400+ route opens after the mock test.
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-light leading-8 text-white/50">
              Take the diagnostic first. After your score is submitted, My 1400+ will open your personal curriculum directly.
            </p>
          </div>

          <div className="border border-white/10 bg-white/[0.035] p-5">
            <div className="flex h-12 w-12 items-center justify-center border border-white/10 bg-black/20 text-white/70">
              <Route size={22} />
            </div>
            <h2 className="mt-5 text-2xl font-light text-white">Build the route</h2>
            <p className="mt-3 text-sm font-light leading-6 text-white/48">
              The curriculum needs your real diagnostic result to identify score gap, weak skills, and first practice priorities.
            </p>
            <Link className="mt-6 flex h-13 items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/mock-test">
              Start diagnostic <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />
      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-4xl flex-col items-center justify-center px-5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/38">My 1400+</p>
        <h1 className="mt-5 text-4xl font-light text-white md:text-5xl">Opening your personal curriculum</h1>
      </section>
    </main>
  );
}
