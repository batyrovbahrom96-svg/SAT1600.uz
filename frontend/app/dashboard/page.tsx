"use client";

import Image from "next/image";
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
  Search,
  Target,
  Trophy,
  User,
  Zap
} from "lucide-react";
import { ApiError, api, clearAuth, getStudentName, getToken } from "@/lib/api";
import { getSubscriptionStatus } from "@/lib/api";
import { languages, useLanguage, type Language } from "@/lib/i18n";

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
  { key: "aiTutor", badgeKey: "new", icon: Bot, href: "/practice" },
  { key: "dashboard", active: true, icon: LayoutDashboard, href: "/dashboard" },
  { key: "studyPlan", icon: Map, href: "/my-1400" },
  { key: "leaderboard", icon: Trophy, href: "/results/demo" },
  { key: "tests", icon: BookOpenCheck, href: "/sat-test" },
  { key: "quickPractice", icon: Zap, href: "/practice" },
  { key: "readingAnalyzer", icon: Search, href: "/reading-analyzer" },
  { key: "vocabulary", icon: LibraryBig, href: "/practice/reading" },
  { key: "webinars", icon: CalendarDays, href: "/my-1400#webinars" },
  { key: "profile", icon: User, href: "/dashboard#profile" }
];

const copy = {
  en: {
    nav: {
      aiTutor: "AI Tutor Chat",
      dashboard: "Dashboard",
      studyPlan: "My Study Plan",
      leaderboard: "Leaderboard",
      tests: "Diagnostic & Mock Tests",
      quickPractice: "Quick Practice",
      readingAnalyzer: "Reading Analyzer",
      vocabulary: "Vocabulary Builder",
      webinars: "Webinars",
      profile: "Profile"
    },
    new: "New",
    logout: "Log out",
    personalDashboard: "Personal dashboard",
    greeting: "Hello",
    fallbackName: "Student",
    motivationNoScore: "Take your diagnostic today. SATTEST will turn it into a personal score-growth roadmap.",
    motivationGoalReached: "Goal reached. Now we protect your score with harder timed practice.",
    motivationGap: (gap: number) => `${gap} points left. Today's focused practice moves you closer.`,
    startMock: "Start mock",
    analyzer: "Analyzer",
    messageTests: "Practice tests are temporarily unavailable.",
    lastResult: "Last Test Result",
    diagnosticNeeded: "Diagnostic needed",
    rw: "Reading & Writing",
    math: "Math",
    accuracy: "Accuracy",
    noScoreText: "Your latest score, section breakdown, and weak areas will appear here after the diagnostic.",
    takeDiagnostic: "Take Diagnostic Test",
    fullReport: "Full report",
    examCountdown: "Exam Countdown",
    noDate: "No date set",
    daysLeft: (days: number) => `${days} days left`,
    setExamDate: "+ Set exam date →",
    examDate: (date: string) => `Exam: ${date}`,
    goalScore: "Goal Score",
    setGoal: "Set goal",
    goalUniversity: "Goal University",
    setUniversity: "Set university",
    chooseUniversity: "Choose university",
    proStatus: "Plan Status",
    proActive: "Pro Active",
    freePlan: "Free Plan",
    upgradePro: "Upgrade to Pro",
    streak: "Study Streak",
    streakValue: "0 days",
    streakAction: "Start today with 5 questions",
    roadmap: "Roadmap",
    pathTitle: "Your path to 1400+",
    completed: "Completed",
    upcoming: "Upcoming milestone",
    diagnosticTaken: "Diagnostic taken",
    currentWeek: (week: number) => `Current week ${week}`,
    weakSprint: "Weak topics sprint",
    mockDate: "Mock test date",
    examDateStep: "Exam date",
    savedLabel: "Saved questions",
    bookmarked: "Bookmarked",
    noBookmarks: "No bookmarks yet. Save difficult questions in Reading Analyzer or practice so you can review them here.",
    actionAi: "Ask a question and get an SAT-style explanation.",
    actionPractice: "Keep today's streak with a quick 5-question drill.",
    actionAnalyzer: "Analyze passages, screenshots, and questions with AI.",
    actionTests: "Start a diagnostic or full mock test.",
    editGoalTitle: "Set your goal score",
    editGoalHelp: "Most students aim for 1400+, but choose the score that matches your university target.",
    editUniversityTitle: "Choose goal university",
    editUniversityHelp: "Write the university or scholarship target you want SATTEST to keep visible.",
    editExamTitle: "Set SAT exam date",
    editExamHelp: "Use YYYY-MM-DD format so the countdown stays accurate.",
    save: "Save",
    cancel: "Cancel",
    scorePlaceholder: "1400",
    universityPlaceholder: "Example: NYU Abu Dhabi",
    datePlaceholder: "2026-08-23"
  },
  ru: {
    nav: {
      aiTutor: "AI Tutor Chat",
      dashboard: "Панель",
      studyPlan: "Мой план",
      leaderboard: "Рейтинг",
      tests: "Диагностика и Mock Tests",
      quickPractice: "Быстрая практика",
      readingAnalyzer: "Reading Analyzer",
      vocabulary: "Словарь",
      webinars: "Вебинары",
      profile: "Профиль"
    },
    new: "Новое",
    logout: "Выйти",
    personalDashboard: "Личный кабинет",
    greeting: "Привет",
    fallbackName: "Студент",
    motivationNoScore: "Пройдите диагностику сегодня. SATTEST превратит результат в личный план роста.",
    motivationGoalReached: "Цель достигнута. Теперь закрепляем результат сложной практикой на время.",
    motivationGap: (gap: number) => `Осталось ${gap} баллов. Сегодняшняя практика приближает вас к цели.`,
    startMock: "Начать mock",
    analyzer: "Analyzer",
    messageTests: "Практические тесты временно недоступны.",
    lastResult: "Последний результат",
    diagnosticNeeded: "Нужна диагностика",
    rw: "Reading & Writing",
    math: "Math",
    accuracy: "Точность",
    noScoreText: "После диагностики здесь появятся ваш балл, секции и слабые темы.",
    takeDiagnostic: "Пройти диагностику",
    fullReport: "Полный отчет",
    examCountdown: "До экзамена",
    noDate: "Дата не указана",
    daysLeft: (days: number) => `Осталось ${days} дней`,
    setExamDate: "+ Указать дату экзамена →",
    examDate: (date: string) => `Экзамен: ${date}`,
    goalScore: "Целевой балл",
    setGoal: "Задать цель",
    goalUniversity: "Целевой университет",
    setUniversity: "Выберите университет",
    chooseUniversity: "Выбрать университет",
    proStatus: "Статус плана",
    proActive: "Pro активен",
    freePlan: "Бесплатный план",
    upgradePro: "Получить Pro",
    streak: "Серия занятий",
    streakValue: "0 дней",
    streakAction: "Начните сегодня с 5 вопросов",
    roadmap: "Карта пути",
    pathTitle: "Ваш путь к 1400+",
    completed: "Готово",
    upcoming: "Следующий этап",
    diagnosticTaken: "Диагностика пройдена",
    currentWeek: (week: number) => `Текущая неделя ${week}`,
    weakSprint: "Спринт по слабым темам",
    mockDate: "Дата mock test",
    examDateStep: "Дата экзамена",
    savedLabel: "Сохраненные вопросы",
    bookmarked: "Закладки",
    noBookmarks: "Пока нет закладок. Сохраняйте сложные вопросы в Analyzer или практике.",
    actionAi: "Задайте вопрос и получите SAT-объяснение.",
    actionPractice: "Сделайте быстрые 5 вопросов сегодня.",
    actionAnalyzer: "Анализируйте тексты, скриншоты и вопросы с AI.",
    actionTests: "Начните диагностику или полный mock test.",
    editGoalTitle: "Укажите целевой балл",
    editGoalHelp: "Большинство учеников целятся в 1400+, но выберите свою цель.",
    editUniversityTitle: "Выберите университет",
    editUniversityHelp: "Напишите университет или стипендию, которую хотите держать в фокусе.",
    editExamTitle: "Укажите дату SAT",
    editExamHelp: "Формат YYYY-MM-DD сохранит точный отсчет.",
    save: "Сохранить",
    cancel: "Отмена",
    scorePlaceholder: "1400",
    universityPlaceholder: "Например: NYU Abu Dhabi",
    datePlaceholder: "2026-08-23"
  },
  uz: {
    nav: {
      aiTutor: "AI Tutor Chat",
      dashboard: "Dashboard",
      studyPlan: "Mening Rejam",
      leaderboard: "Leaderboard",
      tests: "Diagnostic & Mock Tests",
      quickPractice: "Tezkor Mashq",
      readingAnalyzer: "Reading Analyzer",
      vocabulary: "Vocabulary Builder",
      webinars: "Webinarlar",
      profile: "Profil"
    },
    new: "Yangi",
    logout: "Chiqish",
    personalDashboard: "Shaxsiy dashboard",
    greeting: "Salom",
    fallbackName: "O'quvchi",
    motivationNoScore: "Bugun diagnostic topshiring. SATTEST natijangizdan shaxsiy yo'l xaritasini quradi.",
    motivationGoalReached: "Maqsadga yetdingiz. Endi qiyin timed practice bilan natijani mustahkamlaymiz.",
    motivationGap: (gap: number) => `${gap} ball qoldi. Bugungi aniq mashq sizni yaqinlashtiradi.`,
    startMock: "Mock boshlash",
    analyzer: "Analyzer",
    messageTests: "Practice testlar vaqtincha mavjud emas.",
    lastResult: "Oxirgi test natijasi",
    diagnosticNeeded: "Diagnostic kerak",
    rw: "Reading & Writing",
    math: "Math",
    accuracy: "Aniqlik",
    noScoreText: "Diagnosticdan keyin oxirgi ball, bo'limlar va zaif mavzular shu yerda ko'rinadi.",
    takeDiagnostic: "Diagnostic Testni Boshlash",
    fullReport: "To'liq hisobot",
    examCountdown: "Imtihongacha",
    noDate: "Sana yo'q",
    daysLeft: (days: number) => `${days} kun qoldi`,
    setExamDate: "+ Imtihon sanasini belgilash →",
    examDate: (date: string) => `Imtihon: ${date}`,
    goalScore: "Maqsad Ball",
    setGoal: "Maqsadni belgilash",
    goalUniversity: "Maqsad Universitet",
    setUniversity: "Universitet tanlang",
    chooseUniversity: "Universitet tanlash",
    proStatus: "Reja holati",
    proActive: "Pro faol",
    freePlan: "Bepul reja",
    upgradePro: "Pro olish",
    streak: "O'qish streak",
    streakValue: "0 kun",
    streakAction: "Bugun 5 savoldan boshlang",
    roadmap: "Yo'l Xaritasi",
    pathTitle: "1400+ yo'lingiz",
    completed: "Tugallandi",
    upcoming: "Keyingi bosqich",
    diagnosticTaken: "Diagnostic topshirildi",
    currentWeek: (week: number) => `Joriy hafta ${week}`,
    weakSprint: "Zaif mavzular sprinti",
    mockDate: "Mock test sanasi",
    examDateStep: "Imtihon sanasi",
    savedLabel: "Saqlangan Savollar",
    bookmarked: "Bookmarked",
    noBookmarks: "Hali bookmark yo'q. Reading Analyzer yoki practice ichida qiyin savollarni saqlab boring.",
    actionAi: "Savol yozing, SAT usulida tushuntirish oling.",
    actionPractice: "5 savollik tez mashq bilan bugungi streakni saqlang.",
    actionAnalyzer: "Passage, screenshot va savollarni AI bilan tahlil qiling.",
    actionTests: "Diagnostic yoki full mock testni boshlang.",
    editGoalTitle: "Maqsad ballingizni belgilang",
    editGoalHelp: "Ko'p o'quvchilar 1400+ ni nishonlaydi, lekin universitetingizga mos maqsadni tanlang.",
    editUniversityTitle: "Maqsad universitetni tanlang",
    editUniversityHelp: "SATTEST doim ko'rsatib turishi uchun universitet yoki grant maqsadingizni yozing.",
    editExamTitle: "SAT imtihon sanasini belgilang",
    editExamHelp: "Countdown to'g'ri ishlashi uchun YYYY-MM-DD formatidan foydalaning.",
    save: "Saqlash",
    cancel: "Bekor qilish",
    scorePlaceholder: "1400",
    universityPlaceholder: "Masalan: NYU Abu Dhabi",
    datePlaceholder: "2026-08-23"
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const t = copy[language];
  const [tests, setTests] = useState<Test[]>([]);
  const [history, setHistory] = useState<AnalyticsHistory | null>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<Results | null>(null);
  const [requestedAttemptId, setRequestedAttemptId] = useState<string | null>(null);
  const [canShowDashboard, setCanShowDashboard] = useState(true);
  const [message, setMessage] = useState("");
  const [isProActive, setIsProActive] = useState(false);
  const [goalScore, setGoalScore] = useState("1400");
  const [goalUniversity, setGoalUniversity] = useState("");
  const [examDate, setExamDate] = useState("");
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [editing, setEditing] = useState<"score" | "university" | "exam" | null>(null);
  const [draftValue, setDraftValue] = useState("");

  const latestHistoryItem = history?.score_history[history.score_history.length - 1];
  const latestScore = latestHistoryItem?.score;
  const latestAttemptId = requestedAttemptId || latestHistoryItem?.attempt_id;
  const satMockTest = tests.find((test) => test.is_premium) ?? tests[0];
  const diagnosticSummary = diagnosticResults ? buildDiagnosticSummary(diagnosticResults) : null;
  const storedName = getStudentName();
  const firstName = useMemo(() => {
    const name = (storedName || t.fallbackName).trim();
    return name.split(/\s+/)[0] || t.fallbackName;
  }, [storedName, t.fallbackName]);
  const daysLeft = useMemo(() => {
    if (!examDate) return null;
    const now = new Date();
    const target = new Date(`${examDate}T09:00:00`);
    return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86_400_000));
  }, [examDate]);
  const progressPercent = latestScore ? Math.max(8, Math.min(100, Math.round((latestScore / Number(goalScore || 1400)) * 100))) : 12;
  const motivationalLine = latestScore
    ? latestScore >= Number(goalScore || 1400)
      ? t.motivationGoalReached
      : t.motivationGap(Number(goalScore || 1400) - latestScore)
    : t.motivationNoScore;

  const withLanguage = (href: string) => {
    const [withoutHash, hash] = href.split("#");
    const [pathname, query = ""] = withoutHash.split("?");
    const params = new URLSearchParams(query);
    params.set("lang", language);
    return `${pathname}?${params.toString()}${hash ? `#${hash}` : ""}`;
  };

  const changeLanguage = (next: Language) => {
    setLanguage(next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    setRequestedAttemptId(new URLSearchParams(window.location.search).get("attemptId"));
    setGoalScore(window.localStorage.getItem("sattest_goal_score") || "1400");
    setGoalUniversity(window.localStorage.getItem("sattest_goal_university") || "");
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
      setMessage(t.messageTests);
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

    api<{ full_name: string }>("/api/auth/me")
      .then((profile) => {
        if (profile.full_name) window.localStorage.setItem("sat1600_full_name", profile.full_name);
      })
      .catch(() => {});

    getSubscriptionStatus()
      .then((status) => setIsProActive(status.has_active_subscription))
      .catch(() => setIsProActive(false));
  }, [router, t.messageTests]);

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
    setDraftValue(goalScore);
    setEditing("score");
  }

  function saveUniversity() {
    setDraftValue(goalUniversity);
    setEditing("university");
  }

  function saveExamDate() {
    setDraftValue(examDate);
    setEditing("exam");
  }

  function saveDraft() {
    const next = draftValue.trim();
    if (!next) return;
    if (editing === "score") {
      setGoalScore(next);
      window.localStorage.setItem("sattest_goal_score", next);
    }
    if (editing === "university") {
      setGoalUniversity(next);
      window.localStorage.setItem("sattest_goal_university", next);
    }
    if (editing === "exam") {
      setExamDate(next);
      window.localStorage.setItem("sattest_exam_date", next);
    }
    setEditing(null);
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
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,215,0,0.10),transparent_34%),linear-gradient(135deg,rgba(255,215,0,0.04),transparent_42%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-[1800px] lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-[#b89418]/20 bg-[#080808]/95 px-5 py-5 shadow-[20px_0_80px_rgba(0,0,0,0.25)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-6">
          <div className="flex items-center justify-between gap-4 lg:block">
            <button className="flex items-center gap-4 text-left lg:block" onClick={() => router.push("/")} type="button">
              <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#FFD700]/35 bg-black shadow-[0_0_34px_rgba(255,215,0,0.14)] lg:h-24 lg:w-24">
                <Image className="h-full w-full object-cover" src="/assets/brand/sattest-lion-crest.png" alt="SATTEST lion crest" width={160} height={160} priority />
              </span>
              <span className="block">
                <span className="block text-xl font-black tracking-[0.32em] text-[#FFD700] lg:mt-4">SATTEST.UZ</span>
                <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.24em] text-white/42">Practice • Improve • Achieve</span>
              </span>
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <LanguageButtons language={language} onChange={changeLanguage} />
              <button className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/50" onClick={logout} type="button">
                {t.logout}
              </button>
            </div>
          </div>

          <nav className="mt-6 flex gap-2 overflow-x-auto pb-2 lg:mt-10 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
            {navItems.map((item) => (
              <button
                className={`flex min-w-fit items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition lg:w-full ${
                  item.active
                    ? "border-[#FFD700] bg-[#FFD700] text-black shadow-[0_14px_44px_rgba(255,215,0,0.18)]"
                    : "border-transparent text-white/55 hover:border-[#FFD700]/30 hover:bg-[#FFD700]/[0.07] hover:text-[#FFD700]"
                }`}
                key={item.key}
                onClick={() => router.push(withLanguage(item.href))}
                type="button"
              >
                <item.icon size={18} />
                <span className="font-semibold">{t.nav[item.key as keyof typeof t.nav]}</span>
                {item.badgeKey ? <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-black ${item.active ? "bg-black text-[#FFD700]" : "bg-[#FFD700] text-black"}`}>{t.new}</span> : null}
              </button>
            ))}
          </nav>

          <div className="mt-7 hidden lg:block">
            <LanguageButtons language={language} onChange={changeLanguage} />
          </div>

          <button
            className="mt-7 hidden w-full items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/45 transition hover:border-red-300/25 hover:bg-red-500/10 hover:text-red-100 lg:flex"
            onClick={logout}
            type="button"
          >
            <LogOut size={18} /> {t.logout}
          </button>

          <div className="mt-auto hidden border-t border-[#FFD700]/15 pt-5 lg:block">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/28">SATTEST App v1.0</p>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#FFD700]/15 bg-[#151515] p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#FFD700]/35 bg-[#FFD700] text-sm font-black text-black">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{firstName}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FFD700]/70">{isProActive ? t.proActive : t.freePlan}</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="flex flex-col gap-5 rounded-xl border border-[#FFD700]/15 bg-[#151515]/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)] md:flex-row md:items-end md:justify-between md:p-7">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#FFD700]/70">{t.personalDashboard}</p>
              <h1 className="mt-4 text-4xl font-light leading-tight md:text-6xl">👋 {t.greeting}, {firstName}!</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/55">{motivationalLine}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-xl border border-[#FFD700] bg-[#FFD700] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-transparent hover:text-[#FFD700]" onClick={() => satMockTest && start(satMockTest.id)} type="button">
                {t.startMock}
              </button>
              <button className="rounded-xl border border-white/12 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-white/62 transition hover:border-white/35 hover:text-white" onClick={() => router.push("/reading-analyzer")} type="button">
                {t.analyzer}
              </button>
            </div>
          </header>

          {message ? <p className="mt-5 rounded-xl border border-[#FFD700]/25 bg-[#FFD700]/10 p-4 text-sm font-semibold text-[#FFD700]">{message}</p> : null}

          <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <ScoreCard
              latestScore={latestScore}
              diagnosticResults={diagnosticResults}
              diagnosticSummary={diagnosticSummary}
              language={language}
              t={t}
              onDiagnostic={() => router.push(withLanguage("/mock-test/diagnostic"))}
              onReport={() => latestAttemptId && router.push(`/results/${latestAttemptId}`)}
            />

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
              <CompactCard
                icon={<CalendarDays size={22} />}
                label={t.examCountdown}
                title={daysLeft === null ? t.noDate : t.daysLeft(daysLeft)}
                action={examDate ? t.examDate(examDate) : t.setExamDate}
                onClick={saveExamDate}
                variant="countdown"
              />
              <CompactCard
                icon={<Target size={22} />}
                label={t.goalScore}
                title={goalScore}
                action={t.setGoal}
                onClick={saveGoalScore}
              />
              <CompactCard
                icon={<GraduationCap size={22} />}
                label={t.goalUniversity}
                title={goalUniversity || t.setUniversity}
                action={t.chooseUniversity}
                onClick={saveUniversity}
              />
              <CompactCard
                icon={<Crown size={22} />}
                label={t.proStatus}
                title={isProActive ? t.proActive : t.freePlan}
                action={isProActive ? "SATTEST.UZ Pro" : t.upgradePro}
                onClick={() => router.push(withLanguage("/pricing"))}
              />
              <CompactCard
                icon={<Flame size={22} />}
                label={t.streak}
                title={t.streakValue}
                action={t.streakAction}
                onClick={() => router.push(withLanguage("/practice"))}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <RoadmapCard
              hasDiagnostic={Boolean(latestScore)}
              currentWeek={latestScore ? Math.max(1, Math.min(4, Math.ceil(progressPercent / 25))) : 1}
              examDate={examDate}
              t={t}
            />
            <section className="rounded-xl border border-white/10 bg-[#151515] p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.32em] text-white/36">{t.savedLabel}</p>
                  <h2 className="mt-2 text-2xl font-light">{t.bookmarked}</h2>
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
                      {t.noBookmarks}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <ActionCard icon={<MessageSquareText size={22} />} title={t.nav.aiTutor} text={t.actionAi} href={withLanguage("/practice")} router={router} />
            <ActionCard icon={<Zap size={22} />} title={t.nav.quickPractice} text={t.actionPractice} href={withLanguage("/practice")} router={router} />
            <ActionCard icon={<Search size={22} />} title={t.nav.readingAnalyzer} text={t.actionAnalyzer} href={withLanguage("/reading-analyzer")} router={router} />
            <ActionCard icon={<Crown size={22} />} title="Mock Tests" text={t.actionTests} href={withLanguage("/sat-test")} router={router} />
          </section>
        </section>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-[#FFD700]/20 bg-[#080808]/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        {[
          { key: "dashboard", icon: LayoutDashboard, href: "/dashboard" },
          { key: "studyPlan", icon: Map, href: "/my-1400" },
          { key: "tests", icon: BookOpenCheck, href: "/sat-test" },
          { key: "readingAnalyzer", icon: Search, href: "/reading-analyzer" },
          { key: "profile", icon: User, href: "/dashboard#profile" }
        ].map((item) => (
          <button
            className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-black uppercase tracking-[0.08em] ${
              item.key === "dashboard" ? "bg-[#FFD700] text-black" : "text-white/45"
            }`}
            key={item.key}
            onClick={() => router.push(withLanguage(item.href))}
            type="button"
          >
            <item.icon size={18} />
            <span>{t.nav[item.key as keyof typeof t.nav].split(" ")[0]}</span>
          </button>
        ))}
      </nav>
      {editing ? (
        <EditModal
          title={editing === "score" ? t.editGoalTitle : editing === "university" ? t.editUniversityTitle : t.editExamTitle}
          help={editing === "score" ? t.editGoalHelp : editing === "university" ? t.editUniversityHelp : t.editExamHelp}
          placeholder={editing === "score" ? t.scorePlaceholder : editing === "university" ? t.universityPlaceholder : t.datePlaceholder}
          value={draftValue}
          saveLabel={t.save}
          cancelLabel={t.cancel}
          onChange={setDraftValue}
          onClose={() => setEditing(null)}
          onSave={saveDraft}
        />
      ) : null}
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

function LanguageButtons({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/25 p-1" aria-label="Language selector">
      {languages.map((item) => (
        <button
          className={`h-9 rounded-lg px-3 text-[10px] font-black uppercase tracking-[0.16em] transition ${language === item.code ? "bg-white text-black" : "text-white/45 hover:text-white"}`}
          key={item.code}
          onClick={() => onChange(item.code)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function EditModal({
  title,
  help,
  placeholder,
  value,
  saveLabel,
  cancelLabel,
  onChange,
  onClose,
  onSave
}: {
  title: string;
  help: string;
  placeholder: string;
  value: string;
  saveLabel: string;
  cancelLabel: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-[#FFD700]/25 bg-[#151515] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.45)]">
        <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[#FFD700]/70">SATTEST.UZ</p>
        <h2 className="mt-3 text-3xl font-light text-white">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-white/50">{help}</p>
        <input
          autoFocus
          className="mt-6 h-14 w-full rounded-xl border border-white/12 bg-black/35 px-4 text-base text-white outline-none transition focus:border-[#FFD700]"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSave();
            if (event.key === "Escape") onClose();
          }}
          placeholder={placeholder}
          value={value}
        />
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button className="h-12 flex-1 rounded-xl border border-[#FFD700] bg-[#FFD700] text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-transparent hover:text-[#FFD700]" onClick={onSave} type="button">
            {saveLabel}
          </button>
          <button className="h-12 flex-1 rounded-xl border border-white/12 text-xs font-black uppercase tracking-[0.18em] text-white/60 transition hover:border-white/35 hover:text-white" onClick={onClose} type="button">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ latestScore, diagnosticResults, diagnosticSummary, t, onDiagnostic, onReport }: {
  latestScore?: number;
  diagnosticResults: Results | null;
  diagnosticSummary: DiagnosticSummary | null;
  language: Language;
  t: typeof copy.en;
  onDiagnostic: () => void;
  onReport: () => void;
}) {
  const score = diagnosticResults?.score_total ?? latestScore;
  const rw = diagnosticResults?.score_reading_writing ?? 0;
  const math = diagnosticResults?.score_math ?? 0;
  const rwPercent = rw ? Math.min(100, Math.round((rw / 800) * 100)) : 0;
  const mathPercent = math ? Math.min(100, Math.round((math / 800) * 100)) : 0;

  return (
    <section className="relative overflow-hidden rounded-xl border border-[#FFD700]/18 bg-[#151515] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.22)] md:p-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,215,0,0.12),transparent_38%)]" />
      <div className="absolute right-5 top-5 hidden md:block">
        <SattestMascot />
      </div>
      <div className="relative z-10 max-w-3xl">
        <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/38">📊 {t.lastResult}</p>
        <div className="mt-5 flex flex-wrap items-end gap-4">
          <h2 className="text-7xl font-light leading-none text-[#FFD700] drop-shadow-[0_0_30px_rgba(255,215,0,0.18)] md:text-8xl">{score ?? "—"}</h2>
          <span className="mb-2 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#FFD700]">
            {score ? scoreBand(score) : t.diagnosticNeeded}
          </span>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_1fr_0.8fr]">
          <ScoreMetric label={t.rw} value={rw || "—"} percent={rwPercent} />
          <ScoreMetric label={t.math} value={math || "—"} percent={mathPercent} />
          <ScoreMetric label={t.accuracy} value={diagnosticSummary ? `${diagnosticSummary.overallAccuracy}%` : "—"} percent={diagnosticSummary?.overallAccuracy ?? 0} />
        </div>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-white/52">
          {diagnosticSummary?.feedback || t.noScoreText}
        </p>
        {score ? (
          <button className="mt-6 inline-flex items-center gap-3 rounded-xl border border-[#FFD700] bg-[#FFD700] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-transparent hover:text-[#FFD700]" onClick={onReport} type="button">
            {t.fullReport} <ArrowRight size={16} />
          </button>
        ) : (
          <button className="mt-6 inline-flex items-center gap-3 rounded-xl border border-[#FFD700] bg-[#FFD700] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-transparent hover:text-[#FFD700]" onClick={onDiagnostic} type="button">
            {t.takeDiagnostic} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </section>
  );
}

function SattestMascot() {
  return (
    <div className="relative h-44 w-44" aria-label="SATTEST lion studying mascot">
      <div className="absolute inset-4 rounded-full bg-[#FFD700]/10 blur-2xl" />
      <svg className="absolute inset-0 h-full w-full text-[#FFD700]" viewBox="0 0 180 180" fill="none" aria-hidden="true">
        <circle cx="90" cy="80" r="52" stroke="currentColor" strokeWidth="2" opacity="0.38" />
        <path d="M44 80c8-35 30-49 46-49s38 14 46 49c-11-13-21-18-31-20 4 9 7 21 5 35-5-9-11-15-20-18-9 3-15 9-20 18-2-14 1-26 5-35-10 2-20 7-31 20Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d="M66 95c5 14 14 22 24 22s19-8 24-22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M73 78h.1M107 78h.1" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        <path d="M84 91h12l-6 6-6-6Z" fill="currentColor" />
        <path d="M48 132h84M58 122h64c5 0 9 4 9 9v8H49v-8c0-5 4-9 9-9Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M68 132c4 6 10 9 22 9s18-3 22-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
        <path d="M52 44 39 31M128 44l13-13M90 23V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      </svg>
    </div>
  );
}

function ScoreMetric({ label, value, percent }: { label: string; value: string | number; percent: number }) {
  return (
    <div className="rounded-xl border border-[#FFD700]/12 bg-black/25 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{label}</p>
      <p className="mt-2 text-2xl font-light text-white">{value}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-[#8b7208] to-[#FFD700]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function CompactCard({ icon, label, title, action, onClick, variant = "default" }: { icon: ReactNode; label: string; title: string; action: string; onClick: () => void; variant?: "default" | "countdown" }) {
  const isCountdown = variant === "countdown";
  return (
    <button
      className={`rounded-xl border p-5 text-left transition hover:scale-[1.01] ${
        isCountdown
          ? "border-[#FFD700]/45 bg-gradient-to-br from-[#3d3100] via-[#151515] to-[#9b7b00] shadow-[0_22px_70px_rgba(255,215,0,0.12)] hover:shadow-[0_22px_90px_rgba(255,215,0,0.18)]"
          : "border-[#FFD700]/12 bg-[#151515] hover:border-[#FFD700]/40 hover:bg-[#FFD700]/[0.06]"
      }`}
      onClick={onClick}
      type="button"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${isCountdown ? "border-black/20 bg-[#FFD700] text-black" : "border-[#FFD700]/20 bg-[#FFD700]/10 text-[#FFD700]"}`}>{icon}</div>
      <p className={`mt-5 text-[10px] font-black uppercase tracking-[0.28em] ${isCountdown ? "text-black/60 mix-blend-screen" : "text-white/36"}`}>{label}</p>
      <h3 className={`mt-2 text-2xl font-light ${isCountdown ? "text-[#FFD700]" : "text-white"}`}>{title}</h3>
      <p className={`mt-3 text-sm ${isCountdown ? "font-semibold text-white" : "text-[#FFD700]"}`}>{action}</p>
    </button>
  );
}

function RoadmapCard({ hasDiagnostic, currentWeek, examDate, t }: { hasDiagnostic: boolean; currentWeek: number; examDate: string; t: typeof copy.en }) {
  const steps = [
    { label: t.diagnosticTaken, complete: hasDiagnostic },
    { label: t.currentWeek(currentWeek), complete: hasDiagnostic },
    { label: t.weakSprint, complete: false },
    { label: t.mockDate, complete: false },
    { label: examDate ? t.examDate(examDate) : t.examDateStep, complete: false }
  ];
  const currentIndex = hasDiagnostic ? 1 : 0;

  return (
    <section className="rounded-xl border border-[#FFD700]/12 bg-[#151515] p-5 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-white/36">{t.roadmap}</p>
          <h2 className="mt-2 text-2xl font-light">{t.pathTitle}</h2>
        </div>
        <Map className="text-[#FFD700]" size={28} />
      </div>
      <div className="mt-7 space-y-0">
        {steps.map((step, index) => (
          <div className="grid grid-cols-[28px_1fr] gap-4" key={step.label}>
            <div className="flex flex-col items-center">
              <span className={`relative flex h-7 w-7 items-center justify-center rounded-full border ${
                step.complete ? "border-[#FFD700] bg-[#FFD700]" : index === currentIndex ? "border-[#FFD700] bg-black" : "border-white/18 bg-white/5"
              }`}>
                {index === currentIndex ? <span className="h-2.5 w-2.5 rounded-full bg-[#FFD700]" /> : null}
              </span>
              {index < steps.length - 1 ? <span className={`h-12 w-px border-l ${step.complete ? "border-[#FFD700]" : "border-dashed border-white/16"}`} /> : null}
            </div>
            <div className="pb-7">
              <p className={step.complete ? "font-semibold text-white" : "text-white/48"}>{step.label}</p>
              <p className="mt-1 text-sm text-white/35">{step.complete ? t.completed : t.upcoming}</p>
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
