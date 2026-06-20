"use client";

import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { safeReadJson, type FullMockResult } from "@/lib/full-mock-test";
import { RW_MOCK_RESULTS_KEY, RW_MOCK_TOTAL_QUESTIONS } from "@/lib/rw-mock-test";
import { pick, useLanguage, type Language } from "@/lib/i18n";

const copy: Record<Language, {
  title: string;
  subtitle: string;
  score: string;
  correct: string;
  weak: string;
  topics: string;
  review: string;
  missingTitle: string;
  missingText: string;
  start: string;
  path: string;
  retake: string;
}> = {
  en: {
    title: "Reading & Writing Mock Result",
    subtitle: "54-question timed section completed.",
    score: "R&W Score",
    correct: "Correct answers",
    weak: "Weak areas",
    topics: "Topic accuracy",
    review: "Mistake review",
    missingTitle: "No R&W mock result yet",
    missingText: "Start the Reading & Writing mock from your curriculum path.",
    start: "Start R&W Mock",
    path: "Back to path",
    retake: "Retake mock",
  },
  ru: {
    title: "Результат Reading & Writing Mock",
    subtitle: "54 вопроса в формате timed section завершены.",
    score: "R&W балл",
    correct: "Верных ответов",
    weak: "Слабые темы",
    topics: "Точность по темам",
    review: "Разбор ошибок",
    missingTitle: "Результата R&W mock пока нет",
    missingText: "Начните Reading & Writing mock из вашей учебной траектории.",
    start: "Начать R&W Mock",
    path: "Назад к пути",
    retake: "Пройти заново",
  },
  uz: {
    title: "Reading & Writing Mock Natijasi",
    subtitle: "54 savollik timed section yakunlandi.",
    score: "R&W ball",
    correct: "To'g'ri javoblar",
    weak: "Zaif mavzular",
    topics: "Mavzular bo'yicha aniqlik",
    review: "Xatolar tahlili",
    missingTitle: "R&W mock natijasi hali yo'q",
    missingText: "Reading & Writing mock testni curriculum yo'lidan boshlang.",
    start: "R&W Mock boshlash",
    path: "Yo'lga qaytish",
    retake: "Qayta topshirish",
  },
};

export default function ReadingWritingMockResultsPage() {
  const { language } = useLanguage();
  const t = pick(copy, language);
  const [result, setResult] = useState<FullMockResult | null>(null);

  useEffect(() => {
    setResult(safeReadJson<FullMockResult>(RW_MOCK_RESULTS_KEY));
  }, []);

  const correctCount = useMemo(() => result?.answers.filter((answer) => answer.isCorrect).length ?? 0, [result]);
  const missedAnswers = useMemo(() => result?.answers.filter((answer) => !answer.isCorrect).slice(0, 12) ?? [], [result]);

  if (!result) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] px-6 py-10 text-white">
        <section className="mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center text-center">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#FFD700]">SATTEST.UZ</p>
          <h1 className="mt-5 text-4xl font-black sm:text-6xl">{t.missingTitle}</h1>
          <p className="mt-5 text-lg font-semibold text-white/55">{t.missingText}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#FFD700] px-6 py-3 text-sm font-black text-black" href={`/rw-mock?lang=${language}`}>
              {t.start} <ArrowRight size={18} />
            </Link>
            <Link className="inline-flex min-h-12 items-center rounded-xl border border-white/10 px-6 py-3 text-sm font-black text-white/70 hover:text-white" href={`/path?lang=${language}`}>
              {t.path}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-8 text-white sm:px-6">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-[#FFD700]/20 bg-[#151515] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#FFD700]">SATTEST.UZ MOCK</p>
              <h1 className="mt-3 text-4xl font-black sm:text-6xl">{t.title}</h1>
              <p className="mt-3 text-lg font-semibold text-white/55">{t.subtitle}</p>
            </div>
            <div className="flex gap-3">
              <Link className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#FFD700] px-5 py-3 text-sm font-black text-black" href={`/path?lang=${language}`}>
                {t.path} <ArrowRight size={18} />
              </Link>
              <Link className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-black text-white/70 hover:text-white" href={`/rw-mock?lang=${language}`}>
                <RotateCcw size={17} /> {t.retake}
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-[#FFD700]/25 bg-black/30 p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">{t.score}</p>
              <p className="mt-3 text-6xl font-black text-[#FFD700]">{result.rwScore}</p>
              <p className="mt-2 text-sm font-bold text-white/45">200-800</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">{t.correct}</p>
              <p className="mt-3 text-5xl font-black">{correctCount}/{RW_MOCK_TOTAL_QUESTIONS}</p>
              <p className="mt-2 text-sm font-bold text-white/45">{Math.round((correctCount / RW_MOCK_TOTAL_QUESTIONS) * 100)}%</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">{t.weak}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {result.weakAreas.map((area) => (
                  <span className="rounded-full border border-[#FFD700]/25 bg-[#FFD700]/10 px-3 py-1 text-xs font-black text-[#FFD700]" key={area}>
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-6">
            <h2 className="text-2xl font-black">{t.topics}</h2>
            <div className="mt-5 space-y-4">
              {result.topicAccuracy.map((topic) => (
                <div key={topic.topic}>
                  <div className="flex justify-between gap-4 text-sm font-black">
                    <span>{topic.topic}</span>
                    <span className="text-white/45">{topic.correct}/{topic.total}</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#FFD700]" style={{ width: `${topic.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#151515] p-6">
            <h2 className="text-2xl font-black">{t.review}</h2>
            <div className="mt-5 space-y-4">
              {missedAnswers.length === 0 ? (
                <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5 text-emerald-100">
                  <CheckCircle2 className="mb-2" /> Perfect section. No missed answers.
                </div>
              ) : missedAnswers.map((answer) => (
                <article className="rounded-2xl border border-white/10 bg-black/25 p-5" key={answer.questionId}>
                  <div className="flex items-start gap-3">
                    <XCircle className="mt-1 shrink-0 text-[#F87171]" size={20} />
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#FFD700]">{answer.topic}</p>
                      <p className="mt-2 font-semibold text-white/80">{answer.question.prompt}</p>
                      <p className="mt-3 text-sm font-bold text-white/45">
                        Your answer: {answer.selectedAnswer ?? "-"} · Correct: {answer.correctAnswer}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-white/60">{answer.explanation}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
