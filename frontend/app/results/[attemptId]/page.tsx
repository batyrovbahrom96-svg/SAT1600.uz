"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
  Lock,
  RefreshCcw,
  Route,
  Target,
  Timer,
  Trophy,
  XCircle
} from "lucide-react";
import { CurriculumPrompt } from "@/components/CurriculumPrompt";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumText } from "@/components/PremiumText";
import { ApiError, api, getSubscriptionStatus } from "@/lib/api";

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

const KNOWN_LABELS: Record<string, string> = {
  command_of_evidence_quantitative_graph: "Command of Evidence Quantitative Graph",
  cross_text_connection: "Cross Text Connection",
  text_structure_function: "Text Structure and Function",
  functions: "Functions"
};

const LOWERCASE_WORDS = new Set(["and", "as", "for", "in", "of", "on", "the", "to"]);

const demoResults: Results = {
  attempt_id: "demo",
  score_total: 1320,
  score_reading_writing: 660,
  score_math: 660,
  final_score: 0.78,
  topic_accuracy: {
    "Information and Ideas": 0.86,
    "Craft and Structure": 0.76,
    "Expression of Ideas": 0.72,
    "Algebra": 0.84,
    "Advanced Math": 0.68,
    "Problem Solving": 0.73
  },
  weaknesses: ["Advanced Math", "Expression of Ideas", "Problem Solving"],
  strengths: ["Information and Ideas", "Algebra"],
  report: "This 1320-level sample shows a strong foundation with specific score lift available in Advanced Math, Expression of Ideas, and Problem Solving. Most missed questions came from sign handling, transition logic, and unit interpretation under time pressure.",
  questions: [
    {
      id: "demo-1",
      section: "math",
      module: 2,
      topic: "Advanced Math",
      prompt: "The function f is defined by f(x) = |x - 4x|. What value of a satisfies f(5) - f(a) = -15?",
      selected_answer: "5",
      correct_answer: "10",
      is_correct: false,
      explanation: "First simplify f(x) to |-3x|, so f(5) = 15. The equation becomes 15 - f(a) = -15, which means f(a) = 30. Since |-3a| = 30, a can be 10 or -10 depending on the answer choices. The key mistake was substituting before isolating f(a).",
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
    },
    {
      id: "demo-3",
      section: "reading_writing",
      module: 1,
      topic: "Craft and Structure",
      prompt: "In context, which word most precisely completes the sentence?",
      selected_answer: "C",
      correct_answer: "C",
      is_correct: true,
      explanation: "The selected word matches both the tone and the contrast established in the previous sentence.",
      trap_type: null,
      difficulty: 5,
      time_spent_seconds: 44
    },
    {
      id: "demo-4",
      section: "reading_writing",
      module: 2,
      topic: "Expression of Ideas",
      prompt: "Which choice best connects the two sentences and preserves the logical relationship?",
      selected_answer: "A",
      correct_answer: "D",
      is_correct: false,
      explanation: "The second sentence gives a consequence, not another example. A transition such as therefore or consequently preserves the logic better than a contrast or continuation signal.",
      trap_type: "transition logic mismatch",
      difficulty: 6,
      time_spent_seconds: 66
    },
    {
      id: "demo-5",
      section: "reading_writing",
      module: 2,
      topic: "Information and Ideas",
      prompt: "Which finding, if true, would most directly support the claim in the passage?",
      selected_answer: "B",
      correct_answer: "B",
      is_correct: true,
      explanation: "The finding directly confirms the claimed relationship instead of describing a related but weaker trend.",
      trap_type: null,
      difficulty: 6,
      time_spent_seconds: 61
    },
    {
      id: "demo-6",
      section: "reading_writing",
      module: 2,
      topic: "Boundaries",
      prompt: "Which choice completes the text so that it conforms to Standard English conventions?",
      selected_answer: "D",
      correct_answer: "D",
      is_correct: true,
      explanation: "The punctuation correctly joins the independent clause and the explanatory phrase without creating a comma splice.",
      trap_type: null,
      difficulty: 6,
      time_spent_seconds: 52
    },
    {
      id: "demo-7",
      section: "math",
      module: 1,
      topic: "Algebra",
      prompt: "If 3x + 7 = 28, what is the value of x?",
      selected_answer: "7",
      correct_answer: "7",
      is_correct: true,
      explanation: "Subtract 7 from both sides to get 3x = 21, then divide by 3.",
      trap_type: null,
      difficulty: 3,
      time_spent_seconds: 31
    },
    {
      id: "demo-8",
      section: "math",
      module: 1,
      topic: "Problem Solving",
      prompt: "A quantity increases from 80 to 100. What is the percent increase?",
      selected_answer: "20%",
      correct_answer: "25%",
      is_correct: false,
      explanation: "The increase is 20, but percent increase is measured against the original value: 20 divided by 80 equals 25%.",
      trap_type: "percent base error",
      difficulty: 5,
      time_spent_seconds: 57
    },
    {
      id: "demo-9",
      section: "math",
      module: 2,
      topic: "Algebra",
      prompt: "A line has slope 3 and passes through (2, 5). Which equation represents the line?",
      selected_answer: "y = 3x - 1",
      correct_answer: "y = 3x - 1",
      is_correct: true,
      explanation: "Use y = mx + b. Substituting (2, 5) gives 5 = 6 + b, so b = -1.",
      trap_type: null,
      difficulty: 5,
      time_spent_seconds: 49
    },
    {
      id: "demo-10",
      section: "math",
      module: 2,
      topic: "Geometry and Trigonometry",
      prompt: "A right triangle has legs 6 and 8. What is the hypotenuse?",
      selected_answer: "10",
      correct_answer: "10",
      is_correct: true,
      explanation: "Apply the Pythagorean theorem: 6 squared plus 8 squared equals 100, so the hypotenuse is 10.",
      trap_type: null,
      difficulty: 4,
      time_spent_seconds: 36
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
  const [showCurriculumPanel, setShowCurriculumPanel] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);

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

  useEffect(() => {
    if (attemptId === "demo") {
      setSubscriptionChecked(true);
      return;
    }
    getSubscriptionStatus()
      .then((status) => setHasActiveSubscription(status.has_active_subscription))
      .catch(() => setHasActiveSubscription(false))
      .finally(() => setSubscriptionChecked(true));
  }, [attemptId]);

  const reportResults = results ?? (attemptId === "demo" ? demoResults : null);
  const analytics = useMemo(() => reportResults ? buildReportAnalytics(reportResults) : null, [reportResults]);

  useEffect(() => {
    if (!reportResults || !analytics || !subscriptionChecked || attemptId === "demo" || hasActiveSubscription) return undefined;
    const timer = window.setTimeout(() => setShowCurriculumPanel(true), 2200);
    return () => window.clearTimeout(timer);
  }, [analytics, attemptId, hasActiveSubscription, reportResults, subscriptionChecked]);

  useEffect(() => {
    if (hasActiveSubscription) {
      setShowCurriculumPanel(false);
    }
  }, [hasActiveSubscription]);

  if (!reportResults || !analytics) {
    return (
      <main className="sat-lux-page min-h-screen text-white">
        <LuxuryNavbar />
        <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center border border-white/10 bg-white/[0.035] text-white">
            <BarChart3 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-4xl font-light text-white md:text-5xl">Loading score report</h1>
          <p className="mt-4 max-w-xl text-sm font-light leading-7 text-white/48">
            {message || "We are preparing your score, mistakes, and next study plan."}
          </p>
          {message ? (
            <PremiumButton
              className="mt-7"
              icon={<ArrowRight size={18} />}
              onClick={() => router.push("/dashboard")}
              type="button"
            >
              Back to dashboard
            </PremiumButton>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="sat-lux-page min-h-screen text-white">
      <LuxuryNavbar />
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <div className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Post-test analytics</p>
            <PremiumText as="h1" className="mt-5 text-5xl font-light leading-none text-white md:text-7xl" variant="hero">
              Score report
            </PremiumText>
            <p className="mt-6 max-w-3xl text-lg font-light leading-8 text-white/50">
              Your score, accuracy, weak topics, missed-question explanations, and the next study moves are all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PremiumButton
              icon={<Download size={18} />}
              onClick={() => window.print()}
              type="button"
              variant="glass"
            >
              Print report
            </PremiumButton>
            <PremiumButton
              icon={<RefreshCcw size={18} />}
              onClick={() => router.push(attemptId === "demo" ? "/pricing" : "/dashboard")}
              type="button"
            >
              {attemptId === "demo" ? "Choose plan" : "New test"}
            </PremiumButton>
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
                <TopicBar key={item.rawTopic} topic={item.topic} accuracy={item.accuracy} />
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

        <section className="mt-6 border border-emerald-300/25 bg-emerald-300/[0.06] p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.36em] text-emerald-100/58">
                {hasActiveSubscription ? "30-day plan active" : "Locked 30-day plan"}
              </p>
              <h2 className="mt-4 text-3xl font-light leading-tight text-white md:text-4xl">
                {hasActiveSubscription
                  ? "You can see the problem. Now open the exercises that fix it."
                  : "Sizning 30 kunlik rejangiz tayyor. Pro: 200,000 so'm."}
              </h2>
              <p className="mt-4 max-w-3xl text-sm font-light leading-7 text-white/58">
                {hasActiveSubscription
                  ? "Your approved subscription is active. Continue from this diagnostic into the daily route, supervised theory, retake dates, and progress tracking for these exact weaknesses."
                  : "Your diagnostic score and weak spots are clear. Unlock Pro to open the exact 30-day repair route built from these mistakes: daily tasks, explanations, retakes, and progress tracking."}
              </p>
              {!hasActiveSubscription ? (
                <div className="mt-5 inline-flex items-center gap-3 border border-yellow-200/25 bg-yellow-200/[0.08] px-4 py-3 text-sm font-black text-yellow-50">
                  <Lock size={17} />
                  <span>Pro opens instantly after payment bot confirmation.</span>
                </div>
              ) : null}
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {(analytics.weaknesses.length ? analytics.weaknesses : ["Reading/Writing", "Math", "Timing"]).slice(0, 3).map((weakness) => (
                  <div className="border border-white/10 bg-black/20 p-3" key={weakness}>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Needs repair</p>
                    <p className="mt-2 text-sm font-semibold text-white/76">{weakness}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-white/10 bg-black/25 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">
                {hasActiveSubscription ? "Next assignment" : "Locked next assignment"}
              </p>
              <div className="mt-4 grid gap-2">
                {buildLockedAssignments(analytics.weaknesses).map((assignment) => (
                  <div className="flex items-center justify-between gap-3 border border-white/10 bg-white/[0.035] px-3 py-3" key={assignment}>
                    <span className={`text-sm font-light text-white/70 ${hasActiveSubscription ? "" : "blur-[1px]"}`}>{assignment}</span>
                    {hasActiveSubscription ? (
                      <CheckCircle2 className="text-emerald-100/60" size={17} />
                    ) : (
                      <Lock className="text-white/35" size={16} />
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-white/55">
                {hasActiveSubscription
                  ? "Start the first set now and retake the weak section after completion."
                  : "Your 30-day plan is ready now. Pay 200,000 so'm and open the route while the weak spots are fresh."}
              </p>
              <PremiumButton
                className="mt-5 w-full"
                icon={<ArrowRight size={18} />}
                onClick={() => router.push(hasActiveSubscription && attemptId ? `/curriculum/${attemptId}` : "/pricing?plan=pro&from=diagnostic-result")}
                type="button"
              >
                {hasActiveSubscription ? "Open my route" : "Pay 200,000 so'm and unlock"}
              </PremiumButton>
            </div>
          </div>
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

      {showCurriculumPanel ? (
        <CurriculumPrompt
          onClose={() => setShowCurriculumPanel(false)}
          onOpen={() => router.push(hasActiveSubscription && attemptId ? `/curriculum/${attemptId}` : "/pricing?plan=pro&from=diagnostic-result")}
          score={reportResults.score_total}
          weaknesses={analytics.weaknesses}
          isUnlocked={hasActiveSubscription}
        />
      ) : null}
    </main>
  );
}

function ResultsUnavailableNotice() {
  const previewItems = [
    {
      icon: BarChart3,
      title: "Score breakdown",
      text: "Overall score, Reading and Writing score, Math score, and topic accuracy."
    },
    {
      icon: XCircle,
      title: "Mistake map",
      text: "Wrong answers grouped by section, question type, trap pattern, and timing pressure."
    },
    {
      icon: Route,
      title: "Personal study route",
      text: "A focused curriculum that turns the diagnostic result into daily practice priorities."
    }
  ];

  return (
    <main className="sat-lux-page min-h-screen text-white">
      <LuxuryNavbar />

      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl gap-8 px-5 py-14 md:px-8 lg:grid-cols-[1fr_470px] lg:items-center">
        <div>
          <div className="flex h-16 w-16 items-center justify-center border border-yellow-200/25 bg-yellow-200/10 text-yellow-100">
            <CircleAlert size={30} />
          </div>
          <p className="mt-8 text-[10px] font-black uppercase tracking-[0.42em] text-white/42">
            Results unavailable
          </p>
          <PremiumText as="h1" className="mt-5 max-w-4xl text-5xl font-light leading-none text-white md:text-7xl" variant="hero">
            Take the diagnostic first. Then your report appears here.
          </PremiumText>
          <p className="mt-7 max-w-2xl text-lg font-light leading-8 text-white/55">
            This page is reserved for completed SAT mock tests. After the diagnostic, SATTEST.UZ will show your score, mistakes, weak topics, timing pressure, and the next practice route.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            {["Free diagnostic", "Demo report", "Choose pricing"].map((step, index) => (
              <div className="border border-white/10 bg-white/[0.035] p-4" key={step}>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">Step {index + 1}</p>
                <p className="mt-3 text-lg font-light text-white">{step}</p>
              </div>
            ))}
          </div>

          <PremiumButton className="mt-9" href="/mock-test/diagnostic" icon={<ArrowRight size={18} />}>
            Start free diagnostic
          </PremiumButton>
        </div>

        <div className="border border-white/12 bg-white/[0.035] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.38)]">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/42">What will appear here</p>
          <div className="mt-5 grid gap-3">
            {previewItems.map((item) => {
              const Icon = item.icon;
              return (
                <div className="border border-white/10 bg-black/20 p-4" key={item.title}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-black/25 text-white/65">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-light text-white">{item.title}</h2>
                      <p className="mt-2 text-sm font-light leading-6 text-white/48">{item.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">Report preview</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                ["Overall", "—"],
                ["R&W", "—"],
                ["Math", "—"]
              ].map(([label, value]) => (
                <div className="border border-white/10 p-3" key={label}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{label}</p>
                  <p className="mt-2 text-3xl font-light text-white">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-light leading-6 text-white/45">
              Once the mock test is submitted, these empty values become your real diagnostic scores and report.
            </p>
          </div>
        </div>
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
    .map(([topic, value]) => ({ rawTopic: topic, topic: formatTopicLabel(topic), accuracy: Math.round(value * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy);
  const wrongQuestions = questions
    .filter((question) => !question.is_correct)
    .map(normalizeQuestionLabels);
  const trapCounts = wrongQuestions.reduce<Record<string, number>>((counts, question) => {
    const trap = formatTrapLabel(question.trap_type || "general reasoning miss");
    counts[trap] = (counts[trap] || 0) + 1;
    return counts;
  }, {});
  const topTrap = Object.entries(trapCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const weaknesses = normalizeLabelList(results.weaknesses.length ? results.weaknesses : topicChart.filter((item) => item.accuracy < 65).map((item) => item.topic));
  const strengths = normalizeLabelList(results.strengths.length ? results.strengths : topicChart.filter((item) => item.accuracy >= 75).map((item) => item.topic));
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

function buildLockedAssignments(weaknesses: string[]) {
  const [first = "Advanced Math", second = "Transitions", third = "Evidence traps"] = weaknesses;

  return [
    `18 ${cleanLabel(first)} questions ready`,
    `12 ${cleanLabel(second)} drills ready`,
    `Next mini mock scheduled after ${cleanLabel(third)} repair`
  ];
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
  if (results.report) return formatReportText(results.report);
  if (weaknesses.length) {
    return `Your biggest score lift is in ${weaknesses.slice(0, 2).join(" and ")}. Review missed examples, then do short timed sets until accuracy is above 75%.${topTrap ? ` Watch for ${topTrap} traps.` : ""}`;
  }
  if (accuracy >= 80) {
    return "Strong performance. Your next move is harder timed practice and reducing small mistakes under pressure.";
  }
  return "Keep building consistency. Review every missed question, write the rule that would have solved it, then retest that topic.";
}

function buildStudyPlan(weaknesses: string[], wrongQuestions: ResultQuestion[], topTrap: string) {
  const priority = weaknesses[0] || formatTopicLabel(wrongQuestions[0]?.topic || "") || "mixed practice";
  const second = weaknesses[1] || formatTopicLabel(wrongQuestions[1]?.topic || "") || "timing";
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
  return value.replace(/[_/\\-]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeQuestionLabels(question: ResultQuestion): ResultQuestion {
  return {
    ...question,
    topic: formatTopicLabel(question.topic),
    subtopic: question.subtopic ? formatTopicLabel(question.subtopic) : question.subtopic,
    trap_type: question.trap_type ? formatTrapLabel(question.trap_type) : question.trap_type
  };
}

function normalizeLabelList(values: string[]) {
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
  const trimmed = value.trim();
  if (!trimmed) return "";
  const known = KNOWN_LABELS[trimmed.toLowerCase()];
  if (known) return known;
  return titleCase(cleanLabel(trimmed));
}

function formatTrapLabel(value: string) {
  return cleanLabel(value).toLowerCase();
}

function formatReportText(value: string) {
  let formatted = value;
  Object.keys(KNOWN_LABELS)
    .sort((a, b) => b.length - a.length)
    .forEach((label) => {
      formatted = formatted.replace(new RegExp(escapeRegExp(label), "g"), KNOWN_LABELS[label]);
    });
  return formatted
    .replace(/[_/\\]+/g, " ")
    .replace(/[–—-]/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildMistakeExplanation(question: ResultQuestion) {
  const { cleanText, meta } = parseExplanation(question.explanation || "");
  const trap = question.trap_type || meta.pattern || meta.logic_pattern || "";
  const cleanedTrap = trap ? formatTopicLabel(trap) : "";
  const reasoning = cleanText || "Review the evidence carefully and compare it with the exact wording of the correct answer.";
  const selected = question.selected_answer || "blank";
  const correct = question.correct_answer || "the credited answer";
  const nextMove = meta.logic_pattern
    ? `When you see this question type again, ${formatSentence(meta.logic_pattern)}.`
    : `Before choosing, underline the exact proof for ${correct} and reject any answer that adds a claim the text does not prove.`;

  return [
    {
      title: "Why the correct answer works",
      body: reasoning
    },
    {
      title: "Why your answer missed",
      body: `You chose ${selected}, but the credited answer is ${correct}. The missed answer most likely went beyond the evidence or followed an attractive trap instead of the exact support in the text.`
    },
    {
      title: "Trap to avoid",
      body: cleanedTrap
        ? `${cleanedTrap}: this trap looks reasonable because it borrows words or timing from the passage, but it does not prove the required conclusion.`
        : "Do not choose an answer because it sounds related. Choose it only if the passage directly supports it."
    },
    {
      title: "Next move",
      body: nextMove
    }
  ];
}

function parseExplanation(value: string) {
  const meta: Record<string, string> = {};
  const textParts: string[] = [];

  value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const match = part.match(/^([a-zA-Z_]+)=(.+)$/);
      if (match) {
        meta[match[1]] = match[2].trim();
        return;
      }
      textParts.push(part);
    });

  return {
    meta,
    cleanText: formatExplanationText(textParts.join("; "))
  };
}

function formatExplanationText(value: string) {
  return value
    .replace(/^Ambiguity-first validation:\s*/i, "")
    .replace(/[_/\\]+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatSentence(value: string) {
  const cleaned = cleanLabel(value).toLowerCase();
  return cleaned ? `${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}` : "check the exact evidence before selecting";
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      if (index > 0 && LOWERCASE_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-4">
        <span className="min-w-0 max-w-[calc(100%-4rem)] break-words text-sm font-light leading-5 text-white/76">
          {formatTopicLabel(topic)}
        </span>
        <span className="shrink-0 text-sm font-black tabular-nums text-white/50">{accuracy}%</span>
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
  const explanation = buildMistakeExplanation(question);

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
          <span className="border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-black text-white/65" data-sattest-no-translate="true">
            {question.topic}
          </span>
          {question.trap_type ? (
            <span className="border border-red-300/20 bg-red-950/20 px-2 py-1 text-xs font-black text-red-200" data-sattest-no-translate="true">
              Trap: {cleanLabel(question.trap_type)}
            </span>
          ) : null}
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-light text-white/45">
          <Timer size={16} /> {formatSeconds(question.time_spent_seconds)}
        </div>
      </div>

      <p className="mt-5 font-light leading-7 text-white/78" data-sattest-no-translate="true">
        {question.prompt}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="border border-red-300/20 bg-red-950/20 p-3">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-red-200/70">Your answer</div>
          <div className="mt-2 font-black text-red-100" data-sattest-no-translate="true">
            {question.selected_answer || "Blank"}
          </div>
        </div>
        <div className="border border-emerald-300/20 bg-emerald-950/20 p-3">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/70">Correct answer</div>
          <div className="mt-2 font-black text-emerald-100" data-sattest-no-translate="true">
            {question.correct_answer}
          </div>
        </div>
      </div>

      <div className="mt-4 border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-white">Enhanced explanation</div>
            <p className="mt-1 text-xs font-light text-white/42">Clear reason, trap, and next action for this mistake.</p>
          </div>
          <Lightbulb className="shrink-0 text-yellow-100/70" size={19} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {explanation.map((item) => (
            <div className="border border-white/10 bg-white/[0.03] p-4" key={item.title}>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">{item.title}</div>
              <p className="mt-2 text-sm font-light leading-6 text-white/62" data-sattest-no-translate="true">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
