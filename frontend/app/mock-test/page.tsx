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
  const [preTestStep, setPreTestStep] = useState<"dashboard" | "instructions" | "preparing">("dashboard");
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
    setPreTestStep("preparing");
    setMessage("");
    const startedAt = Date.now();
    try {
      const result = await api<{ attempt_id: string }>(`/api/tests/${diagnosticTest.id}/attempts`, { method: "POST" });
      const remainingDelay = Math.max(1400 - (Date.now() - startedAt), 0);
      if (remainingDelay) {
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      }
      router.push(`/test/${result.attempt_id}`);
    } catch (error) {
      setPreTestStep("dashboard");
      setMessage(error instanceof Error ? error.message : "Unable to start diagnostic mock test.");
    }
  }

  if (isLoggedIn && preTestStep === "instructions") {
    return <DiagnosticInstructions onBack={() => setPreTestStep("dashboard")} onContinue={startDiagnostic} />;
  }

  if (isLoggedIn && preTestStep === "preparing") {
    return <PreparingDiagnosticScreen />;
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
                onClick={() => setPreTestStep("instructions")}
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

function DiagnosticInstructions({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  return (
    <main className="min-h-screen bg-[#f6f6f4] px-5 py-10 text-[#202124]">
      <section className="mx-auto max-w-4xl">
        <h1 className="text-center text-5xl font-light leading-none md:text-6xl">SAT Diagnostic Mock Test</h1>

        <div className="mt-10 rounded-2xl bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] md:p-12">
          <div className="grid gap-9">
            <InstructionBlock
              title="Timing"
              text="This diagnostic is timed like a real Digital SAT. Keep one browser tab open, stay focused, and answer each module before the timer ends."
            />
            <InstructionBlock
              title="Scores"
              text="When you finish, SATTEST.UZ saves your overall score, Reading and Writing score, Math score, missed questions, and weak topics."
            />
            <InstructionBlock
              title="Personal 1400+ route"
              text="Your report becomes the starting point for My 1400+: daily study hours, priority skills, and practice tasks based on your own mistakes."
            />
            <div className="flex gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eeeeec] text-[#202124]">
                <LockKeyhole size={22} />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Test mode</h2>
                <p className="mt-3 max-w-2xl text-xl leading-8 text-[#202124]/82">
                  Do not refresh the page or close the browser during the test. If the test is interrupted, you may need to start again.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-[1fr_2fr]">
            <button
              className="h-14 border border-black/20 bg-white px-6 text-xs font-black uppercase tracking-[0.22em] text-black transition-colors hover:bg-black hover:text-white"
              onClick={onBack}
              type="button"
            >
              Back
            </button>
            <button
              className="flex h-14 items-center justify-between bg-black px-6 text-xs font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-black/82"
              onClick={onContinue}
              type="button"
            >
              Continue to diagnostic <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function InstructionBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h2 className="text-3xl font-bold">{title}</h2>
      <p className="mt-3 max-w-2xl text-xl leading-8 text-[#202124]/82">{text}</p>
    </div>
  );
}

function PreparingDiagnosticScreen() {
  return (
    <main className="min-h-screen bg-[#f6f6f4] px-5 py-10 text-[#202124]">
      <section className="mx-auto max-w-5xl">
        <h1 className="text-5xl font-light leading-none md:text-6xl">We're preparing your SAT diagnostic mock test</h1>

        <div className="mt-16 overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <div className="relative flex min-h-[480px] flex-col items-center justify-center px-8 py-12 text-center">
            <div className="absolute left-0 top-24 h-20 w-56 rounded-r-full bg-[#bfeffa]" />
            <div className="absolute left-28 top-36 h-24 w-72 rounded-full bg-[#d9f6fb]" />
            <div className="relative h-56 w-40">
              <div className="absolute left-4 right-4 top-0 h-8 border-4 border-[#555] bg-[#9d9d9d]" />
              <div className="absolute left-6 right-6 top-7 h-44 rounded-b-[70px] rounded-t-[70px] border-4 border-[#666] bg-[#c9f4ff]/70" />
              <div className="absolute left-9 right-9 top-12 h-16 rounded-b-[52px] bg-[#ff6846]" />
              <div className="absolute left-9 right-9 bottom-11 h-14 rounded-t-[52px] bg-[#ff6846]" />
              <div className="absolute left-1/2 top-[104px] h-4 w-4 -translate-x-1/2 rounded-full bg-[#ff6846]" />
              <div className="absolute left-1/2 top-[132px] h-3 w-3 -translate-x-1/2 rounded-full bg-[#ff6846]" />
              <div className="absolute left-1/2 top-[158px] h-2 w-2 -translate-x-1/2 rounded-full bg-[#ff6846]" />
              <div className="absolute bottom-0 left-4 right-4 h-8 border-4 border-[#555] bg-[#9d9d9d]" />
            </div>
            <p className="mt-12 max-w-3xl text-3xl leading-tight text-[#202124]">
              This may take up to a minute. Please do not refresh this page or close the browser.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
