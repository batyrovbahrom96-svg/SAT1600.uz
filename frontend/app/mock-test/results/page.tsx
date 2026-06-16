"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BookOpenCheck, Lock, Target, XCircle } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { PremiumButton } from "@/components/PremiumButton";
import { Skeleton } from "@/components/SkeletonLoader";
import { getToken } from "@/lib/api";
import { calculateDiagnosticResult, freeDiagnosticQuestions, type DiagnosticResult } from "@/lib/free-diagnostic";
import { getFreeDiagnosticResult, type StoredFreeDiagnostic } from "@/lib/free-diagnostic-storage";
import { useLanguage } from "@/lib/i18n";
import { notifyDiagnosticResult } from "./actions";

const resultCopy = {
  en: {
    eyebrow: "Estimated score from 25 questions",
    title: "Your estimated score:",
    subtext: "This is an estimate from 25 questions. Section results are shown as ranges because a short diagnostic should not pretend to be exact. Take the full 98-question mock test in Pro for accurate section scores.",
    breakdown: "Section breakdown",
    readingWritingRange: "Reading & Writing range",
    mathRange: "Math range",
    totalRange: "Estimated total range",
    topics: "Accuracy by topic",
    weakAreas: "Weak areas",
    traps: "Mistake patterns",
    example: "One worked example",
    youAnswered: "You answered",
    correctAnswer: "Correct answer",
    noMiss: "No missed question in this diagnostic. Pro still opens the full 98-question mock test and a complete 30-day route.",
    locked: "Payment page ready",
    upsellTitle: "Go Pro and reach 1400+.",
    goal: "Your diagnostic score:",
    bridge: "See your weak areas, choose a plan, scan the Payme or Click QR code, then confirm payment in Telegram.",
    upsellBodyA: "Your weak areas are",
    upsellBodyB:
      "After payment, @SATTEST_UZ_bot activates Pro and sends you back to SATTEST.UZ to open the full mock result, personal 1400+ curriculum, unlimited targeted practice, and mistake tracking.",
    monthly: "200,000 UZS / month",
    threeMonth: "600,000 UZS / 3 months",
    threeMonthNote: "Convenience for the full prep cycle. Same monthly price, paid once.",
    cta: "Open payment page",
    restart: "Retake Free Diagnostic",
    missing: "Diagnostic results were not found. Start the free diagnostic again."
  },
  ru: {
    eyebrow: "Оценочный балл по 25 вопросам",
    title: "Ваш оценочный балл:",
    subtext: "Это оценка по 25 вопросам. Результаты по разделам показаны диапазоном, потому что короткая диагностика не должна притворяться точной. Для точных баллов по разделам пройдите полный mock test из 98 вопросов в Pro.",
    breakdown: "Разделы",
    readingWritingRange: "Диапазон чтения и письма",
    mathRange: "Диапазон математики",
    totalRange: "Общий диапазон",
    topics: "Точность по темам",
    weakAreas: "Слабые места",
    traps: "Типы ошибок",
    example: "Один пример с разбором",
    youAnswered: "Ваш ответ",
    correctAnswer: "Правильный ответ",
    noMiss: "В этой диагностике нет ошибок. Pro всё равно открывает полный mock test из 98 вопросов и полный 30-дневный маршрут.",
    locked: "Страница оплаты готова",
    upsellTitle: "Перейдите на Pro и дойдите до 1400+.",
    goal: "Ваш балл диагностики:",
    bridge: "Посмотрите слабые места, выберите тариф, отсканируйте QR Payme или Click и подтвердите оплату в Telegram.",
    upsellBodyA: "Ваши слабые места:",
    upsellBodyB:
      "После оплаты @SATTEST_UZ_bot активирует Pro и отправит вас обратно на SATTEST.UZ, чтобы открыть результат полного mock test, личный маршрут 1400+, целевую практику и отслеживание ошибок.",
    monthly: "200,000 UZS / месяц",
    threeMonth: "600,000 UZS / 3 месяца",
    threeMonthNote: "Удобно для полного цикла подготовки. Та же месячная цена, одним платежом.",
    cta: "Открыть страницу оплаты",
    restart: "Пройти диагностику заново",
    missing: "Результаты диагностики не найдены. Начните бесплатную диагностику снова."
  },
  uz: {
    eyebrow: "25 savoldan taxminiy ball",
    title: "Taxminiy balingiz:",
    subtext: "Bu 25 savol asosidagi taxmin. Bo'lim natijalari oraliq ko'rinishida beriladi, chunki qisqa diagnostika aniq ball deb ko'rsatmasligi kerak. Aniq bo'lim ballari uchun Pro'dagi 98 savollik to'liq mock testni topshiring.",
    breakdown: "Bo'limlar kesimi",
    readingWritingRange: "Reading/Writing oralig'i",
    mathRange: "Matematika oralig'i",
    totalRange: "Umumiy taxmin oralig'i",
    topics: "Mavzular bo'yicha aniqlik",
    weakAreas: "Zaif joylar",
    traps: "Xato naqshlari",
    example: "Bitta savolning to'liq izohi",
    youAnswered: "Sizning javobingiz",
    correctAnswer: "To'g'ri javob",
    noMiss: "Bu diagnostikada xato yo'q. Pro baribir 98 savollik to'liq mock test va 30 kunlik to'liq reja ochadi.",
    locked: "To'lov sahifasi tayyor",
    upsellTitle: "Pro-ga o'ting va 1400+ ga yeting!",
    goal: "Diagnostika balingiz:",
    bridge: "Zaif joylaringizni ko'ring, tarif tanlang, Payme yoki Click QR kodini skaner qiling va Telegramda to'lovni tasdiqlang.",
    upsellBodyA: "Zaif joylaringiz:",
    upsellBodyB:
      "To'lovdan keyin @SATTEST_UZ_bot Pro obunangizni faollashtiradi va sizni SATTEST.UZ ga qaytaradi: to'liq mock test natijasi, shaxsiy 1400+ curriculum, maqsadli mashqlar va xatolar kuzatuvi ochiladi.",
    monthly: "200,000 UZS / oy",
    threeMonth: "600,000 UZS / 3 oy",
    threeMonthNote: "To'liq tayyorgarlik sikli uchun qulay. Oylik narx o'zgarmaydi, faqat bir martalik to'lov.",
    cta: "To'lov sahifasini ochish",
    restart: "Bepul diagnostikani qayta topshirish",
    missing: "Diagnostika natijalari topilmadi. Bepul diagnostikani qaytadan boshlang."
  }
};

export default function FreeDiagnosticResultsPage() {
  const { language } = useLanguage();
  const copy = resultCopy[language];
  const [stored, setStored] = useState<StoredFreeDiagnostic | null>(null);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setStored(getFreeDiagnosticResult());
    setHasCheckedStorage(true);
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

  useEffect(() => {
    if (!result || !stored || typeof window === "undefined") return;

    const notificationKey = `sattest_diagnostic_notified_${stored.sessionId}`;
    if (window.localStorage.getItem(notificationKey) === "sent") return;

    window.localStorage.setItem(notificationKey, "pending");
    void notifyDiagnosticResult({
      timestamp: stored.completedAt,
      estimatedScore: result.estimatedTotal,
      weakAreas: result.weakAreas.slice(0, 3),
      language: language.toUpperCase() as "EN" | "RU" | "UZ",
    })
      .then((response) => {
        if (response?.ok) {
          window.localStorage.setItem(notificationKey, "sent");
          return;
        }
        window.localStorage.removeItem(notificationKey);
      })
      .catch(() => {
        window.localStorage.removeItem(notificationKey);
      });
  }, [language, result, stored]);

  const paymentUrl = useMemo(() => `/payment?lang=${language}&from=free-diagnostic`, [language]);
  const unlockUrl = useMemo(() => {
    if (isLoggedIn) return paymentUrl;
    const params = new URLSearchParams();
    params.set("plan", "pro");
    params.set("from", "free-diagnostic");
    if (stored?.email) params.set("email", stored.email);
    return `/register?${params.toString()}&next=${encodeURIComponent(paymentUrl)}`;
  }, [isLoggedIn, paymentUrl, stored?.email]);

  if (!hasCheckedStorage) {
    return (
      <main className="min-h-screen bg-[#080908] text-white" data-sattest-no-translate="true">
        <LuxuryNavbar />
        <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl gap-8 px-5 py-12 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="pt-10">
            <Skeleton width="220px" height="12px" />
            <Skeleton width="min(640px, 90vw)" height="96px" borderRadius="4px" style={{ marginTop: 28 }} />
            <Skeleton width="min(540px, 80vw)" height="26px" borderRadius="4px" style={{ marginTop: 28 }} />
          </div>
          <div className="grid gap-3 border border-white/10 bg-white/[0.035] p-5">
            <Skeleton height="96px" />
            <Skeleton height="96px" />
            <Skeleton height="96px" />
          </div>
        </section>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="min-h-screen bg-[#080908] text-white" data-sattest-no-translate="true">
        <LuxuryNavbar />
        <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-4xl flex-col justify-center px-5 py-14 text-center md:px-8">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#c8bd88]">Free Diagnostic</p>
          <h1 className="mt-6 text-5xl font-light leading-none md:text-7xl">{copy.missing}</h1>
          <PremiumButton className="mx-auto mt-8 min-w-[280px]" href="/mock-test" icon={<ArrowRight size={18} />}>
            {copy.restart}
          </PremiumButton>
        </section>
      </main>
    );
  }

  const workedExample = result.missedQuestions[0];
  const weakAreas = result.weakAreas.slice(0, 3);
  const weakAreasText = formatList(weakAreas, language);

  return (
    <main className="min-h-screen bg-[#080908] text-white" data-sattest-no-translate="true">
      <LuxuryNavbar />
      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <RevealSection delay={0}>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#c8bd88]">{copy.eyebrow}</p>
            <h1 className="mt-6 text-5xl font-light leading-none text-white md:text-7xl">
              {copy.title} <span className="block">≈{result.estimatedTotal}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-light leading-8 text-white/58">{copy.subtext}</p>
          </div>

          <div className="grid border border-white/10 bg-white/[0.035]">
            <ScoreTile label={copy.readingWritingRange} value={`${result.estimatedRwMin}-${result.estimatedRwMax}`} />
            <div className="border-t border-white/10" />
            <ScoreTile label={copy.mathRange} value={`${result.estimatedMathMin}-${result.estimatedMathMax}`} />
            <div className="border-t border-white/10" />
            <ScoreTile label={copy.totalRange} value={`${result.estimatedMin}-${result.estimatedMax}`} />
          </div>
        </div>
        </RevealSection>

        <RevealSection delay={180}>
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
        </RevealSection>

        <RevealSection delay={360}>
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
        </RevealSection>

        <RevealSection delay={540}>
        <section className="mt-6 border border-[#c8bd88]/35 bg-[#c8bd88]/[0.07] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-end">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.34em] text-[#c8bd88]">
                <Lock size={16} /> {copy.locked}
              </p>
              <h2 className="mt-5 text-4xl font-light leading-tight md:text-6xl">
                {copy.upsellTitle} <span className="block text-white/72">{copy.goal} {result.estimatedTotal}</span>
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
              <PremiumButton className="w-full" href={unlockUrl} icon={<ArrowRight size={18} />}>
                {copy.cta}
              </PremiumButton>
            </div>
          </div>
        </section>
        </RevealSection>
      </section>
    </main>
  );
}

function RevealSection({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timeout);
  }, [delay]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        willChange: "opacity, transform"
      }}
    >
      {children}
    </div>
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
