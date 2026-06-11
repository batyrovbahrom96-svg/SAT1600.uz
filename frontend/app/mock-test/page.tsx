"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, Check, LockKeyhole, RotateCcw, UserPlus } from "lucide-react";
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

type MiniQuestion = {
  section: "Reading" | "Writing" | "Math";
  topic: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
};

const miniDiagnosticQuestions: MiniQuestion[] = [
  {
    section: "Reading",
    topic: "Command of Evidence",
    prompt:
      "A researcher found that students who reviewed missed SAT questions improved faster than students who only watched new lessons. Which choice best states the finding?",
    choices: [
      "New lessons are unnecessary for SAT improvement.",
      "Reviewing mistakes can be more useful than only adding new content.",
      "Students should stop taking full mock tests.",
      "SAT scores improve only when students study every day."
    ],
    answerIndex: 1,
    explanation:
      "The evidence compares mistake review with only watching new lessons. The correct answer keeps that exact relationship without exaggerating it."
  },
  {
    section: "Writing",
    topic: "Transitions",
    prompt:
      "The student understood the formula. ___, she lost points because she used the wrong sign under time pressure.",
    choices: ["Therefore", "However", "For example", "Similarly"],
    answerIndex: 1,
    explanation:
      "The second sentence contrasts understanding the formula with still losing points, so 'However' preserves the logic."
  },
  {
    section: "Math",
    topic: "Advanced Math",
    prompt: "If f(x) = |x - 4x|, what positive value of a makes f(5) - f(a) = -15?",
    choices: ["5", "10", "15", "30"],
    answerIndex: 1,
    explanation:
      "Simplify f(x) to |-3x|. Then f(5) = 15, so 15 - f(a) = -15 and f(a) = 30. That gives |-3a| = 30, so a = 10."
  },
  {
    section: "Writing",
    topic: "Boundaries",
    prompt: "Which choice completes the sentence correctly? The sensor failed ___ the team repeated the trial.",
    choices: [", the", "; the", "the", ", and, the"],
    answerIndex: 1,
    explanation:
      "Both sides are complete sentences. A semicolon correctly joins two related independent clauses."
  },
  {
    section: "Math",
    topic: "Linear Equations",
    prompt: "If 3(x - 2) + 2x = 19, what is the value of x?",
    choices: ["3", "4", "5", "7"],
    answerIndex: 2,
    explanation:
      "Distribute first: 3x - 6 + 2x = 19, so 5x = 25 and x = 5."
  }
];

export default function MockTestAccessPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [history, setHistory] = useState<AnalyticsHistory | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState("");
  const [preTestStep, setPreTestStep] = useState<"dashboard" | "instructions" | "preparing">("dashboard");
  const [miniIndex, setMiniIndex] = useState(0);
  const [miniAnswers, setMiniAnswers] = useState<Record<number, number>>({});
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
    <MiniDiagnostic
      answers={miniAnswers}
      currentIndex={miniIndex}
      onAnswer={(answerIndex) => setMiniAnswers((current) => ({ ...current, [miniIndex]: answerIndex }))}
      onNext={() => setMiniIndex((index) => Math.min(miniDiagnosticQuestions.length, index + 1))}
      onRestart={() => {
        setMiniAnswers({});
        setMiniIndex(0);
      }}
    />
  );
}

function MiniDiagnostic({
  answers,
  currentIndex,
  onAnswer,
  onNext,
  onRestart
}: {
  answers: Record<number, number>;
  currentIndex: number;
  onAnswer: (answerIndex: number) => void;
  onNext: () => void;
  onRestart: () => void;
}) {
  const isComplete = currentIndex >= miniDiagnosticQuestions.length;
  const answeredCount = Object.keys(answers).length;
  const correctCount = miniDiagnosticQuestions.reduce((total, question, index) => total + (answers[index] === question.answerIndex ? 1 : 0), 0);
  const currentQuestion = miniDiagnosticQuestions[currentIndex];
  const currentAnswer = answers[currentIndex];
  const missedTopics = miniDiagnosticQuestions
    .filter((question, index) => answers[index] !== undefined && answers[index] !== question.answerIndex)
    .map((question) => question.topic);
  const projectedScore = 820 + correctCount * 90;

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />

      <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl gap-8 px-5 py-10 md:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Mini diagnostic</p>
          <h1 className="mt-6 max-w-4xl text-5xl font-light leading-none text-white md:text-7xl">
            Try the SAT diagnostic before signing in.
          </h1>
          <p className="mt-7 max-w-2xl text-lg font-light leading-8 text-white/50">
            Answer 5 SAT-style questions. SATTEST.UZ will show a quick weakness snapshot, then you can create an account to save the full mock test.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {["No login required", "Instant feedback", "Weak-topic snapshot", "Full mock saved after signup"].map((item) => (
              <div className="flex items-center gap-3 border border-white/10 bg-white/[0.035] p-3 text-sm text-white/64" key={item}>
                <Check size={16} />
                {item}
              </div>
            ))}
          </div>
        </div>

        {isComplete ? (
          <section className="border border-white/10 bg-white/[0.035] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="border-b border-white/10 pb-5">
              <div className="flex h-12 w-12 items-center justify-center border border-white/10 bg-black/20 text-white/70">
                <BarChart3 size={22} />
              </div>
              <h2 className="mt-5 text-4xl font-light leading-tight text-white">Your mini diagnostic snapshot</h2>
              <p className="mt-3 text-sm font-light leading-6 text-white/48">
                This is a short preview, not a saved SAT score. The full diagnostic creates your real score report and 1400+ route.
              </p>
            </div>

            <div className="mt-5 grid border border-white/10 bg-black/20">
              <ScoreMetric label="Projected range" value={projectedScore} />
              <div className="grid grid-cols-2 border-t border-white/10">
                <ScoreMetric label="Correct" value={correctCount} />
                <ScoreMetric label="Questions" value={miniDiagnosticQuestions.length} />
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {(missedTopics.length ? missedTopics : ["Higher-difficulty timing"]).slice(0, 3).map((topic, index) => (
                <div className="border border-red-200/15 bg-red-400/10 p-3" key={`${topic}-${index}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/55">Priority weakness</p>
                  <p className="mt-2 text-sm font-semibold text-red-50" data-sattest-no-translate="true">
                    {topic}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-100/62">Next step</p>
              <p className="mt-3 text-sm font-light leading-6 text-white/62">
                Create an account to take the full diagnostic. Your real report will save every mistake, timing pattern, and daily route.
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr]">
              <Link className="flex h-13 items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/register">
                Save full diagnostic <UserPlus size={18} />
              </Link>
              <Link className="flex h-13 items-center justify-between border border-white/15 bg-black/20 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-white/35 hover:text-white" href="/pricing?plan=pro">
                Unlock Pro <ArrowRight size={18} />
              </Link>
              <button
                className="flex h-13 items-center justify-between border border-white/15 bg-black/20 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-white/35 hover:text-white md:col-span-2"
                onClick={onRestart}
                type="button"
              >
                Restart mini diagnostic <RotateCcw size={18} />
              </button>
            </div>
          </section>
        ) : currentQuestion ? (
          <section className="border border-white/10 bg-white/[0.035] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/38" data-sattest-no-translate="true">
                  {currentQuestion.section} · Question {currentIndex + 1} of {miniDiagnosticQuestions.length}
                </p>
                <h2 className="mt-3 text-3xl font-light text-white" data-sattest-no-translate="true">
                  {currentQuestion.topic}
                </h2>
              </div>
              <div className="border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/58">
                {answeredCount}/{miniDiagnosticQuestions.length} answered
              </div>
            </div>

            <p className="mt-8 max-w-4xl text-2xl font-light leading-snug text-white md:text-3xl" data-sattest-no-translate="true">
              {currentQuestion.prompt}
            </p>

            <div className="mt-8 grid gap-3">
              {currentQuestion.choices.map((choice, index) => {
                const hasAnswer = currentAnswer !== undefined;
                const isSelected = currentAnswer === index;
                const isCorrect = currentQuestion.answerIndex === index;
                const optionClass = hasAnswer
                  ? isCorrect
                    ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-100"
                    : isSelected
                      ? "border-red-300/45 bg-red-300/10 text-red-100"
                      : "border-white/10 bg-black/15 text-white/42"
                  : "border-white/10 bg-black/20 text-white/72 hover:border-white/35 hover:bg-white/[0.06]";

                return (
                  <button
                    className={`flex min-h-14 items-center gap-4 border px-4 py-4 text-left text-base transition-colors ${optionClass}`}
                    disabled={hasAnswer}
                    data-sattest-no-translate="true"
                    key={choice}
                    onClick={() => onAnswer(index)}
                    type="button"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current text-xs font-black">
                      {String.fromCharCode(65 + index)}
                    </span>
                    {choice}
                  </button>
                );
              })}
            </div>

            {currentAnswer !== undefined ? (
              <div className="mt-6 border border-white/10 bg-black/25 p-4">
                <p className="text-sm font-semibold text-white">
                  {currentAnswer === currentQuestion.answerIndex ? "Correct." : "Trap found."}
                </p>
                <p className="mt-2 text-sm font-light leading-6 text-white/58" data-sattest-no-translate="true">
                  {currentQuestion.explanation}
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex justify-end">
              <button
                className="flex h-13 min-w-[230px] items-center justify-between border border-white bg-white px-5 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                disabled={currentAnswer === undefined}
                onClick={onNext}
                type="button"
              >
                {currentIndex === miniDiagnosticQuestions.length - 1 ? "See snapshot" : "Next question"} <ArrowRight size={18} />
              </button>
            </div>
          </section>
        ) : null}
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
    <main className="diagnostic-instructions-page min-h-screen bg-[#f6f6f4] px-5 py-10">
      <section className="mx-auto max-w-4xl">
        <h1 className="text-center text-5xl font-light leading-none md:text-6xl">SAT Diagnostic Mock Test</h1>

        <div className="diagnostic-instructions-card mt-10 rounded-2xl bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] md:p-12">
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
              <div className="diagnostic-instructions-lock flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eeeeec]">
                <LockKeyhole size={22} />
              </div>
              <div>
                <h2 className="diagnostic-instructions-title text-3xl font-bold">Test mode</h2>
                <p className="diagnostic-instructions-copy mt-3 max-w-2xl text-xl leading-8">
                  Do not refresh the page or close the browser during the test. If the test is interrupted, you may need to start again.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-[1fr_2fr]">
            <button
              className="diagnostic-instructions-back h-14 border border-black/20 bg-white px-6 text-xs font-black uppercase tracking-[0.22em] transition-colors hover:bg-black hover:text-white"
              onClick={onBack}
              type="button"
            >
              Back
            </button>
            <button
              className="diagnostic-instructions-continue flex h-14 items-center justify-between bg-black px-6 text-xs font-black uppercase tracking-[0.22em] transition-colors hover:bg-black/82"
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
      <h2 className="diagnostic-instructions-title text-3xl font-bold">{title}</h2>
      <p className="diagnostic-instructions-copy mt-3 max-w-2xl text-xl leading-8">{text}</p>
    </div>
  );
}

function PreparingDiagnosticScreen() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080908] px-5 py-10 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl flex-col justify-center">
        <p className="text-xs font-black uppercase tracking-[0.42em] text-[#c8bd88]">Secure diagnostic launch</p>
        <h1 className="mt-6 max-w-5xl text-5xl font-light leading-[0.95] md:text-7xl">
          We're preparing your SAT diagnostic mock test
        </h1>

        <div className="mt-12 overflow-hidden rounded-[28px] border border-white/12 bg-[#111211]/92 shadow-[0_34px_100px_rgba(0,0,0,0.45)]">
          <div className="grid min-h-[430px] gap-8 p-7 md:grid-cols-[1.1fr_0.9fr] md:p-10">
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-6">
                  <span className="font-serif text-2xl uppercase tracking-[0.28em] text-white">SATTEST.UZ</span>
                  <span className="rounded-full border border-[#c8bd88]/45 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#c8bd88]">
                    Loading
                  </span>
                </div>

                <div className="mt-10">
                  <h2 className="max-w-2xl text-3xl font-semibold leading-tight md:text-5xl">Building your test environment</h2>
                  <p className="mt-6 max-w-2xl text-xl leading-8 text-white/68">
                    This may take up to a minute. Please do not refresh this page or close the browser.
                  </p>
                </div>
              </div>

              <div className="mt-10">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-[#c8bd88]" />
                </div>
                <div className="mt-6 grid gap-3 text-sm font-bold uppercase tracking-[0.18em] text-white/72 sm:grid-cols-3">
                  <div className="border border-white/10 p-4">Loading modules</div>
                  <div className="border border-white/10 p-4">Checking timer</div>
                  <div className="border border-white/10 p-4">Preparing report</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center border border-white/10 bg-black/22 p-6">
              <div className="relative flex aspect-square w-full max-w-[290px] items-center justify-center">
                <div className="absolute inset-0 border border-[#c8bd88]/35" />
                <div className="absolute inset-7 border border-white/12" />
                <div className="text-center">
                  <div className="text-7xl font-light">SAT</div>
                  <div className="mt-5 text-xs font-black uppercase tracking-[0.38em] text-[#c8bd88]">Diagnostic</div>
                  <div className="mx-auto mt-6 h-px w-28 bg-white/24" />
                  <div className="mt-6 text-sm font-bold uppercase tracking-[0.28em] text-white/54">Please wait</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
