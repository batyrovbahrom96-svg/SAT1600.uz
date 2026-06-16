"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BookOpenCheck, Check, Lock, MessageCircle, Target, XCircle } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { PremiumButton } from "@/components/PremiumButton";
import { Skeleton } from "@/components/SkeletonLoader";
import { calculateDiagnosticResult, freeDiagnosticQuestions, type DiagnosticResult } from "@/lib/free-diagnostic";
import { getFreeDiagnosticResult, type StoredFreeDiagnostic } from "@/lib/free-diagnostic-storage";
import { useLanguage } from "@/lib/i18n";
import { notifyDiagnosticResult } from "./actions";

const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "SATTEST_UZ_bot";
const telegramBotUrl = `https://t.me/${telegramBotUsername}?start=pro`;
const paynetQrPayload =
  "00020101021140440012qr-online.uz01186qz7uqn60TiFsWDuxO0202115204531153038605802UZ5910AO'PAYNET'6008Tashkent610610002164280002uz0106PAYNET0208Toshkent80520012qr-online.uz03097120207070419marketing@paynet.uz630453C8";
const paynetQrImage = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(paynetQrPayload)}`;
const diagnosticPaywallCountdownKey = "sattest_diagnostic_paywall_countdown_end";
const diagnosticPaywallDurationMs = 24 * 60 * 60 * 1000;

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
    locked: "Pro subscription payment ready",
    upsellTitle: "Go Pro and reach 1400+.",
    goal: "Your diagnostic score:",
    bridge: "Scan the QR code now, pay for Pro Subscription 1, then send the receipt in Telegram.",
    upsellBodyA: "Your weak areas are",
    upsellBodyB:
      "After payment, @SATTEST_UZ_bot activates Pro and sends you back to SATTEST.UZ to open the full mock result, personal 1400+ curriculum, unlimited targeted practice, and mistake tracking.",
    monthlyPlan: "Pro Subscription 1",
    monthly: "200,000 UZS / 1 month",
    threeMonth: "600,000 UZS / 3 months",
    threeMonthNote: "Convenience for the full prep cycle. Same monthly price, paid once.",
    scanLine: "Scan QR → Pay → Send receipt",
    instructions: [
      "Pay 200,000 UZS with this QR code.",
      `Send the payment screenshot to @${telegramBotUsername}.`,
      "Write your registration email in the message."
    ],
    proOpens: "Pro opens the full mock test result, My 1400+ route, unlimited practice, and mistake tracking after activation.",
    cta: "Paid — send receipt",
    qrAlt: "Pro Subscription 1 Paynet QR payment 200,000 UZS",
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
    bridge: "Отсканируйте QR сейчас, оплатите Pro Subscription 1 и отправьте чек в Telegram.",
    upsellBodyA: "Ваши слабые места:",
    upsellBodyB:
      "После оплаты @SATTEST_UZ_bot активирует Pro и отправит вас обратно на SATTEST.UZ, чтобы открыть результат полного mock test, личный маршрут 1400+, целевую практику и отслеживание ошибок.",
    monthlyPlan: "Pro Subscription 1",
    monthly: "200,000 UZS / 1 месяц",
    threeMonth: "600,000 UZS / 3 месяца",
    threeMonthNote: "Удобно для полного цикла подготовки. Та же месячная цена, одним платежом.",
    scanLine: "Сканируй QR → Оплати → Отправь чек",
    instructions: [
      "Оплатите 200,000 UZS по этому QR-коду.",
      `Отправьте скриншот оплаты в @${telegramBotUsername}.`,
      "Напишите email регистрации в сообщении."
    ],
    proOpens: "После активации Pro открывает полный mock test result, маршрут My 1400+, безлимитную практику и отслеживание ошибок.",
    cta: "Оплатил — отправить чек",
    qrAlt: "QR оплата Pro Subscription 1 Paynet 200,000 UZS",
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
    bridge: "QR kodni hozir skaner qiling, Pro Subscription 1 uchun to'lang va chekni Telegramga yuboring.",
    upsellBodyA: "Zaif joylaringiz:",
    upsellBodyB:
      "To'lovdan keyin @SATTEST_UZ_bot Pro obunangizni faollashtiradi va sizni SATTEST.UZ ga qaytaradi: to'liq mock test natijasi, shaxsiy 1400+ curriculum, maqsadli mashqlar va xatolar kuzatuvi ochiladi.",
    monthlyPlan: "Pro Subscription 1",
    monthly: "200,000 UZS / 1 oy",
    threeMonth: "600,000 UZS / 3 oy",
    threeMonthNote: "To'liq tayyorgarlik sikli uchun qulay. Oylik narx o'zgarmaydi, faqat bir martalik to'lov.",
    scanLine: "QR skaner → To'lov → Chek yuborish",
    instructions: [
      "Ushbu QR kod orqali 200,000 UZS to'lang.",
      `To'lov skrinshotini @${telegramBotUsername} ga yuboring.`,
      "Xabarda ro'yxatdan o'tgan emailingizni yozing."
    ],
    proOpens: "Faollashtirilgandan keyin Pro to'liq mock test natijasi, My 1400+ yo'nalishi, cheksiz mashqlar va xatolar kuzatuvini ochadi.",
    cta: "To'ladim — chek yuborish",
    qrAlt: "Pro Subscription 1 Paynet QR to'lov 200,000 UZS",
    restart: "Bepul diagnostikani qayta topshirish",
    missing: "Diagnostika natijalari topilmadi. Bepul diagnostikani qaytadan boshlang."
  }
};

export default function FreeDiagnosticResultsPage() {
  const { language } = useLanguage();
  const copy = resultCopy[language];
  const [stored, setStored] = useState<StoredFreeDiagnostic | null>(null);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(24 * 60 * 60);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setStored(getFreeDiagnosticResult());
    setHasCheckedStorage(true);
  }, []);

  const result = useMemo<DiagnosticResult | null>(() => {
    if (!stored) return null;
    return calculateDiagnosticResult(stored.answers);
  }, [stored]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function getCountdownEnd() {
      const raw = window.localStorage.getItem(diagnosticPaywallCountdownKey);
      const saved = raw ? Number(raw) : 0;
      if (Number.isFinite(saved) && saved > Date.now()) return saved;

      const next = Date.now() + diagnosticPaywallDurationMs;
      window.localStorage.setItem(diagnosticPaywallCountdownKey, String(next));
      return next;
    }

    let endAt = Date.now() + diagnosticPaywallDurationMs;
    try {
      endAt = getCountdownEnd();
    } catch {
      endAt = Date.now() + diagnosticPaywallDurationMs;
    }

    const updateCountdown = () => {
      setCountdownSeconds(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!result || !stored || typeof window === "undefined") return;

    const notificationKey = `sattest_diagnostic_notified_${stored.sessionId}`;
    try {
      if (window.localStorage.getItem(notificationKey) === "sent") return;
      window.localStorage.setItem(notificationKey, "pending");
    } catch {
      // The notification is helpful but should not block the result page.
    }

    void notifyDiagnosticResult({
      timestamp: stored.completedAt,
      estimatedScore: result.estimatedTotal,
      weakAreas: result.weakAreas.slice(0, 3),
      language: language.toUpperCase() as "EN" | "RU" | "UZ",
    })
      .then((response) => {
        if (response?.ok) {
          try {
            window.localStorage.setItem(notificationKey, "sent");
          } catch {}
          return;
        }
        try {
          window.localStorage.removeItem(notificationKey);
        } catch {}
      })
      .catch(() => {
        try {
          window.localStorage.removeItem(notificationKey);
        } catch {}
      });
  }, [language, result, stored]);

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
          <PremiumButton className="mx-auto mt-8 min-w-[280px]" href="/mock-test/diagnostic" icon={<ArrowRight size={18} />}>
            {copy.restart}
          </PremiumButton>
        </section>
      </main>
    );
  }

  const workedExample = result.missedQuestions[0];
  const weakAreas = result.weakAreas.slice(0, 3);

  return (
    <main className="min-h-screen bg-[#080908] text-white" data-sattest-no-translate="true">
      <style>{`
        .locked-section {
          filter: blur(6px);
          pointer-events: none;
          user-select: none;
          position: relative;
        }

        .lock-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.5);
          z-index: 10;
          border-radius: 12px;
        }

        @keyframes diagnostic-timer-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.03); opacity: 0.72; }
        }

        .diagnostic-timer-pulse {
          animation: diagnostic-timer-pulse 1.2s ease-in-out infinite;
        }
      `}</style>
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

        <RevealSection delay={120}>
          <DiagnosticProLockCard countdownSeconds={countdownSeconds} />
        </RevealSection>

        <RevealSection delay={180}>
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <LockedAnalysisSection>
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
          </LockedAnalysisSection>

          <section className="grid gap-6">
            <LockedAnalysisSection>
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
            </LockedAnalysisSection>

            <LockedAnalysisSection>
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
            </LockedAnalysisSection>
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
                {copy.upsellBodyB}
              </p>
            </div>
            <div className="grid gap-4">
              <article className="border border-white/15 bg-black/30 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/45">{copy.monthlyPlan}</p>
                <h3 className="mt-3 text-4xl font-light">{copy.monthly}</h3>
                <div className="mt-5 grid min-h-[290px] place-items-center border border-white/15 bg-white p-4">
                  <img className="h-[270px] w-[270px] object-contain" src={paynetQrImage} alt={copy.qrAlt} />
                </div>
                <p className="mt-4 text-center text-sm font-semibold uppercase tracking-[0.16em] text-white/70">{copy.scanLine}</p>
                <div className="mt-5 grid gap-3">
                  {copy.instructions.map((instruction) => (
                    <p className="flex items-start gap-3 text-sm leading-6 text-white/70" key={instruction}>
                      <Check className="mt-0.5 shrink-0 text-[#c8bd88]" size={16} /> {instruction}
                    </p>
                  ))}
                </div>
                <a className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-3 border border-[#c8bd88]/45 bg-[#c8bd88] px-5 text-center text-[11px] font-black uppercase tracking-[0.18em] text-black transition-colors hover:bg-white" href={telegramBotUrl} target="_blank" rel="noreferrer">
                  <MessageCircle size={18} /> {copy.cta}
                </a>
              </article>
              <div className="border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white/58">
                {copy.proOpens}
              </div>
            </div>
          </div>
        </section>
        </RevealSection>
      </section>
    </main>
  );
}

function LockedAnalysisSection({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="locked-section">{children}</div>
      <div className="lock-overlay">
        <Lock className="text-[#FFD700]" size={32} />
        <p className="mt-3 text-center text-xs font-black uppercase tracking-[0.22em] text-white">Pro kerak</p>
      </div>
    </div>
  );
}

function DiagnosticProLockCard({ countdownSeconds }: { countdownSeconds: number }) {
  const expired = countdownSeconds <= 0;
  const isUrgent = countdownSeconds > 0 && countdownSeconds <= 60 * 60;

  return (
    <section className="mt-8 rounded-xl border border-[#FFD700]/35 bg-black/55 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.38)] md:p-7">
      <div className="mx-auto max-w-3xl text-white">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">🔒</span>
          <h2 className="text-3xl font-black leading-tight text-[#FFD700]">Bu ma'lumotlar YOPIQ</h2>
        </div>

        <p className="mt-5 text-2xl font-semibold leading-9">
          Siz 3 ta zaif mavzuni aniqladingiz — lekin ularni ko'rish uchun Pro kerak!
        </p>

        <div className="mt-6">
          <p className="text-lg font-black text-white">Pro da siz olasiz:</p>
          <div className="mt-4 grid gap-3 text-lg leading-7 text-white/82">
            <p>✅ Zaif mavzular ro'yxati</p>
            <p>✅ Har bir xato tahlili</p>
            <p>✅ 30 kunlik shaxsiy reja</p>
            <p>✅ To'liq 98 savollik Mock Test</p>
            <p>✅ Cheksiz mashq testlari</p>
          </div>
        </div>

        <div className="mt-7 rounded-xl border border-[#FFD700]/35 bg-[#FFD700]/10 p-4 text-center">
          {expired ? (
            <p className="text-2xl font-black text-[#FFD700]">⚠️ Vaqt tugadi! Hozir Pro oling!</p>
          ) : (
            <>
              <p className={["text-4xl font-black tabular-nums text-[#FFD700]", isUrgent ? "diagnostic-timer-pulse" : ""].join(" ")}>
                ⏰ {formatCountdown(countdownSeconds)}
              </p>
              <p className="mt-2 text-lg font-bold text-white">Rejangiz bugun o'chadi!</p>
            </>
          )}
        </div>

        <div className="mt-6 grid gap-3">
          <a
            className="flex h-14 w-full items-center justify-center rounded-xl bg-[#FFD700] px-5 text-center text-lg font-black text-black transition hover:bg-white"
            href={telegramBotUrl}
            target="_blank"
            rel="noreferrer"
          >
            🔑 PRO OLISH → 200,000 UZS/OY
          </a>
          <a
            className="flex h-14 w-full items-center justify-center rounded-xl border border-[#FFD700]/55 bg-white/10 px-5 text-center text-lg font-black text-[#FFD700] transition hover:bg-[#FFD700] hover:text-black"
            href={telegramBotUrl}
            target="_blank"
            rel="noreferrer"
          >
            💎 3 OY → 600,000 UZS
          </a>
        </div>

        <p className="mt-5 text-center text-base font-bold text-white/82">✅ Bu oy 47 o'quvchi Pro oldi</p>
      </div>
    </section>
  );
}

function formatCountdown(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
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
