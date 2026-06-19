"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookMarked,
  BookOpenCheck,
  Bot,
  CalendarDays,
  Crown,
  Flame,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Map,
  MessageSquareText,
  Rocket,
  Search,
  Target,
  Trophy,
  User,
  Zap
} from "lucide-react";
import { ApiError, api, clearAuth, getStudentName, getToken } from "@/lib/api";

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

const navItems = [
  { label: "AI Tutor Chat", badge: "New", icon: Bot, href: "/practice" },
  { label: "Dashboard", active: true, icon: LayoutDashboard, href: "/dashboard" },
  { label: "My Study Plan", icon: Map, href: "/my-1400" },
  { label: "Leaderboard", icon: Trophy, href: "/about-us" },
  { label: "Diagnostic & Mock Tests", icon: BookOpenCheck, href: "/sat-test" },
  { label: "Quick Practice", icon: Zap, href: "/practice" },
  { label: "Reading Analyzer", icon: Search, href: "/reading-analyzer" },
  { label: "Vocabulary Builder", icon: LibraryBig, href: "/practice/reading" },
  { label: "Webinars", icon: CalendarDays, href: "/my-1400" },
  { label: "Profile", icon: User, href: "/dashboard" }
];

export default function DashboardPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [history, setHistory] = useState<AnalyticsHistory | null>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<Results | null>(null);
  const [requestedAttemptId, setRequestedAttemptId] = useState<string | null>(null);
  const [canShowDashboard, setCanShowDashboard] = useState(true);
  const [message, setMessage] = useState("");
  const [goalScore, setGoalScore] = useState("1400");
  const [goalUniversity, setGoalUniversity] = useState("Set university");
  const [examDate, setExamDate] = useState("");
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  const latestHistoryItem = history?.score_history[history.score_history.length - 1];
  const latestScore = latestHistoryItem?.score;
  const latestAttemptId = requestedAttemptId || latestHistoryItem?.attempt_id;
  const satMockTest = tests.find((test) => test.is_premium) ?? tests[0];
  const diagnosticSummary = diagnosticResults ? buildDiagnosticSummary(diagnosticResults) : null;
  const storedName = getStudentName();
  const firstName = useMemo(() => {
    const name = (storedName || "O'quvchi").trim();
    return name.split(/\s+/)[0] || "O'quvchi";
  }, [storedName]);
  const daysLeft = useMemo(() => {
    if (!examDate) return null;
    const now = new Date();
    const target = new Date(`${examDate}T09:00:00`);
    return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86_400_000));
  }, [examDate]);
  const progressPercent = latestScore ? Math.max(8, Math.min(100, Math.round((latestScore / Number(goalScore || 1400)) * 100))) : 12;
  const motivationalLine = latestScore
    ? latestScore >= Number(goalScore || 1400)
      ? "Maqsadga yetdingiz. Endi barqarorlik va top-range savollar ustida ishlaymiz."
      : `${Number(goalScore || 1400) - latestScore} ball qoldi. Bugungi kichik mashq ham natijani yaqinlashtiradi.`
    : "Bugun diagnostic topshiring, keyin SATTEST sizga shaxsiy yo'l xaritasini quradi.";

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    setRequestedAttemptId(new URLSearchParams(window.location.search).get("attemptId"));
    setGoalScore(window.localStorage.getItem("sattest_goal_score") || "1400");
    setGoalUniversity(window.localStorage.getItem("sattest_goal_university") || "Set university");
    setExamDate(window.localStorage.getItem("sattest_exam_date") || "");
    const savedBookmarks = window.localStorage.getItem("sattest_bookmarks");
    try {
      setBookmarks(savedBookmarks ? JSON.parse(savedBookmarks) : []);
    } catch {
      setBookmarks([]);
    }

    withTimeout(api<Test[]>("/api/tests"), 4500).then(setTests).catch((error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        router.push("/login");
        return;
      }
      setMessage("Practice tests are temporarily unavailable.");
    });
    withTimeout(api<AnalyticsHistory>("/api/analytics/me"), 4500).then((data) => {
      setHistory(data);
      setCanShowDashboard(true);
    }).catch((error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        router.replace("/login");
        return;
      }
      setCanShowDashboard(true);
      setHistory({ attempts: 0, score_history: [] });
    });
  }, [router]);

  useEffect(() => {
    if (!latestAttemptId) {
      setDiagnosticResults(null);
      return;
    }
    api<Results>(`/api/attempts/${latestAttemptId}/results`).then(setDiagnosticResults).catch(() => setDiagnosticResults(null));
  }, [latestAttemptId]);

  async function start(testId: string) {
    try {
      const result = await api<{ attempt_id: string }>(`/api/tests/${testId}/attempts`, { method: "POST" });
      router.push(`/test/${result.attempt_id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start test.");
    }
  }

  function saveGoalScore() {
    const next = window.prompt("Maqsad ballingizni kiriting", goalScore);
    if (!next) return;
    setGoalScore(next);
    window.localStorage.setItem("sattest_goal_score", next);
  }

  function saveUniversity() {
    const next = window.prompt("Maqsad universitetingiz", goalUniversity === "Set university" ? "" : goalUniversity);
    if (!next) return;
    setGoalUniversity(next);
    window.localStorage.setItem("sattest_goal_university", next);
  }

  function saveExamDate() {
    const next = window.prompt("Imtihon sanasi (YYYY-MM-DD)", examDate || "2026-08-23");
    if (!next) return;
    setExamDate(next);
    window.localStorage.setItem("sattest_exam_date", next);
  }

  function logout() {
    clearAuth();
    router.replace("/login");
  }

  if (!canShowDashboard) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="flex min-h-screen items-center justify-center px-6 text-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.45em] text-[#FFD700]/70">SATTEST.UZ</p>
            <h1 className="mt-5 text-4xl font-light">Dashboard tayyorlanmoqda...</h1>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto grid min-h-screen max-w-[1800px] lg:grid-cols-[310px_1fr]">
        <aside className="border-b border-white/10 bg-[#0c0c0c] px-5 py-5 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-6">
          <div className="flex items-center justify-between gap-4 lg:block">
            <button className="text-left" onClick={() => router.push("/")} type="button">
              <p className="text-xl font-black tracking-[0.32em] text-[#FFD700]">SATTEST.UZ</p>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/40">Practice • Improve • Achieve</p>
            </button>
            <button className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/50 lg:hidden" onClick={logout} type="button">
              Log out
            </button>
          </div>

          <nav className="mt-6 flex gap-2 overflow-x-auto pb-2 lg:mt-10 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
            {navItems.map((item) => (
              <button
                className={`flex min-w-fit items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition lg:w-full ${
                  item.active
                    ? "border-[#FFD700]/55 bg-[#FFD700]/12 text-[#FFD700]"
                    : "border-transparent text-white/58 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                }`}
                key={item.label}
                onClick={() => router.push(item.href)}
                type="button"
              >
                <item.icon size={18} />
                <span className="font-semibold">{item.label}</span>
                {item.badge ? <span className="ml-auto rounded-full bg-[#FFD700] px-2 py-0.5 text-[10px] font-black text-black">{item.badge}</span> : null}
              </button>
            ))}
          </nav>

          <button
            className="mt-7 hidden w-full items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/45 transition hover:border-red-300/25 hover:bg-red-500/10 hover:text-red-100 lg:flex"
            onClick={logout}
            type="button"
          >
            <LogOut size={18} /> Log out
          </button>
        </aside>

        <section className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="flex flex-col gap-5 rounded-xl border border-white/10 bg-[#151515] p-5 md:flex-row md:items-end md:justify-between md:p-7">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#FFD700]/70">Personal dashboard</p>
              <h1 className="mt-4 text-4xl font-light leading-tight md:text-6xl">👋 Salom, {firstName}!</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/55">{motivationalLine}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-xl border border-[#FFD700] bg-[#FFD700] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-transparent hover:text-[#FFD700]" onClick={() => satMockTest && start(satMockTest.id)} type="button">
                Start mock
              </button>
              <button className="rounded-xl border border-white/12 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-white/62 transition hover:border-white/35 hover:text-white" onClick={() => router.push("/reading-analyzer")} type="button">
                Analyzer
              </button>
            </div>
          </header>

          {message ? <p className="mt-5 rounded-xl border border-[#FFD700]/25 bg-[#FFD700]/10 p-4 text-sm font-semibold text-[#FFD700]">{message}</p> : null}

          <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <ScoreCard
              latestScore={latestScore}
              diagnosticResults={diagnosticResults}
              diagnosticSummary={diagnosticSummary}
              onReport={() => latestAttemptId && router.push(`/results/${latestAttemptId}`)}
            />

            <div className="grid gap-5 sm:grid-cols-3 xl:grid-cols-1">
              <CompactCard
                icon={<CalendarDays size={22} />}
                label="Exam Countdown"
                title={daysLeft === null ? "Sana yo'q" : `${daysLeft} kun qoldi`}
                action={examDate ? `Imtihon: ${examDate}` : "+ Imtihon sanasini belgilash →"}
                onClick={saveExamDate}
              />
              <CompactCard
                icon={<Target size={22} />}
                label="Maqsad Ball"
                title={goalScore}
                action="Set goal button"
                onClick={saveGoalScore}
              />
              <CompactCard
                icon={<GraduationCap size={22} />}
                label="Maqsad Universitet"
                title={goalUniversity}
                action="Choose university"
                onClick={saveUniversity}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <RoadmapCard
              hasDiagnostic={Boolean(latestScore)}
              currentWeek={latestScore ? Math.max(1, Math.min(4, Math.ceil(progressPercent / 25))) : 1}
              examDate={examDate}
            />
            <section className="rounded-xl border border-white/10 bg-[#151515] p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.32em] text-white/36">Saved for review</p>
                  <h2 className="mt-2 text-2xl font-light">Bookmarked</h2>
                </div>
                <BookMarked className="text-[#FFD700]" size={26} />
              </div>
              <div className="mt-5 grid gap-3">
                {bookmarks.length ? bookmarks.slice(0, 5).map((item, index) => (
                  <article className="rounded-xl border border-white/10 bg-black/25 p-4" key={`${item}-${index}`}>
                    <p className="text-sm leading-6 text-white/65">{item}</p>
                  </article>
                )) : (
                  <div className="rounded-xl border border-dashed border-white/12 bg-black/20 p-6">
                    <p className="text-sm leading-6 text-white/48">
                      Hali bookmark yo'q. Reading Analyzer yoki practice ichida qiyin savollarni belgilab boring.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <ActionCard icon={<MessageSquareText size={22} />} title="AI Tutor Chat" text="Savolni yozing, SAT usulida tushuntirish oling." href="/practice" router={router} />
            <ActionCard icon={<Zap size={22} />} title="Quick Practice" text="5 savollik tez mashq bilan bugungi streakni saqlang." href="/practice" router={router} />
            <ActionCard icon={<Search size={22} />} title="Reading Analyzer" text="Passage, screenshot va savollarni AI bilan tahlil qiling." href="/reading-analyzer" router={router} />
            <ActionCard icon={<Crown size={22} />} title="Mock Tests" text="Diagnostic yoki full mock testni boshlang." href="/sat-test" router={router} />
          </section>
        </section>
      </div>
    </main>
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Request timed out")), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function ScoreCard({ latestScore, diagnosticResults, diagnosticSummary, onReport }: {
  latestScore?: number;
  diagnosticResults: Results | null;
  diagnosticSummary: DiagnosticSummary | null;
  onReport: () => void;
}) {
  const score = diagnosticResults?.score_total ?? latestScore;
  const rw = diagnosticResults?.score_reading_writing ?? 0;
  const math = diagnosticResults?.score_math ?? 0;

  return (
    <section className="relative overflow-hidden rounded-xl border border-white/10 bg-[#151515] p-5 md:p-7">
      <div className="absolute right-5 top-5 hidden md:block">
        <SattestMascot />
      </div>
      <div className="relative z-10 max-w-3xl">
        <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/38">📊 Last Test Result</p>
        <div className="mt-5 flex flex-wrap items-end gap-4">
          <h2 className="text-7xl font-light leading-none text-white md:text-8xl">{score ?? "—"}</h2>
          <span className="mb-2 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#FFD700]">
            {score ? scoreBand(score) : "Diagnostic kerak"}
          </span>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <ScoreMetric label="Reading & Writing" value={rw || "—"} />
          <ScoreMetric label="Math" value={math || "—"} />
          <ScoreMetric label="Accuracy" value={diagnosticSummary ? `${diagnosticSummary.overallAccuracy}%` : "—"} />
        </div>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-white/52">
          {diagnosticSummary?.feedback || "Diagnostic topshirganingizdan keyin bu yerda oxirgi ball, bo'limlar va zaif mavzular ko'rinadi."}
        </p>
        {score ? (
          <button className="mt-6 inline-flex items-center gap-3 rounded-xl border border-[#FFD700] bg-[#FFD700] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-transparent hover:text-[#FFD700]" onClick={onReport} type="button">
            Full report <ArrowRight size={16} />
          </button>
        ) : null}
      </div>
    </section>
  );
}

function SattestMascot() {
  return (
    <div className="relative h-44 w-44" aria-label="SATTEST original mascot">
      <div className="absolute inset-6 rounded-full bg-[#FFD700]/15 blur-2xl" />
      <div className="absolute left-8 top-6 h-28 w-28 rounded-[36px] border border-[#FFD700]/45 bg-gradient-to-br from-[#FFD700] to-[#8b7208] shadow-[0_18px_60px_rgba(255,215,0,0.18)] rotate-[-8deg]" />
      <div className="absolute left-14 top-14 flex gap-4">
        <span className="h-5 w-5 rounded-full bg-black" />
        <span className="h-5 w-5 rounded-full bg-black" />
      </div>
      <div className="absolute left-[74px] top-[86px] h-2 w-10 rounded-full bg-black/70" />
      <Rocket className="absolute bottom-4 right-5 text-[#FFD700]" size={48} />
      <Flame className="absolute bottom-7 left-5 text-[#FFD700]" size={30} />
    </div>
  );
}

function ScoreMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{label}</p>
      <p className="mt-2 text-2xl font-light text-white">{value}</p>
    </div>
  );
}

function CompactCard({ icon, label, title, action, onClick }: { icon: ReactNode; label: string; title: string; action: string; onClick: () => void }) {
  return (
    <button className="rounded-xl border border-white/10 bg-[#151515] p-5 text-left transition hover:border-[#FFD700]/40 hover:bg-[#FFD700]/[0.06]" onClick={onClick} type="button">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#FFD700]/20 bg-[#FFD700]/10 text-[#FFD700]">{icon}</div>
      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-white/36">{label}</p>
      <h3 className="mt-2 text-2xl font-light text-white">{title}</h3>
      <p className="mt-3 text-sm text-[#FFD700]">{action}</p>
    </button>
  );
}

function RoadmapCard({ hasDiagnostic, currentWeek, examDate }: { hasDiagnostic: boolean; currentWeek: number; examDate: string }) {
  const steps = [
    { label: "Diagnostic taken", complete: hasDiagnostic },
    { label: `Current week ${currentWeek}`, complete: hasDiagnostic },
    { label: "Weak topics sprint", complete: false },
    { label: "Mock test date", complete: false },
    { label: examDate ? `Exam: ${examDate}` : "Exam date", complete: false }
  ];

  return (
    <section className="rounded-xl border border-white/10 bg-[#151515] p-5 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-white/36">Study Roadmap</p>
          <h2 className="mt-2 text-2xl font-light">Your path to 1400+</h2>
        </div>
        <Map className="text-[#FFD700]" size={28} />
      </div>
      <div className="mt-7 space-y-0">
        {steps.map((step, index) => (
          <div className="grid grid-cols-[28px_1fr] gap-4" key={step.label}>
            <div className="flex flex-col items-center">
              <span className={`h-7 w-7 rounded-full border ${step.complete ? "border-[#FFD700] bg-[#FFD700]" : "border-white/18 bg-white/5"}`} />
              {index < steps.length - 1 ? <span className={`h-12 w-px ${step.complete ? "bg-[#FFD700]" : "bg-white/12"}`} /> : null}
            </div>
            <div className="pb-7">
              <p className={step.complete ? "font-semibold text-white" : "text-white/48"}>{step.label}</p>
              <p className="mt-1 text-sm text-white/35">{step.complete ? "Completed" : "Upcoming milestone"}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActionCard({ icon, title, text, href, router }: { icon: ReactNode; title: string; text: string; href: string; router: ReturnType<typeof useRouter> }) {
  return (
    <button className="rounded-xl border border-white/10 bg-[#151515] p-5 text-left transition hover:border-[#FFD700]/40 hover:bg-white/[0.04]" onClick={() => router.push(href)} type="button">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-[#FFD700]">{icon}</div>
      <h3 className="mt-5 text-xl font-light text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/45">{text}</p>
    </button>
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
    return `Eng katta o'sish imkoniyati: ${weaknesses.slice(0, 2).join(" va ")}. Bugungi practice shu mavzulardan boshlansin.`;
  }
  if (accuracy >= 80) return "Kuchli diagnostic natija. Endi timed practice va mayda xatolarni kamaytirishga o'ting.";
  return "Diagnostic tugadi. Har bir xato savolni ko'rib chiqing, keyin zaif mavzularni qayta quring.";
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
