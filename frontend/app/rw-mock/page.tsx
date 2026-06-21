"use client";

import { ArrowLeft, ArrowRight, Bookmark, Clock, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FULL_MOCK_MODULES,
  FULL_MOCK_BANK_VERSION,
  countCorrect,
  safeRemoveJson,
  safeReadJson,
  safeWriteJson,
  type FullMockChart,
  type FullMockModuleNumber,
  type FullMockProgress,
} from "@/lib/full-mock-test";
import {
  RW_MOCK_PROGRESS_KEY,
  RW_MOCK_RESULTS_KEY,
  calculateReadingWritingMockResult,
  chooseReadingWritingNextVariant,
  createReadingWritingMockProgress,
  getReadingWritingMockQuestions,
} from "@/lib/rw-mock-test";
import { getSubscriptionStatus } from "@/lib/api";
import { languages, pick, useLanguage, type Language } from "@/lib/i18n";

type ScreenState = "intro" | "test" | "break";

const satTestCopy: Record<Language, {
  introTitle: string;
  resumePrompt: (question: number) => string;
  resume: string;
  restart: string;
  start: string;
  saved: string;
  moduleDone: (module: number) => string;
  nextStarts: (time: string) => string;
  saveProgress: string;
  save: string;
  skip: string;
  startNextModule: string;
  practiceTest: string;
  markForReview: string;
  undo: string;
  back: string;
  backToIntro: string;
  backToSite: string;
  questionProgress: (current: number, total: number, global: number) => string;
  endModule: string;
  next: string;
}> = {
  en: {
    introTitle: "SAT Reading & Writing Mock — 54 questions",
    resumePrompt: (question) => `You have an unfinished test. Continue from question ${question}?`,
    resume: "Continue",
    restart: "Start over",
    start: "Start test",
    saved: "Result saved",
    moduleDone: (module) => `Module ${module} completed.`,
    nextStarts: (time) => `The next module starts in ${time}.`,
    saveProgress: "Save progress? Enter your email:",
    save: "Save",
    skip: "Skip",
    startNextModule: "Start next module",
    practiceTest: "This is a practice test",
    markForReview: "Mark for Review",
    undo: "Undo",
    back: "Back",
    backToIntro: "Back to intro",
    backToSite: "Back to site",
    questionProgress: (current, total, global) => `Question ${current} of ${total} · Total ${global} of 54`,
    endModule: "End Module",
    next: "Next",
  },
  ru: {
    introTitle: "SAT Reading & Writing Mock — 54 вопроса",
    resumePrompt: (question) => `У вас есть незавершённый тест. Продолжить с вопроса ${question}?`,
    resume: "Продолжить",
    restart: "Начать заново",
    start: "Начать тест",
    saved: "Результат сохранён",
    moduleDone: (module) => `Модуль ${module} завершён.`,
    nextStarts: (time) => `Следующий модуль начнётся через ${time}.`,
    saveProgress: "Сохранить прогресс? Введите email:",
    save: "Сохранить",
    skip: "Пропустить",
    startNextModule: "Начать следующий модуль",
    practiceTest: "Это тренировочный тест",
    markForReview: "Отметить для проверки",
    undo: "Отменить",
    back: "Назад",
    backToIntro: "Назад к началу",
    backToSite: "Назад на сайт",
    questionProgress: (current, total, global) => `Вопрос ${current} из ${total} · Всего ${global} из 54`,
    endModule: "Завершить модуль",
    next: "Далее",
  },
  uz: {
    introTitle: "SAT Reading & Writing Mock — 54 ta savol",
    resumePrompt: (question) => `Sizda tugallanmagan test bor. ${question}-savoldan davom ettirasizmi?`,
    resume: "Davom ettirish",
    restart: "Qaytadan boshlash",
    start: "Testni boshlash",
    saved: "Natija saqlandi",
    moduleDone: (module) => `${module}-modul yakunlandi.`,
    nextStarts: (time) => `Keyingi modul ${time} dan keyin boshlanadi.`,
    saveProgress: "Progressni saqlaysizmi? Email kiriting:",
    save: "Saqlash",
    skip: "O'tkazib yuborish",
    startNextModule: "Keyingi modulni boshlash",
    practiceTest: "Bu mashq testi",
    markForReview: "Tekshirish uchun belgilash",
    undo: "Bekor qilish",
    back: "Orqaga",
    backToIntro: "Boshlanishga qaytish",
    backToSite: "Saytga qaytish",
    questionProgress: (current, total, global) => `Savol ${current}/${total} · Jami ${global}/54`,
    endModule: "Modulni yakunlash",
    next: "Keyingi",
  },
};

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function moduleOffset(moduleNumber: FullMockModuleNumber) {
  if (moduleNumber === 1) return 0;
  if (moduleNumber === 2) return 27;
  if (moduleNumber === 3) return 54;
  return 27;
}

function QuestionChart({ chart }: { chart: FullMockChart }) {
  const width = 620;
  const height = 330;
  const padding = { top: 42, right: 32, bottom: 70, left: 70 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  if (chart.type === "scatter") {
    const minX = chart.minX ?? Math.min(...chart.points.map((point) => point.x));
    const maxX = chart.maxX ?? Math.max(...chart.points.map((point) => point.x));
    const minY = chart.minY ?? 0;
    const maxY = chart.maxY ?? Math.max(...chart.points.map((point) => point.y));
    const xScale = (value: number) => padding.left + ((value - minX) / (maxX - minX || 1)) * plotWidth;
    const yScale = (value: number) => padding.top + plotHeight - ((value - minY) / (maxY - minY || 1)) * plotHeight;

    return (
      <figure className="mt-8 overflow-hidden border border-[#d9dfd8] bg-[#fbfbf8] p-4 shadow-[0_12px_35px_rgba(7,17,36,0.06)]">
        <svg className="h-auto w-full" role="img" viewBox={`0 0 ${width} ${height}`} aria-label={chart.title}>
          <text x={padding.left} y="25" className="fill-[#071124] text-[20px] font-black">{chart.title}</text>
          {[0, 1, 2, 3, 4].map((tick) => {
            const y = padding.top + (plotHeight / 4) * tick;
            const value = Math.round(maxY - ((maxY - minY) / 4) * tick);
            return (
              <g key={tick}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e3e7e0" />
                <text x={padding.left - 12} y={y + 5} textAnchor="end" className="fill-[#647084] text-[12px] font-bold">{value}</text>
              </g>
            );
          })}
          <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke="#9aa4b2" />
          <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="#9aa4b2" />
          {[minX, (minX + maxX) / 2, maxX].map((value) => (
            <text key={value} x={xScale(value)} y={height - padding.bottom + 24} textAnchor="middle" className="fill-[#647084] text-[12px] font-bold">{Math.round(value * 10) / 10}</text>
          ))}
          {chart.trend ? (
            <line
              x1={xScale(chart.trend.from.x)}
              x2={xScale(chart.trend.to.x)}
              y1={yScale(chart.trend.from.y)}
              y2={yScale(chart.trend.to.y)}
              stroke={chart.trend.color}
              strokeDasharray="8 7"
              strokeWidth="4"
            />
          ) : null}
          {chart.points.map((point, index) => (
            <circle key={`${point.x}-${point.y}-${index}`} cx={xScale(point.x)} cy={yScale(point.y)} r="6" fill="#071124" opacity="0.82" />
          ))}
          <text x={padding.left + plotWidth / 2} y={height - 18} textAnchor="middle" className="fill-[#071124] text-[13px] font-black">{chart.xLabel}</text>
          <text x="18" y={padding.top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 18 ${padding.top + plotHeight / 2})`} className="fill-[#071124] text-[13px] font-black">{chart.yLabel}</text>
        </svg>
      </figure>
    );
  }

  const values = chart.series.flatMap((series) => series.values);
  const min = chart.min ?? Math.min(0, ...values);
  const max = chart.max ?? Math.max(...values);
  const xAt = (index: number) => padding.left + (chart.labels.length === 1 ? plotWidth / 2 : (index / (chart.labels.length - 1)) * plotWidth);
  const yAt = (value: number) => padding.top + plotHeight - ((value - min) / (max - min || 1)) * plotHeight;
  const barGroupWidth = plotWidth / chart.labels.length;
  const barWidth = Math.min(42, (barGroupWidth - 18) / chart.series.length);

  return (
    <figure className="mt-8 overflow-hidden border border-[#d9dfd8] bg-[#fbfbf8] p-4 shadow-[0_12px_35px_rgba(7,17,36,0.06)]">
      <svg className="h-auto w-full" role="img" viewBox={`0 0 ${width} ${height}`} aria-label={chart.title}>
        <text x={padding.left} y="25" className="fill-[#071124] text-[20px] font-black">{chart.title}</text>
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = padding.top + (plotHeight / 4) * tick;
          const value = Math.round((max - ((max - min) / 4) * tick) * 10) / 10;
          return (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e3e7e0" />
              <text x={padding.left - 12} y={y + 5} textAnchor="end" className="fill-[#647084] text-[12px] font-bold">{value}</text>
            </g>
          );
        })}
        <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke="#9aa4b2" />
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="#9aa4b2" />
        {chart.type === "line" ? chart.series.map((series) => {
          const points = series.values.map((value, index) => `${xAt(index)},${yAt(value)}`).join(" ");
          return (
            <g key={series.name}>
              <polyline points={points} fill="none" stroke={series.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {series.values.map((value, index) => (
                <circle key={`${series.name}-${index}`} cx={xAt(index)} cy={yAt(value)} r="5" fill={series.color} />
              ))}
            </g>
          );
        }) : chart.series.map((series, seriesIndex) => (
          <g key={series.name}>
            {series.values.map((value, index) => {
              const x = padding.left + index * barGroupWidth + (barGroupWidth - chart.series.length * barWidth) / 2 + seriesIndex * barWidth;
              const y = yAt(value);
              return <rect key={`${series.name}-${index}`} x={x} y={y} width={barWidth} height={height - padding.bottom - y} fill={series.color} rx="3" />;
            })}
          </g>
        ))}
        {chart.labels.map((label, index) => (
          <text key={label} x={xAt(index)} y={height - padding.bottom + 24} textAnchor="middle" className="fill-[#647084] text-[12px] font-bold">{label}</text>
        ))}
        <text x={padding.left + plotWidth / 2} y={height - 18} textAnchor="middle" className="fill-[#071124] text-[13px] font-black">{chart.xLabel}</text>
        <text x="18" y={padding.top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 18 ${padding.top + plotHeight / 2})`} className="fill-[#071124] text-[13px] font-black">{chart.yLabel}</text>
        {chart.series.map((series, index) => (
          <g key={series.name} transform={`translate(${padding.left + index * 145}, ${height - 48})`}>
            <rect width="14" height="14" fill={series.color} rx="2" />
            <text x="22" y="12" className="fill-[#526073] text-[12px] font-black">{series.name}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

export default function SatTestPage() {
  const { language, setLanguage } = useLanguage();
  const copy = pick(satTestCopy, language);
  const [accessAllowed, setAccessAllowed] = useState(false);
  const [screen, setScreen] = useState<ScreenState>("intro");
  const [progress, setProgress] = useState<FullMockProgress | null>(null);
  const [resumeProgress, setResumeProgress] = useState<FullMockProgress | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [emailDraft, setEmailDraft] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSubscriptionStatus()
      .then((status) => {
        if (cancelled) return;
        if (status.has_active_subscription) {
          setAccessAllowed(true);
        } else {
          window.location.replace(`/path?lang=${language}`);
        }
      })
      .catch(() => {
        if (!cancelled) window.location.replace(`/path?lang=${language}`);
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    const saved = safeReadJson<FullMockProgress>(RW_MOCK_PROGRESS_KEY);
    if (saved && saved.bankVersion !== FULL_MOCK_BANK_VERSION) {
      safeRemoveJson(RW_MOCK_PROGRESS_KEY);
      safeRemoveJson(RW_MOCK_RESULTS_KEY);
      return;
    }
    if (saved && !safeReadJson(RW_MOCK_RESULTS_KEY)) {
      setResumeProgress(saved);
    }
  }, []);

  useEffect(() => {
    if (!progress || screen !== "test") return;
    const update = () => {
      const end = progress.moduleEndsAt ?? Date.now();
      setSecondsLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [progress, screen]);

  const finishTest = useCallback((nextProgress: FullMockProgress) => {
    if (isFinishing) return;
    setIsFinishing(true);
    const result = calculateReadingWritingMockResult(nextProgress);
    safeWriteJson(RW_MOCK_PROGRESS_KEY, nextProgress);
    safeWriteJson(RW_MOCK_RESULTS_KEY, result);
    window.location.href = `/rw-mock/results?lang=${language}`;
  }, [isFinishing, language]);

  const completeModule = useCallback((sourceProgress = progress) => {
    if (!sourceProgress) return;
    const currentModule = sourceProgress.currentModule;
    const questions = getReadingWritingMockQuestions(sourceProgress, currentModule);
    const score = countCorrect(questions, sourceProgress.answers);
    const nextCompleted = Array.from(new Set([...(sourceProgress.completedModules ?? []), currentModule]));
    const nextProgress: FullMockProgress = {
      ...sourceProgress,
      bankVersion: FULL_MOCK_BANK_VERSION,
      moduleScores: { ...sourceProgress.moduleScores, [String(currentModule)]: score },
      completedModules: nextCompleted,
    };

    if (currentModule === 2) {
      finishTest(nextProgress);
      return;
    }

    const nextModule = (currentModule + 1) as FullMockModuleNumber;
    const nextVariant = chooseReadingWritingNextVariant(nextProgress);
    const withVariant: FullMockProgress = {
      ...nextProgress,
      bankVersion: FULL_MOCK_BANK_VERSION,
      currentModule: nextModule,
      currentQuestion: 1,
      moduleVariants: {
        ...nextProgress.moduleVariants,
        [nextModule]: nextVariant,
      },
      moduleStartedAt: undefined,
      moduleEndsAt: undefined,
    };
    safeWriteJson(RW_MOCK_PROGRESS_KEY, withVariant);
    setProgress(withVariant);
    setBreakSeconds(5 * 60);
    setScreen("break");
  }, [finishTest, progress]);

  useEffect(() => {
    if (screen === "test" && secondsLeft === 0 && progress?.moduleEndsAt && Date.now() >= progress.moduleEndsAt) {
      completeModule(progress);
    }
  }, [completeModule, progress, screen, secondsLeft]);

  useEffect(() => {
    if (screen !== "break" || breakSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setBreakSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [breakSeconds, screen]);

  const questions = useMemo(() => progress ? getReadingWritingMockQuestions(progress) : [], [progress]);
  const currentQuestion = progress ? questions[progress.currentQuestion - 1] : null;
  const selectedAnswer = currentQuestion && progress ? progress.answers[currentQuestion.id] : null;
  const totalQuestionNumber = progress ? moduleOffset(progress.currentModule) + progress.currentQuestion : 1;
  const moduleInfo = progress ? FULL_MOCK_MODULES[progress.currentModule] : FULL_MOCK_MODULES[1];
  const warning = secondsLeft <= 5 * 60;

  function changeLanguage(next: Language) {
    setLanguage(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function returnToIntro() {
    if (progress) setResumeProgress(progress);
    setScreen("intro");
  }

  function beginFresh() {
    const initial = createReadingWritingMockProgress();
    safeWriteJson(RW_MOCK_PROGRESS_KEY, initial);
    safeRemoveJson(RW_MOCK_RESULTS_KEY);
    setProgress(initial);
    setResumeProgress(null);
    setScreen("test");
  }

  function resume() {
    if (!resumeProgress) return;
    const moduleSeconds = FULL_MOCK_MODULES[resumeProgress.currentModule].seconds;
    const restored = {
      ...resumeProgress,
      bankVersion: FULL_MOCK_BANK_VERSION,
      moduleStartedAt: resumeProgress.moduleStartedAt ?? Date.now(),
      moduleEndsAt: resumeProgress.moduleEndsAt && resumeProgress.moduleEndsAt > Date.now()
        ? resumeProgress.moduleEndsAt
        : Date.now() + moduleSeconds * 1000,
    };
    safeWriteJson(RW_MOCK_PROGRESS_KEY, restored);
    setProgress(restored);
    setScreen("test");
  }

  function startNextModule() {
    if (!progress) return;
    const now = Date.now();
    const next = {
      ...progress,
      bankVersion: FULL_MOCK_BANK_VERSION,
      moduleStartedAt: now,
      moduleEndsAt: now + FULL_MOCK_MODULES[progress.currentModule].seconds * 1000,
    };
    safeWriteJson(RW_MOCK_PROGRESS_KEY, next);
    setProgress(next);
    setScreen("test");
  }

  function saveEmail(skip = false) {
    if (!progress) return;
    const email = skip ? progress.email : emailDraft.trim() || progress.email;
    const next = { ...progress, bankVersion: FULL_MOCK_BANK_VERSION, email };
    safeWriteJson(RW_MOCK_PROGRESS_KEY, next);
    setProgress(next);
  }

  function selectAnswer(answer: string) {
    if (!progress || !currentQuestion) return;
    const next = {
      ...progress,
      bankVersion: FULL_MOCK_BANK_VERSION,
      answers: {
        ...progress.answers,
        [currentQuestion.id]: answer,
      },
    };
    safeWriteJson(RW_MOCK_PROGRESS_KEY, next);
    setProgress(next);
  }

  function moveQuestion(direction: 1 | -1) {
    if (!progress) return;
    const nextIndex = progress.currentQuestion + direction;
    if (nextIndex < 1) return;
    if (nextIndex > questions.length) {
      completeModule(progress);
      return;
    }
    const next = { ...progress, bankVersion: FULL_MOCK_BANK_VERSION, currentQuestion: nextIndex };
    safeWriteJson(RW_MOCK_PROGRESS_KEY, next);
    setProgress(next);
  }

  if (!accessAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-5 text-center text-white">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#FFD700]">SATTEST.UZ Pro</p>
          <h1 className="mt-5 text-3xl font-black">Reading & Writing Mock tekshirilmoqda...</h1>
        </div>
      </main>
    );
  }

  if (screen === "intro") {
    return (
      <main className="min-h-screen bg-[#f7f7f4] text-[#071124]">
        <section className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center">
          <p className="mb-5 text-xs font-black uppercase tracking-[0.28em] text-[#12613f]">SATTEST.UZ</p>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">{copy.introTitle}</h1>
          {resumeProgress ? (
            <div className="mt-8 w-full max-w-2xl border border-[#ccd4ca] bg-white p-5 text-left shadow-[0_18px_60px_rgba(7,17,36,0.08)]">
              <p className="text-lg font-bold">{copy.resumePrompt(moduleOffset(resumeProgress.currentModule) + resumeProgress.currentQuestion)}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button className="bg-[#00a86b] px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-white" onClick={resume} type="button">
                  {copy.resume}
                </button>
                <button className="border border-[#071124]/20 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#071124]" onClick={beginFresh} type="button">
                  {copy.restart}
                </button>
              </div>
            </div>
          ) : null}
          <button className="mt-8 inline-flex items-center gap-3 bg-[#00a86b] px-7 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_50px_rgba(0,168,107,0.24)]" onClick={beginFresh} type="button">
            {copy.start} <ArrowRight size={20} />
          </button>
        </section>
        <SatMockBottomControls
          activeLanguage={language}
          backHref="/"
          backLabel={copy.backToSite}
          onLanguageChange={changeLanguage}
        />
      </main>
    );
  }

  if (screen === "break" && progress) {
    const justCompleted = progress.currentModule - 1;
    return (
      <main className="min-h-screen bg-[#f7f7f4] text-[#071124]">
        <section className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
          <div className="border border-[#ccd4ca] bg-white p-8 shadow-[0_18px_60px_rgba(7,17,36,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#12613f]">{copy.saved}</p>
            <h1 className="mt-4 text-4xl font-black">{copy.moduleDone(justCompleted)}</h1>
            <p className="mt-4 text-lg text-[#4b5565]">{copy.nextStarts(formatTime(breakSeconds))}</p>
            {justCompleted === 1 ? (
              <div className="mt-8 border border-[#e0e5dd] bg-[#f7f7f4] p-5">
                <p className="font-bold">{copy.saveProgress}</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    className="min-h-12 flex-1 border border-[#cfd6cd] bg-white px-4 text-[#071124] outline-none"
                    onChange={(event) => setEmailDraft(event.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    value={emailDraft}
                  />
                  <button className="bg-[#071124] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white" onClick={() => saveEmail(false)} type="button">
                    {copy.save}
                  </button>
                  <button className="border border-[#071124]/20 px-5 py-3 text-xs font-black uppercase tracking-[0.16em]" onClick={() => saveEmail(true)} type="button">
                    {copy.skip}
                  </button>
                </div>
              </div>
            ) : null}
            <button className="mt-8 inline-flex items-center gap-3 bg-[#00a86b] px-7 py-4 text-sm font-black uppercase tracking-[0.18em] text-white" onClick={startNextModule} type="button">
              {copy.startNextModule} <ArrowRight size={20} />
            </button>
          </div>
        </section>
        <SatMockBottomControls
          activeLanguage={language}
          backLabel={copy.backToIntro}
          elevated
          onBack={returnToIntro}
          onLanguageChange={changeLanguage}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#071124]">
      <header className="sticky top-0 z-20 border-b border-[#d8ddd6] bg-white">
        <div className="flex min-h-16 items-center justify-between gap-4 px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{moduleInfo.title}</p>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#526073]">{copy.practiceTest}</p>
          </div>
          <div className={["flex items-center gap-2 text-xl font-black", warning ? "text-[#a16207] animate-pulse" : "text-[#071124]"].join(" ")}>
            <Clock size={20} /> {formatTime(secondsLeft)}
          </div>
        </div>
        <div className="h-1 bg-[#e7e9e5]">
          <div
            className="h-full bg-[#2563eb] transition-[width] duration-300"
            style={{ width: `${((progress?.currentQuestion ?? 1) / questions.length) * 100}%` }}
          />
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl grid-cols-1 bg-white lg:grid-cols-[1fr_0.85fr]">
        <article className="min-h-[calc(100vh-9rem)] border-r border-[#dde2df] p-7 sm:p-12">
          <p className="max-w-2xl text-xl leading-relaxed sm:text-2xl">{currentQuestion?.passage}</p>
          {currentQuestion?.chart ? <QuestionChart chart={currentQuestion.chart} /> : null}
        </article>

        <article className="p-7 sm:p-10">
          <div className="flex items-center justify-between border-b border-dashed border-[#d8ddd6] pb-6">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center bg-[#030817] text-xl font-black text-white">{progress?.currentQuestion}</span>
              <span className="inline-flex items-center gap-2 text-sm font-black text-[#526073]">
                <Bookmark size={18} /> {copy.markForReview}
              </span>
            </div>
            <button className="inline-flex items-center gap-2 text-sm font-black text-[#8a93a3]" type="button">
              <RotateCcw size={18} /> {copy.undo}
            </button>
          </div>

          <h2 className="mt-8 text-center text-2xl font-black leading-tight sm:text-3xl">{currentQuestion?.prompt}</h2>
          <div className="mt-8 space-y-4">
            {currentQuestion?.choices.map((choice) => (
              <button
                className={[
                  "flex min-h-20 w-full items-center justify-between gap-4 border px-5 text-left transition",
                  selectedAnswer === choice.label ? "border-[#2563eb] bg-[#eff6ff]" : "border-[#e1e5e8] bg-white hover:border-[#91a2bc]"
                ].join(" ")}
                key={choice.label}
                onClick={() => selectAnswer(choice.label)}
                type="button"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#73839b] text-lg font-black">{choice.label}</span>
                <span className="flex-1 text-xl font-bold">{choice.text}</span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <footer className="sticky bottom-0 z-20 flex min-h-16 items-center justify-between border-t border-[#d8ddd6] bg-white px-5">
        <button className="text-sm font-black text-[#526073] disabled:opacity-35" disabled={(progress?.currentQuestion ?? 1) <= 1} onClick={() => moveQuestion(-1)} type="button">
          {copy.back}
        </button>
        <p className="text-sm font-black text-[#526073]">{copy.questionProgress(progress?.currentQuestion ?? 1, questions.length, totalQuestionNumber)}</p>
        <div className="flex gap-3">
          <button className="hidden border border-[#071124]/20 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] sm:block" onClick={() => completeModule(progress)} type="button">
            {copy.endModule}
          </button>
          <button className="inline-flex items-center gap-3 rounded-md bg-[#2554d8] px-6 py-3 text-sm font-black text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.45)]" onClick={() => moveQuestion(1)} type="button">
            {progress && progress.currentQuestion >= questions.length ? copy.endModule : copy.next} <ArrowRight size={18} />
          </button>
        </div>
      </footer>
      <SatMockBottomControls
        activeLanguage={language}
        backLabel={copy.backToIntro}
        elevated
        onBack={returnToIntro}
        onLanguageChange={changeLanguage}
      />
    </main>
  );
}

function SatMockBottomControls({
  activeLanguage,
  backHref,
  backLabel,
  elevated = false,
  onBack,
  onLanguageChange,
}: {
  activeLanguage: Language;
  backHref?: string;
  backLabel: string;
  elevated?: boolean;
  onBack?: () => void;
  onLanguageChange: (language: Language) => void;
}) {
  const backClassName = "inline-flex h-11 items-center gap-2 border border-[#071124]/15 bg-white px-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#071124] shadow-[0_14px_40px_rgba(7,17,36,0.10)] transition-colors hover:bg-[#071124] hover:text-white";
  const languageButtonClassName = (isActive: boolean) => [
    "flex h-11 min-w-11 items-center justify-center px-3 text-[10px] font-black uppercase tracking-[0.14em] transition-colors",
    isActive ? "bg-[#071124] text-white" : "bg-white text-[#071124]/55 hover:text-[#071124]"
  ].join(" ");

  const safeBackHref = backHref || "/";
  const backControl = onBack ? (
    <button className={backClassName} onClick={onBack} type="button">
      <ArrowLeft size={16} /> {backLabel}
    </button>
  ) : (
    <a className={backClassName} href={safeBackHref}>
      <ArrowLeft size={16} /> {backLabel}
    </a>
  );

  return (
    <div className={["fixed left-4 z-40 flex flex-wrap items-center gap-2", elevated ? "bottom-20" : "bottom-4"].join(" ")} data-sattest-no-translate="true">
      {backControl}
      <div className="flex items-center border border-[#071124]/15 bg-white p-1 shadow-[0_14px_40px_rgba(7,17,36,0.10)]" aria-label="SAT mock language selector">
        {languages.map((item) => (
          <button
            className={languageButtonClassName(activeLanguage === item.code)}
            key={item.code}
            onClick={() => onLanguageChange(item.code)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
