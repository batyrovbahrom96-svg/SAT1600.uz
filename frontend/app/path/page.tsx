"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  Flame,
  Lock,
  LogOut,
  Medal,
  MessageCircle,
  FileText,
  Play,
  Search,
  Sparkles,
  Target,
  Trophy,
  User,
  Zap
} from "lucide-react";
import { api, clearAuth, getStudentName, getSubscriptionStatus, getToken, trackProLockView } from "@/lib/api";
import { PaymentQrHandoff } from "@/components/PaymentQrHandoff";
import { calculateDiagnosticResult } from "@/lib/free-diagnostic";
import { getFreeDiagnosticResult } from "@/lib/free-diagnostic-storage";
import { pick, useLanguage, type Language } from "@/lib/i18n";

const telegramBotUsername = process.env.NEXT_PUBLIC_PAYMENT_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "SATTESTUZBot";

type PathNode = {
  id: string;
  title: Record<Language, string>;
  subtitle: Record<Language, string>;
  icon: string;
  focus: string;
  checkpoint?: boolean;
  diagnostic?: boolean;
  unitIntro?: boolean;
  unitStart?: Record<Language, string>;
  domain?: "reading_writing" | "math";
};

type TrackType = "beginner" | "diagnostic";

type Progress = {
  completed: string[];
  xp: number;
  streak: number;
  longestStreak: number;
  dailyGoal: number;
  todayLessons: number;
  lastCompletedDate?: string;
  lastGoalDate?: string;
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

type MasteryQuestion = {
  passage_or_sentence: string;
  question_text: string;
  options: Record<"A" | "B" | "C" | "D", string>;
  correct_answer: "A" | "B" | "C" | "D";
  explanation_uz: string;
  why_wrong_uz: Partial<Record<"A" | "B" | "C" | "D", string>>;
};

type MasteryContent = {
  explanation_uz: string;
  strategy_uz: string[];
  questions: MasteryQuestion[];
};

type MasteryType = {
  id: string;
  type_name: string;
  type_name_uz: string;
  order_index: number;
  is_free: boolean;
  status: "locked" | "in_progress" | "passed";
  best_score: number;
  attempts: number;
  completed_at: string | null;
  locked_reason: "pro_required" | "previous_required" | null;
  requires_pro: boolean;
};

type MasteryCatalog = {
  is_pro: boolean;
  pass_mistake_limit: number;
  passed_count: number;
  total: number;
  paywall_required: boolean;
  types: MasteryType[];
};

const progressKey = "sattest_path_progress_v1";
const onboardingKey = "sattest_path_onboarding_v1";
const lionLogo = "/assets/brand/sattest-lion-crest.png";

const defaultProgress: Progress = {
  completed: [],
  xp: 0,
  streak: 0,
  longestStreak: 0,
  dailyGoal: 2,
  todayLessons: 0
};

const copy = {
  nav: {
    learn: { en: "Learn", ru: "Учиться", uz: "O'qish" },
    practice: { en: "Practice Bank", ru: "Банк практики", uz: "Practice Bank" },
    analyzer: { en: "Reading Analyzer", ru: "Reading Analyzer", uz: "Reading Analyzer" },
    mock: { en: "Mock Test", ru: "Mock Test", uz: "Mock Test" },
    profile: { en: "Profile", ru: "Профиль", uz: "Profil" },
    settings: { en: "Settings", ru: "Настройки", uz: "Sozlamalar" },
    logout: { en: "Log out", ru: "Выйти", uz: "Chiqish" }
  },
  today: {
    prefix: { en: "Today", ru: "Сегодня", uz: "Bugun" },
    diagnostic: { en: "Finish the Reading diagnostic", ru: "Завершить Reading диагностику", uz: "Reading diagnostikani tugatish" },
    lesson: { en: "Complete", ru: "Пройти", uz: "Dars" },
    practice: { en: "5-question practice", ru: "Практика из 5 вопросов", uz: "5 savollik amaliyot" },
    mock: { en: "Mini Mock Test", ru: "Mini Mock Test", uz: "Mini Mock Test" }
  },
  header: {
    hello: { en: "Hello", ru: "Привет", uz: "Salom" },
    noTest: { en: "Start with one clear step: finish the diagnostic, then follow your personal path.", ru: "Начните с одного шага: диагностика, затем личный путь.", uz: "Bitta aniq qadamdan boshlang: diagnostika, keyin shaxsiy yo'l." },
    withTest: { en: "Your weak areas are now shaping today’s path.", ru: "Слабые темы уже формируют ваш путь.", uz: "Zaif mavzularingiz bugungi yo'lni shakllantiryapti." },
    start: { en: "START", ru: "СТАРТ", uz: "BOSHLASH" },
    completed: { en: "Completed", ru: "Готово", uz: "Tugadi" },
    locked: { en: "Locked", ru: "Закрыто", uz: "Yopiq" }
  },
  track: {
    beginner: { en: "Complete SAT curriculum", ru: "Полная SAT программа", uz: "To'liq SAT curriculum" },
    diagnostic: { en: "Your personal weak-area path", ru: "Ваш путь по слабым темам", uz: "Sizning shaxsiy zaif-mavzu yo'lingiz" },
    beginnerBody: {
      en: "Beginner track walks through every Reading & Writing and Math domain topic by topic.",
      ru: "Beginner track проходит все темы Reading & Writing и Math по порядку.",
      uz: "Beginner track Reading & Writing va Math bo'limlarini mavzuma-mavzu to'liq olib boradi."
    },
    diagnosticBody: {
      en: "Diagnostic track stays shorter and focuses only on weak areas found in your test.",
      ru: "Diagnostic track короче и фокусируется только на слабых темах из теста.",
      uz: "Diagnostic track qisqaroq: diagnostikada topilgan zaif mavzularga e'tibor beradi."
    }
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
  quick: {
    title: { en: "Quick access", ru: "Быстрый доступ", uz: "Tez kirish" },
    body: {
      en: "Use the existing tools when you need extra practice, AI analysis, or a full mock.",
      ru: "Используйте готовые инструменты для практики, AI анализа или полного mock test.",
      uz: "Qo'shimcha mashq, AI tahlil yoki full mock kerak bo'lsa, mavjud toolslarga tez o'ting."
    },
    practiceTitle: { en: "Practice Bank", ru: "Банк практики", uz: "Practice Bank" },
    practiceBody: { en: "Easy / Medium / Hard question sets", ru: "Easy / Medium / Hard наборы", uz: "Easy / Medium / Hard savollar" },
    practiceMeta: { en: "Question bank", ru: "Банк вопросов", uz: "Savol banki" },
    practiceFree: { en: "Pro required", ru: "Нужен Pro", uz: "Pro kerak" },
    analyzerTitle: { en: "Reading Analyzer", ru: "Reading Analyzer", uz: "Reading Analyzer" },
    analyzerBody: { en: "Analyze SAT passages with AI", ru: "AI анализ SAT текстов", uz: "SAT matnini AI bilan tahlil qiling" },
    analyzerFree: { en: "3/3 free analyses today", ru: "3/3 бесплатных анализа сегодня", uz: "Bugun 3/3 bepul tahlil qoldi" },
    analyzerPro: { en: "Unlimited — Pro", ru: "Безлимит — Pro", uz: "Cheksiz — Pro" },
    mockTitle: { en: "Full Mock Test", ru: "Полный Mock Test", uz: "To'liq Mock Test" },
    mockBody: { en: "98 questions, adaptive format", ru: "98 вопросов, adaptive format", uz: "98 savol, adaptive format" },
    mockFree: { en: "Pro required", ru: "Нужен Pro", uz: "Pro kerak" },
    mockPro: { en: "Ready to start", ru: "Готов к старту", uz: "Boshlashga tayyor" },
    start: { en: "Start", ru: "Начать", uz: "Boshlash" },
    open: { en: "Open", ru: "Открыть", uz: "Ochish" }
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

const beginnerUnits: Array<{
  domain: "reading_writing" | "math";
  name: Record<Language, string>;
  overview: Record<Language, string>;
  topics: Array<{ key: string; icon: string; focus: string; title: Record<Language, string>; subtitle: Record<Language, string> }>;
}> = [
  {
    domain: "reading_writing",
    name: { en: "Information & Ideas", ru: "Информация и идеи", uz: "Information & Ideas" },
    overview: {
      en: "You learn how SAT questions ask for central ideas, details, inferences, and evidence. The goal is simple: prove answers from the text.",
      ru: "Вы учитесь находить главную идею, детали, выводы и доказательства. Цель проста: доказывать ответ текстом.",
      uz: "Bu bo'limda central idea, details, inference va evidence savollarini o'rganasiz. Maqsad oddiy: javobni matndan dalil bilan isbotlash."
    },
    topics: [
      { key: "central-ideas-details", icon: "📖", focus: "Central Ideas & Details", title: { en: "Central Ideas & Details", ru: "Главная идея и детали", uz: "Central Ideas & Details" }, subtitle: { en: "Separate the big idea from supporting facts.", ru: "Отделяйте главную мысль от деталей.", uz: "Asosiy g'oyani qo'llab-quvvatlovchi detaldan ajrating." } },
      { key: "inferences", icon: "🔍", focus: "Inferences", title: { en: "Inferences", ru: "Выводы", uz: "Inferences" }, subtitle: { en: "Make only the conclusion the text supports.", ru: "Делайте только вывод, который поддержан текстом.", uz: "Faqat matn qo'llab-quvvatlagan xulosani oling." } },
      { key: "evidence-textual", icon: "📌", focus: "Command of Evidence (Textual)", title: { en: "Command of Evidence — Textual", ru: "Доказательство — текст", uz: "Command of Evidence — Textual" }, subtitle: { en: "Choose the line that directly proves the claim.", ru: "Выберите строку, которая прямо доказывает мысль.", uz: "Da'voni to'g'ridan-to'g'ri isbotlaydigan qatorni tanlang." } },
      { key: "evidence-quantitative", icon: "📊", focus: "Command of Evidence (Quantitative)", title: { en: "Command of Evidence — Quantitative", ru: "Доказательство — данные", uz: "Command of Evidence — Quantitative" }, subtitle: { en: "Read graphs and data without guessing.", ru: "Читайте графики и данные без догадок.", uz: "Grafik va ma'lumotni taxminsiz o'qing." } }
    ]
  },
  {
    domain: "reading_writing",
    name: { en: "Craft & Structure", ru: "Стиль и структура", uz: "Craft & Structure" },
    overview: {
      en: "You learn how authors use words, structure, purpose, and paired texts to build meaning.",
      ru: "Вы изучаете, как авторы создают смысл через слова, структуру, цель и связанные тексты.",
      uz: "Muallif so'z tanlovi, tuzilma, maqsad va bog'langan matnlar orqali ma'no yaratishini o'rganasiz."
    },
    topics: [
      { key: "words-in-context", icon: "🔤", focus: "Words in Context", title: { en: "Words in Context", ru: "Слова в контексте", uz: "Words in Context" }, subtitle: { en: "Use context, not the common dictionary meaning.", ru: "Используйте контекст, не обычное значение.", uz: "Oddiy lug'at ma'nosini emas, kontekstni ishlating." } },
      { key: "text-structure-purpose", icon: "🏗️", focus: "Text Structure & Purpose", title: { en: "Text Structure & Purpose", ru: "Структура и цель текста", uz: "Text Structure & Purpose" }, subtitle: { en: "Name how the passage is built and why.", ru: "Определяйте, как построен текст и зачем.", uz: "Matn qanday qurilganini va nima uchunligini toping." } },
      { key: "cross-text-connections", icon: "🔗", focus: "Cross-Text Connections", title: { en: "Cross-Text Connections", ru: "Связь двух текстов", uz: "Cross-Text Connections" }, subtitle: { en: "Compare claims without mixing them.", ru: "Сравнивайте идеи, не смешивая их.", uz: "Da'volarni aralashtirmasdan solishtiring." } }
    ]
  },
  {
    domain: "reading_writing",
    name: { en: "Expression of Ideas", ru: "Выражение идей", uz: "Expression of Ideas" },
    overview: {
      en: "You learn how information should be combined and connected so the writing flows logically.",
      ru: "Вы учитесь объединять и связывать информацию логично.",
      uz: "Ma'lumotlarni mantiqan birlashtirish va bog'lashni o'rganasiz."
    },
    topics: [
      { key: "rhetorical-synthesis", icon: "🧩", focus: "Rhetorical Synthesis", title: { en: "Rhetorical Synthesis", ru: "Риторический синтез", uz: "Rhetorical Synthesis" }, subtitle: { en: "Combine notes for a clear purpose.", ru: "Объединяйте заметки под цель.", uz: "Eslatmalarni aniq maqsad uchun birlashtiring." } },
      { key: "transitions", icon: "↔️", focus: "Transitions", title: { en: "Transitions", ru: "Переходы", uz: "Transitions" }, subtitle: { en: "Match the logical direction between ideas.", ru: "Определяйте логическое направление.", uz: "G'oyalar orasidagi mantiqiy yo'nalishni toping." } }
    ]
  },
  {
    domain: "reading_writing",
    name: { en: "Standard English Conventions", ru: "Стандартная грамматика", uz: "Standard English Conventions" },
    overview: {
      en: "You learn sentence boundaries, punctuation, agreement, and structure so every sentence is complete and precise.",
      ru: "Вы изучаете границы предложений, пунктуацию, согласование и структуру.",
      uz: "Gap chegaralari, punctuation, agreement va sentence structure ni o'rganasiz."
    },
    topics: [
      { key: "boundaries", icon: "✍️", focus: "Boundaries", title: { en: "Boundaries — Punctuation", ru: "Границы — пунктуация", uz: "Boundaries — Punctuation" }, subtitle: { en: "Avoid comma splices and broken sentences.", ru: "Избегайте comma splice и неполных предложений.", uz: "Comma splice va noto'liq gaplardan saqlaning." } },
      { key: "form-structure-sense", icon: "🧠", focus: "Form, Structure, and Sense", title: { en: "Form, Structure, and Sense", ru: "Форма, структура и смысл", uz: "Form, Structure, and Sense" }, subtitle: { en: "Match verbs, pronouns, modifiers, and parallel forms.", ru: "Согласуйте глаголы, местоимения и формы.", uz: "Fe'l, olmosh, modifier va parallel formalarni moslang." } }
    ]
  },
  {
    domain: "math",
    name: { en: "Algebra", ru: "Алгебра", uz: "Algebra" },
    overview: {
      en: "You build the algebra base: equations, functions, systems, and inequalities.",
      ru: "Вы строите базу алгебры: уравнения, функции, системы и неравенства.",
      uz: "Tenglama, funksiya, sistema va tengsizliklar bo'yicha algebra bazasini qurasiz."
    },
    topics: [
      { key: "linear-equations-one-variable", icon: "x", focus: "Linear equations (one variable)", title: { en: "Linear Equations — One Variable", ru: "Линейные уравнения — 1 переменная", uz: "Linear equations — one variable" }, subtitle: { en: "Solve one unknown cleanly.", ru: "Чётко решайте одну неизвестную.", uz: "Bitta noma'lumni toza yeching." } },
      { key: "linear-equations-two-variables", icon: "xy", focus: "Linear equations (two variables)", title: { en: "Linear Equations — Two Variables", ru: "Линейные уравнения — 2 переменные", uz: "Linear equations — two variables" }, subtitle: { en: "Understand slope, intercept, and pairs.", ru: "Понимайте наклон, пересечение и пары.", uz: "Slope, intercept va juft qiymatlarni tushuning." } },
      { key: "linear-functions", icon: "ƒ", focus: "Linear functions", title: { en: "Linear Functions", ru: "Линейные функции", uz: "Linear functions" }, subtitle: { en: "Connect graphs, tables, and equations.", ru: "Связывайте графики, таблицы и уравнения.", uz: "Grafik, jadval va tenglamani bog'lang." } },
      { key: "systems-linear-equations", icon: "≡", focus: "Systems of linear equations", title: { en: "Systems of Linear Equations", ru: "Системы линейных уравнений", uz: "Systems of linear equations" }, subtitle: { en: "Find the pair that satisfies both equations.", ru: "Находите пару для двух уравнений.", uz: "Ikkala tenglamaga mos juftlikni toping." } },
      { key: "linear-inequalities", icon: "≤", focus: "Linear inequalities", title: { en: "Linear Inequalities", ru: "Линейные неравенства", uz: "Linear inequalities" }, subtitle: { en: "Track direction and solution ranges.", ru: "Следите за направлением и диапазоном.", uz: "Yo'nalish va yechim oralig'ini kuzating." } }
    ]
  },
  {
    domain: "math",
    name: { en: "Advanced Math", ru: "Продвинутая математика", uz: "Advanced Math" },
    overview: {
      en: "You learn expressions, nonlinear equations, and functions by reading structure.",
      ru: "Вы изучаете выражения, нелинейные уравнения и функции через структуру.",
      uz: "Ifodalar, nonlinear tenglamalar va funksiyalarni structure orqali o'rganasiz."
    },
    topics: [
      { key: "equivalent-expressions", icon: "=", focus: "Equivalent expressions", title: { en: "Equivalent Expressions", ru: "Эквивалентные выражения", uz: "Equivalent expressions" }, subtitle: { en: "Rewrite without changing value.", ru: "Переписывайте без изменения значения.", uz: "Qiymatni o'zgartirmasdan qayta yozing." } },
      { key: "nonlinear-equations", icon: "∩", focus: "Nonlinear equations", title: { en: "Nonlinear Equations", ru: "Нелинейные уравнения", uz: "Nonlinear equations" }, subtitle: { en: "Solve quadratics and curved relationships.", ru: "Решайте квадраты и нелинейные связи.", uz: "Kvadrat va egri bog'lanishlarni yeching." } },
      { key: "nonlinear-functions", icon: "𝑓", focus: "Nonlinear functions", title: { en: "Nonlinear Functions", ru: "Нелинейные функции", uz: "Nonlinear functions" }, subtitle: { en: "Read function behavior from structure.", ru: "Читайте поведение функции из структуры.", uz: "Funksiya xatti-harakatini strukturadan o'qing." } }
    ]
  },
  {
    domain: "math",
    name: { en: "Problem-Solving & Data Analysis", ru: "Задачи и анализ данных", uz: "Problem-Solving & Data Analysis" },
    overview: {
      en: "You keep units attached through ratios, rates, percents, data, and probability.",
      ru: "Вы сохраняете единицы в отношениях, процентах, данных и вероятности.",
      uz: "Ratio, rate, percent, data va probability da birliklarni saqlab borasiz."
    },
    topics: [
      { key: "ratios-rates-proportions", icon: ":", focus: "Ratios, rates, proportions", title: { en: "Ratios, Rates, Proportions", ru: "Отношения, скорости, пропорции", uz: "Ratios, rates, proportions" }, subtitle: { en: "Compare quantities with units.", ru: "Сравнивайте величины с единицами.", uz: "Miqdorlarni birliklar bilan solishtiring." } },
      { key: "percentages", icon: "%", focus: "Percentages", title: { en: "Percentages", ru: "Проценты", uz: "Percentages" }, subtitle: { en: "Track percent of what.", ru: "Следите: процент от чего.", uz: "Nimaning foizi ekanini kuzating." } },
      { key: "one-variable-data", icon: "📈", focus: "One-variable data distributions", title: { en: "One-Variable Data", ru: "Данные одной переменной", uz: "One-variable data" }, subtitle: { en: "Mean, median, spread, and meaning.", ru: "Среднее, медиана, разброс и смысл.", uz: "Mean, median, spread va ma'no." } },
      { key: "two-variable-data", icon: "📉", focus: "Two-variable data models", title: { en: "Two-Variable Data Models", ru: "Модели двух переменных", uz: "Two-variable data models" }, subtitle: { en: "Read trends and linear models.", ru: "Читайте тренды и линейные модели.", uz: "Trend va linear modelni o'qing." } },
      { key: "probability", icon: "🎲", focus: "Probability", title: { en: "Probability", ru: "Вероятность", uz: "Probability" }, subtitle: { en: "Favorable outcomes over total outcomes.", ru: "Нужные исходы делите на все исходы.", uz: "Kerakli natijani umumiy natijaga bo'ling." } }
    ]
  },
  {
    domain: "math",
    name: { en: "Geometry & Trigonometry", ru: "Геометрия и тригонометрия", uz: "Geometry & Trigonometry" },
    overview: {
      en: "You learn shapes, measurement, triangles, circles, and right-triangle trig.",
      ru: "Вы изучаете фигуры, измерения, треугольники, окружности и тригонометрию.",
      uz: "Shakllar, o'lchov, uchburchak, aylana va right-triangle trig ni o'rganasiz."
    },
    topics: [
      { key: "area-volume", icon: "⬛", focus: "Area and volume", title: { en: "Area and Volume", ru: "Площадь и объём", uz: "Area and volume" }, subtitle: { en: "Match formulas to shapes.", ru: "Соотносите формулы с фигурами.", uz: "Formulani shaklga moslang." } },
      { key: "lines-angles-triangles", icon: "△", focus: "Lines, angles, triangles", title: { en: "Lines, Angles, Triangles", ru: "Линии, углы, треугольники", uz: "Lines, angles, triangles" }, subtitle: { en: "Use angle facts without overcomplicating.", ru: "Используйте факты об углах просто.", uz: "Burchak faktlarini soddalik bilan ishlating." } },
      { key: "right-triangle-trig", icon: "sin", focus: "Right triangle trigonometry", title: { en: "Right Triangle Trigonometry", ru: "Тригонометрия прямоугольного треугольника", uz: "Right triangle trigonometry" }, subtitle: { en: "Sine, cosine, tangent as ratios.", ru: "Синус, косинус, тангенс как отношения.", uz: "Sine, cosine, tangent ni ratio sifatida ko'ring." } },
      { key: "circles", icon: "○", focus: "Circles", title: { en: "Circles", ru: "Окружности", uz: "Circles" }, subtitle: { en: "Radius, diameter, circumference, and arcs.", ru: "Радиус, диаметр, длина окружности и дуги.", uz: "Radius, diameter, circumference va arc." } }
    ]
  }
];

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
    const dailyGoal = Number(window.localStorage.getItem("sattest_path_daily_goal") || parsed.dailyGoal || defaultProgress.dailyGoal);
    const lastGoalDate = parsed.lastGoalDate;
    const streakStillAlive = lastGoalDate === today || lastGoalDate === yesterdayKey();
    return {
      ...defaultProgress,
      ...parsed,
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      dailyGoal: Number.isFinite(dailyGoal) && dailyGoal > 0 ? dailyGoal : defaultProgress.dailyGoal,
      streak: streakStillAlive ? parsed.streak ?? 0 : 0,
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

function buildBeginnerPath() {
  const nodes: PathNode[] = [];
  beginnerUnits.forEach((unit, unitIndex) => {
    const unitLabel = {
      en: `STAGE ${unitIndex + 1}: ${unit.name.en}`,
      ru: `ЭТАП ${unitIndex + 1}: ${unit.name.ru}`,
      uz: `BOSQICH ${unitIndex + 1}: ${unit.name.uz}`
    };
    nodes.push({
      id: `unit-${unitIndex + 1}-${slug(unit.name.en)}-foundations`,
      icon: unit.domain === "math" ? "📐" : "📖",
      focus: `${unit.name.en} Foundations`,
      unitIntro: true,
      unitStart: unitLabel,
      domain: unit.domain,
      title: {
        en: `${unit.name.en} — Foundations`,
        ru: `${unit.name.ru} — Основы`,
        uz: `${unit.name.uz} — Asosiy tushunchalar`
      },
      subtitle: unit.overview
    });
    unit.topics.forEach((topic) => {
      nodes.push({
        id: topic.key,
        icon: topic.icon,
        focus: topic.focus,
        domain: unit.domain,
        title: topic.title,
        subtitle: topic.subtitle
      });
    });
    if ((unitIndex + 1) % 2 === 0) {
      nodes.push({
        id: `checkpoint-${unitIndex + 1}`,
        icon: "🦁",
        focus: "Checkpoint",
        checkpoint: true,
        domain: unit.domain,
        title: { en: `Checkpoint ${unitIndex / 2 + 1}`, ru: `Checkpoint ${unitIndex / 2 + 1}`, uz: `Checkpoint ${unitIndex / 2 + 1}` },
        subtitle: {
          en: "A short review before the next stage.",
          ru: "Короткое повторение перед следующим этапом.",
          uz: "Keyingi bosqichdan oldin qisqa review."
        }
      });
    }
  });
  nodes.push({
    id: "beginner-full-mock",
    icon: "🏆",
    focus: "Mock Test",
    checkpoint: true,
    title: { en: "Full Mock Test Milestone", ru: "Full Mock Test Milestone", uz: "Full Mock Test Milestone" },
    subtitle: {
      en: "Use the full curriculum foundation under timed conditions.",
      ru: "Проверьте полную базу в условиях времени.",
      uz: "To'liq curriculum bazasini vaqt bilan sinab ko'ring."
    }
  });
  return nodes;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function lessonQuestions(focus: string): LessonQuestion[] {
  if (focus.includes("Foundations")) {
    return [
      {
        prompt: "Bu foundations ekranining asosiy maqsadi nima?",
        choices: ["Bo'limni nima uchun o'rganishni tushunish", "Darhol final mock test topshirish", "Tasodifiy mavzu tanlash"],
        answer: "Bo'limni nima uchun o'rganishni tushunish",
        explanation: "Beginner track har bir unit oldidan katta rasmni beradi, keyin mavzularni tartib bilan ochadi."
      }
    ];
  }

  if (focus.includes("Central Ideas")) {
    return [
      { prompt: "Central idea savolida eng yaxshi javob nimani qamrab oladi?", choices: ["Butun matnni", "Faqat bitta detalni", "Matndan tashqari fikrni"], answer: "Butun matnni", explanation: "Central idea butun passage mazmunini qamrab olishi kerak; bitta detal yetarli emas." },
      { prompt: "Asosiy tuzoq qaysi?", choices: ["Juda tor detail answer", "Matndan dalil", "Neutral wording"], answer: "Juda tor detail answer", explanation: "SAT ko'pincha to'g'ri ko'rinadigan, lekin faqat bir gapga tegishli javob beradi." },
      { prompt: "Tekshirish uchun qaysi joylarni o'qiysiz?", choices: ["Birinchi va oxirgi gaplarni", "Faqat variantlarni", "Faqat eng uzun so'zni"], answer: "Birinchi va oxirgi gaplarni", explanation: "Passage boshi va oxiri odatda umumiy yo'nalishni ko'rsatadi." }
    ];
  }

  if (focus.includes("Inference")) {
    return [
      { prompt: "Inference javobi qanday bo'lishi kerak?", choices: ["Matn qo'llab-quvvatlaydigan xulosa", "Shaxsiy fikr", "Juda katta taxmin"], answer: "Matn qo'llab-quvvatlaydigan xulosa", explanation: "Inference matndan tashqariga chiqmaydi; u dalilga tayangan xulosa." },
      { prompt: "Nima xato hisoblanadi?", choices: ["Too big a leap", "Exact evidence", "Careful wording"], answer: "Too big a leap", explanation: "Agar xulosa matnda yetarli dalilga ega bo'lmasa, u SAT uchun xato." },
      { prompt: "Inference savolida oldin nima qilasiz?", choices: ["Dalil topasiz", "Eng chiroyli variantni tanlaysiz", "Passageni e'tiborsiz qoldirasiz"], answer: "Dalil topasiz", explanation: "Har inference uchun matnda kamida bitta tayanch dalil bo'lishi kerak." }
    ];
  }

  if (focus.includes("Evidence")) {
    return [
      { prompt: "Command of Evidence savolida javob nimani qilishi kerak?", choices: ["Da'voni to'g'ridan-to'g'ri isbotlash", "Faqat mavzuga o'xshash bo'lish", "Yangi fikr qo'shish"], answer: "Da'voni to'g'ridan-to'g'ri isbotlash", explanation: "Evidence javobi related emas, proof bo'lishi kerak." },
      { prompt: "Graph/data savolida eng muhim narsa?", choices: ["Label va unit", "Variant uzunligi", "Grafik ranglari"], answer: "Label va unit", explanation: "Quantitative evidence da label, unit va exact value xatolarni oldini oladi." },
      { prompt: "Qaysi javob odatda xato?", choices: ["Too general quote", "Exact quote", "Direct data point"], answer: "Too general quote", explanation: "Juda umumiy quote claimni to'g'ridan-to'g'ri isbotlamaydi." }
    ];
  }

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
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [trackType, setTrackType] = useState<TrackType>("diagnostic");
  const [weakAreas, setWeakAreas] = useState<string[]>([]);
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeNode, setActiveNode] = useState<PathNode | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [lessonComplete, setLessonComplete] = useState(false);
  const [masteryCatalog, setMasteryCatalog] = useState<MasteryCatalog | null>(null);
  const [masteryLoading, setMasteryLoading] = useState(false);
  const [masteryError, setMasteryError] = useState("");
  const [activeMasteryType, setActiveMasteryType] = useState<MasteryType | null>(null);
  const [masteryContent, setMasteryContent] = useState<MasteryContent | null>(null);
  const [masteryScreen, setMasteryScreen] = useState<"explanation" | "strategy" | "practice" | "result" | "paywall">("explanation");
  const [masteryQuestionIndex, setMasteryQuestionIndex] = useState(0);
  const [masteryAnswers, setMasteryAnswers] = useState<Record<string, string>>({});
  const [masteryFeedback, setMasteryFeedback] = useState<{ selected: string; correct: string; isCorrect: boolean } | null>(null);
  const [masteryResult, setMasteryResult] = useState<{ passed: boolean; correct: number; mistakes: number; paywall_required?: boolean; message_uz?: string } | null>(null);
  const [recentlyCompletedNodeId, setRecentlyCompletedNodeId] = useState<string | null>(null);
  const [streakBumped, setStreakBumped] = useState(false);
  const currentNodeRef = useRef<HTMLDivElement | null>(null);
  const previousStreakRef = useRef(defaultProgress.streak);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?next=/path?lang=${language}`);
      return;
    }
    setStudentName(getStudentName() || "Student");
    const savedTrack = window.localStorage.getItem("sattest_track_type");
    setTrackType(savedTrack === "beginner" ? "beginner" : "diagnostic");
    api<{ track_type?: TrackType }>("/api/auth/me")
      .then((profile) => {
        if (profile.track_type === "beginner" || profile.track_type === "diagnostic") {
          window.localStorage.setItem("sattest_track_type", profile.track_type);
          setTrackType(profile.track_type);
        }
      })
      .catch(() => undefined);
    const savedProgress = readProgress();
    const diagnosticWeakAreas = readDiagnosticWeakAreas();
    const progressWithDiagnostic =
      diagnosticWeakAreas.length && !savedProgress.completed.includes("diagnostic")
        ? { ...savedProgress, completed: ["diagnostic", ...savedProgress.completed] }
        : savedProgress;
    setProgress(progressWithDiagnostic);
    saveProgress(progressWithDiagnostic);
    setWeakAreas(diagnosticWeakAreas);
    if (diagnosticWeakAreas.length) {
      api("/api/platform/progress", {
        method: "POST",
        body: JSON.stringify({ event: "diagnostic_completed", daily_goal: progressWithDiagnostic.dailyGoal })
      }).catch(() => undefined);
    }
    setShowOnboarding(window.localStorage.getItem(onboardingKey) !== "done");
    setSubscriptionChecked(false);
    getSubscriptionStatus()
      .then((status) => setIsProActive(status.has_active_subscription))
      .catch(() => setIsProActive(false))
      .finally(() => setSubscriptionChecked(true));
    refreshMasteryCatalog();
  }, [language, router]);

  const path = useMemo(() => (trackType === "beginner" ? buildBeginnerPath() : buildPersonalPath(weakAreas)), [trackType, weakAreas]);
  const completedSet = useMemo(() => new Set(progress.completed), [progress.completed]);
  const currentIndex = path.findIndex((node) => !completedSet.has(node.id));
  const safeCurrentIndex = currentIndex === -1 ? path.length - 1 : currentIndex;
  const currentNode = path[safeCurrentIndex];
  const todayAction = useMemo(() => {
    if (!currentNode) return "";
    if (currentNode.diagnostic) return pick(copy.today.diagnostic, language);
    if (currentNode.focus === "Mock Test" || currentNode.id.includes("mock")) return pick(copy.today.mock, language);
    if (currentNode.focus.includes("Practice")) return pick(copy.today.practice, language);
    return `${pick(copy.today.lesson, language)}: ${pick(currentNode.title, language)}`;
  }, [currentNode, language]);
  const questions = activeNode ? lessonQuestions(activeNode.focus) : [];
  const answeredCount = Object.keys(answers).length;
  const correctCount = questions.filter((question, index) => answers[index] === question.answer).length;
  const perfect = questions.length > 0 && questions.every((question, index) => answers[index] === question.answer);
  const masteryPassedCount = masteryCatalog?.types.filter((item) => item.status === "passed").length ?? 0;
  const masteryTotal = masteryCatalog?.total ?? 12;
  const readingWritingMockUnlocked = Boolean(masteryCatalog && masteryPassedCount >= masteryTotal && isProActive);

  useEffect(() => {
    if (progress.streak > previousStreakRef.current) {
      setStreakBumped(true);
      const timeout = window.setTimeout(() => setStreakBumped(false), 420);
      previousStreakRef.current = progress.streak;
      return () => window.clearTimeout(timeout);
    }
    previousStreakRef.current = progress.streak;
  }, [progress.streak]);

  useEffect(() => {
    if (!currentNodeRef.current) return;
    const isSmallScreen = window.matchMedia("(max-width: 767px)").matches;
    if (!isSmallScreen) return;
    const timeout = window.setTimeout(() => {
      currentNodeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [safeCurrentIndex, path.length]);

  function updateProgress(next: Progress) {
    setProgress(next);
    saveProgress(next);
  }

  function refreshMasteryCatalog() {
    api<MasteryCatalog>("/api/reading-mastery/types")
      .then((catalog) => {
        setMasteryCatalog(catalog);
        setIsProActive(catalog.is_pro);
        setSubscriptionChecked(true);
      })
      .catch(() => {
        setMasteryError("Reading & Writing mastery tizimini yuklab bo'lmadi.");
      });
  }

  async function openMasteryType(type: MasteryType, forceNew = false) {
    setMasteryError("");
    if (type.locked_reason === "pro_required") {
      void trackProLockView("path_type_lock");
      setActiveMasteryType(type);
      setMasteryScreen("paywall");
      return;
    }
    if (type.status === "locked") {
      setMasteryError("Avval oldingi savol turini o'zlashtiring.");
      return;
    }
    setMasteryLoading(true);
    try {
      const response = await api<{ type: MasteryType; content: MasteryContent }>("/api/reading-mastery/start", {
        method: "POST",
        body: JSON.stringify({ type_id: type.id, force_new: forceNew })
      });
      setActiveMasteryType(response.type);
      setMasteryContent(response.content);
      setMasteryScreen("explanation");
      setMasteryQuestionIndex(0);
      setMasteryAnswers({});
      setMasteryFeedback(null);
      setMasteryResult(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mastery mavzusini ochib bo'lmadi.";
      if (message.includes("pro_required")) {
        void trackProLockView("path_type_lock");
        setActiveMasteryType(type);
        setMasteryScreen("paywall");
      } else {
        setMasteryError(message);
      }
    } finally {
      setMasteryLoading(false);
    }
  }

  function chooseMasteryAnswer(letter: "A" | "B" | "C" | "D") {
    if (!masteryContent) return;
    const question = masteryContent.questions[masteryQuestionIndex];
    const correct = question.correct_answer;
    setMasteryAnswers((current) => ({ ...current, [String(masteryQuestionIndex)]: letter }));
    setMasteryFeedback({ selected: letter, correct, isCorrect: letter === correct });
  }

  async function continueMasteryPractice() {
    if (!masteryContent || !activeMasteryType) return;
    if (masteryQuestionIndex < masteryContent.questions.length - 1) {
      setMasteryQuestionIndex((index) => index + 1);
      setMasteryFeedback(null);
      return;
    }
    setMasteryLoading(true);
    try {
      const response = await api<{
        passed: boolean;
        correct: number;
        mistakes: number;
        paywall_required?: boolean;
        message_uz?: string;
        retry_content?: MasteryContent;
        types?: MasteryType[];
      }>("/api/reading-mastery/submit", {
        method: "POST",
        body: JSON.stringify({ type_id: activeMasteryType.id, answers: masteryAnswers })
      });
      if (response.types && masteryCatalog) {
        setMasteryCatalog({ ...masteryCatalog, types: response.types, passed_count: response.types.filter((item) => item.status === "passed").length });
      } else {
        refreshMasteryCatalog();
      }
      setMasteryResult({ passed: response.passed, correct: response.correct, mistakes: response.mistakes, paywall_required: response.paywall_required, message_uz: response.message_uz });
      if (response.paywall_required) {
        void trackProLockView("path_type_lock");
      }
      if (!response.passed && response.retry_content) {
        setMasteryContent(response.retry_content);
      }
      setMasteryScreen("result");
      setMasteryFeedback(null);
    } catch (error) {
      setMasteryError(error instanceof Error ? error.message : "Javoblarni tekshirishda xatolik bo'ldi.");
    } finally {
      setMasteryLoading(false);
    }
  }

  function retryMasterySet() {
    setMasteryQuestionIndex(0);
    setMasteryAnswers({});
    setMasteryFeedback(null);
    setMasteryResult(null);
    setMasteryScreen("practice");
  }

  function closeMasteryModal() {
    setActiveMasteryType(null);
    setMasteryContent(null);
    setMasteryFeedback(null);
    setMasteryResult(null);
    setMasteryScreen("explanation");
  }

  function regenerateMasterySet() {
    if (!activeMasteryType || masteryLoading) return;
    openMasteryType(activeMasteryType, true);
  }

  function openNode(node: PathNode, index: number) {
    if (trackType === "diagnostic" && node.diagnostic && !completedSet.has(node.id)) {
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
    const previousTodayLessons = progress.lastCompletedDate === today ? progress.todayLessons : 0;
    const todayLessons = previousTodayLessons + (wasCompleted ? 0 : 1);
    const goalWasAlreadyMet = progress.lastGoalDate === today;
    const goalMetNow = !goalWasAlreadyMet && todayLessons >= progress.dailyGoal;
    const baseStreak = progress.lastGoalDate === yesterdayKey() || progress.lastGoalDate === today ? progress.streak : 0;
    const streak = goalMetNow ? baseStreak + 1 : baseStreak;
    const longestStreak = Math.max(progress.longestStreak ?? 0, streak);
    const next: Progress = {
      ...progress,
      completed: wasCompleted ? progress.completed : [...progress.completed, activeNode.id],
      xp: progress.xp + (wasCompleted ? 0 : 10) + (!wasCompleted && perfect ? 5 : 0),
      streak,
      longestStreak,
      todayLessons,
      lastCompletedDate: today,
      lastGoalDate: goalMetNow ? today : progress.lastGoalDate
    };
    updateProgress(next);
    api("/api/platform/progress", {
      method: "POST",
      body: JSON.stringify({
        event: activeNode.id.includes("mock") ? "mock_completed" : "lesson_completed",
        current_streak: next.streak,
        longest_streak: next.longestStreak,
        daily_goal: next.dailyGoal
      })
    }).catch(() => undefined);
    setRecentlyCompletedNodeId(activeNode.id);
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

  function openReadingWritingMock() {
    if (!readingWritingMockUnlocked) {
      setMasteryError(
        isProActive
          ? "SAT Reading & Writing Mock ochilishi uchun avval 12 ta savol turini o'zlashtiring."
          : "SAT Reading & Writing Mock Pro curriculum ichida ochiladi. Avval 1-mavzuni tugating, keyin Pro bilan davom eting."
      );
      return;
    }
    router.push(`/rw-mock?lang=${language}&from=path`);
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
            <SideLink icon={<Trophy size={18} />} label="Leaderboard" href="#leaderboard" muted />
            <SideLink icon={<Zap size={18} />} label={pick(copy.nav.practice, language)} href={`/practice?lang=${language}`} muted />
            <SideLink icon={<Search size={18} />} label={pick(copy.nav.analyzer, language)} href={`/reading-analyzer?lang=${language}`} muted />
            <SideLink icon={<FileText size={18} />} label={pick(copy.nav.mock, language)} href={`/sat-mock?lang=${language}`} muted />
            <SideLink icon={<User size={18} />} label={pick(copy.nav.profile, language)} href="#profile" muted />
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
              <div className="mt-4 inline-flex max-w-full items-center gap-3 rounded-2xl border border-[#FFD700]/35 bg-[#FFD700]/10 px-4 py-3 text-base font-black text-[#FFD700]">
                <Target size={20} />
                <span>{pick(copy.today.prefix, language)}: {todayAction}</span>
              </div>
              <p className="mt-3 max-w-2xl text-base leading-7 text-white/60">
                {trackType === "beginner" ? pick(copy.track.beginnerBody, language) : weakAreas.length ? pick(copy.header.withTest, language) : pick(copy.track.diagnosticBody, language)}
              </p>
              <p className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white/50">
                {trackType === "beginner" ? pick(copy.track.beginner, language) : pick(copy.track.diagnostic, language)}
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

          <section className="mt-8 rounded-3xl border border-white/10 bg-[#151515] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FFD700]">{pick(copy.quick.title, language)}</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{pick(copy.quick.body, language)}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <QuickAccessCard
                body={pick(copy.quick.practiceBody, language)}
                cta={isProActive ? pick(copy.quick.start, language) : pick(copy.quick.practiceFree, language)}
                href={`/practice?lang=${language}`}
                icon={isProActive ? <Zap size={24} /> : <Lock size={24} />}
                meta={isProActive ? `${pick(copy.quick.practiceMeta, language)} — Easy/Medium/Hard` : "300,000 UZS/oy"}
                title={`⚡ ${pick(copy.quick.practiceTitle, language)}`}
              />
              <QuickAccessCard
                body={pick(copy.quick.analyzerBody, language)}
                cta={pick(copy.quick.open, language)}
                href={`/reading-analyzer?lang=${language}`}
                icon={<Search size={24} />}
                meta={isProActive ? pick(copy.quick.analyzerPro, language) : pick(copy.quick.analyzerFree, language)}
                title={`🔍 ${pick(copy.quick.analyzerTitle, language)}`}
              />
              <QuickAccessCard
                body={pick(copy.quick.mockBody, language)}
                cta={isProActive ? pick(copy.quick.start, language) : pick(copy.quick.mockFree, language)}
                href={`/sat-mock?lang=${language}`}
                icon={isProActive ? <FileText size={24} /> : <Lock size={24} />}
                meta={isProActive ? pick(copy.quick.mockPro, language) : "300,000 UZS/oy"}
                title={`📝 ${pick(copy.quick.mockTitle, language)}`}
              />
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-[#FFD700]/20 bg-[#151515] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FFD700]">SAT Reading & Writing Mastery</p>
                <h2 className="mt-2 text-2xl font-black text-white md:text-4xl">12 ta rasmiy savol turi</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
                  Har bir mavzu: tushuntirish → strategiya → 10 original savol → pass/fail gate. 2 tagacha xato bilan o'tasiz; 3+ xato bo'lsa yangi savollar bilan qayta urinasiz.
                </p>
              </div>
              <div className="rounded-2xl border border-[#FFD700]/25 bg-black/35 px-4 py-3 text-right">
                <p className="text-xs font-bold text-white/45">Progress</p>
                <p className="text-2xl font-black text-[#FFD700]">{masteryCatalog ? `${masteryCatalog.passed_count}/${masteryCatalog.total}` : "..."}</p>
              </div>
            </div>

            {masteryError ? <div className="mt-4 rounded-2xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{masteryError}</div> : null}

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(masteryCatalog?.types || []).map((type) => {
                const locked = type.status === "locked";
                const passed = type.status === "passed";
                const proLocked = type.locked_reason === "pro_required";
                return (
                  <button
                    className={[
                      "group min-h-[132px] rounded-2xl border p-4 text-left transition",
                      passed ? "border-[#FFD700]/45 bg-[#FFD700]/12" : "",
                      !passed && !locked ? "border-[#FFD700]/55 bg-black/35 hover:bg-[#FFD700]/10" : "",
                      locked ? "border-white/10 bg-black/25 opacity-85 hover:border-[#FFD700]/30" : ""
                    ].join(" ")}
                    key={type.id}
                    onClick={() => openMasteryType(type)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FFD700] text-sm font-black text-black">{type.order_index}</span>
                      <span className={["inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black", passed ? "bg-emerald-400/15 text-emerald-200" : proLocked ? "bg-[#FFD700]/15 text-[#FFD700]" : locked ? "bg-white/10 text-white/40" : "bg-[#FFD700]/15 text-[#FFD700]"].join(" ")}>
                        {passed ? <Check size={14} /> : locked ? <Lock size={14} /> : <Play size={14} />}
                        {passed ? `${type.best_score}/10` : type.is_free ? "FREE" : proLocked ? "PRO" : "OPEN"}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-black text-white">{type.type_name}</h3>
                    <p className="mt-1 text-sm font-semibold text-white/50">{type.type_name_uz}</p>
                    <p className="mt-3 text-xs font-bold text-white/35">
                      {passed ? "O'zlashtirildi" : proLocked ? "Type 1 dan keyin Pro bilan ochiladi" : locked ? "Avval oldingi mavzuni tugating" : "Boshlashga tayyor"}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-3xl border border-[#FFD700]/25 bg-black/35 p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <span className={[
                    "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border text-3xl",
                    readingWritingMockUnlocked ? "border-[#FFD700]/70 bg-[#FFD700] text-black shadow-[0_0_28px_rgba(255,215,0,0.22)]" : "border-white/10 bg-[#2a2a2a] text-white/45"
                  ].join(" ")}>
                    {readingWritingMockUnlocked ? "🏆" : <Lock size={26} />}
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FFD700]">Curriculum Milestone</p>
                    <h3 className="mt-1 text-2xl font-black text-white">SAT Reading & Writing Mock</h3>
                    <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/55">
                      12 ta savol turini o'zlashtirgandan keyin Reading & Writing bo'yicha timed mock ochiladi. Bu curriculum ichidagi progress check, public menu emas.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/50">{masteryPassedCount}/{masteryTotal} mastery tugadi</span>
                      <span className={["rounded-full border px-3 py-1", isProActive ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-[#FFD700]/30 bg-[#FFD700]/10 text-[#FFD700]"].join(" ")}>
                        {isProActive ? "Pro active" : "Pro required"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  className={[
                    "min-h-12 rounded-xl px-5 py-3 text-sm font-black transition",
                    readingWritingMockUnlocked ? "bg-[#FFD700] text-black hover:bg-white" : "border border-white/10 bg-[#151515] text-white/45"
                  ].join(" ")}
                  onClick={openReadingWritingMock}
                  type="button"
                >
                  {readingWritingMockUnlocked ? "R&W Mock boshlash →" : "Locked"}
                </button>
              </div>
            </div>

            {!masteryCatalog && !masteryError ? <p className="mt-4 text-sm font-semibold text-white/45">Mastery tizimi yuklanmoqda...</p> : null}
          </section>

          <section className="path-stage relative mx-auto mt-8 max-w-3xl py-10">
            <div className="path-line-base" />
            <div
              className="path-line-completed"
              style={{ height: `${path.length > 1 ? Math.max(0, (safeCurrentIndex / (path.length - 1)) * 100) : 0}%` }}
            />
            {path.map((node, index) => {
              const isCompleted = completedSet.has(node.id);
              const isCurrent = index === safeCurrentIndex && !isCompleted;
              const isLocked = index > safeCurrentIndex;
              const side = index % 2 === 0 ? "md:pr-[54%]" : "md:pl-[54%]";
              const isRecentlyCompleted = recentlyCompletedNodeId === node.id;
              const nodeTooltip = isLocked
                ? "Avval oldingi darslarni tugating"
                : isCompleted
                  ? perfect && isRecentlyCompleted
                    ? `${questions.length}/${questions.length} — Mukammal!`
                    : "Review mode"
                  : pick(copy.header.start, language);

              return (
                <div
                  className={`path-node-row relative mb-12 flex justify-center ${side}`}
                  key={node.id}
                  ref={isCurrent ? currentNodeRef : null}
                >
                  {node.unitStart ? (
                    <div className="absolute -top-10 left-1/2 z-30 w-[min(92vw,520px)] -translate-x-1/2 rounded-full border border-[#FFD700]/30 bg-[#0a0a0a] px-4 py-2 text-center text-xs font-black uppercase tracking-[0.18em] text-[#FFD700] shadow-[0_0_30px_rgba(255,215,0,0.08)]">
                      {pick(node.unitStart, language)}
                    </div>
                  ) : null}
                  <button
                    className={[
                      "path-node group relative z-20 flex w-full max-w-[340px] items-center gap-4 rounded-2xl border p-4 text-left",
                      isCurrent ? "path-node--current border-[#FFD700]/65 bg-[#FFD700]/10 text-white" : "",
                      isCompleted ? "path-node--completed border-[#FFD700]/45 bg-[#15120a] text-white" : "",
                      isRecentlyCompleted ? "path-node--just-completed" : "",
                      isLocked ? "path-node--locked cursor-not-allowed border-white/10 bg-[#151515] text-white/42" : "",
                      node.checkpoint || node.unitIntro || node.id.includes("mock") ? "path-node--milestone" : "",
                      !isLocked && !isCurrent ? "hover:border-[#FFD700]/70 hover:bg-[#1b1b1b]" : ""
                    ].join(" ")}
                    onClick={() => openNode(node, index)}
                    type="button"
                    aria-label={nodeTooltip}
                  >
                    {isCurrent ? <span className="path-start-pill">{pick(copy.header.start, language)}</span> : null}
                    <span className="path-tooltip">{nodeTooltip}</span>
                    <span
                      className={[
                        "path-node-circle",
                        isCurrent ? "path-node-circle--current" : "",
                        isCompleted ? "path-node-circle--completed" : "",
                        isLocked ? "path-node-circle--locked" : "",
                        node.checkpoint || node.unitIntro || node.id.includes("mock") ? "path-node-circle--milestone" : ""
                      ].join(" ")}
                    >
                      {isCompleted ? (
                        <Check className="path-check-icon" size={30} />
                      ) : isLocked ? (
                        <Lock size={24} />
                      ) : node.checkpoint || node.unitIntro || node.id.includes("mock") ? (
                        <Image className="h-12 w-12 rounded-full object-cover" src={lionLogo} alt="" width={72} height={72} />
                      ) : (
                        node.icon
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-black">{pick(node.title, language)}</span>
                      <span className="mt-1 block text-sm leading-5 text-white/52">{pick(node.subtitle, language)}</span>
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

        <aside className="border-t border-white/10 bg-[#101010] p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden lg:border-l lg:border-t-0 lg:p-5">
          <div className="path-sidebar-scroll mt-4 grid gap-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pb-6 lg:pr-2" id="profile">
            <MetricCard animated={streakBumped} icon={<Flame className="text-[#FFD700]" />} value={`${progress.streak}`} label={pick(copy.right.streak, language)} />
            <div className="path-sidebar-card rounded-xl border border-white/10 bg-[#151515] p-5" style={{ animationDelay: "80ms" }}>
              <div className="flex items-center justify-between">
                <p className="font-black">{pick(copy.right.dailyGoal, language)}</p>
                <Target className="text-[#FFD700]" size={20} />
              </div>
              <div className="mt-4 h-3 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#FFD700]" style={{ width: `${Math.min(100, (progress.todayLessons / Math.max(1, progress.dailyGoal)) * 100)}%` }} />
              </div>
              <p className="mt-2 text-sm font-semibold text-white/55">{progress.todayLessons}/{progress.dailyGoal} lessons</p>
            </div>
            {subscriptionChecked && !isProActive ? (
              <div className="path-sidebar-card rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/10 p-5" style={{ animationDelay: "160ms" }}>
                <div className="flex items-center gap-2">
                  <MessageCircle className="text-[#FFD700]" size={20} />
                  <p className="font-black text-[#FFD700]">SATTEST PRO</p>
                </div>
                <p className="mt-3 text-2xl font-black text-white">300,000 UZS/oy</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Practice Bank, Mock Test va qolgan curriculum mavzularini ochish uchun Telegram bot orqali to'lov qiling.
                </p>
                <PaymentQrHandoff compact source="path_type_lock" className="mt-4 bg-black/30" />
                <p className="mt-2 text-center text-xs font-bold text-white/45">@{telegramBotUsername}</p>
              </div>
            ) : null}
            <div className="path-sidebar-card rounded-xl border border-white/10 bg-[#151515] p-5" style={{ animationDelay: "240ms" }}>
              <div className="flex items-center gap-2">
                <Sparkles className="text-[#FFD700]" size={20} />
                <p className="font-black">{pick(copy.right.challenge, language)}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/58">{pick(copy.right.challengeBody, language)}</p>
            </div>
            <div className="path-sidebar-card rounded-xl border border-white/10 bg-[#151515] p-5" id="leaderboard" style={{ animationDelay: "320ms" }}>
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
              <LessonCompletePanel
                correct={correctCount}
                total={questions.length}
                perfect={perfect}
                language={language}
                onContinue={() => {
                  setActiveNode(null);
                  window.setTimeout(() => setRecentlyCompletedNodeId(null), 1000);
                }}
              />
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
                    {activeNode.unitIntro
                      ? pick(activeNode.subtitle, language)
                      : `${activeNode.focus} is one focused SAT skill. Learn the rule, prove it with one worked example, then answer with evidence instead of guessing.`}
                  </LessonBlock>
                  <LessonBlock title={pick(copy.lesson.example, language)} icon={<BarChart3 className="text-[#FFD700]" />}>
                    {activeNode.unitIntro
                      ? "Example: before this unit starts, name the skill group, why SAT tests it, and the mistake you want to avoid. Then the next nodes turn that overview into practice."
                      : "Example: before picking an answer, name what the question asks and underline the exact sentence, data point, or math rule that proves it."}
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

      {activeMasteryType ? (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/85 p-4 backdrop-blur">
          <div className="mx-auto my-8 max-w-4xl rounded-3xl border border-[#FFD700]/25 bg-[#101010] p-5 shadow-[0_24px_100px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FFD700]">Question Type {activeMasteryType.order_index}</p>
                <h2 className="mt-2 text-2xl font-black md:text-4xl">{activeMasteryType.type_name}</h2>
                <p className="mt-1 text-sm font-semibold text-white/50">{activeMasteryType.type_name_uz}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {masteryContent && masteryScreen !== "paywall" ? (
                  <button className="rounded-xl border border-[#FFD700]/30 px-4 py-2 text-sm font-black text-[#FFD700] hover:bg-[#FFD700] hover:text-black disabled:opacity-45" disabled={masteryLoading} onClick={regenerateMasterySet} type="button">
                    Yangi 10 savol yaratish
                  </button>
                ) : null}
                <button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white/60 hover:border-white/30 hover:text-white" onClick={closeMasteryModal} type="button">
                  Close
                </button>
              </div>
            </div>

            {masteryScreen === "paywall" ? (
              <div className="mt-8 rounded-3xl border border-[#FFD700]/35 bg-[#FFD700]/10 p-6 text-center">
                <Image className="mx-auto h-20 w-20 rounded-full border border-[#FFD700]/40 object-cover" src={lionLogo} alt="SATTEST lion crest" width={120} height={120} />
                <h3 className="mt-5 text-3xl font-black">🦁 Birinchi mavzuni o'zlashtirdingiz!</h3>
                <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-white/68">
                  Qolgan 11 ta savol turi sizni kutmoqda, har biri 10 ta original savol bilan.
                </p>
                <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-white/10 bg-black/35 p-5 text-left">
                  <p className="text-2xl font-black text-[#FFD700]">300,000 UZS/oy</p>
                  <ul className="mt-4 grid gap-2 text-sm font-semibold text-white/70">
                    <li>✅ Qolgan 11 ta savol turi</li>
                    <li>✅ Har biri 10 ta original savol bilan</li>
                    <li>✅ Natijalaringiz saqlanadi va kuzatiladi</li>
                    <li>✅ Mock testlar, Reading Analyzer va shaxsiy path</li>
                  </ul>
                  <PaymentQrHandoff source="path_type_lock" className="mt-5" />
                </div>
                <p className="mt-3 text-sm font-bold text-white/45">@{telegramBotUsername}</p>
              </div>
            ) : null}

            {masteryContent && masteryScreen === "explanation" ? (
              <div className="mt-8 grid gap-5">
                <MasteryPanel title="Bu nima degani?">
                  <p className="text-xl font-bold leading-9 text-white/82">{masteryContent.explanation_uz}</p>
                </MasteryPanel>
                <button className="min-h-12 rounded-xl bg-[#FFD700] px-5 py-3 font-black text-black transition hover:bg-white" onClick={() => setMasteryScreen("strategy")} type="button">
                  Strategiyani ko'rish →
                </button>
              </div>
            ) : null}

            {masteryContent && masteryScreen === "strategy" ? (
              <div className="mt-8 grid gap-5">
                <MasteryPanel title="Qanday yondashish kerak?">
                  <ul className="grid gap-3 text-lg font-semibold leading-8 text-white/78">
                    {masteryContent.strategy_uz.map((item) => (
                      <li className="rounded-2xl border border-white/10 bg-black/25 p-4" key={item}>{item}</li>
                    ))}
                  </ul>
                </MasteryPanel>
                <button className="min-h-12 rounded-xl bg-[#FFD700] px-5 py-3 font-black text-black transition hover:bg-white" onClick={() => setMasteryScreen("practice")} type="button">
                  10 ta savolni boshlash →
                </button>
              </div>
            ) : null}

            {masteryContent && masteryScreen === "practice" ? (
              <div className="mt-8">
                {(() => {
                  const question = masteryContent.questions[masteryQuestionIndex];
                  const mistakes = Object.entries(masteryAnswers).filter(([index, answer]) => masteryContent.questions[Number(index)]?.correct_answer !== answer).length;
                  return (
                    <div className="grid gap-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FFD700]">Savol {masteryQuestionIndex + 1}/10</p>
                        <p className={["rounded-full border px-3 py-1 text-sm font-black", mistakes > 2 ? "border-red-400/50 bg-red-500/10 text-red-100" : "border-[#FFD700]/30 bg-[#FFD700]/10 text-[#FFD700]"].join(" ")}>
                          Xatolar: {mistakes}/2
                        </p>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-[#FFD700]" style={{ width: `${((masteryQuestionIndex + 1) / 10) * 100}%` }} />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/35 p-5 text-lg leading-8 text-white/78">{question.passage_or_sentence}</div>
                      <h3 className="text-2xl font-black leading-tight">{question.question_text}</h3>
                      <div className="grid gap-3">
                        {(["A", "B", "C", "D"] as const).map((letter) => {
                          const selected = masteryFeedback?.selected === letter;
                          const correct = masteryFeedback?.correct === letter;
                          return (
                            <button
                              className={[
                                "min-h-14 rounded-2xl border px-4 py-3 text-left text-base font-bold transition",
                                !masteryFeedback ? "border-white/10 bg-[#151515] text-white/80 hover:border-[#FFD700]/60" : "",
                                masteryFeedback && correct ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100" : "",
                                masteryFeedback && selected && !correct ? "border-red-400/60 bg-red-500/15 text-red-100" : "",
                                masteryFeedback && !selected && !correct ? "border-white/10 bg-black/20 text-white/38" : ""
                              ].join(" ")}
                              disabled={Boolean(masteryFeedback)}
                              key={letter}
                              onClick={() => chooseMasteryAnswer(letter)}
                              type="button"
                            >
                              <span className="mr-2 text-[#FFD700]">{letter}.</span>
                              {question.options[letter]}
                            </button>
                          );
                        })}
                      </div>
                      {masteryFeedback ? (
                        <div className={["rounded-2xl border p-4", masteryFeedback.isCorrect ? "border-emerald-400/45 bg-emerald-500/10" : "border-red-400/45 bg-red-500/10"].join(" ")}>
                          <p className="text-lg font-black">{masteryFeedback.isCorrect ? "✅ To'g'ri" : `❌ Bu emas. To'g'ri javob: ${masteryFeedback.correct}`}</p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-white/70">
                            {masteryFeedback.isCorrect ? question.explanation_uz : question.why_wrong_uz[masteryFeedback.selected as "A" | "B" | "C" | "D"] || question.explanation_uz}
                          </p>
                          <button className="mt-4 min-h-11 rounded-xl bg-[#FFD700] px-5 py-3 text-sm font-black text-black hover:bg-white" disabled={masteryLoading} onClick={continueMasteryPractice} type="button">
                            {masteryQuestionIndex === masteryContent.questions.length - 1 ? "Natijani ko'rish →" : "Davom et →"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
            ) : null}

            {masteryScreen === "result" && masteryResult ? (
              <div className="mt-8 rounded-3xl border border-white/10 bg-black/35 p-6 text-center">
                {masteryResult.passed ? (
                  <>
                    <h3 className="text-3xl font-black text-emerald-100">✅ {activeMasteryType.type_name} o'zlashtirildi!</h3>
                    <p className="mt-3 text-2xl font-black text-[#FFD700]">{masteryResult.correct}/10 to'g'ri</p>
                    {masteryResult.paywall_required ? (
                      <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-[#FFD700]/35 bg-[#FFD700]/10 p-5">
                        <p className="text-xl font-black">🦁 {activeMasteryType.type_name} mavzusini o'zlashtirdingiz — {masteryResult.correct}/10!</p>
                        <p className="mt-3 text-sm font-semibold leading-6 text-white/72">
                          Qolgan 11 ta savol turi sizni kutmoqda, har biri 10 ta original savol bilan.
                        </p>
                        <p className="mt-3 text-sm font-black text-[#FFD700]">Pro bilan to'liq SAT yo'lini oching:</p>
                        <PaymentQrHandoff source="path_type_lock" className="mt-4" />
                        <p className="mt-2 text-xs font-bold text-white/45">@{telegramBotUsername}</p>
                      </div>
                    ) : null}
                    <button className="mt-6 min-h-11 rounded-xl border border-white/10 px-5 py-3 font-black text-white/70 hover:border-[#FFD700] hover:text-[#FFD700]" onClick={closeMasteryModal} type="button">
                      Pathga qaytish
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-3xl font-black text-red-100">Yana urinib ko'ramiz</h3>
                    <p className="mx-auto mt-3 max-w-2xl text-lg font-semibold leading-8 text-white/68">
                      {masteryResult.message_uz || `Bu safar ${masteryResult.mistakes} xato qildingiz. Savollar yangilandi — qaytadan urinib ko'ramiz.`}
                    </p>
                    <button className="mt-6 min-h-12 rounded-xl bg-[#FFD700] px-6 py-3 font-black text-black hover:bg-white" onClick={retryMasterySet} type="button">
                      Qayta urinish →
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {masteryLoading ? <p className="mt-5 text-center text-sm font-black text-[#FFD700]">Yuklanmoqda...</p> : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function MasteryPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#FFD700]/20 bg-[#151515] p-5">
      <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[#FFD700]">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SideLink({ active = false, href = "#", icon, label, muted = false }: { active?: boolean; href?: string; icon: ReactNode; label: string; muted?: boolean }) {
  const className = [
    "flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition",
    active ? "bg-[#FFD700] text-black" : muted ? "text-white/38 hover:bg-white/5 hover:text-white/70" : "text-white/55 hover:bg-white/5 hover:text-[#FFD700]"
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

function QuickAccessCard({
  body,
  cta,
  href,
  icon,
  meta,
  title
}: {
  body: string;
  cta: string;
  href: string;
  icon: ReactNode;
  meta: string;
  title: string;
}) {
  return (
    <Link
      className="group flex min-h-[190px] flex-col justify-between rounded-2xl border border-white/10 bg-black/25 p-5 transition hover:border-[#FFD700]/55 hover:bg-[#FFD700]/10"
      href={href}
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/10 text-[#FFD700] transition group-hover:bg-[#FFD700] group-hover:text-black">
            {icon}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-right text-[10px] font-black uppercase tracking-[0.12em] text-white/48">
            {meta}
          </span>
        </div>
        <h3 className="mt-5 text-xl font-black text-white">{title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/52">{body}</p>
      </div>
      <span className="mt-5 inline-flex items-center justify-between rounded-xl border border-[#FFD700]/35 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#FFD700] transition group-hover:bg-[#FFD700] group-hover:text-black">
        {cta}
        <ChevronRight size={16} />
      </span>
    </Link>
  );
}

function MetricCard({ animated = false, icon, value, label }: { animated?: boolean; icon: ReactNode; value: string; label: string }) {
  return (
    <div className="path-sidebar-card rounded-xl border border-white/10 bg-[#151515] p-5" style={{ animationDelay: "0ms" }}>
      <div className="flex items-center justify-between">
        <div>
          <p className={["text-4xl font-black text-[#FFD700]", animated ? "path-streak-count--bump" : ""].join(" ")}>{value}</p>
          <p className="mt-1 text-sm font-semibold text-white/55">{label}</p>
        </div>
        <span className={animated ? "path-streak-flame--bump" : ""}>{icon}</span>
      </div>
    </div>
  );
}

function LessonCompletePanel({
  correct,
  total,
  perfect,
  language,
  onContinue
}: {
  correct: number;
  total: number;
  perfect: boolean;
  language: Language;
  onContinue: () => void;
}) {
  const [displayCorrect, setDisplayCorrect] = useState(0);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    setDisplayCorrect(0);
    setShowButton(false);
    const duration = 600;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      setDisplayCorrect(Math.round(correct * progress));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        window.setTimeout(() => setShowButton(true), 200);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [correct]);

  return (
    <div className="lesson-complete-panel text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#FFD700]/45 bg-[#FFD700]/15 text-[#FFD700]">
        <Check size={42} />
      </div>
      <h2 className="mt-5 text-4xl font-black">{pick(copy.lesson.done, language)}</h2>
      <p className={["lesson-score-text mt-5 text-5xl font-black text-[#FFD700]", perfect ? "lesson-score-text--perfect" : ""].join(" ")}>
        {displayCorrect}/{total}
      </p>
      <p className="mt-2 text-lg font-bold text-white/58">to'g'ri</p>
      <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-[#FFD700]/30 bg-[#FFD700]/10 px-5 py-3 text-sm font-black text-[#FFD700]">
        <Sparkles size={18} />
        {pick(copy.lesson.xp, language)}
        {perfect ? <span>• {pick(copy.lesson.perfect, language)}</span> : null}
      </div>
      <button
        className={[
          "lesson-continue-button mt-7 min-h-12 w-full rounded-xl bg-[#FFD700] px-5 py-3 font-black text-black transition hover:bg-white",
          showButton ? "lesson-continue-button--visible" : ""
        ].join(" ")}
        onClick={onContinue}
        type="button"
      >
        {pick(copy.lesson.next, language)}
      </button>
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
