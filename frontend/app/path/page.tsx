"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Crown,
  Flame,
  GraduationCap,
  Lock,
  LogOut,
  Map,
  Medal,
  Play,
  Settings,
  Sparkles,
  Target,
  Trophy,
  User,
  Zap
} from "lucide-react";
import { clearAuth, getStudentName, getSubscriptionStatus, getToken } from "@/lib/api";
import { calculateDiagnosticResult } from "@/lib/free-diagnostic";
import { getFreeDiagnosticResult } from "@/lib/free-diagnostic-storage";
import { pick, useLanguage, type Language } from "@/lib/i18n";

type PathNode = {
  id: string;
  title: Record<Language, string>;
  subtitle: Record<Language, string>;
  icon: string;
  focus: string;
  checkpoint?: boolean;
  diagnostic?: boolean;
};

type Progress = {
  completed: string[];
  xp: number;
  streak: number;
  dailyGoal: number;
  todayLessons: number;
  lastCompletedDate?: string;
  goalScore?: string;
  examDate?: string;
  university?: string;
};

type LessonQuestion = {
  prompt: string;
  choices: string[];
  answer: string;
  explanation: string;
};

const progressKey = "sattest_path_progress_v1";
const onboardingKey = "sattest_path_onboarding_v1";
const lionLogo = "/assets/brand/sattest-lion-crest.png";

const defaultProgress: Progress = {
  completed: [],
  xp: 0,
  streak: 0,
  dailyGoal: 3,
  todayLessons: 0
};

const copy = {
  nav: {
    learn: { en: "Learn", ru: "Учиться", uz: "O'qish" },
    roadmap: { en: "Study Roadmap", ru: "Дорожная карта", uz: "Yo'l xaritasi" },
    leaderboard: { en: "Leaderboard", ru: "Рейтинг", uz: "Reyting" },
    bank: { en: "Practice Bank", ru: "Банк практики", uz: "Mashq banki" },
    profile: { en: "Profile", ru: "Профиль", uz: "Profil" },
    settings: { en: "Settings", ru: "Настройки", uz: "Sozlamalar" },
    logout: { en: "Log out", ru: "Выйти", uz: "Chiqish" }
  },
  header: {
    hello: { en: "Hello", ru: "Привет", uz: "Salom" },
    noTest: { en: "Start with one clear step: finish the diagnostic, then follow your personal path.", ru: "Начните с одного шага: диагностика, затем личный путь.", uz: "Bitta aniq qadamdan boshlang: diagnostika, keyin shaxsiy yo'l." },
    withTest: { en: "Your weak areas are now shaping today’s path.", ru: "Слабые темы уже формируют ваш путь.", uz: "Zaif mavzularingiz bugungi yo'lni shakllantiryapti." },
    start: { en: "START", ru: "СТАРТ", uz: "BOSHLASH" },
    completed: { en: "Completed", ru: "Готово", uz: "Tugadi" },
    locked: { en: "Locked", ru: "Закрыто", uz: "Yopiq" }
  },
  right: {
    proTitle: { en: "SATTEST PRO", ru: "SATTEST PRO", uz: "SATTEST PRO" },
    proBody: { en: "Unlock unlimited path lessons, full mock tests, and every weak-area route.", ru: "Откройте безлимитные уроки, полные mock tests и маршруты по слабым темам.", uz: "Cheksiz path darslari, full mock testlar va barcha zaif mavzu yo'llarini oching." },
    proCta: { en: "Try Pro", ru: "Получить Pro", uz: "Pro olish" },
    streak: { en: "day streak", ru: "дней подряд", uz: "kun ketma-ket" },
    dailyGoal: { en: "Today’s goal", ru: "Цель на сегодня", uz: "Bugungi maqsad" },
    challenge: { en: "Today’s mini-challenge", ru: "Мини-челлендж дня", uz: "Bugungi mini-challenge" },
    challengeBody: { en: "Finish one Reading node before 8 PM to protect your streak.", ru: "Закончите один Reading урок до 20:00, чтобы сохранить серию.", uz: "Streakni saqlash uchun 20:00 gacha bitta Reading node tugating." }
  },
  onboarding: {
    title: { en: "Let’s build your SAT path.", ru: "Соберём ваш SAT путь.", uz: "SAT yo'lingizni tuzamiz." },
    goal: { en: "Target score", ru: "Целевой балл", uz: "Maqsad ball" },
    exam: { en: "Exam date (optional)", ru: "Дата экзамена (необязательно)", uz: "Imtihon sanasi (ixtiyoriy)" },
    daily: { en: "Daily lessons", ru: "Уроков в день", uz: "Kunlik darslar" },
    save: { en: "Save path settings", ru: "Сохранить путь", uz: "Yo'l sozlamalarini saqlash" },
    diagnostic: { en: "Start Diagnostic", ru: "Начать диагностику", uz: "Diagnostikani boshlash" }
  },
  lesson: {
    concept: { en: "Concept", ru: "Концепт", uz: "Tushuncha" },
    example: { en: "Worked example", ru: "Разбор примера", uz: "Ishlangan misol" },
    practice: { en: "Practice", ru: "Практика", uz: "Mashq" },
    complete: { en: "Complete lesson", ru: "Завершить урок", uz: "Darsni tugatish" },
    done: { en: "Lesson complete!", ru: "Урок завершён!", uz: "Dars tugadi!" },
    xp: { en: "+10 XP", ru: "+10 XP", uz: "+10 XP" },
    perfect: { en: "Perfect bonus +5 XP", ru: "Бонус за идеал +5 XP", uz: "Mukammal bonus +5 XP" },
    next: { en: "Back to path", ru: "Назад к пути", uz: "Yo'lga qaytish" }
  }
};

const baseNodes: PathNode[] = [
  {
    id: "diagnostic",
    icon: "🎯",
    focus: "Diagnostic",
    diagnostic: true,
    title: { en: "Diagnostic Test", ru: "Диагностический тест", uz: "Diagnostik test" },
    subtitle: { en: "Find your real starting point.", ru: "Узнайте реальный старт.", uz: "Haqiqiy boshlanish nuqtangizni toping." }
  },
  {
    id: "algebra-basics",
    icon: "📐",
    focus: "Algebra",
    title: { en: "Foundations — Algebra Basics", ru: "База — Алгебра", uz: "Foundation — Algebra Basics" },
    subtitle: { en: "Linear equations, systems, and clean setup.", ru: "Уравнения, системы и точная постановка.", uz: "Tenglamalar, sistemalar va aniq setup." }
  },
  {
    id: "reading-basics",
    icon: "📖",
    focus: "Reading",
    title: { en: "Foundations — Reading Basics", ru: "База — Reading", uz: "Foundation — Reading Basics" },
    subtitle: { en: "Prove answers from the text.", ru: "Доказывайте ответы текстом.", uz: "Javobni matndan dalil bilan isbotlang." }
  },
  {
    id: "checkpoint-1",
    icon: "⭐",
    focus: "Checkpoint",
    checkpoint: true,
    title: { en: "Checkpoint Quiz", ru: "Контрольный квиз", uz: "Checkpoint quiz" },
    subtitle: { en: "A short proof that the basics are stable.", ru: "Короткая проверка базы.", uz: "Asoslar mustahkamligini tekshirish." }
  },
  {
    id: "words-context",
    icon: "📊",
    focus: "Words in Context",
    title: { en: "Words in Context", ru: "Слова в контексте", uz: "Kontekstdagi so'zlar" },
    subtitle: { en: "Read the sentence around the blank.", ru: "Читайте контекст вокруг пропуска.", uz: "Bo'sh joy atrofidagi gapni o'qing." }
  },
  {
    id: "advanced-math-intro",
    icon: "🔢",
    focus: "Advanced Math",
    title: { en: "Advanced Math Intro", ru: "Advanced Math старт", uz: "Advanced Math kirish" },
    subtitle: { en: "Functions, quadratics, and structure.", ru: "Функции, квадраты и структура.", uz: "Funksiyalar, kvadratlar va struktura." }
  }
];

const weakAreaNodes: Record<string, PathNode[]> = {
  "Advanced Math": [
    {
      id: "advanced-functions",
      icon: "ƒ",
      focus: "Advanced Math",
      title: { en: "Advanced Math — Functions", ru: "Advanced Math — Функции", uz: "Advanced Math — Funksiyalar" },
      subtitle: { en: "Turn formulas into movement.", ru: "Понимайте движение формул.", uz: "Formulani harakat sifatida ko'ring." }
    },
    {
      id: "quadratics",
      icon: "∩",
      focus: "Advanced Math",
      title: { en: "Quadratics & Nonlinear", ru: "Квадратные и нелинейные", uz: "Quadratics & Nonlinear" },
      subtitle: { en: "Factor, vertex, and intercept logic.", ru: "Факторизация, вершина, пересечения.", uz: "Factor, vertex va kesishish logikasi." }
    }
  ],
  Algebra: [
    {
      id: "equation-setup",
      icon: "x",
      focus: "Algebra",
      title: { en: "Equation Setup", ru: "Постановка уравнения", uz: "Equation setup" },
      subtitle: { en: "Translate words into equations.", ru: "Переводите текст в уравнения.", uz: "So'zlarni tenglamaga aylantiring." }
    }
  ],
  "Words in Context": [
    {
      id: "context-clues",
      icon: "🔎",
      focus: "Words in Context",
      title: { en: "Context Clues", ru: "Подсказки контекста", uz: "Context clues" },
      subtitle: { en: "Meaning comes from evidence, not memory.", ru: "Значение из доказательств, не памяти.", uz: "Ma'no xotiradan emas, dalildan keladi." }
    }
  ],
  Transitions: [
    {
      id: "transition-logic",
      icon: "↔",
      focus: "Transitions",
      title: { en: "Transition Logic", ru: "Логика переходов", uz: "Transition logic" },
      subtitle: { en: "Same direction, contrast, cause, example.", ru: "Продолжение, контраст, причина, пример.", uz: "Davom, contrast, sabab, misol." }
    }
  ],
  "Rhetorical Synthesis": [
    {
      id: "synthesis-notes",
      icon: "🧩",
      focus: "Rhetorical Synthesis",
      title: { en: "Synthesis Notes", ru: "Синтез заметок", uz: "Synthesis notes" },
      subtitle: { en: "Combine notes without adding outside facts.", ru: "Объединяйте заметки без лишних фактов.", uz: "Eslatmalarni tashqi factsiz birlashtiring." }
    }
  ],
  "Problem Solving and Data Analysis": [
    {
      id: "data-rate-percent",
      icon: "%",
      focus: "Problem Solving and Data Analysis",
      title: { en: "Rates, Percents, Data", ru: "Проценты, скорости, данные", uz: "Rate, percent, data" },
      subtitle: { en: "Keep units attached until the end.", ru: "Сохраняйте единицы до конца.", uz: "Birliklarni oxirigacha ushlang." }
    }
  ]
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function readProgress(): Progress {
  if (typeof window === "undefined") return defaultProgress;
  try {
    const raw = window.localStorage.getItem(progressKey);
    if (!raw) return defaultProgress;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    const today = todayKey();
    return {
      ...defaultProgress,
      ...parsed,
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      todayLessons: parsed.lastCompletedDate === today ? parsed.todayLessons ?? 0 : 0
    };
  } catch {
    return defaultProgress;
  }
}

function saveProgress(progress: Progress) {
  window.localStorage.setItem(progressKey, JSON.stringify(progress));
}

function uniqueNodes(nodes: PathNode[]) {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    if (seen.has(node.id)) return false;
    seen.add(node.id);
    return true;
  });
}

function readDiagnosticWeakAreas() {
  const diagnostic = getFreeDiagnosticResult();
  if (diagnostic) {
    return calculateDiagnosticResult(diagnostic.answers).weakAreas;
  }

  if (typeof window === "undefined") return [];
  const possibleKeys = [
    "sattest_last_diagnostic_result",
    "sattest_diagnostic_result",
    "sat1600_diagnostic_result",
    "sattest_mock_results",
    "sattest_last_results"
  ];

  for (const key of possibleKeys) {
    try {
      const raw = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const areas = extractWeakAreas(parsed);
      if (areas.length) return areas;
    } catch {
      continue;
    }
  }
  return [];
}

function extractWeakAreas(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const direct = record.weakAreas ?? record.weak_areas ?? record.weaknesses;
  if (Array.isArray(direct)) return direct.filter((item): item is string => typeof item === "string");
  for (const nested of Object.values(record)) {
    const found = extractWeakAreas(nested);
    if (found.length) return found;
  }
  return [];
}

function buildPersonalPath(weakAreas: string[]) {
  const inserted: PathNode[] = [];
  weakAreas.slice(0, 4).forEach((area) => {
    const exact = weakAreaNodes[area];
    if (exact) {
      inserted.push(...exact);
      return;
    }
    const matchedKey = Object.keys(weakAreaNodes).find((key) => area.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(area.toLowerCase()));
    if (matchedKey) inserted.push(...weakAreaNodes[matchedKey]);
  });

  const tail: PathNode[] = [
    {
      id: "mock-1",
      icon: "📝",
      focus: "Mock Test",
      checkpoint: true,
      title: { en: "Mock Test #1", ru: "Mock Test #1", uz: "Mock Test #1" },
      subtitle: { en: "Prove the first repair cycle.", ru: "Проверьте первый цикл роста.", uz: "Birinchi repair cycle ni isbotlang." }
    },
    {
      id: "mistake-notebook",
      icon: "✍️",
      focus: "Mistakes",
      title: { en: "Mistake Notebook", ru: "Тетрадь ошибок", uz: "Xatolar daftari" },
      subtitle: { en: "Turn every miss into one rule.", ru: "Каждую ошибку в одно правило.", uz: "Har xatoni bitta qoidaga aylantiring." }
    },
    {
      id: "exam-readiness",
      icon: "🏆",
      focus: "Final Review",
      checkpoint: true,
      title: { en: "Exam Readiness", ru: "Готовность к экзамену", uz: "Imtihonga tayyorgarlik" },
      subtitle: { en: "Timing, stamina, and final accuracy.", ru: "Время, выносливость, точность.", uz: "Vaqt, chidamlilik va final aniqlik." }
    }
  ];

  return uniqueNodes([baseNodes[0], ...inserted, ...baseNodes.slice(1), ...tail]);
}

function lessonQuestions(focus: string): LessonQuestion[] {
  if (focus.includes("Words")) {
    return [
      { prompt: "For a Words in Context question, what comes first?", choices: ["Pick the familiar definition", "Read surrounding evidence", "Choose the longest option"], answer: "Read surrounding evidence", explanation: "SAT vocabulary is context-first. The surrounding sentence proves the meaning." },
      { prompt: "Which trap is common?", choices: ["Common dictionary meaning", "Direct textual evidence", "Precise replacement"], answer: "Common dictionary meaning", explanation: "SAT often uses a familiar word in a precise local meaning." },
      { prompt: "What should your final answer do?", choices: ["Sound elegant", "Fit the sentence and evidence", "Use advanced vocabulary"], answer: "Fit the sentence and evidence", explanation: "The answer must match both grammar and the logical evidence." }
    ];
  }

  if (focus.includes("Algebra") || focus.includes("Math") || focus.includes("Data")) {
    return [
      { prompt: "What is the safest first step in a word problem?", choices: ["Guess the operation", "Name the quantity asked", "Skip to choices"], answer: "Name the quantity asked", explanation: "The SAT often asks for a specific value, not every variable in the story." },
      { prompt: "If 3x + 5 = 20, x equals:", choices: ["5", "15", "25"], answer: "5", explanation: "Subtract 5 to get 3x = 15, then divide by 3." },
      { prompt: "Why keep units attached?", choices: ["It looks cleaner", "It prevents using the wrong rate", "It makes equations longer"], answer: "It prevents using the wrong rate", explanation: "Units reveal whether you are calculating people, dollars, minutes, or percent." }
    ];
  }

  if (focus.includes("Transitions")) {
    return [
      { prompt: "Before choosing a transition, identify:", choices: ["The paragraph length", "The relationship between ideas", "The hardest word"], answer: "The relationship between ideas", explanation: "Transitions are about direction: same idea, contrast, cause, or example." },
      { prompt: "Which word signals contrast?", choices: ["Moreover", "However", "Therefore"], answer: "However", explanation: "However flips direction from one idea to another." },
      { prompt: "Which trap is common?", choices: ["Smooth sound but wrong logic", "Too much punctuation", "Short answer choice"], answer: "Smooth sound but wrong logic", explanation: "A transition can sound natural while pointing in the wrong direction." }
    ];
  }

  return [
    { prompt: "What should every SAT answer be based on?", choices: ["Memory", "Evidence", "Speed"], answer: "Evidence", explanation: "SAT rewards proof. Find the line or rule before picking." },
    { prompt: "A strong lesson habit is:", choices: ["Review mistakes immediately", "Ignore misses", "Only do easy questions"], answer: "Review mistakes immediately", explanation: "Immediate feedback turns one miss into a reusable rule." },
    { prompt: "The best next step is usually:", choices: ["One focused skill", "Ten random features", "A long lecture"], answer: "One focused skill", explanation: "The path keeps the next action clear and small." }
  ];
}

function difficultyFor(index: number) {
  if (index < 3) return "Easy";
  if (index < 8) return "Medium";
  return "Hard";
}

export default function PathPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [studentName, setStudentName] = useState("Student");
  const [isProActive, setIsProActive] = useState(false);
  const [weakAreas, setWeakAreas] = useState<string[]>([]);
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeNode, setActiveNode] = useState<PathNode | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [lessonComplete, setLessonComplete] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?next=/path?lang=${language}`);
      return;
    }
    setStudentName(getStudentName() || "Student");
    const savedProgress = readProgress();
    setProgress(savedProgress);
    setWeakAreas(readDiagnosticWeakAreas());
    setShowOnboarding(window.localStorage.getItem(onboardingKey) !== "done");
    getSubscriptionStatus().then((status) => setIsProActive(status.has_active_subscription)).catch(() => setIsProActive(false));
  }, [language, router]);

  const path = useMemo(() => buildPersonalPath(weakAreas), [weakAreas]);
  const completedSet = useMemo(() => new Set(progress.completed), [progress.completed]);
  const currentIndex = path.findIndex((node) => !completedSet.has(node.id));
  const safeCurrentIndex = currentIndex === -1 ? path.length - 1 : currentIndex;
  const currentNode = path[safeCurrentIndex];
  const questions = activeNode ? lessonQuestions(activeNode.focus) : [];
  const answeredCount = Object.keys(answers).length;
  const perfect = questions.length > 0 && questions.every((question, index) => answers[index] === question.answer);

  function updateProgress(next: Progress) {
    setProgress(next);
    saveProgress(next);
  }

  function openNode(node: PathNode, index: number) {
    if (node.diagnostic && !completedSet.has(node.id)) {
      router.push(`/mock-test/diagnostic?lang=${language}`);
      return;
    }
    if (index > safeCurrentIndex) return;
    setAnswers({});
    setLessonComplete(false);
    setActiveNode(node);
  }

  function completeLesson() {
    if (!activeNode) return;
    const today = todayKey();
    const wasCompleted = progress.completed.includes(activeNode.id);
    const streak =
      progress.lastCompletedDate === today
        ? progress.streak
        : progress.lastCompletedDate === yesterdayKey()
          ? progress.streak + 1
          : 1;
    const next: Progress = {
      ...progress,
      completed: wasCompleted ? progress.completed : [...progress.completed, activeNode.id],
      xp: progress.xp + (wasCompleted ? 0 : 10) + (!wasCompleted && perfect ? 5 : 0),
      streak,
      todayLessons: progress.lastCompletedDate === today ? progress.todayLessons + (wasCompleted ? 0 : 1) : 1,
      lastCompletedDate: today
    };
    updateProgress(next);
    setLessonComplete(true);
  }

  function saveOnboarding(formData: FormData) {
    const next: Progress = {
      ...progress,
      goalScore: String(formData.get("goalScore") || progress.goalScore || ""),
      examDate: String(formData.get("examDate") || progress.examDate || ""),
      dailyGoal: Number(formData.get("dailyGoal") || progress.dailyGoal || 3)
    };
    updateProgress(next);
    window.localStorage.setItem(onboardingKey, "done");
    setShowOnboarding(false);
  }

  function logout() {
    clearAuth();
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="border-b border-white/10 bg-[#101010] p-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:p-5">
          <div className="flex items-center gap-3">
            <Image className="h-12 w-12 rounded-xl border border-[#FFD700]/35 object-cover" src={lionLogo} alt="SATTEST lion crest" width={96} height={96} />
            <div>
              <p className="font-black text-white">SATTEST.UZ</p>
              <p className="text-xs font-semibold text-[#FFD700]">Practice • Improve • Achieve</p>
            </div>
          </div>

          <nav className="mt-8 grid gap-2">
            <SideLink active icon={<BookOpen size={18} />} label={pick(copy.nav.learn, language)} />
            <SideLink icon={<Map size={18} />} label={pick(copy.nav.roadmap, language)} href="/roadmap" />
            <SideLink icon={<Trophy size={18} />} label={pick(copy.nav.leaderboard, language)} href="#leaderboard" />
            <SideLink icon={<Zap size={18} />} label={pick(copy.nav.bank, language)} href="/practice" />
            <SideLink icon={<User size={18} />} label={pick(copy.nav.profile, language)} href="#profile" />
            <SideLink icon={<Settings size={18} />} label={pick(copy.nav.settings, language)} href="#settings" />
            <button className="mt-2 flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-white/55 transition hover:bg-white/5 hover:text-[#FFD700]" onClick={logout} type="button">
              <LogOut size={18} />
              {pick(copy.nav.logout, language)}
            </button>
          </nav>

          <div className="mt-8 rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-white/45">
            <p>v1.0 Path Engine</p>
            <p className="mt-2 truncate font-semibold text-white/70">{studentName}</p>
          </div>
        </aside>

        <section className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <header className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold text-[#FFD700]">SATTEST Learning Path</p>
              <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">
                👋 {pick(copy.header.hello, language)}, {studentName.split(" ")[0] || "Student"}!
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-white/60">
                {weakAreas.length ? pick(copy.header.withTest, language) : pick(copy.header.noTest, language)}
              </p>
            </div>
            <div className="rounded-xl border border-[#FFD700]/25 bg-[#FFD700]/10 px-4 py-3">
              <p className="text-xs font-semibold text-white/50">XP</p>
              <p className="text-3xl font-black text-[#FFD700]">{progress.xp}</p>
            </div>
          </header>

          {showOnboarding ? (
            <form
              className="mt-6 rounded-xl border border-[#FFD700]/25 bg-[#151515] p-5"
              onSubmit={(event) => {
                event.preventDefault();
                saveOnboarding(new FormData(event.currentTarget));
              }}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-black">{pick(copy.onboarding.title, language)}</h2>
                  <p className="mt-2 text-sm text-white/55">Goal, date, and daily pace stay simple. The path will do the ordering.</p>
                </div>
                <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FFD700] px-5 py-3 text-sm font-black text-black transition hover:bg-white" href={`/mock-test/diagnostic?lang=${language}`}>
                  {pick(copy.onboarding.diagnostic, language)}
                  <ChevronRight size={18} />
                </Link>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-semibold text-white/70">
                  {pick(copy.onboarding.goal, language)}
                  <input className="min-h-11 rounded-xl border border-white/10 bg-black px-4 text-white outline-none focus:border-[#FFD700]" defaultValue={progress.goalScore || ""} name="goalScore" placeholder="1400" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-white/70">
                  {pick(copy.onboarding.exam, language)}
                  <input className="min-h-11 rounded-xl border border-white/10 bg-black px-4 text-white outline-none focus:border-[#FFD700]" defaultValue={progress.examDate || ""} name="examDate" type="date" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-white/70">
                  {pick(copy.onboarding.daily, language)}
                  <input className="min-h-11 rounded-xl border border-white/10 bg-black px-4 text-white outline-none focus:border-[#FFD700]" defaultValue={progress.dailyGoal} min={1} name="dailyGoal" type="number" />
                </label>
              </div>
              <button className="mt-5 min-h-11 rounded-xl border border-[#FFD700]/40 px-5 py-3 text-sm font-black text-[#FFD700] transition hover:bg-[#FFD700] hover:text-black" type="submit">
                {pick(copy.onboarding.save, language)}
              </button>
            </form>
          ) : null}

          <section className="relative mx-auto mt-8 max-w-3xl py-6">
            <div className="absolute left-1/2 top-10 h-[calc(100%-80px)] -translate-x-1/2 border-l-2 border-dashed border-white/15" />
            {path.map((node, index) => {
              const isCompleted = completedSet.has(node.id);
              const isCurrent = index === safeCurrentIndex && !isCompleted;
              const isLocked = index > safeCurrentIndex;
              const side = index % 2 === 0 ? "md:pr-[54%]" : "md:pl-[54%]";

              return (
                <div className={`relative mb-8 flex justify-center ${side}`} key={node.id}>
                  {node.checkpoint ? (
                    <Image className="absolute left-1/2 top-1/2 z-10 hidden h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#FFD700]/45 object-cover md:block" src={lionLogo} alt="" width={72} height={72} />
                  ) : null}
                  <button
                    className={[
                      "group relative z-20 flex min-h-[112px] w-full max-w-[320px] items-center gap-4 rounded-xl border p-4 text-left transition",
                      isCurrent ? "border-[#FFD700] bg-[#FFD700] text-black shadow-[0_0_34px_rgba(255,215,0,0.28)]" : "",
                      isCompleted ? "border-[#FFD700]/45 bg-[#2a2408] text-white" : "",
                      isLocked ? "border-white/10 bg-[#151515] text-white/42" : "",
                      !isLocked && !isCurrent ? "hover:border-[#FFD700]/70 hover:bg-[#1b1b1b]" : ""
                    ].join(" ")}
                    onClick={() => openNode(node, index)}
                    type="button"
                  >
                    {isCurrent ? <span className="absolute -top-7 left-4 text-xs font-black text-[#FFD700]">{pick(copy.header.start, language)}</span> : null}
                    <span className={["flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-black", isCurrent ? "bg-black text-[#FFD700]" : isCompleted ? "bg-[#FFD700] text-black" : "bg-white/5 text-white/45"].join(" ")}>
                      {isCompleted ? <Check size={28} /> : isLocked ? <Lock size={24} /> : node.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-black">{pick(node.title, language)}</span>
                      <span className={["mt-1 block text-sm leading-5", isCurrent ? "text-black/70" : "text-white/52"].join(" ")}>{pick(node.subtitle, language)}</span>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-black">
                        {isCompleted ? pick(copy.header.completed, language) : isLocked ? pick(copy.header.locked, language) : difficultyFor(index)}
                        {!isLocked ? <Play size={14} /> : null}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </section>
        </section>

        <aside className="border-t border-white/10 bg-[#101010] p-4 lg:sticky lg:top-0 lg:h-screen lg:border-l lg:border-t-0 lg:p-5">
          {!isProActive ? (
            <div className="rounded-xl border border-[#FFD700]/35 bg-[#FFD700]/10 p-5">
              <div className="flex items-center gap-3">
                <Crown className="text-[#FFD700]" size={28} />
                <h2 className="text-xl font-black">{pick(copy.right.proTitle, language)}</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/62">{pick(copy.right.proBody, language)}</p>
              <Link className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FFD700] px-4 py-3 text-sm font-black text-black transition hover:bg-white" href={`/pricing?lang=${language}`}>
                {pick(copy.right.proCta, language)}
                <ChevronRight size={18} />
              </Link>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4" id="profile">
            <MetricCard icon={<Flame className="text-[#FFD700]" />} value={`${progress.streak}`} label={pick(copy.right.streak, language)} />
            <div className="rounded-xl border border-white/10 bg-[#151515] p-5">
              <div className="flex items-center justify-between">
                <p className="font-black">{pick(copy.right.dailyGoal, language)}</p>
                <Target className="text-[#FFD700]" size={20} />
              </div>
              <div className="mt-4 h-3 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#FFD700]" style={{ width: `${Math.min(100, (progress.todayLessons / Math.max(1, progress.dailyGoal)) * 100)}%` }} />
              </div>
              <p className="mt-2 text-sm font-semibold text-white/55">{progress.todayLessons}/{progress.dailyGoal} lessons</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#151515] p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="text-[#FFD700]" size={20} />
                <p className="font-black">{pick(copy.right.challenge, language)}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/58">{pick(copy.right.challengeBody, language)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#151515] p-5" id="leaderboard">
              <div className="flex items-center gap-2">
                <Medal className="text-[#FFD700]" size={20} />
                <p className="font-black">Weekly XP</p>
              </div>
              <ol className="mt-4 grid gap-3 text-sm">
                {["Muslima", "Jasur", studentName.split(" ")[0] || "You", "Nodira"].map((name, index) => (
                  <li className={["flex items-center justify-between rounded-xl px-3 py-2", name === (studentName.split(" ")[0] || "You") ? "bg-[#FFD700] text-black" : "bg-white/5 text-white/70"].join(" ")} key={`${name}-${index}`}>
                    <span>{index + 1}. {name}</span>
                    <span className="font-black">{880 - index * 120} XP</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </aside>
      </div>

      {activeNode ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur">
          <div className="mx-auto my-8 max-w-3xl rounded-xl border border-[#FFD700]/25 bg-[#111] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            {lessonComplete ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#FFD700] text-5xl text-black">✓</div>
                <h2 className="mt-6 text-4xl font-black">{pick(copy.lesson.done, language)}</h2>
                <p className="mt-3 text-2xl font-black text-[#FFD700]">{pick(copy.lesson.xp, language)} {perfect ? `• ${pick(copy.lesson.perfect, language)}` : ""}</p>
                <button className="mt-8 min-h-11 rounded-xl bg-[#FFD700] px-6 py-3 font-black text-black transition hover:bg-white" onClick={() => setActiveNode(null)} type="button">
                  {pick(copy.lesson.next, language)}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-[#FFD700]">{activeNode.focus}</p>
                    <h2 className="mt-2 text-3xl font-black">{pick(activeNode.title, language)}</h2>
                  </div>
                  <button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white/60 hover:border-white/30 hover:text-white" onClick={() => setActiveNode(null)} type="button">
                    Close
                  </button>
                </div>

                <div className="mt-6 grid gap-4">
                  <LessonBlock title={pick(copy.lesson.concept, language)} icon={<BookOpen className="text-[#FFD700]" />}>
                    {activeNode.focus} is one focused skill. Learn the rule, prove it with one example, then answer quickly with evidence.
                  </LessonBlock>
                  <LessonBlock title={pick(copy.lesson.example, language)} icon={<BarChart3 className="text-[#FFD700]" />}>
                    Example: before picking an answer, name what the question asks and underline the exact sentence or rule that proves it.
                  </LessonBlock>
                  <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                    <h3 className="text-xl font-black">{pick(copy.lesson.practice, language)}</h3>
                    <div className="mt-4 grid gap-4">
                      {questions.map((question, index) => (
                        <div className="rounded-xl border border-white/10 bg-[#151515] p-4" key={question.prompt}>
                          <p className="font-black">{index + 1}. {question.prompt}</p>
                          <div className="mt-3 grid gap-2 md:grid-cols-3">
                            {question.choices.map((choice) => {
                              const selected = answers[index] === choice;
                              const answered = index in answers;
                              const correct = choice === question.answer;
                              return (
                                <button
                                  className={[
                                    "min-h-11 rounded-xl border px-3 py-2 text-sm font-bold transition",
                                    !answered ? "border-white/10 bg-black/30 text-white/72 hover:border-[#FFD700]" : "",
                                    answered && correct ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100" : "",
                                    answered && selected && !correct ? "border-red-400/50 bg-red-500/15 text-red-100" : "",
                                    answered && !selected && !correct ? "border-white/10 bg-black/20 text-white/35" : ""
                                  ].join(" ")}
                                  disabled={answered}
                                  onClick={() => setAnswers((current) => ({ ...current, [index]: choice }))}
                                  type="button"
                                >
                                  {choice}
                                </button>
                              );
                            })}
                          </div>
                          {index in answers ? <p className="mt-3 text-sm font-semibold text-white/60">{question.explanation}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  className="mt-6 min-h-12 w-full rounded-xl bg-[#FFD700] px-5 py-3 font-black text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={answeredCount < questions.length}
                  onClick={completeLesson}
                  type="button"
                >
                  {pick(copy.lesson.complete, language)}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SideLink({ active = false, href = "#", icon, label }: { active?: boolean; href?: string; icon: ReactNode; label: string }) {
  const className = [
    "flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition",
    active ? "bg-[#FFD700] text-black" : "text-white/55 hover:bg-white/5 hover:text-[#FFD700]"
  ].join(" ");
  return href.startsWith("/") ? (
    <Link className={className} href={href}>
      {icon}
      {label}
    </Link>
  ) : (
    <a className={className} href={href}>
      {icon}
      {label}
    </a>
  );
}

function MetricCard({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#151515] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-4xl font-black text-[#FFD700]">{value}</p>
          <p className="mt-1 text-sm font-semibold text-white/55">{label}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}

function LessonBlock({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-xl font-black">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/62">{children}</p>
    </div>
  );
}
