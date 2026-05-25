"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Nav } from "@/components/Nav";
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
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const [results, setResults] = useState<Results | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
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

  const analytics = useMemo(() => results ? buildReportAnalytics(results) : null, [results]);

  if (!results || !analytics) {
    return (
      <main className="min-h-screen bg-paper">
        <Nav />
        <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-4 text-center">
          <BarChart3 className="h-12 w-12 text-brand" />
          <h1 className="mt-5 text-3xl font-black text-ink">Loading score report</h1>
          <p className="mt-3 max-w-xl text-slate-600">
            {message || "We are preparing your score, mistakes, and next study plan."}
          </p>
          {message ? (
            <button
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-3 font-bold text-white hover:bg-blue-700"
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
    <main className="min-h-screen bg-paper">
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-brand">Post-test analytics</p>
            <h1 className="mt-2 text-3xl font-black text-ink md:text-4xl">SAT1600 Score Report</h1>
            <p className="mt-2 max-w-3xl text-slate-600">
              Your score, accuracy, weak topics, missed-question explanations, and the next study moves are all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-ink hover:bg-slate-50"
              onClick={() => window.print()}
              type="button"
            >
              <Download size={18} /> Print report
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
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
            value={results.score_total}
            detail={analytics.scoreBand}
            tone="brand"
          />
          <ScoreCard
            icon={<BookOpenCheck size={22} />}
            label="Reading and Writing"
            value={results.score_reading_writing}
            detail={`${analytics.sectionSummaries[0]?.accuracy ?? 0}% accuracy`}
            tone="mint"
          />
          <ScoreCard
            icon={<Target size={22} />}
            label="Math"
            value={results.score_math}
            detail={`${analytics.sectionSummaries[1]?.accuracy ?? 0}% accuracy`}
            tone="warning"
          />
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-500">Overall accuracy</div>
                <div className="mt-2 text-4xl font-black text-ink">{analytics.overallAccuracy}%</div>
              </div>
              <AccuracyRing value={analytics.overallAccuracy} />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-600">
              {analytics.correctCount} correct out of {analytics.answeredCount} answered questions.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-ink">Accuracy by topic</h2>
                <p className="mt-1 text-sm text-slate-600">These are the fastest score gains to chase first.</p>
              </div>
              <BarChart3 className="text-brand" />
            </div>
            <div className="mt-5 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topicChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="topic" hide />
                  <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value}%`, "Accuracy"]} labelFormatter={(label) => String(label)} />
                  <Bar dataKey="accuracy" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {analytics.topicChart.map((item) => (
                <TopicBar key={item.topic} topic={item.topic} accuracy={item.accuracy} />
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Brain className="text-brand" />
              <h2 className="text-xl font-black text-ink">Smart feedback</h2>
            </div>
            <p className="mt-4 rounded-md bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-900">
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
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Lightbulb className="text-warning" />
              <h2 className="text-xl font-black text-ink">Next 7 days</h2>
            </div>
            <div className="mt-4 space-y-3">
              {analytics.studyPlan.map((step, index) => (
                <div className="flex gap-3" key={step}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-black text-ink">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold leading-6 text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-ink">Mistake analysis</h2>
              <p className="mt-1 text-sm text-slate-600">Wrong questions, explanations, trap type, and what to fix.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-black text-red-700">
              <XCircle size={18} /> {analytics.wrongQuestions.length} missed
            </div>
          </div>

          {analytics.wrongQuestions.length === 0 ? (
            <div className="p-6 text-sm font-semibold text-slate-600">
              No missed questions were recorded for this attempt.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {analytics.wrongQuestions.map((question, index) => (
                <MistakeCard key={question.id} index={index + 1} question={question} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-brand" />
            <h2 className="text-xl font-black text-ink">Tutor or parent summary</h2>
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">
            Score: {results.score_total}. Reading and Writing: {results.score_reading_writing}. Math: {results.score_math}.
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
    brand: "bg-blue-50 text-brand",
    mint: "bg-emerald-50 text-emerald-700",
    warning: "bg-yellow-50 text-yellow-700"
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-black text-slate-500">{label}</div>
        <div className={`rounded-md p-2 ${toneClass}`}>{icon}</div>
      </div>
      <div className="mt-3 text-4xl font-black text-ink">{value}</div>
      <div className="mt-2 text-sm font-bold text-slate-600">{detail}</div>
    </div>
  );
}

function AccuracyRing({ value }: { value: number }) {
  const background = `conic-gradient(#1d4ed8 ${value * 3.6}deg, #e2e8f0 0deg)`;
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background }}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-sm font-black text-ink">
        {value}%
      </div>
    </div>
  );
}

function TopicBar({ topic, accuracy }: { topic: string; accuracy: number }) {
  const color = accuracy >= 75 ? "bg-emerald-500" : accuracy >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-ink">{topic}</span>
        <span className="font-black text-slate-600">{accuracy}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${accuracy}%` }} />
      </div>
    </div>
  );
}

function SectionBreakdown({ section }: { section: SectionSummary }) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-black text-ink">{section.label}</div>
          <div className="mt-1 text-sm text-slate-500">
            {section.total ? `${section.correct}/${section.total} correct` : "Accuracy estimated from score"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-ink">{section.score}</div>
          <div className="text-sm font-bold text-slate-500">{section.accuracy}%</div>
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
  const chipClass = tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700";
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={tone === "green" ? "text-emerald-700" : "text-red-700"}>{icon}</div>
        <h2 className="text-xl font-black text-ink">{title}</h2>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.length ? items.map((item) => (
          <span className={`rounded-md px-3 py-2 text-sm font-black ${chipClass}`} key={item}>
            {item}
          </span>
        )) : <p className="text-sm font-semibold text-slate-600">{emptyText}</p>}
      </div>
    </section>
  );
}

function MistakeCard({ index, question }: { index: number; question: ResultQuestion }) {
  return (
    <article className="p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">
            Miss {index}
          </span>
          <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">
            {sectionName(question.section)} M{question.module || "-"}
          </span>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">
            {question.topic}
          </span>
          {question.trap_type ? (
            <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700">
              Trap: {cleanLabel(question.trap_type)}
            </span>
          ) : null}
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-500">
          <Timer size={16} /> {formatSeconds(question.time_spent_seconds)}
        </div>
      </div>

      <p className="mt-4 font-semibold leading-7 text-ink">{question.prompt}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md bg-red-50 p-3">
          <div className="text-xs font-black uppercase text-red-700">Your answer</div>
          <div className="mt-1 font-black text-red-900">{question.selected_answer || "Blank"}</div>
        </div>
        <div className="rounded-md bg-emerald-50 p-3">
          <div className="text-xs font-black uppercase text-emerald-700">Correct answer</div>
          <div className="mt-1 font-black text-emerald-900">{question.correct_answer}</div>
        </div>
      </div>

      <div className="mt-4 rounded-md bg-slate-50 p-4">
        <div className="text-sm font-black text-ink">Explanation</div>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{question.explanation}</p>
      </div>
    </article>
  );
}
