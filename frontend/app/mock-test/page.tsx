"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, LockKeyhole, RotateCcw, UserPlus } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { ApiError, api, getToken } from "@/lib/api";

type Test = { id: string; title: string; description: string; is_premium: boolean };
type AnalyticsHistory = {
  score_history: { attempt_id: string; score: number; date: string }[];
  attempts: number;
};
type Results = {
  score_total: number;
  score_reading_writing: number;
  score_math: number;
};

export default function MockTestAccessPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [history, setHistory] = useState<AnalyticsHistory | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState("");
  const latestAttemptId = history?.score_history.at(-1)?.attempt_id;
  const diagnosticTest = tests[0];

  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(Boolean(token));
    if (!token) return;

    api<Test[]>("/api/tests").then(setTests).catch((error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setIsLoggedIn(false);
        return;
      }
      setMessage("Mock tests are temporarily unavailable.");
    });
    api<AnalyticsHistory>("/api/analytics/me").then(setHistory).catch((error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setIsLoggedIn(false);
        return;
      }
      setMessage("Unable to load your saved diagnostic test.");
    });
  }, []);

  useEffect(() => {
    if (!latestAttemptId) {
      setResults(null);
      return;
    }
    api<Results>(`/api/attempts/${latestAttemptId}/results`).then(setResults).catch(() => {
      setMessage("Unable to load your score report.");
    });
  }, [latestAttemptId]);

  async function startDiagnostic() {
    if (!diagnosticTest) return;
    try {
      const result = await api<{ attempt_id: string }>(`/api/tests/${diagnosticTest.id}/attempts`, { method: "POST" });
      router.push(`/test/${result.attempt_id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start diagnostic mock test.");
    }
  }

  if (isLoggedIn) {
    return (
      <main className="min-h-screen bg-[#101112] text-white">
        <LuxuryNavbar />

        <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl gap-10 px-5 py-14 md:px-8 lg:grid-cols-[1fr_520px] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Saved diagnostic mock test</p>
            <h1 className="mt-6 max-w-4xl text-5xl font-light leading-none text-white md:text-7xl">
              Your SAT mock test is connected to your account.
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-light leading-8 text-white/50">
              SATTEST.UZ remembers your diagnostic attempt and keeps your total score, Reading and Writing score, and Math score attached to your personal cabinet.
            </p>
          </div>

          <div className="border border-white/10 bg-white/[0.035] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="border-b border-white/10 pb-5">
              <div className="flex h-12 w-12 items-center justify-center border border-white/10 bg-black/20 text-white/70">
                <BarChart3 size={22} />
              </div>
              <h2 className="mt-5 text-2xl font-light text-white">Diagnostic score</h2>
              <p className="mt-3 text-sm font-light leading-6 text-white/48">
                {results ? "Your latest completed SAT mock diagnostic result." : "No completed diagnostic score is saved yet."}
              </p>
            </div>

            {results ? (
              <div className="mt-5 grid border border-white/10 bg-black/20">
                <ScoreMetric label="Overall" value={results.score_total} />
                <div className="grid grid-cols-2 border-t border-white/10">
                  <ScoreMetric label="English" value={results.score_reading_writing} />
                  <ScoreMetric label="Math" value={results.score_math} />
                </div>
              </div>
            ) : (
              <div className="mt-5 border border-white/10 bg-black/20 p-5 text-sm font-light leading-6 text-white/50">
                Take the diagnostic mock SAT test once, and your score will appear here automatically.
              </div>
            )}

            {message ? <p className="mt-4 border border-yellow-200/20 bg-yellow-300/10 p-3 text-sm text-yellow-100">{message}</p> : null}

            <div className="mt-5 grid gap-3">
              <button
                className="flex h-13 items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/35"
                disabled={!diagnosticTest}
                onClick={startDiagnostic}
                type="button"
              >
                {results ? "Retake Diagnostic" : "Start Diagnostic"} <RotateCcw size={18} />
              </button>
              {latestAttemptId ? (
                <Link className="flex h-13 items-center justify-between border border-white/15 bg-black/20 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-white/35 hover:text-white" href={`/results/${latestAttemptId}`}>
                  Open Score Report <ArrowRight size={18} />
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />

      <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl gap-10 px-5 py-14 md:px-8 lg:grid-cols-[1fr_440px] lg:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Student access required</p>
          <h1 className="mt-6 max-w-4xl text-5xl font-light leading-none text-white md:text-7xl">
            Sign in before choosing a mock test.
          </h1>
          <p className="mt-7 max-w-2xl text-lg font-light leading-8 text-white/50">
            Every mock test needs an account so your attempt, score report, mistakes, and progress history stay connected to you.
          </p>
        </div>

        <div className="border border-white/10 bg-white/[0.035] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
          <div className="border-b border-white/10 pb-5">
            <div className="flex h-12 w-12 items-center justify-center border border-white/10 bg-black/20 text-white/70">
              <LockKeyhole size={22} />
            </div>
            <h2 className="mt-5 text-2xl font-light text-white">Continue to Mock Test</h2>
            <p className="mt-3 text-sm font-light leading-6 text-white/48">
              Create an account if this is your first test, or sign in to continue with your saved workspace.
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            <Link className="flex h-13 items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/register">
              Sign Up <UserPlus size={18} />
            </Link>
            <Link className="flex h-13 items-center justify-between border border-white/15 bg-black/20 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-white/35 hover:text-white" href="/login">
              Sign In <ArrowRight size={18} />
            </Link>
          </div>

          <p className="mt-5 text-xs font-light leading-5 text-white/35">
            After signing up or signing in, you will be taken to the mock test dashboard.
          </p>
        </div>
      </section>
    </main>
  );
}

function ScoreMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-5">
      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">{label}</div>
      <div className="mt-3 text-5xl font-light text-white">{value}</div>
    </div>
  );
}
