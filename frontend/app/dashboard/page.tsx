"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2, Clock3, Crown, LineChart, Target, TrendingUp, XCircle } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { ApiError, api } from "@/lib/api";

type Test = { id: string; title: string; description: string; is_premium: boolean };
type ScoreHistoryItem = { attempt_id: string; score: number; date: string };
type AnalyticsHistory = { score_history: ScoreHistoryItem[]; attempts: number };
type ResultQuestion = {
  id: string;
  section?: "reading_writing" | "math" | string;
  topic: string;
  subtopic?: string | null;
  selected_answer?: string | null;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  trap_type?: string | null;
  time_spent_seconds?: number;
};
type Results = {
  attempt_id?: string;
  score_total: number;
  score_reading_writing: number;
  score_math: number;
  topic_accuracy: Record<string, number>;
  weaknesses: string[];
  strengths: string[];
  report: string;
  questions: ResultQuestion[];
};
type DiagnosticSummary = {
  overallAccuracy: number;
  correctCount: number;
  answeredCount: number;
  weaknesses: string[];
  strengths: string[];
  topicChart: { topic: string; accuracy: number }[];
  sections: { key: string; label: string; score: number; correct: number; total: number; accuracy: number }[];
  wrongQuestions: ResultQuestion[];
  feedback: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [history, setHistory] = useState<AnalyticsHistory | null>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<Results | null>(null);
  const [requestedAttemptId, setRequestedAttemptId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const attempts = history?.attempts ?? 0;
  const latestScore = history?.score_history.at(-1)?.score;
  const latestAttemptId = requestedAttemptId || history?.score_history.at(-1)?.attempt_id;
  const hasDiagnostic = Boolean(latestScore && latestAttemptId);
  const diagnosticTest = tests[0];
  const diagnosticSummary = diagnosticResults ? buildDiagnosticSummary(diagnosticResults) : null;

  useEffect(() => {
    setRequestedAttemptId(new URLSearchParams(window.location.search).get("attemptId"));

    api<Test[]>("/api/tests").then(setTests).catch((error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        router.push("/login");
        return;
      }
      console.log("API unavailable, continue");
      setMessage("Practice tests are temporarily unavailable.");
    });
    api<AnalyticsHistory>("/api/analytics/me").then(setHistory).catch(() => {
      console.log("API unavailable, continue");
    });
  }, [router]);

  useEffect(() => {
    if (!latestAttemptId) {
      setDiagnosticResults(null);
      return;
    }

    api<Results>(`/api/attempts/${latestAttemptId}/results`).then(setDiagnosticResults).catch((error) => {
      console.log("Unable to load diagnostic results", error);
    });
  }, [latestAttemptId]);

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
                {hasDiagnostic ? "Your diagnostic evaluation is inside this cabinet." : "Take your diagnostic mock test first."}
              </h2>
              <p className="mt-5 max-w-2xl text-base font-light leading-7 text-white/50">
                {hasDiagnostic
                  ? "Your latest SAT mock result is now connected to your personal track. Review the section evaluation, weaknesses, and priority topics before starting the next practice cycle."
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

          {diagnosticResults && diagnosticSummary ? (
            <section className="border border-white/10 bg-white/[0.035] p-5 md:p-6">
              <div className="grid gap-6 border-b border-white/10 pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/38">Diagnostic evaluation</p>
                  <h2 className="mt-3 text-3xl font-light leading-tight text-white md:text-4xl">SAT result classified by section</h2>
                  <p className="mt-3 max-w-3xl text-sm font-light leading-6 text-white/50">
                    {diagnosticSummary.feedback}
                  </p>
                </div>
                <button
                  className="flex h-12 items-center justify-center gap-3 border border-white bg-white px-6 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white"
                  onClick={() => router.push(`/results/${diagnosticResults?.attempt_id || latestAttemptId}`)}
                  type="button"
                >
                  Full report <ArrowRight size={17} />
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <DiagnosticMetric label="Total score" value={diagnosticResults.score_total} detail={scoreBand(diagnosticResults.score_total)} />
                <DiagnosticMetric label="Reading & Writing" value={diagnosticResults.score_reading_writing} detail={`${diagnosticSummary.sections[0]?.accuracy ?? 0}% accuracy`} />
                <DiagnosticMetric label="Math" value={diagnosticResults.score_math} detail={`${diagnosticSummary.sections[1]?.accuracy ?? 0}% accuracy`} />
                <DiagnosticMetric label="Overall accuracy" value={`${diagnosticSummary.overallAccuracy}%`} detail={`${diagnosticSummary.correctCount}/${diagnosticSummary.answeredCount} correct`} />
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="grid gap-4">
                  {diagnosticSummary.sections.map((section) => (
                    <article className="border border-white/10 bg-black/20 p-5" key={section.key}>
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-xl font-light text-white">{section.label}</h3>
                        <span className="text-3xl font-light text-white">{section.score}</span>
                      </div>
                      <div className="mt-4 h-2 bg-white/[0.07]">
                        <div className="h-full bg-white/75" style={{ width: `${section.accuracy}%` }} />
                      </div>
                      <p className="mt-3 text-sm font-light text-white/48">
                        {section.correct} correct out of {section.total || "available"} questions. Accuracy: {section.accuracy}%.
                      </p>
                    </article>
                  ))}
                </div>

                <div className="grid gap-4">
                  <article className="border border-white/10 bg-black/20 p-5">
                    <h3 className="text-xl font-light text-white">Priority topics</h3>
                    <div className="mt-4 grid gap-3">
                      {diagnosticSummary.topicChart.slice(0, 6).map((item) => (
                        <div key={item.topic}>
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-white/65">{item.topic}</span>
                            <span className="font-black text-white/80">{item.accuracy}%</span>
                          </div>
                          <div className="mt-2 h-1.5 bg-white/[0.07]">
                            <div className="h-full bg-white/70" style={{ width: `${item.accuracy}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="grid gap-4 md:grid-cols-2">
                    <DiagnosticList title="Strengths" items={diagnosticSummary.strengths} emptyText="No clear strengths yet." />
                    <DiagnosticList title="Weaknesses" items={diagnosticSummary.weaknesses} emptyText="No urgent weak topic." />
                  </article>
                </div>
              </div>

              <section className="mt-6 border border-white/10 bg-black/20">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 p-5">
                  <div>
                    <h3 className="text-xl font-light text-white">Mistakes and setbacks</h3>
                    <p className="mt-2 text-sm font-light text-white/45">These mistakes will drive the future personal practice curriculum.</p>
                  </div>
                  <span className="inline-flex items-center gap-2 border border-red-300/20 bg-red-950/20 px-3 py-2 text-sm font-black text-red-200">
                    <XCircle size={17} /> {diagnosticSummary.wrongQuestions.length} missed
                  </span>
                </div>
                <div className="divide-y divide-white/10">
                  {diagnosticSummary.wrongQuestions.slice(0, 4).map((question, index) => (
                    <div className="grid gap-3 p-5 md:grid-cols-[32px_1fr]" key={question.id}>
                      <span className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/[0.04] text-sm font-black text-white/70">
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                          <span>{sectionName(question.section)}</span>
                          <span>{formatTopicLabel(question.topic)}</span>
                          {question.trap_type ? <span>{formatTopicLabel(question.trap_type)}</span> : null}
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm font-light leading-6 text-white/58">{question.explanation || question.correct_answer}</p>
                      </div>
                    </div>
                  ))}
                  {diagnosticSummary.wrongQuestions.length === 0 ? (
                    <div className="p-5 text-sm font-light text-white/48">No missed questions were recorded for this diagnostic.</div>
                  ) : null}
                </div>
              </section>
            </section>
          ) : null}

          <section className="grid gap-5 lg:grid-cols-3">
            <article className="border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-center gap-3 text-white/70">
                <LineChart size={20} />
                <h3 className="text-lg font-light text-white">Progress track</h3>
              </div>
              <p className="mt-4 text-sm font-light leading-6 text-white/45">
                {hasDiagnostic ? "Your diagnostic score is saved. The next build will add completed study hours and weekly growth." : "Score history, completed hours, weekly growth, and readiness for 1400+ will be tracked here after the diagnostic."}
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
                {diagnosticSummary?.weaknesses.slice(0, 3).join(", ") || "Waiting for first diagnostic result."}
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

function buildDiagnosticSummary(results: Results): DiagnosticSummary {
  const questions = results.questions || [];
  const answeredCount = questions.length;
  const correctCount = questions.filter((question) => question.is_correct).length;
  const overallAccuracy = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
  const topicChart = Object.entries(results.topic_accuracy || {})
    .map(([topic, value]) => ({ topic: formatTopicLabel(topic), accuracy: Math.round(value * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy);
  const wrongQuestions = questions.filter((question) => !question.is_correct);
  const sections = [
    { key: "reading_writing", label: "Reading and Writing", score: results.score_reading_writing },
    { key: "math", label: "Math", score: results.score_math }
  ].map((section) => {
    const rows = questions.filter((question) => question.section === section.key);
    const total = rows.length;
    const correct = rows.filter((question) => question.is_correct).length;
    const accuracy = total ? Math.round((correct / total) * 100) : estimateAccuracyFromScore(section.score);
    return { ...section, total, correct, accuracy };
  });
  const weaknesses = normalizeLabels(results.weaknesses.length ? results.weaknesses : topicChart.filter((item) => item.accuracy < 65).map((item) => item.topic));
  const strengths = normalizeLabels(results.strengths.length ? results.strengths : topicChart.filter((item) => item.accuracy >= 75).map((item) => item.topic));

  return {
    overallAccuracy,
    correctCount,
    answeredCount,
    weaknesses,
    strengths,
    topicChart,
    sections,
    wrongQuestions,
    feedback: buildDiagnosticFeedback(results, weaknesses, overallAccuracy)
  };
}

function buildDiagnosticFeedback(results: Results, weaknesses: string[], accuracy: number) {
  if (results.report) return cleanReportText(results.report);
  if (weaknesses.length) {
    return `Your biggest score gains are in ${weaknesses.slice(0, 2).join(" and ")}. These topics should become the first blocks of your personal practice curriculum.`;
  }
  if (accuracy >= 80) return "Strong diagnostic result. Your next focus is hard timed practice and reducing small errors under pressure.";
  return "The diagnostic is complete. Review every missed question, then rebuild the weak skills before taking another timed module.";
}

function DiagnosticMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="border border-white/10 bg-black/20 p-5">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">{label}</div>
      <div className="mt-4 text-4xl font-light text-white">{value}</div>
      <div className="mt-3 text-sm font-light text-white/48">{detail}</div>
    </div>
  );
}

function DiagnosticList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div className="border border-white/10 bg-black/20 p-5">
      <h3 className="text-lg font-light text-white">{title}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.length ? items.map((item) => (
          <span className="border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/58" key={item}>
            {item}
          </span>
        )) : <span className="text-sm font-light text-white/42">{emptyText}</span>}
      </div>
    </div>
  );
}

function normalizeLabels(values: string[]) {
  const seen = new Set<string>();
  return values.reduce<string[]>((labels, value) => {
    const label = formatTopicLabel(value);
    if (label && !seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
    return labels;
  }, []);
}

function formatTopicLabel(value: string) {
  return value
    .replace(/[_/\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cleanReportText(value: string) {
  return value
    .replace(/[_/\\]+/g, " ")
    .replace(/[–—-]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sectionName(section?: string) {
  if (section === "reading_writing") return "Reading and Writing";
  if (section === "math") return "Math";
  return "SAT";
}

function scoreBand(score: number) {
  if (score >= 1500) return "Elite range";
  if (score >= 1400) return "1400+ target reached";
  if (score >= 1200) return "Strong foundation";
  if (score >= 1000) return "Build consistency";
  return "Core skills first";
}

function estimateAccuracyFromScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(((score - 200) / 600) * 100)));
}
