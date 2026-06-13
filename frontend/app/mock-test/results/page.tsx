"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BookOpenCheck, Lock, Target, XCircle } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { getToken } from "@/lib/api";
import { calculateDiagnosticResult, freeDiagnosticQuestions, type DiagnosticResult } from "@/lib/free-diagnostic";
import { getFreeDiagnosticResult, type StoredFreeDiagnostic } from "@/lib/free-diagnostic-storage";
import { useLanguage } from "@/lib/i18n";

const resultCopy = {
  en: {
    eyebrow: "Estimated score from 25 questions",
    title: "Your estimated score:",
    subtext: "This is an estimate from 25 questions. Take the full 98-question mock test in Pro for your accurate score.",
    breakdown: "Section breakdown",
    topics: "Accuracy by topic",
    weakAreas: "Weak areas",
    traps: "Mistake patterns",
    example: "One worked example",
    youAnswered: "You answered",
    correctAnswer: "Correct answer",
    noMiss: "No missed question in this diagnostic. Pro still opens the full 98-question mock test and a complete 30-day route.",
    locked: "Full Mock Test Ready",
    upsellTitle: "Your estimated score is",
    goal: "Your goal is 1400+.",
    bridge: "Your 30-day plan is ready. Unlock the full route while your weak areas are fresh.",
    upsellBodyA: "Your weak areas are",
    upsellBodyB:
      "SATTEST Pro includes the full 98-question identical Digital SAT mock test (2h14m, accurate scoring), a personalized 30-day plan built from this diagnostic, unlimited targeted practice, and mistake tracking.",
    monthly: "200,000 UZS / month",
    threeMonth: "600,000 UZS / 3 months",
    threeMonthNote: "Convenience for the full prep cycle. Same monthly price, paid once.",
    cta: "Unlock Full Mock Test",
    restart: "Retake Free Diagnostic",
    missing: "Diagnostic results were not found. Start the free diagnostic again."
  },
  ru: {
    eyebrow: "Оценочный балл по 25 вопросам",
    title: "Ваш оценочный балл:",
    subtext: "Это оценка по 25 вопросам. Для точного балла пройдите полный mock test из 98 вопросов в Pro.",
    breakdown: "Разделы",
    topics: "Точность по темам",
    weakAreas: "Слабые места",
    traps: "Типы ошибок",
    example: "Один пример с разбором",
    youAnswered: "Ваш ответ",
    correctAnswer: "Правильный ответ",
    noMiss: "В этой диагностике нет ошибок. Pro всё равно открывает полный mock test из 98 вопросов и полный 30-дневный маршрут.",
    locked: "Полный mock test готов",
    upsellTitle: "Ваш оценочный балл",
    goal: "Ваша цель — 1400+.",
    bridge: "Ваш 30-дневный план готов. Откройте полный маршрут, пока слабые места ещё свежие.",
    upsellBodyA: "Ваши слабые места:",
    upsellBodyB:
      "SATTEST Pro включает полный Digital SAT mock test из 98 вопросов (2ч14м, точный балл), персональный 30-дневный план по этой диагностике, неограниченную целевую практику и отслеживание ошибок.",
    monthly: "200,000 UZS / месяц",
    threeMonth: "600,000 UZS / 3 месяца",
    threeMonthNote: "Удобно для полного цикла подготовки. Та же месячная цена, одним платежом.",
    cta: "Открыть полный mock test",
    restart: "Пройти диагностику заново",
    missing: "Результаты диагностики не найдены. Начните бесплатную диагностику снова."
  },
  uz: {
    eyebrow: "25 savoldan taxminiy ball",
    title: "Taxminiy balingiz:",
    subtext: "Bu 25 savol asosidagi taxmin. Aniq ball uchun Pro'dagi 98 savollik to'liq mock testni topshiring.",
    breakdown: "Bo'limlar kesimi",
    topics: "Mavzular bo'yicha aniqlik",
    weakAreas: "Zaif joylar",
    traps: "Xato naqshlari",
    example: "Bitta savolning to'liq izohi",
    youAnswered: "Sizning javobingiz",
    correctAnswer: "To'g'ri javob",
    noMiss: "Bu diagnostikada xato yo'q. Pro baribir 98 savollik to'liq mock test va 30 kunlik to'liq reja ochadi.",
    locked: "To'liq mock test tayyor",
    upsellTitle: "Taxminiy balingiz",
    goal: "Maqsadingiz 1400+.",
    bridge: "30 kunlik rejangiz tayyor. Zaif joylaringiz esingizda turgan paytda to'liq yo'nalishni oching.",
    upsellBodyA: "Zaif joylaringiz:",
    upsellBodyB:
      "SATTEST Pro ichida 98 savollik to'liq Digital SAT mock test (2 soat 14 daqiqa, aniq ball), shu diagnostika asosida shaxsiy 30 kunlik reja, cheksiz maqsadli mashqlar va xatolar kuzatuvi bor.",
    monthly: "200,000 UZS / oy",
    threeMonth: "600,000 UZS / 3 oy",
    threeMonthNote: "To'liq tayyorgarlik sikli uchun qulay. Oylik narx o'zgarmaydi, faqat bir martalik to'lov.",
    cta: "To'liq Mock Testni ochish",
    restart: "Bepul diagnostikani qayta topshirish",
    missing: "Diagnostika natijalari topilmadi. Bepul diagnostikani qaytadan boshlang."
  }
};

export default function FreeDiagnosticResultsPage() {
  const { language } = useLanguage();
  const copy = resultCopy[language];
  const [stored, setStored] = useState<StoredFreeDiagnostic | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setStored(getFreeDiagnosticResult());
  }, []);

  useEffect(() => {
    function syncAuth() {
      setIsLoggedIn(Boolean(getToken()));
    }
    syncAuth();
    window.addEventListener("sattest:auth-change", syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener("sattest:auth-change", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  const result = useMemo<DiagnosticResult | null>(() => {
    if (!stored) return null;
    return calculateDiagnosticResult(stored.answers);
  }, [stored]);

  const paymentUrl = useMemo(() => `/pricing?lang=${language}&plan=pro&from=free-diagnostic&payment=qr`, [language]);
  const unlockUrl = useMemo(() => {
    if (isLoggedIn) return paymentUrl;
    const params = new URLSearchParams();
    params.set("plan", "pro");
    params.set("from", "free-diagnostic");
    if (stored?.email) params.set("email", stored.email);
    return `/register?${params.toString()}&next=${encodeURIComponent(paymentUrl)}`;
  }, [isLoggedIn, paymentUrl, stored?.email]);

  if (!result) {
    return (
      <main className="min-h-screen bg-[#080908] text-white">
        <LuxuryNavbar />
        <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-4xl flex-col justify-center px-5 py-14 text-center md:px-8">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#c8bd88]">Free Diagnostic</p>
          <h1 className="mt-6 text-5xl font-light leading-none md:text-7xl">{copy.missing}</h1>
          <Link className="mx-auto mt-8 flex h-14 min-w-[280px] items-center justify-between border border-white bg-white px-5 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/mock-test">
            {copy.restart} <ArrowRight size={18} />
          </Link>
        </section>
      </main>
    );
  }

  const workedExample = result.missedQuestions[0];
  const weakAreas = result.weakAreas.slice(0, 3);
  const weakAreasText = formatList(weakAreas, language);

  return (
    <main className="min-h-screen bg-[#080908] text-white">
      <LuxuryNavbar />
      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#c8bd88]">{copy.eyebrow}</p>
            <h1 className="mt-6 text-5xl font-light leading-none text-white md:text-7xl">
              {copy.title} <span className="block">≈{result.estimatedTotal}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-light leading-8 text-white/58">{copy.subtext}</p>
          </div>

          <div className="grid border border-white/10 bg-white/[0.035]">
            <ScoreTile label="Reading & Writing" value={`≈${result.estimatedRw}`} />
            <div className="border-t border-white/10" />
            <ScoreTile label="Math" value={`≈${result.estimatedMath}`} />
            <div className="border-t border-white/10" />
            <ScoreTile label="Range" value={`${result.estimatedMin}-${result.estimatedMax}`} />
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-[#c8bd88]" size={20} />
              <h2 className="text-2xl font-light">{copy.topics}</h2>
            </div>
            <div className="mt-6 grid gap-4">
              {result.topicAccuracy.map((item) => (
                <div key={item.topic}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-white" data-sattest-no-translate="true">{item.topic}</span>
                    <span className="text-white/58">{item.correct}/{item.total} · {item.accuracy}%</span>
                  </div>
                  <div className="mt-2 h-2 bg-white/10">
                    <div className="h-full bg-[#c8bd88]" style={{ width: `${item.accuracy}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6">
            <div className="border border-red-200/15 bg-red-400/10 p-5">
              <div className="flex items-center gap-3">
                <Target className="text-red-100" size={20} />
                <h2 className="text-2xl font-light">{copy.weakAreas}</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {weakAreas.map((area) => (
                  <div className="border border-red-100/15 bg-black/20 p-3 text-lg font-semibold text-red-50" data-sattest-no-translate="true" key={area}>
                    {area}
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-center gap-3">
                <XCircle className="text-[#c8bd88]" size={20} />
                <h2 className="text-2xl font-light">{copy.traps}</h2>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {(result.trapTypes.length ? result.trapTypes : ["No repeated trap yet"]).map((trap) => (
                  <span className="border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/68" data-sattest-no-translate="true" key={trap}>
                    {trap}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-3">
            <BookOpenCheck className="text-[#c8bd88]" size={20} />
            <h2 className="text-2xl font-light">{copy.example}</h2>
          </div>
          {workedExample ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
              <p className="text-2xl font-light leading-snug text-white" data-sattest-no-translate="true">{workedExample.question.prompt}</p>
              <div className="border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-white/56">{copy.youAnswered}: <span className="text-red-100" data-sattest-no-translate="true">{workedExample.selectedAnswer ?? "Skipped"}</span></p>
                <p className="mt-2 text-sm text-white/56">{copy.correctAnswer}: <span className="text-emerald-100" data-sattest-no-translate="true">{workedExample.question.correctAnswer}</span></p>
                <p className="mt-4 text-sm leading-6 text-white/68" data-sattest-no-translate="true">{workedExample.question.explanation}</p>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-lg leading-8 text-white/58">{copy.noMiss}</p>
          )}
        </section>

        <section className="mt-6 border border-[#c8bd88]/35 bg-[#c8bd88]/[0.07] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-end">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.34em] text-[#c8bd88]">
                <Lock size={16} /> {copy.locked}
              </p>
              <h2 className="mt-5 text-4xl font-light leading-tight md:text-6xl">
                {copy.upsellTitle} {result.estimatedTotal}. {copy.goal}
              </h2>
              <p className="mt-5 max-w-3xl text-xl font-semibold leading-8 text-white">
                {copy.bridge}
              </p>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-white/64">
                {copy.upsellBodyA} <span className="font-semibold text-white" data-sattest-no-translate="true">{weakAreasText}</span>. {copy.upsellBodyB}
              </p>
            </div>
            <div className="grid gap-3">
              <div className="border border-white/10 bg-black/25 p-4">
                <p className="text-3xl font-light">{copy.monthly}</p>
              </div>
              <div className="border border-white/10 bg-black/25 p-4">
                <p className="text-3xl font-light">{copy.threeMonth}</p>
                <p className="mt-2 text-sm text-white/52">{copy.threeMonthNote}</p>
              </div>
              <Link className="flex h-14 items-center justify-between border border-white bg-white px-5 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href={unlockUrl}>
                {copy.cta} <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function ScoreTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">{label}</p>
      <p className="mt-3 text-5xl font-light text-white">{value}</p>
    </div>
  );
}

function formatList(items: string[], language: "en" | "ru" | "uz") {
  if (items.length <= 1) return items[0] ?? "";
  const conjunction = language === "ru" ? "и" : language === "uz" ? "va" : "and";
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1]}`;
}
