"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Download,
  Lightbulb,
  RefreshCcw,
  Target,
  Timer,
  Trophy,
  XCircle
} from "lucide-react";
import { ApiError, api } from "@/lib/api";

type ResultQuestion = {
  id: string;
  section?: "reading_writing" | "math" | string;
  module?: number;
  topic: string;
  subtopic?: string | null;
  prompt: string;
  question_type?: string;
  format?: "multiple_choice" | "grid_in" | string;
  selected_answer?: string | null;
  correct_answer: string;
  is_correct: boolean;
  marked_for_review?: boolean;
  explanation: string;
  trap_type?: string | null;
  difficulty?: number;
  estimated_time?: number;
  time_spent_seconds: number;
};

type Results = {
  attempt_id?: string;
  score_total: number;
  score_reading_writing: number;
  score_math: number;
  final_score: number | null;
  topic_accuracy: Record<string, number>;
  weaknesses: string[];
  strengths: string[];
  report: string;
  questions: ResultQuestion[];
};

type SectionSummary = {
  key: string;
  label: string;
  score: number;
  correct: number;
  total: number;
  accuracy: number;
};

const demoResults: Results = {
  attempt_id: "demo",
  score_total: 1320,
  score_reading_writing: 660,
  score_math: 660,
  final_score: 0.73,
  topic_accuracy: {
    "Information and Ideas": 0.82,
    "Craft and Structure": 0.67,
    "Algebra": 0.74,
    "Advanced Math": 0.52,
    "Problem Solving": 0.59
  },
  weaknesses: ["Advanced Math", "Problem Solving"],
  strengths: ["Information and Ideas", "Algebra"],
  report: "Focus next on Advanced Math and Problem Solving. Most misses came from algebra setup and unit interpretation traps.",
  questions: [
    {
      id: "demo-1",
      section: "math",
      module: 2,
      topic: "Advanced Math",
      prompt: "The function f is defined by f(x) = |x - 4x|. What value of a satisfies f(5) - f(a) = -15?",
      selected_answer: "5",
      correct_answer: "-20",
      is_correct: false,
      explanation: "First simplify f(x) to |-3x|. Since f(5) = 15, the equation becomes 15 - f(a) = -15, so f(a) = 30. That gives |-3a| = 30, so a can be 10 or -10 if choices allow. Review the exact answer choices and absolute value logic.",
      trap_type: "absolute value sign error",
      difficulty: 7,
      time_spent_seconds: 78
    },
    {
      id: "demo-2",
      section: "reading_writing",
      module: 1,
      topic: "Information and Ideas",
      prompt: "Which choice best supports the researchers' conclusion?",
      selected_answer: "B",
      correct_answer: "B",
      is_correct: true,
      explanation: "The answer directly matches the trend in the evidence instead of focusing on only one data point.",
      trap_type: null,
      difficulty: 5,
      time_spent_seconds: 58
    }
  ]
};

export default function ResultsPage() {
  const params = useParams<{ attemptId?: string | string[] }>();
  const pathname = usePathname();
  const pathAttemptId = pathname.split("/").filter(Boolean).at(-1);
  const attemptId = (Array.isArray(params.attemptId) ? params.attemptId[0] : params.attemptId) || pathAttemptId;
  const router = useRouter();
  const [results, setResults] = useState<Results | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!attemptId) return;

    if (attemptId === "demo") {
      setResults(demoResults);
      return;
    }

    api<Results>(`/api/attempts/${attemptId}/results`).then(setResults).catch((error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
        router.push("/dashboard");
        return;
      }
      setMessage(error instanceof Error ? error.message : "Unable to load this score report.");
    });
  }, [attemptId, router]);

  const reportResults = results ?? (attemptId === "demo" ? demoResults : null);
  const analytics = useMemo(() => reportResults ? buildReportAnalytics(reportResults) : null, [reportResults]);

  if (!reportResults || !analytics) {
    return (
      <main className="min-h-screen bg-[#101112] text-white">
        <ResultsHeader />
        <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center border border-white/10 bg-white/[0.035] text-white">
            <BarChart3 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-4xl font-light text-white md:text-5xl">Loading score report</h1>
          <p className="mt-4 max-w-xl text-sm font-light leading-7 text-white/48">
            {message || "We are preparing your score, mistakes, and next study plan."}
          </p>
          {message ? (
            <button
              className="mt-7 inline-flex h-12 items-center gap-3 border border-white bg-white px-5 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white"
              onClick={() => router.push("/dashboard")}
              type="button"
            >
              Back to dashboard <ArrowRight size={18} />
            </button>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <ResultsHeader />
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <div className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Post-test analytics</p>
            <h1 className="mt-5 text-5xl font-light leading-none text-white md:text-7xl">Score report</h1>
            <p className="mt-6 max-w-3xl text-lg font-light leading-8 text-white/50">
              Your score, accuracy, weak topics, missed-question explanations, and the next study moves are all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-12 items-center gap-3 border border-white/15 bg-white/[0.035] px-5 text-xs font-black uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-white/35 hover:text-white"
              onClick={() => window.print()}
              type="button"
            >
              <Download size={18} /> Print report
            </button>
            <button
              className="inline-flex h-12 items-center gap-3 border border-white bg-white px-5 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white"
              onClick={() => router.push("/dashboard")}
              type="button"
            >
              <RefreshCcw size={18} /> New test
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.2fr]">
          <ScoreCard
            icon={<Trophy size={22} />}
            label="Total SAT score"
            value={reportResults.score_total}
            detail={analytics.scoreBand}
            tone="brand"
          />
          <ScoreCard
            icon={<BookOpenCheck size={22} />}
            label="Reading and Writing"
            value={reportResults.score_reading_writing}
            detail={`${analytics.sectionSummaries[0]?.accuracy ?? 0}% accuracy`}
            tone="mint"
          />
          <ScoreCard
            icon={<Target size={22} />}
            label="Math"
            value={reportResults.score_math}
            detail={`${analytics.sectionSummaries[1]?.accuracy ?? 0}% accuracy`}
            tone="warning"
          />
          <div className="border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">Overall accuracy</div>
                <div className="mt-3 text-5xl font-light text-white">{analytics.overallAccuracy}%</div>
              </div>
              <AccuracyRing value={analytics.overallAccuracy} />
            </div>
            <p className="mt-5 text-sm font-light leading-6 text-white/48">
              {analytics.correctCount} correct out of {analytics.answeredCount} answered questions.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-light text-white">Accuracy by topic</h2>
                <p className="mt-2 text-sm font-light text-white/45">These are the fastest score gains to chase first.</p>
              </div>
              <BarChart3 className="text-white/55" />
            </div>
            <div className="mt-5 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topicChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="topic" hide />
                  <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "#18191a", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    formatter={(value) => [`${value}%`, "Accuracy"]}
                    labelFormatter={(label) => String(label)}
                  />
                  <Bar dataKey="accuracy" fill="#f4f4f4" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {analytics.topicChart.map((item) => (
                <TopicBar key={item.topic} topic={item.topic} accuracy={item.accuracy} />
              ))}
            </div>
          </section>

          <section className="border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center gap-3">
              <Brain className="text-white/55" />
              <h2 className="text-2xl font-light text-white">Smart feedback</h2>
            </div>
            <p className="mt-5 border border-white/10 bg-black/20 p-4 text-sm font-light leading-7 text-white/62">
              {analytics.feedback}
            </p>
            <div className="mt-5 grid gap-3">
              {analytics.sectionSummaries.map((section) => (
                <SectionBreakdown key={section.key} section={section} />
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <InsightPanel
            icon={<CheckCircle2 size={20} />}
            title="Strengths"
            emptyText="No clear strengths yet. Finish more questions to unlock them."
            items={analytics.strengths}
            tone="green"
          />
          <InsightPanel
            icon={<CircleAlert size={20} />}
            title="Weaknesses"
            emptyText="No urgent weak topic. Move into harder timed practice."
            items={analytics.weaknesses}
            tone="red"
          />
          <section className="border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center gap-3">
              <Lightbulb className="text-yellow-200/70" />
              <h2 className="text-2xl font-light text-white">Next 7 days</h2>
            </div>
            <div className="mt-4 space-y-3">
              {analytics.studyPlan.map((step, index) => (
                <div className="flex gap-3" key={step}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/10 bg-black/20 text-sm font-black text-white/70">
                    {index + 1}
                  </span>
                  <p className="text-sm font-light leading-6 text-white/58">{step}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 border border-white/10 bg-white/[0.035]">
          <div className="flex flex-col gap-2 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-light text-white">Mistake analysis</h2>
              <p className="mt-2 text-sm font-light text-white/45">Wrong questions, explanations, trap type, and what to fix.</p>
            </div>
            <div className="inline-flex items-center gap-2 border border-red-300/20 bg-red-950/20 px-3 py-2 text-sm font-black text-red-200">
              <XCircle size={18} /> {analytics.wrongQuestions.length} missed
            </div>
          </div>

          {analytics.wrongQuestions.length === 0 ? (
            <div className="p-6 text-sm font-light text-white/48">
              No missed questions were recorded for this attempt.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {analytics.wrongQuestions.map((question, index) => (
                <MistakeCard key={question.id} index={index + 1} question={question} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-white/55" />
            <h2 className="text-2xl font-light text-white">Tutor or parent summary</h2>
          </div>
          <p className="mt-5 text-sm font-light leading-7 text-white/58">
            Score: {reportResults.score_total}. Reading and Writing: {reportResults.score_reading_writing}. Math: {reportResults.score_math}.
            Accuracy: {analytics.overallAccuracy}%. Priority topics: {analytics.weaknesses.slice(0, 3).join(", ") || "none flagged"}.
            Most common trap: {analytics.topTrap || "not enough missed questions to detect a pattern"}.
          </p>
        </section>
      </section>
    </main>
  );
}

function buildReportAnalytics(results: Results) {
  const questions = results.questions || [];
  const answered = questions.filter((question) => question.selected_answer !== undefined);
  const answeredCount = answered.length || questions.length;
  const correctCount = questions.filter((question) => question.is_correct).length;
  const overallAccuracy = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
  const topicChart = Object.entries(results.topic_accuracy || {})
    .map(([topic, value]) => ({ topic, accuracy: Math.round(value * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy);
  const wrongQuestions = questions.filter((question) => !question.is_correct);
  const trapCounts = wrongQuestions.reduce<Record<string, number>>((counts, question) => {
    const trap = cleanLabel(question.trap_type || "general reasoning miss");
    counts[trap] = (counts[trap] || 0) + 1;
    return counts;
  }, {});
  const topTrap = Object.entries(trapCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const weaknesses = results.weaknesses.length ? results.weaknesses : topicChart.filter((item) => item.accuracy < 65).map((item) => item.topic);
  const strengths = results.strengths.length ? results.strengths : topicChart.filter((item) => item.accuracy >= 75).map((item) => item.topic);
  const sectionSummaries = buildSectionSummaries(results, questions);
  const feedback = buildFeedback(results, overallAccuracy, weaknesses, topTrap);
  const studyPlan = buildStudyPlan(weaknesses, wrongQuestions, topTrap);

  return {
    answeredCount,
    correctCount,
    overallAccuracy,
    topicChart,
    wrongQuestions,
    topTrap,
    weaknesses,
    strengths,
    sectionSummaries,
    feedback,
    scoreBand: scoreBand(results.score_total),
    studyPlan
  };
}

function buildSectionSummaries(results: Results, questions: ResultQuestion[]): SectionSummary[] {
  const sections = [
    { key: "reading_writing", label: "Reading and Writing", score: results.score_reading_writing },
    { key: "math", label: "Math", score: results.score_math }
  ];

  return sections.map((section) => {
    const rows = questions.filter((question) => question.section === section.key);
    const total = rows.length;
    const correct = rows.filter((question) => question.is_correct).length;
    const accuracy = total ? Math.round((correct / total) * 100) : estimateAccuracyFromScore(section.score);
    return { ...section, total, correct, accuracy };
  });
}

function buildFeedback(results: Results, accuracy: number, weaknesses: string[], topTrap: string) {
  if (results.report) return results.report;
  if (weaknesses.length) {
    return `Your biggest score lift is in ${weaknesses.slice(0, 2).join(" and ")}. Review missed examples, then do short timed sets until accuracy is above 75%.${topTrap ? ` Watch for ${topTrap} traps.` : ""}`;
  }
  if (accuracy >= 80) {
    return "Strong performance. Your next move is harder timed practice and reducing small mistakes under pressure.";
  }
  return "Keep building consistency. Review every missed question, write the rule that would have solved it, then retest that topic.";
}

function buildStudyPlan(weaknesses: string[], wrongQuestions: ResultQuestion[], topTrap: string) {
  const priority = weaknesses[0] || wrongQuestions[0]?.topic || "mixed practice";
  const second = weaknesses[1] || wrongQuestions[1]?.topic || "timing";
  return [
    `Day 1: Review every missed ${priority} question and rewrite the solution in your own words.`,
    `Day 2-3: Drill 20 targeted ${priority} questions without a timer, then correct immediately.`,
    `Day 4: Do one timed ${second} set and track blanks, changes, and rushed mistakes.`,
    `Day 5-6: Retake missed question types. Aim for 80% accuracy before adding harder problems.`,
    `Day 7: Take another mixed module and compare the trap pattern${topTrap ? `, especially ${topTrap}` : ""}.`
  ];
}

function scoreBand(score: number) {
  if (score >= 1500) return "Elite range";
  if (score >= 1400) return "Highly competitive";
  if (score >= 1200) return "Strong foundation";
  if (score >= 1000) return "Build consistency";
  return "Core skills first";
}

function estimateAccuracyFromScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(((score - 200) / 600) * 100)));
}

function cleanLabel(value: string) {
  return value.replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function sectionName(section?: string) {
  if (section === "reading_writing") return "Reading and Writing";
  if (section === "math") return "Math";
  return "SAT";
}

function ResultsHeader() {
  return (
    <header className="border-b border-white/10 bg-[#101112]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <Link href="/" className="flex h-12 w-[210px] items-center border border-white/10 bg-black/30 px-4 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
          <img className="h-auto w-full object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.32)]" src="/assets/brand/sattest-wordmark.png" alt="SATTEST.UZ" />
        </Link>
        <nav className="hidden items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/48 md:flex">
          <Link className="flex items-center gap-2 px-3 py-2 transition-colors hover:text-white" href="/dashboard">
            <BookOpenCheck size={16} /> Tests
          </Link>
          <Link className="flex items-center gap-2 px-3 py-2 text-white" href="/results/demo">
            <BarChart3 size={16} /> Results
          </Link>
        </nav>
      </div>
    </header>
  );
}

function ScoreCard({
  icon,
  label,
  value,
  detail,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: number;
  detail: string;
  tone: "brand" | "mint" | "warning";
}) {
  const toneClass = {
    brand: "border-white/12 bg-white/[0.05] text-white",
    mint: "border-emerald-200/15 bg-emerald-400/10 text-emerald-100",
    warning: "border-yellow-200/15 bg-yellow-400/10 text-yellow-100"
  }[tone];

  return (
    <div className="border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">{label}</div>
        <div className={`border p-2 ${toneClass}`}>{icon}</div>
      </div>
      <div className="mt-4 text-5xl font-light text-white">{value}</div>
      <div className="mt-3 text-sm font-light text-white/48">{detail}</div>
    </div>
  );
}

function AccuracyRing({ value }: { value: number }) {
  const background = `conic-gradient(#f4f4f4 ${value * 3.6}deg, rgba(255,255,255,0.12) 0deg)`;
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background }}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#101112] text-sm font-black text-white">
        {value}%
      </div>
    </div>
  );
}

function TopicBar({ topic, accuracy }: { topic: string; accuracy: number }) {
  const color = accuracy >= 75 ? "bg-emerald-300" : accuracy >= 60 ? "bg-yellow-200" : "bg-red-300";
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-light text-white/76">{topic}</span>
        <span className="font-black text-white/50">{accuracy}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden bg-white/10">
        <div className={`h-full ${color}`} style={{ width: `${accuracy}%` }} />
      </div>
    </div>
  );
}

function SectionBreakdown({ section }: { section: SectionSummary }) {
  return (
    <div className="border border-white/10 bg-black/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-light text-white">{section.label}</div>
          <div className="mt-1 text-sm font-light text-white/42">
            {section.total ? `${section.correct}/${section.total} correct` : "Accuracy estimated from score"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-light text-white">{section.score}</div>
          <div className="text-sm font-black text-white/42">{section.accuracy}%</div>
        </div>
      </div>
    </div>
  );
}

function InsightPanel({
  icon,
  title,
  emptyText,
  items,
  tone
}: {
  icon: ReactNode;
  title: string;
  emptyText: string;
  items: string[];
  tone: "green" | "red";
}) {
  const chipClass = tone === "green" ? "border-emerald-200/15 bg-emerald-400/10 text-emerald-100" : "border-red-200/15 bg-red-400/10 text-red-100";
  return (
    <section className="border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-center gap-3">
        <div className={tone === "green" ? "text-emerald-100/80" : "text-red-100/80"}>{icon}</div>
        <h2 className="text-2xl font-light text-white">{title}</h2>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.length ? items.map((item) => (
          <span className={`border px-3 py-2 text-sm font-black ${chipClass}`} key={item}>
            {item}
          </span>
        )) : <p className="text-sm font-light text-white/48">{emptyText}</p>}
      </div>
    </section>
  );
}

function MistakeCard({ index, question }: { index: number; question: ResultQuestion }) {
  return (
    <article className="p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <span className="border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-black text-white/65">
            Miss {index}
          </span>
          <span className="border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-black text-white/65">
            {sectionName(question.section)} M{question.module || "-"}
          </span>
          <span className="border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-black text-white/65">
            {question.topic}
          </span>
          {question.trap_type ? (
            <span className="border border-red-300/20 bg-red-950/20 px-2 py-1 text-xs font-black text-red-200">
              Trap: {cleanLabel(question.trap_type)}
            </span>
          ) : null}
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-light text-white/45">
          <Timer size={16} /> {formatSeconds(question.time_spent_seconds)}
        </div>
      </div>

      <p className="mt-5 font-light leading-7 text-white/78">{question.prompt}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="border border-red-300/20 bg-red-950/20 p-3">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-red-200/70">Your answer</div>
          <div className="mt-2 font-black text-red-100">{question.selected_answer || "Blank"}</div>
        </div>
        <div className="border border-emerald-300/20 bg-emerald-950/20 p-3">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/70">Correct answer</div>
          <div className="mt-2 font-black text-emerald-100">{question.correct_answer}</div>
        </div>
      </div>

      <div className="mt-4 border border-white/10 bg-black/20 p-4">
        <div className="text-sm font-black text-white">Explanation</div>
        <p className="mt-2 text-sm font-light leading-6 text-white/58">{question.explanation}</p>
      </div>
    </article>
  );
}
