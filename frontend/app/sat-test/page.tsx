"use client";

import { ArrowRight, Bookmark, Clock, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { notifyFullMockResult } from "@/app/sat-test/actions";
import {
  FULL_MOCK_MODULES,
  FULL_MOCK_PROGRESS_KEY,
  FULL_MOCK_RESULTS_KEY,
  calculateFullMockResult,
  chooseNextVariant,
  countCorrect,
  createInitialProgress,
  getModuleQuestions,
  safeReadJson,
  safeWriteJson,
  type FullMockModuleNumber,
  type FullMockProgress,
} from "@/lib/full-mock-test";
import { useLanguage } from "@/lib/i18n";

type ScreenState = "intro" | "test" | "break";

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
  return 76;
}

export default function SatTestPage() {
  const { language } = useLanguage();
  const [screen, setScreen] = useState<ScreenState>("intro");
  const [progress, setProgress] = useState<FullMockProgress | null>(null);
  const [resumeProgress, setResumeProgress] = useState<FullMockProgress | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [emailDraft, setEmailDraft] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    const saved = safeReadJson<FullMockProgress>(FULL_MOCK_PROGRESS_KEY);
    if (saved && !safeReadJson(FULL_MOCK_RESULTS_KEY)) {
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

  const finishTest = useCallback(async (nextProgress: FullMockProgress) => {
    if (isFinishing) return;
    setIsFinishing(true);
    const result = calculateFullMockResult(nextProgress);
    safeWriteJson(FULL_MOCK_PROGRESS_KEY, nextProgress);
    safeWriteJson(FULL_MOCK_RESULTS_KEY, result);
    notifyFullMockResult({
      timestamp: new Date(result.completedAt).toISOString(),
      totalScore: result.totalScore,
      rwScore: result.rwScore,
      mathScore: result.mathScore,
      weakAreas: result.weakAreas,
      language: language.toUpperCase() as "EN" | "RU" | "UZ",
    }).catch((error) => console.error("Full mock notification failed.", error));
    window.location.href = "/mock-test/full/results";
  }, [isFinishing, language]);

  const completeModule = useCallback((sourceProgress = progress) => {
    if (!sourceProgress) return;
    const currentModule = sourceProgress.currentModule;
    const questions = getModuleQuestions(sourceProgress, currentModule);
    const score = countCorrect(questions, sourceProgress.answers);
    const nextCompleted = Array.from(new Set([...(sourceProgress.completedModules ?? []), currentModule]));
    const nextProgress: FullMockProgress = {
      ...sourceProgress,
      moduleScores: { ...sourceProgress.moduleScores, [String(currentModule)]: score },
      completedModules: nextCompleted,
    };

    if (currentModule === 4) {
      finishTest(nextProgress);
      return;
    }

    const nextModule = (currentModule + 1) as FullMockModuleNumber;
    const nextVariant = chooseNextVariant(nextProgress, currentModule);
    const withVariant: FullMockProgress = {
      ...nextProgress,
      currentModule: nextModule,
      currentQuestion: 1,
      moduleVariants: {
        ...nextProgress.moduleVariants,
        [nextModule]: nextVariant,
      },
      moduleStartedAt: undefined,
      moduleEndsAt: undefined,
    };
    safeWriteJson(FULL_MOCK_PROGRESS_KEY, withVariant);
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

  const questions = useMemo(() => progress ? getModuleQuestions(progress) : [], [progress]);
  const currentQuestion = progress ? questions[progress.currentQuestion - 1] : null;
  const selectedAnswer = currentQuestion && progress ? progress.answers[currentQuestion.id] : null;
  const totalQuestionNumber = progress ? moduleOffset(progress.currentModule) + progress.currentQuestion : 1;
  const moduleInfo = progress ? FULL_MOCK_MODULES[progress.currentModule] : FULL_MOCK_MODULES[1];
  const warning = secondsLeft <= 5 * 60;

  function beginFresh() {
    const initial = createInitialProgress();
    safeWriteJson(FULL_MOCK_PROGRESS_KEY, initial);
    window.localStorage.removeItem(FULL_MOCK_RESULTS_KEY);
    setProgress(initial);
    setResumeProgress(null);
    setScreen("test");
  }

  function resume() {
    if (!resumeProgress) return;
    const moduleSeconds = FULL_MOCK_MODULES[resumeProgress.currentModule].seconds;
    const restored = {
      ...resumeProgress,
      moduleStartedAt: resumeProgress.moduleStartedAt ?? Date.now(),
      moduleEndsAt: resumeProgress.moduleEndsAt && resumeProgress.moduleEndsAt > Date.now()
        ? resumeProgress.moduleEndsAt
        : Date.now() + moduleSeconds * 1000,
    };
    safeWriteJson(FULL_MOCK_PROGRESS_KEY, restored);
    setProgress(restored);
    setScreen("test");
  }

  function startNextModule() {
    if (!progress) return;
    const now = Date.now();
    const next = {
      ...progress,
      moduleStartedAt: now,
      moduleEndsAt: now + FULL_MOCK_MODULES[progress.currentModule].seconds * 1000,
    };
    safeWriteJson(FULL_MOCK_PROGRESS_KEY, next);
    setProgress(next);
    setScreen("test");
  }

  function saveEmail(skip = false) {
    if (!progress) return;
    const email = skip ? progress.email : emailDraft.trim() || progress.email;
    const next = { ...progress, email };
    safeWriteJson(FULL_MOCK_PROGRESS_KEY, next);
    setProgress(next);
  }

  function selectAnswer(answer: string) {
    if (!progress || !currentQuestion) return;
    const next = {
      ...progress,
      answers: {
        ...progress.answers,
        [currentQuestion.id]: answer,
      },
    };
    safeWriteJson(FULL_MOCK_PROGRESS_KEY, next);
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
    const next = { ...progress, currentQuestion: nextIndex };
    safeWriteJson(FULL_MOCK_PROGRESS_KEY, next);
    setProgress(next);
  }

  if (screen === "intro") {
    return (
      <main className="min-h-screen bg-[#f7f7f4] text-[#071124]">
        <section className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center">
          <p className="mb-5 text-xs font-black uppercase tracking-[0.28em] text-[#12613f]">SATTEST.UZ</p>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">Digital SAT Mock Test — 98 вопросов</h1>
          {resumeProgress ? (
            <div className="mt-8 w-full max-w-2xl border border-[#ccd4ca] bg-white p-5 text-left shadow-[0_18px_60px_rgba(7,17,36,0.08)]">
              <p className="text-lg font-bold">У вас есть незавершённый тест. Продолжить с вопроса {moduleOffset(resumeProgress.currentModule) + resumeProgress.currentQuestion}?</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button className="bg-[#00a86b] px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-white" onClick={resume} type="button">
                  Продолжить
                </button>
                <button className="border border-[#071124]/20 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#071124]" onClick={beginFresh} type="button">
                  Начать заново
                </button>
              </div>
            </div>
          ) : null}
          <button className="mt-8 inline-flex items-center gap-3 bg-[#00a86b] px-7 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_50px_rgba(0,168,107,0.24)]" onClick={beginFresh} type="button">
            Начать тест <ArrowRight size={20} />
          </button>
        </section>
      </main>
    );
  }

  if (screen === "break" && progress) {
    const justCompleted = progress.currentModule - 1;
    return (
      <main className="min-h-screen bg-[#f7f7f4] text-[#071124]">
        <section className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
          <div className="border border-[#ccd4ca] bg-white p-8 shadow-[0_18px_60px_rgba(7,17,36,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#12613f]">Результат сохранён</p>
            <h1 className="mt-4 text-4xl font-black">Модуль {justCompleted} завершён.</h1>
            <p className="mt-4 text-lg text-[#4b5565]">Следующий модуль начнётся через {formatTime(breakSeconds)}.</p>
            {justCompleted === 1 ? (
              <div className="mt-8 border border-[#e0e5dd] bg-[#f7f7f4] p-5">
                <p className="font-bold">Сохранить прогресс? Введите email:</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    className="min-h-12 flex-1 border border-[#cfd6cd] bg-white px-4 text-[#071124] outline-none"
                    onChange={(event) => setEmailDraft(event.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    value={emailDraft}
                  />
                  <button className="bg-[#071124] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white" onClick={() => saveEmail(false)} type="button">
                    Сохранить
                  </button>
                  <button className="border border-[#071124]/20 px-5 py-3 text-xs font-black uppercase tracking-[0.16em]" onClick={() => saveEmail(true)} type="button">
                    Пропустить
                  </button>
                </div>
              </div>
            ) : null}
            <button className="mt-8 inline-flex items-center gap-3 bg-[#00a86b] px-7 py-4 text-sm font-black uppercase tracking-[0.18em] text-white" onClick={startNextModule} type="button">
              Начать следующий модуль <ArrowRight size={20} />
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#071124]">
      <header className="sticky top-0 z-20 border-b border-[#d8ddd6] bg-white">
        <div className="flex min-h-16 items-center justify-between gap-4 px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{moduleInfo.title}</p>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#526073]">This is a practice test</p>
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
        </article>

        <article className="p-7 sm:p-10">
          <div className="flex items-center justify-between border-b border-dashed border-[#d8ddd6] pb-6">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center bg-[#030817] text-xl font-black text-white">{progress?.currentQuestion}</span>
              <span className="inline-flex items-center gap-2 text-sm font-black text-[#526073]">
                <Bookmark size={18} /> Mark for Review
              </span>
            </div>
            <button className="inline-flex items-center gap-2 text-sm font-black text-[#8a93a3]" type="button">
              <RotateCcw size={18} /> Undo
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
          Back
        </button>
        <p className="text-sm font-black text-[#526073]">Question {progress?.currentQuestion ?? 1} of {questions.length} · Total {totalQuestionNumber} of 98</p>
        <div className="flex gap-3">
          <button className="hidden border border-[#071124]/20 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] sm:block" onClick={() => completeModule(progress)} type="button">
            End Module
          </button>
          <button className="inline-flex items-center gap-3 rounded-md bg-[#2554d8] px-6 py-3 text-sm font-black text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.45)]" onClick={() => moveQuestion(1)} type="button">
            {progress && progress.currentQuestion >= questions.length ? "End Module" : "Next"} <ArrowRight size={18} />
          </button>
        </div>
      </footer>
    </main>
  );
}
