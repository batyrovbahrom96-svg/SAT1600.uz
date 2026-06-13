"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BookOpen, CalendarDays, Check, CheckCircle2, Clock, FileText, LockKeyhole, Target, Users, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { api, getToken } from "@/lib/api";
import { calculateDiagnosticResult, type DiagnosticResult } from "@/lib/free-diagnostic";
import { getFreeDiagnosticResult, type StoredFreeDiagnostic } from "@/lib/free-diagnostic-storage";
import { useLanguage } from "@/lib/i18n";

type ScoreHistoryItem = { attempt_id: string; score: number; date: string };
type AnalyticsHistory = { score_history: ScoreHistoryItem[]; attempts: number };
type Language = "en" | "ru" | "uz";

const my1400Copy = {
  en: {
    opening: "Opening your personal curriculum",
    diagnosticRequired: "Diagnostic required",
    previewEyebrow: "My 1400+ ko'rinishi",
    previewTitle: "See exactly what to study next.",
    previewBody:
      "My 1400+ turns one diagnostic into a simple daily route: target score, weak topics, today's assignment, teacher-supervised theory, and the next mock retake date.",
    choosePlan: "Choose plan",
    startFreeDiagnostic: "Start free diagnostic",
    sampleDashboard: "Sample student dashboard",
    todayRepair: "Today: Advanced Math repair",
    nextMockRetake: "Next mock retake",
    day25: "Day 25",
    routeUpdates: "The route updates after the score report.",
    weakMapTitle: "Weak-topic map",
    weakMapBody: "Students do not need to guess what to study. The weakest SAT domains appear first.",
    nextTitle: "What the student sees next",
    theoryTitle: "Theory is supervised",
    theoryBody:
      "Each weak skill gets a short rule lesson, worked examples, monitored practice, mistake explanation, and a retest before the topic is treated as improved.",
    roadmapEyebrow: "1-month roadmap",
    roadmapTitle: "Four clear weeks, not thirty confusing rows.",
    roadmapBody: "The real plan becomes more detailed after the diagnostic, but the student always sees only the next useful step.",
    unlockedPreview: "Today unlocked preview",
    routeSampleTitle: "Try the first 2 tasks from the route.",
    routeSampleBody:
      "The student should not only read a plan. They should feel the plan start correcting them immediately: answer, see the trap, then continue into the locked Pro assignment.",
    progress: "Progress",
    explanationsOpened: "explanations opened",
    ready: "Ready",
    fix: "Fix",
    feedback: "Route feedback",
    chooseAnswer: "Choose an answer to see how My 1400+ corrects the mistake.",
    assignment: "Assignment",
    lockedAfterPreview: "Locked after preview",
    lockedTitle: "Today still has 28 tasks, a timed set, and parent progress snapshot locked.",
    lockedBody: "Pro opens the full daily route, updates it after each result, and keeps the student from guessing what to study.",
    unlockPro: "Unlock Pro",
    savedEyebrow: "Saved Free Diagnostic",
    savedTitle: (score: number) => `Your My 1400+ route starts from ≈${score}.`,
    savedBody:
      "This diagnostic is saved for 48 hours. Your weak areas are already inside My 1400+, so after Pro payment the next step is the full mock test and your 30-day plan.",
    estimatedScore: "Estimated score",
    readingWriting: "Reading/Writing",
    readingWritingRange: "Reading/Writing range",
    math: "Math",
    mathRange: "Math range",
    openPaymentQr: "Open payment QR",
    retakeDiagnostic: "Retake diagnostic",
    weakAreasSaved: "Weak areas saved",
    savedUntil: "Saved until",
    savedUntilBody: "Refreshing this page will keep the result. After 48 hours, the free diagnostic result expires and the student should retake it.",
    topicAccuracyTitle: "Topic accuracy from the diagnostic",
    routeReady: "30-day route ready",
    routeReadyBody:
      "Pro turns this saved diagnostic into the full 98-question mock test, accurate scoring, daily weak-skill tasks, mistake tracking, and a clear next retake date.",
    statLabels: ["Target score", "Today", "Retake", "Support"],
    supportValue: "Teacher check",
    sampleDayPlan: [
      ["Theory", "Functions: vertex form, roots, graph meaning", "25 min"],
      ["Practice", "18 Advanced Math questions, first 10 untimed", "55 min"],
      ["Timed set", "12 transition and sentence-placement questions", "25 min"],
      ["Review", "Write trap, rule, and faster method for every miss", "35 min"]
    ],
    routeSteps: [
      ["1", "Take diagnostic", "SATTEST.UZ finds weak skills, timing problems, and repeated traps."],
      ["2", "Follow today's work", "The dashboard gives one clear theory block, question set, and review task."],
      ["3", "Retake and adjust", "Mock retakes update the route, parent summary, and next-week priorities."]
    ],
    topicProgress: [
      ["Information and Ideas", 62, "14 question set + evidence traps"],
      ["Craft and Structure", 58, "Words in context + function questions"],
      ["Expression of Ideas", 70, "Transitions, boundaries, logical order"],
      ["Standard English Conventions", 66, "Punctuation, modifiers, verbs"],
      ["Algebra", 74, "Linear equations, systems, inequalities"],
      ["Advanced Math", 52, "Quadratics, functions, nonlinear models"]
    ],
    nextAssignments: [
      "Watch supervised theory: Advanced Math functions and vertex form",
      "Solve 18 nonlinear equation questions with explanation review",
      "Complete 12 transition and sentence-placement questions",
      "Update mistake notebook: write the trap, rule, and faster method",
      "Send parent progress snapshot after the weekly checkpoint"
    ],
    weeklyTargets: [
      { week: "Week 1", title: "Repair the score leaks", hours: "12.5h", target: "1210 to 1260", work: "Theory supervision, weak-topic drills, and one mini module retake." },
      { week: "Week 2", title: "Build accuracy under time", hours: "14h", target: "1260 to 1310", work: "Timed Reading/Writing sets, Advanced Math blocks, and mistake notebook review." },
      { week: "Week 3", title: "Mixed module pressure", hours: "15h", target: "1310 to 1360", work: "Full mixed modules, hard-question review, and parent progress update." },
      { week: "Week 4", title: "Mock retake and 1400+ push", hours: "16h", target: "1360 to 1400+", work: "Two full mock cycles, final weak-topic sprint, and timing strategy correction." }
    ]
  },
  ru: {
    opening: "Открываем ваш личный план",
    diagnosticRequired: "Нужна диагностика",
    previewEyebrow: "Превью My 1400+",
    previewTitle: "Поймите, что именно учить дальше.",
    previewBody:
      "My 1400+ превращает одну диагностику в понятный ежедневный маршрут: цель по баллам, слабые темы, задание на сегодня, теория с проверкой преподавателя и дата следующего mock test.",
    choosePlan: "Выбрать план",
    startFreeDiagnostic: "Начать бесплатную диагностику",
    sampleDashboard: "Пример кабинета ученика",
    todayRepair: "Сегодня: работа над Advanced Math",
    nextMockRetake: "Следующий mock test",
    day25: "День 25",
    routeUpdates: "Маршрут обновляется после отчёта с результатом.",
    weakMapTitle: "Карта слабых тем",
    weakMapBody: "Ученику не нужно угадывать, что учить. Самые слабые SAT-разделы показываются первыми.",
    nextTitle: "Что ученик видит дальше",
    theoryTitle: "Теория под контролем",
    theoryBody:
      "Каждый слабый навык получает короткое правило, разобранные примеры, практику с проверкой, объяснение ошибок и повторный тест.",
    roadmapEyebrow: "План на 1 месяц",
    roadmapTitle: "Четыре понятные недели, а не тридцать запутанных строк.",
    roadmapBody: "После диагностики план становится детальнее, но ученик всегда видит только следующий полезный шаг.",
    unlockedPreview: "Превью задания на сегодня",
    routeSampleTitle: "Попробуйте первые 2 задания из маршрута.",
    routeSampleBody:
      "Ученик должен не просто читать план. Он должен сразу почувствовать коррекцию: ответить, увидеть ловушку и перейти к закрытому Pro-заданию.",
    progress: "Прогресс",
    explanationsOpened: "объяснений открыто",
    ready: "Готово",
    fix: "Исправить",
    feedback: "Обратная связь маршрута",
    chooseAnswer: "Выберите ответ, чтобы увидеть, как My 1400+ исправляет ошибку.",
    assignment: "Задание",
    lockedAfterPreview: "Дальше закрыто",
    lockedTitle: "На сегодня ещё закрыты 28 заданий, timed set и отчёт для родителей.",
    lockedBody: "Pro открывает полный ежедневный маршрут, обновляет его после каждого результата и убирает догадки из подготовки.",
    unlockPro: "Открыть Pro",
    savedEyebrow: "Сохранённая бесплатная диагностика",
    savedTitle: (score: number) => `Ваш маршрут My 1400+ начинается с ≈${score}.`,
    savedBody:
      "Диагностика сохранена на 48 часов. Слабые темы уже внутри My 1400+, поэтому после оплаты Pro следующий шаг — полный mock test и ваш 30-дневный план.",
    estimatedScore: "Примерный балл",
    readingWriting: "Чтение/письмо",
    readingWritingRange: "Диапазон чтения/письма",
    math: "Математика",
    mathRange: "Диапазон математики",
    openPaymentQr: "Открыть QR оплаты",
    retakeDiagnostic: "Пересдать диагностику",
    weakAreasSaved: "Слабые темы сохранены",
    savedUntil: "Сохранено до",
    savedUntilBody: "После обновления страницы результат останется. Через 48 часов бесплатная диагностика истечёт, и ученику нужно будет пройти её заново.",
    topicAccuracyTitle: "Точность по темам из диагностики",
    routeReady: "30-дневный маршрут готов",
    routeReadyBody:
      "Pro превращает эту диагностику в полный mock test из 98 вопросов, точный балл, ежедневные задания по слабым навыкам, отслеживание ошибок и дату следующей пересдачи.",
    statLabels: ["Цель", "Сегодня", "Пересдача", "Поддержка"],
    supportValue: "Проверка преподавателя",
    sampleDayPlan: [
      ["Теория", "Функции: вершина, корни, смысл графика", "25 мин"],
      ["Практика", "18 вопросов Advanced Math, первые 10 без таймера", "55 мин"],
      ["На время", "12 вопросов на transitions и sentence placement", "25 мин"],
      ["Разбор", "Записать ловушку, правило и быстрый метод для каждой ошибки", "35 мин"]
    ],
    routeSteps: [
      ["1", "Пройти диагностику", "SATTEST.UZ находит слабые навыки, проблемы со временем и повторяющиеся ловушки."],
      ["2", "Сделать задание дня", "Кабинет даёт один понятный блок теории, набор вопросов и задачу на разбор."],
      ["3", "Пересдать и обновить план", "Mock retake обновляет маршрут, отчёт для родителей и приоритеты недели."]
    ],
    topicProgress: [
      ["Information and Ideas", 62, "14 вопросов + ловушки evidence"],
      ["Craft and Structure", 58, "Words in context + function questions"],
      ["Expression of Ideas", 70, "Transitions, boundaries, logical order"],
      ["Standard English Conventions", 66, "Пунктуация, modifiers, verbs"],
      ["Algebra", 74, "Линейные уравнения, systems, inequalities"],
      ["Advanced Math", 52, "Quadratics, functions, nonlinear models"]
    ],
    nextAssignments: [
      "Посмотреть теорию с контролем: функции Advanced Math и vertex form",
      "Решить 18 nonlinear equation questions с разбором",
      "Выполнить 12 вопросов на transitions и sentence placement",
      "Обновить журнал ошибок: ловушка, правило и быстрый метод",
      "Отправить родителям отчёт после недельного checkpoint"
    ],
    weeklyTargets: [
      { week: "Неделя 1", title: "Закрыть потери баллов", hours: "12.5 ч", target: "1210 до 1260", work: "Теория с контролем, drill по слабым темам и один mini module retake." },
      { week: "Неделя 2", title: "Точность под временем", hours: "14 ч", target: "1260 до 1310", work: "Timed Reading/Writing sets, Advanced Math blocks и разбор журнала ошибок." },
      { week: "Неделя 3", title: "Смешанное давление модулей", hours: "15 ч", target: "1310 до 1360", work: "Full mixed modules, hard-question review и отчёт родителям." },
      { week: "Неделя 4", title: "Mock retake и рывок к 1400+", hours: "16 ч", target: "1360 до 1400+", work: "Два full mock cycles, финальный спринт слабых тем и коррекция timing strategy." }
    ]
  },
  uz: {
    opening: "Shaxsiy rejangiz ochilmoqda",
    diagnosticRequired: "Diagnostika kerak",
    previewEyebrow: "My 1400+ preview",
    previewTitle: "Keyin aynan nimani o'qish kerakligini ko'ring.",
    previewBody:
      "My 1400+ bitta diagnostikani oddiy kunlik yo'nalishga aylantiradi: maqsad ball, zaif mavzular, bugungi vazifa, o'qituvchi nazoratidagi nazariya va keyingi mock test kuni.",
    choosePlan: "Rejani tanlash",
    startFreeDiagnostic: "Bepul diagnostikani boshlash",
    sampleDashboard: "O'quvchi kabineti namunasi",
    todayRepair: "Bugun: Advanced Math tuzatish",
    nextMockRetake: "Keyingi mock test",
    day25: "25-kun",
    routeUpdates: "Yo'nalish score reportdan keyin yangilanadi.",
    weakMapTitle: "Zaif mavzular xaritasi",
    weakMapBody: "O'quvchi nimani o'qishni taxmin qilmaydi. Eng zaif SAT bo'limlari birinchi chiqadi.",
    nextTitle: "O'quvchi keyin nimani ko'radi",
    theoryTitle: "Nazariya nazorat ostida",
    theoryBody:
      "Har bir zaif ko'nikma uchun qisqa qoida, ishlangan misollar, nazoratli mashq, xato izohi va qayta test beriladi.",
    roadmapEyebrow: "1 oylik yo'l xaritasi",
    roadmapTitle: "To'rt aniq hafta, o'ttizta chalkash qator emas.",
    roadmapBody: "Diagnostikadan keyin reja batafsilroq bo'ladi, lekin o'quvchi doim faqat keyingi foydali qadamni ko'radi.",
    unlockedPreview: "Bugungi vazifa ko'rinishi",
    routeSampleTitle: "Yo'nalishdagi birinchi 2 vazifani sinab ko'ring.",
    routeSampleBody:
      "O'quvchi faqat reja o'qimasligi kerak. U darhol tuzatishni his qilishi kerak: javob beradi, tuzoqni ko'radi, keyin yopiq Pro vazifaga o'tadi.",
    progress: "Natija",
    explanationsOpened: "izoh ochildi",
    ready: "Tayyor",
    fix: "Tuzatish",
    feedback: "Yo'nalish fikri",
    chooseAnswer: "My 1400+ xatoni qanday tuzatishini ko'rish uchun javob tanlang.",
    assignment: "Vazifa",
    lockedAfterPreview: "Ko'rinishdan keyin yopiq",
    lockedTitle: "Bugun yana 28 ta vazifa, timed set va ota-ona progress hisoboti yopiq.",
    lockedBody: "Pro to'liq kunlik yo'nalishni ochadi, har bir natijadan keyin yangilaydi va o'quvchini nima o'qishni taxmin qilishdan qutqaradi.",
    unlockPro: "Pro ochish",
    savedEyebrow: "Saqlangan bepul diagnostika",
    savedTitle: (score: number) => `My 1400+ yo'nalishingiz ≈${score} balldan boshlanadi.`,
    savedBody:
      "Bu diagnostika 48 soat saqlanadi. Zaif mavzularingiz My 1400+ ichida tayyor, shuning uchun Pro to'lovidan keyingi qadam to'liq mock test va 30 kunlik rejangiz bo'ladi.",
    estimatedScore: "Taxminiy ball",
    readingWriting: "Reading/Writing",
    readingWritingRange: "Reading/Writing oralig'i",
    math: "Matematika",
    mathRange: "Matematika oralig'i",
    openPaymentQr: "To'lov QR kodini ochish",
    retakeDiagnostic: "Diagnostikani qayta topshirish",
    weakAreasSaved: "Zaif mavzular saqlandi",
    savedUntil: "Saqlanish muddati",
    savedUntilBody: "Sahifa yangilansa ham natija saqlanadi. 48 soatdan keyin bepul diagnostika muddati tugaydi va o'quvchi qayta topshirishi kerak.",
    topicAccuracyTitle: "Diagnostikadan mavzular bo'yicha aniqlik",
    routeReady: "30 kunlik yo'nalish tayyor",
    routeReadyBody:
      "Pro bu saqlangan diagnostikani 98 savollik to'liq mock test, aniq ball, kunlik zaif ko'nikma vazifalari, xato kuzatuvi va keyingi retake sanasiga aylantiradi.",
    statLabels: ["Maqsad ball", "Bugun", "Qayta topshirish", "Yordam"],
    supportValue: "O'qituvchi tekshiruvi",
    sampleDayPlan: [
      ["Nazariya", "Funksiyalar: vertex form, ildizlar, grafik ma'nosi", "25 daq"],
      ["Mashq", "18 ta Advanced Math savol, birinchi 10 tasi taymersiz", "55 daq"],
      ["Taymerli set", "12 ta transition va sentence-placement savol", "25 daq"],
      ["Tahlil", "Har bir xato uchun trap, qoida va tezroq usul yozish", "35 daq"]
    ],
    routeSteps: [
      ["1", "Diagnostika topshirish", "SATTEST.UZ zaif ko'nikmalar, vaqt muammolari va takroriy traplarni topadi."],
      ["2", "Bugungi ishni bajarish", "Dashboard bitta aniq nazariya bloki, savollar seti va tahlil vazifasini beradi."],
      ["3", "Qayta topshirish va moslash", "Mock retake yo'nalish, ota-ona xulosasi va keyingi hafta ustuvorliklarini yangilaydi."]
    ],
    topicProgress: [
      ["Information and Ideas", 62, "14 savollik to'plam + dalil tuzoqlari"],
      ["Craft and Structure", 58, "Kontekstdagi so'zlar + funksiya savollari"],
      ["Expression of Ideas", 70, "O'tishlar, gap chegaralari, mantiqiy tartib"],
      ["Standard English Conventions", 66, "Tinish belgilari, modifiers, verbs"],
      ["Algebra", 74, "Chiziqli tenglamalar, sistemalar, inequalities"],
      ["Advanced Math", 52, "Kvadrat tenglamalar, funksiyalar, nonlinear models"]
    ],
    nextAssignments: [
      "Nazoratli nazariyani ko'rish: Advanced Math functions va vertex form",
      "18 ta nonlinear equation questionsni izoh bilan yechish",
      "12 ta transition va sentence-placement savolni bajarish",
      "Xato daftarini yangilash: trap, qoida va tezroq usul",
      "Haftalik checkpointdan keyin ota-onaga progress yuborish"
    ],
    weeklyTargets: [
      { week: "1-hafta", title: "Ball yo'qotishlarni tuzatish", hours: "12.5 soat", target: "1210 dan 1260 gacha", work: "Nazariya nazorati, zaif mavzu drillari va bitta mini module retake." },
      { week: "2-hafta", title: "Vaqt ostida aniqlik qurish", hours: "14 soat", target: "1260 dan 1310 gacha", work: "Timed Reading/Writing setlar, Advanced Math bloklar va xato daftarini tahlil qilish." },
      { week: "3-hafta", title: "Aralash modul bosimi", hours: "15 soat", target: "1310 dan 1360 gacha", work: "Full mixed modules, hard-question review va ota-ona progress yangilanishi." },
      { week: "4-hafta", title: "Mock retake va 1400+ bosqichi", hours: "16 soat", target: "1360 dan 1400+ gacha", work: "Ikki full mock cycle, yakuniy zaif mavzu sprinti va timing strategy tuzatish." }
    ]
  }
} satisfies Record<Language, {
  opening: string;
  diagnosticRequired: string;
  previewEyebrow: string;
  previewTitle: string;
  previewBody: string;
  choosePlan: string;
  startFreeDiagnostic: string;
  sampleDashboard: string;
  todayRepair: string;
  nextMockRetake: string;
  day25: string;
  routeUpdates: string;
  weakMapTitle: string;
  weakMapBody: string;
  nextTitle: string;
  theoryTitle: string;
  theoryBody: string;
  roadmapEyebrow: string;
  roadmapTitle: string;
  roadmapBody: string;
  unlockedPreview: string;
  routeSampleTitle: string;
  routeSampleBody: string;
  progress: string;
  explanationsOpened: string;
  ready: string;
  fix: string;
  feedback: string;
  chooseAnswer: string;
  assignment: string;
  lockedAfterPreview: string;
  lockedTitle: string;
  lockedBody: string;
  unlockPro: string;
  savedEyebrow: string;
  savedTitle: (score: number) => string;
  savedBody: string;
  estimatedScore: string;
  readingWriting: string;
  readingWritingRange: string;
  math: string;
  mathRange: string;
  openPaymentQr: string;
  retakeDiagnostic: string;
  weakAreasSaved: string;
  savedUntil: string;
  savedUntilBody: string;
  topicAccuracyTitle: string;
  routeReady: string;
  routeReadyBody: string;
  statLabels: string[];
  supportValue: string;
  sampleDayPlan: string[][];
  routeSteps: string[][];
  topicProgress: (readonly [string, number, string])[];
  nextAssignments: string[];
  weeklyTargets: { week: string; title: string; hours: string; target: string; work: string }[];
}>;

const topicProgress = [
  ["Information and Ideas", 62, "14 question set + evidence traps"],
  ["Craft and Structure", 58, "Words in context + function questions"],
  ["Expression of Ideas", 70, "Transitions, boundaries, logical order"],
  ["Standard English Conventions", 66, "Punctuation, modifiers, verbs"],
  ["Algebra", 74, "Linear equations, systems, inequalities"],
  ["Advanced Math", 52, "Quadratics, functions, nonlinear models"],
  ["Problem-Solving and Data", 61, "Ratios, charts, probability, units"],
  ["Geometry and Trigonometry", 47, "Angles, circles, triangles, trig"]
] as const;

const weeklyTargets = [
  {
    week: "Week 1",
    title: "Repair the score leaks",
    hours: "12.5h",
    target: "1210 to 1260",
    work: "Theory supervision, weak-topic drills, and one mini module retake."
  },
  {
    week: "Week 2",
    title: "Build accuracy under time",
    hours: "14h",
    target: "1260 to 1310",
    work: "Timed Reading/Writing sets, Advanced Math blocks, and mistake notebook review."
  },
  {
    week: "Week 3",
    title: "Mixed module pressure",
    hours: "15h",
    target: "1310 to 1360",
    work: "Full mixed modules, hard-question review, and parent progress update."
  },
  {
    week: "Week 4",
    title: "Mock retake and 1400+ push",
    hours: "16h",
    target: "1360 to 1400+",
    work: "Two full mock cycles, final weak-topic sprint, and timing strategy correction."
  }
] as const;

const nextAssignments = [
  "Watch supervised theory: Advanced Math functions and vertex form",
  "Solve 18 nonlinear equation questions with explanation review",
  "Complete 12 transition and sentence-placement questions",
  "Update mistake notebook: write the trap, rule, and faster method",
  "Send parent progress snapshot after the weekly checkpoint"
] as const;

const scoreStats: { icon: LucideIcon; label: string; value: string }[] = [
  { icon: Target, label: "Target score", value: "1400+" },
  { icon: Clock, label: "Today", value: "2h 20m" },
  { icon: CalendarDays, label: "Retake", value: "Day 25" },
  { icon: Users, label: "Support", value: "Teacher check" }
];

const routeSteps = [
  ["1", "Take diagnostic", "SATTEST.UZ finds weak skills, timing problems, and repeated traps."],
  ["2", "Follow today's work", "The dashboard gives one clear theory block, question set, and review task."],
  ["3", "Retake and adjust", "Mock retakes update the route, parent summary, and next-week priorities."]
] as const;

const sampleDayPlan = [
  ["Theory", "Functions: vertex form, roots, graph meaning", "25 min"],
  ["Practice", "18 Advanced Math questions, first 10 untimed", "55 min"],
  ["Timed set", "12 transition and sentence-placement questions", "25 min"],
  ["Review", "Write trap, rule, and faster method for every miss", "35 min"]
] as const;

const routeSampleQuestions = [
  {
    label: "Assignment 1",
    skill: "Advanced Math",
    prompt: "A quadratic has roots 3 and 7. Which expression could represent the quadratic?",
    options: ["(x + 3)(x + 7)", "(x - 3)(x - 7)", "(x - 10)(x + 21)", "(x - 4)(x - 6)"],
    correctIndex: 1,
    explanation:
      "Roots are the x-values that make the expression equal to zero. To make x = 3 and x = 7 work, the factors must be (x - 3)(x - 7)."
  },
  {
    label: "Assignment 2",
    skill: "Writing",
    prompt:
      "The experiment produced accurate results. ___, the team repeated the trial to confirm that the pattern was reliable.",
    options: ["Nevertheless", "For this reason", "Similarly", "In contrast"],
    correctIndex: 1,
    explanation:
      "The second sentence gives the reason for repeating the trial. 'For this reason' connects the accurate results to the confirmation step."
  }
] as const;

export default function My1400Page() {
  const router = useRouter();
  const { language } = useLanguage();
  const copy = my1400Copy[language];
  const [state, setState] = useState<"checking" | "login" | "diagnostic">("checking");
  const [freeDiagnostic, setFreeDiagnostic] = useState<StoredFreeDiagnostic | null>(null);
  const freeDiagnosticResult = useMemo<DiagnosticResult | null>(() => {
    if (!freeDiagnostic) return null;
    return calculateDiagnosticResult(freeDiagnostic.answers);
  }, [freeDiagnostic]);

  useEffect(() => {
    if (!getToken()) {
      setState("login");
      return;
    }

    setFreeDiagnostic(getFreeDiagnosticResult());

    api<AnalyticsHistory>("/api/analytics/me")
      .then((history) => {
        const latestAttemptId = history.score_history.at(-1)?.attempt_id;
        if (latestAttemptId) {
          router.replace(`/curriculum/${latestAttemptId}`);
          return;
        }
        setState("diagnostic");
      })
      .catch((error) => {
        console.log("Unable to open My 1400+ curriculum", error);
        setState("diagnostic");
      });
  }, [router]);

  if (state === "login") {
    return (
      <main className="min-h-screen bg-[#101112] text-white">
        <LuxuryNavbar />
        <My1400PreviewDashboard copy={copy} showAuthActions />
      </main>
    );
  }

  if (state === "diagnostic") {
    return (
      <main className="min-h-screen bg-[#101112] text-white">
        <LuxuryNavbar />
        {freeDiagnostic && freeDiagnosticResult ? (
          <My1400SavedDiagnostic diagnostic={freeDiagnostic} result={freeDiagnosticResult} language={language} copy={copy} />
        ) : (
          <My1400PreviewDashboard diagnosticMode copy={copy} />
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />
      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-4xl flex-col items-center justify-center px-5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/38">My 1400+</p>
        <h1 className="mt-5 text-4xl font-light text-white md:text-5xl">{copy.opening}</h1>
      </section>
    </main>
  );
}

function My1400SavedDiagnostic({
  diagnostic,
  result,
  language,
  copy
}: {
  diagnostic: StoredFreeDiagnostic;
  result: DiagnosticResult;
  language: Language;
  copy: (typeof my1400Copy)[Language];
}) {
  const weakAreas = result.weakAreas.slice(0, 3);
  const expiry = new Intl.DateTimeFormat(language === "uz" ? "uz-UZ" : language === "ru" ? "ru-RU" : "en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(diagnostic.expiresAt));

  return (
    <section className="mx-auto max-w-[1320px] px-5 py-10 md:px-8 md:py-14">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_0.7fr] lg:items-start">
        <div className="border border-[#c8bd88]/30 bg-[#c8bd88]/[0.07] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#c8bd88]">{copy.savedEyebrow}</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-light leading-none text-white md:text-7xl">
            {copy.savedTitle(result.estimatedTotal)}
          </h1>
          <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-white/72">
            {copy.savedBody}
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <SavedStat label={copy.estimatedScore} value={`≈${result.estimatedTotal}`} />
            <SavedStat label={copy.readingWritingRange} value={`${result.estimatedRwMin}-${result.estimatedRwMax}`} />
            <SavedStat label={copy.mathRange} value={`${result.estimatedMathMin}-${result.estimatedMathMax}`} />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link className="flex items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/pricing?plan=pro&from=my-1400&payment=qr">
              {copy.openPaymentQr} <ArrowRight size={18} />
            </Link>
            <Link className="flex items-center justify-between border border-white/15 bg-black/20 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-white/35 hover:text-white" href="/mock-test">
              {copy.retakeDiagnostic} <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="border border-white/10 bg-white/[0.035] p-5 md:p-6">
            <div className="flex items-center gap-3">
              <Target size={19} className="text-[#c8bd88]" />
              <h2 className="text-2xl font-light text-white">{copy.weakAreasSaved}</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {weakAreas.map((area) => (
                <div className="border border-white/10 bg-black/20 p-4" data-sattest-no-translate="true" key={area}>
                  <p className="text-lg font-semibold text-white">{area}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/10 bg-white/[0.035] p-5 md:p-6">
            <div className="flex items-center gap-3">
              <CalendarDays size={19} className="text-white/50" />
              <h2 className="text-2xl font-light text-white">{copy.savedUntil}</h2>
            </div>
            <p className="mt-4 text-3xl font-light text-white">{expiry}</p>
            <p className="mt-3 text-sm leading-6 text-white/52">
              {copy.savedUntilBody}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="border border-white/10 bg-white/[0.035] p-5 md:p-6">
          <div className="flex items-center gap-3">
            <BarChart3 size={19} className="text-white/50" />
            <h2 className="text-2xl font-light text-white">{copy.topicAccuracyTitle}</h2>
          </div>
          <div className="mt-5 grid gap-4">
            {result.topicAccuracy.map((topic) => (
              <div key={topic.topic}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-white/78" data-sattest-no-translate="true">{topic.topic}</span>
                  <span className="text-white/45">{topic.correct}/{topic.total} · {topic.accuracy}%</span>
                </div>
                <div className="mt-2 h-2 bg-white/10">
                  <span className="block h-full bg-[#c8bd88]" style={{ width: `${topic.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-white/10 bg-white/[0.035] p-5 md:p-6">
          <div className="flex items-center gap-3">
            <LockKeyhole size={19} className="text-white/50" />
            <h2 className="text-2xl font-light text-white">{copy.routeReady}</h2>
          </div>
          <p className="mt-4 text-sm font-light leading-7 text-white/54">
            {copy.routeReadyBody}
          </p>
          <div className="mt-5 grid gap-3">
            {copy.nextAssignments.slice(0, 4).map((assignment) => (
              <div className="flex gap-3 border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white/62" key={assignment}>
                <Check className="mt-1 shrink-0 text-emerald-200/72" size={15} />
                <span>{assignment}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SavedStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/25 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/36">{label}</p>
      <strong className="mt-3 block text-3xl font-light text-white">{value}</strong>
    </div>
  );
}

function My1400PreviewDashboard({
  copy,
  diagnosticMode = false,
  showAuthActions = false
}: {
  copy: (typeof my1400Copy)[Language];
  diagnosticMode?: boolean;
  showAuthActions?: boolean;
}) {
  const stats = scoreStats.map((stat, index) => ({
    ...stat,
    label: copy.statLabels[index] ?? stat.label,
    value: stat.label === "Support" ? copy.supportValue : stat.value
  }));

  return (
    <section className="mx-auto max-w-[1320px] px-5 py-10 md:px-8 md:py-14">
      <div className="grid gap-5 lg:grid-cols-[0.86fr_0.74fr] lg:items-start">
        <div className="border border-white/10 bg-white/[0.035] p-5 md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">
            {diagnosticMode ? copy.diagnosticRequired : copy.previewEyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl text-5xl font-light leading-none text-white md:text-7xl">
            {copy.previewTitle}
          </h1>
          <p className="mt-6 max-w-3xl text-lg font-light leading-8 text-white/54">
            {copy.previewBody}
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {stats.map(({ icon: StatIcon, label, value }) => {
              return (
                <div className="border border-white/10 bg-black/20 p-4" key={label}>
                  <StatIcon className="text-white/46" size={18} />
                  <p className="mt-4 text-[10px] font-black uppercase tracking-[0.28em] text-white/36">{label}</p>
                  <strong className="mt-2 block text-2xl font-light text-white">{value}</strong>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-3">
            {showAuthActions ? (
              <>
                <Link className="flex items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/pricing">
                  {copy.choosePlan} <ArrowRight size={18} />
                </Link>
                <Link className="flex items-center justify-between border border-white/15 bg-black/20 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-white/35 hover:text-white" href="/mock-test">
                  {copy.startFreeDiagnostic} <ArrowRight size={18} />
                </Link>
              </>
            ) : (
              <Link className="flex items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/pricing">
                {copy.choosePlan} <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </div>

        <div className="border border-white/10 bg-white/[0.035] p-5 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/38">{copy.sampleDashboard}</p>
              <h2 className="mt-3 text-3xl font-light text-white md:text-4xl">{copy.todayRepair}</h2>
            </div>
            <div className="border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100">
              1210 to 1400+
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {copy.sampleDayPlan.map(([label, task, time]) => (
              <div className="grid gap-3 border border-white/10 bg-black/20 p-4 sm:grid-cols-[92px_1fr_72px] sm:items-center" key={label}>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/36">{label}</p>
                <p className="text-sm leading-6 text-white/72">{task}</p>
                <span className="text-sm font-semibold text-white/50 sm:text-right">{time}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/36">{copy.nextMockRetake}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <strong className="text-2xl font-light text-white">{copy.day25}</strong>
              <span className="text-sm leading-6 text-white/54">{copy.routeUpdates}</span>
            </div>
          </div>
        </div>
      </div>

      <RouteSampleQuestions copy={copy} />

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {copy.routeSteps.map(([step, title, body]) => (
          <div className="border border-white/10 bg-white/[0.035] p-5" key={step}>
            <span className="flex h-10 w-10 items-center justify-center border border-white/10 bg-black/20 text-sm font-semibold text-white/62">
              {step}
            </span>
            <h2 className="mt-5 text-2xl font-light text-white">{title}</h2>
            <p className="mt-3 text-sm font-light leading-7 text-white/54">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="border border-white/10 bg-white/[0.035] p-5 md:p-6">
          <div className="flex items-center gap-3">
            <BarChart3 size={19} className="text-white/50" />
            <h2 className="text-2xl font-light text-white">{copy.weakMapTitle}</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/48">
            {copy.weakMapBody}
          </p>
          <div className="mt-5 grid gap-4">
            {copy.topicProgress.slice(0, 6).map(([topic, value, detail]) => (
              <div key={topic}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-white/78">{topic}</span>
                  <span className="text-white/45">{value}%</span>
                </div>
                <div className="mt-2 h-2 bg-white/10">
                  <span className="block h-full bg-white/78" style={{ width: `${value}%` }} />
                </div>
                <p className="mt-2 text-xs leading-5 text-white/42">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="border border-white/10 bg-white/[0.035] p-5 md:p-6">
            <div className="flex items-center gap-3">
              <FileText size={19} className="text-white/50" />
              <h2 className="text-2xl font-light text-white">{copy.nextTitle}</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {copy.nextAssignments.slice(0, 4).map((assignment) => (
                <div className="flex gap-3 border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white/62" key={assignment}>
                  <Check className="mt-1 shrink-0 text-emerald-200/72" size={15} />
                  <span>{assignment}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/10 bg-white/[0.035] p-5 md:p-6">
            <div className="flex items-center gap-3">
              <BookOpen size={19} className="text-white/50" />
              <h2 className="text-2xl font-light text-white">{copy.theoryTitle}</h2>
            </div>
            <p className="mt-4 text-sm font-light leading-7 text-white/54">
              {copy.theoryBody}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 border border-white/10 bg-white/[0.035] p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/38">{copy.roadmapEyebrow}</p>
            <h2 className="mt-3 text-3xl font-light text-white md:text-4xl">{copy.roadmapTitle}</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-white/48">
            {copy.roadmapBody}
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {copy.weeklyTargets.map((week) => (
            <div className="border border-white/10 bg-black/20 p-4" key={week.week}>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/36">{week.week}</p>
              <h3 className="mt-3 text-xl font-light text-white">{week.title}</h3>
              <div className="mt-4 grid gap-2 text-sm text-white/54">
                <span>{week.hours}</span>
                <strong className="font-semibold text-white/82">{week.target}</strong>
                <span className="leading-6">{week.work}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RouteSampleQuestions({ copy }: { copy: (typeof my1400Copy)[Language] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answeredCount = Object.keys(answers).length;

  return (
    <section className="mt-5 border border-white/10 bg-white/[0.035] p-5 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">{copy.unlockedPreview}</p>
          <h2 className="mt-4 text-4xl font-light leading-tight text-white md:text-5xl">
            {copy.routeSampleTitle}
          </h2>
          <p className="mt-4 text-sm font-light leading-7 text-white/52">
            {copy.routeSampleBody}
          </p>
          <div className="mt-5 border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/36">{copy.progress}</p>
            <strong className="mt-2 block text-2xl font-light text-white">{answeredCount}/2 {copy.explanationsOpened}</strong>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {routeSampleQuestions.map((question, questionIndex) => {
            const selected = answers[questionIndex];
            const hasAnswer = selected !== undefined;
            const isCorrect = selected === question.correctIndex;

            return (
              <article className="flex min-h-[420px] flex-col border border-white/10 bg-black/20 p-4" key={question.label}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/36">{copy.assignment} {questionIndex + 1}</p>
                    <h3 className="mt-2 text-2xl font-light text-white">{question.skill}</h3>
                  </div>
                  {hasAnswer ? (
                    <span className={`border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                      isCorrect ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-red-300/30 bg-red-300/10 text-red-100"
                    }`}>
                      {isCorrect ? copy.ready : copy.fix}
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 text-sm leading-6 text-white/66">{question.prompt}</p>

                <div className="mt-4 grid gap-2">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selected === optionIndex;
                    const isRight = question.correctIndex === optionIndex;
                    const optionClass = hasAnswer
                      ? isRight
                        ? "border-emerald-300/45 bg-emerald-300/10 text-white"
                        : isSelected
                          ? "border-red-300/45 bg-red-300/10 text-white"
                          : "border-white/10 bg-transparent text-white/45"
                      : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/35 hover:text-white";

                    return (
                      <button
                        className={`min-h-12 border px-3 py-3 text-left text-sm leading-5 transition-colors ${optionClass}`}
                        key={option}
                        onClick={() => setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))}
                        type="button"
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-auto pt-4">
                  {hasAnswer ? (
                    <div className="border border-white/10 bg-white/[0.04] p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <CheckCircle2 size={16} className="text-emerald-200/80" />
                        {copy.feedback}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/56">{question.explanation}</p>
                    </div>
                  ) : (
                    <div className="border border-dashed border-white/15 p-3 text-sm leading-6 text-white/40">
                      {copy.chooseAnswer}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-4 border border-white/10 bg-black/30 p-5 md:grid-cols-[1fr_340px] md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <LockKeyhole size={18} className="text-white/50" />
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-white/38">{copy.lockedAfterPreview}</p>
          </div>
          <h3 className="mt-3 text-2xl font-light text-white">{copy.lockedTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-white/48">
            {copy.lockedBody}
          </p>
        </div>
        <Link className="flex items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/pricing?plan=pro">
          {copy.unlockPro} <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
