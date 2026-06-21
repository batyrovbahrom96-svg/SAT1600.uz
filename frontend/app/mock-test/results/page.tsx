"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BookOpenCheck, Target, XCircle } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { PremiumButton } from "@/components/PremiumButton";
import { Skeleton } from "@/components/SkeletonLoader";
import { trackProLockView } from "@/lib/api";
import { calculateDiagnosticResult, freeDiagnosticQuestions, type DiagnosticResult } from "@/lib/free-diagnostic";
import { getFreeDiagnosticResult, type StoredFreeDiagnostic } from "@/lib/free-diagnostic-storage";
import { useLanguage } from "@/lib/i18n";
import { notifyDiagnosticResult } from "./actions";

const telegramBotUsername = process.env.NEXT_PUBLIC_PAYMENT_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "SATTESTUZBot";
const telegramDiagnosticUserKey = "sattest_telegram_diagnostic_user_id";

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
      `After payment, @${telegramBotUsername} activates Pro and sends you back to SATTEST.UZ to open the full mock result, personal 1400+ curriculum, unlimited targeted practice, and mistake tracking.`,
    monthlyPlan: "Pro Subscription 1",
    monthly: "300,000 UZS / 1 month",
    threeMonth: "900,000 UZS / 3 months",
    threeMonthNote: "Convenience for the full prep cycle. Same monthly price, paid once.",
    scanLine: "Scan QR → Pay → Send receipt",
    instructions: [
      "Pay 300,000 UZS with this QR code.",
      `Send the payment screenshot to @${telegramBotUsername}.`,
      "Write your registration email in the message."
    ],
    proOpens: "Pro opens the full mock test result, My 1400+ route, unlimited practice, and mistake tracking after activation.",
    cta: "Paid — send receipt",
    qrAlt: "Pro Subscription 1 Paynet QR payment 300,000 UZS",
    lockCard: {
      title: "This information is LOCKED",
      body: "You found 3 weak topics — but you need Pro to see them!",
      includedTitle: "With Pro you get:",
      benefits: [
        "Weak topic list",
        "Every mistake analysis",
        "30-day personal plan",
        "Full 98-question Mock Test",
        "Unlimited practice tests"
      ],
      expired: "",
      primary: "🔑 GET PRO → 300,000 UZS/MONTH",
      threeMonth: "💎 3 MONTHS → 900,000 UZS",
      socialProof: "✅ 47 students got Pro this month"
    },
    paymentModal: {
      title: "Pro payment QR",
      body: "Scan the QR, complete payment, then upload your receipt to the Telegram bot.",
      planMonthly: "Pro Subscription 1",
      planThreeMonth: "Pro Subscription · 3 months",
      monthlyPrice: "300,000 UZS / month",
      threeMonthPrice: "900,000 UZS / 3 months",
      scanLine: "Scan QR → Pay → Upload receipt",
      instructionsTitle: "What to send in Telegram:",
      instructions: [
        "Payment screenshot or PDF receipt",
        "Your registered email",
        "Your full name and phone number"
      ],
      warningTitle: "Warning",
      warningBody: "Fake receipts lead to account ban. If the payment is not found in payment records, Pro access can be revoked immediately.",
      notificationTitle: "After you upload the receipt",
      notificationBody: "The Telegram bot activates Pro and sends you back to SATTEST.UZ. Activation usually takes up to 60 seconds.",
      telegramCta: "Upload receipt in Telegram",
      close: "Close payment QR",
      qrAlt: "Pro subscription payment QR"
    },
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
      `После оплаты @${telegramBotUsername} активирует Pro и отправит вас обратно на SATTEST.UZ, чтобы открыть результат полного mock test, личный маршрут 1400+, целевую практику и отслеживание ошибок.`,
    monthlyPlan: "Pro Subscription 1",
    monthly: "300,000 UZS / 1 месяц",
    threeMonth: "900,000 UZS / 3 месяца",
    threeMonthNote: "Удобно для полного цикла подготовки. Та же месячная цена, одним платежом.",
    scanLine: "Сканируй QR → Оплати → Отправь чек",
    instructions: [
      "Оплатите 300,000 UZS по этому QR-коду.",
      `Отправьте скриншот оплаты в @${telegramBotUsername}.`,
      "Напишите email регистрации в сообщении."
    ],
    proOpens: "После активации Pro открывает полный mock test result, маршрут My 1400+, безлимитную практику и отслеживание ошибок.",
    cta: "Оплатил — отправить чек",
    qrAlt: "QR оплата Pro Subscription 1 Paynet 300,000 UZS",
    lockCard: {
      title: "Эта информация ЗАКРЫТА",
      body: "Вы нашли 3 слабые темы — но чтобы увидеть их, нужен Pro!",
      includedTitle: "В Pro вы получите:",
      benefits: [
        "Список слабых тем",
        "Разбор каждой ошибки",
        "Личный план на 30 дней",
        "Полный Mock Test из 98 вопросов",
        "Безлимитные тренировочные тесты"
      ],
      expired: "",
      primary: "🔑 ПОЛУЧИТЬ PRO → 300,000 UZS/МЕСЯЦ",
      threeMonth: "💎 3 МЕСЯЦА → 900,000 UZS",
      socialProof: "✅ В этом месяце 47 учеников получили Pro"
    },
    paymentModal: {
      title: "QR для оплаты Pro",
      body: "Отсканируйте QR, оплатите и загрузите чек в Telegram-бот.",
      planMonthly: "Pro Subscription 1",
      planThreeMonth: "Pro Subscription · 3 месяца",
      monthlyPrice: "300,000 UZS / месяц",
      threeMonthPrice: "900,000 UZS / 3 месяца",
      scanLine: "Сканируй QR → Оплати → Загрузи чек",
      instructionsTitle: "Что отправить в Telegram:",
      instructions: [
        "Скриншот оплаты или PDF-чек",
        "Email, использованный при регистрации",
        "Ваше имя, фамилию и номер телефона"
      ],
      warningTitle: "Предупреждение",
      warningBody: "Поддельные чеки приводят к блокировке аккаунта. Если платеж не найден в платежных записях, Pro-доступ может быть немедленно отозван.",
      notificationTitle: "После загрузки чека",
      notificationBody: "Telegram-бот активирует Pro и вернет вас на SATTEST.UZ. Обычно активация занимает до 60 секунд.",
      telegramCta: "Загрузить чек в Telegram",
      close: "Закрыть QR оплаты",
      qrAlt: "QR-код оплаты Pro subscription"
    },
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
      `To'lovdan keyin @${telegramBotUsername} Pro obunangizni faollashtiradi va sizni SATTEST.UZ ga qaytaradi: to'liq mock test natijasi, shaxsiy 1400+ curriculum, maqsadli mashqlar va xatolar kuzatuvi ochiladi.`,
    monthlyPlan: "Pro Subscription 1",
    monthly: "300,000 UZS / 1 oy",
    threeMonth: "900,000 UZS / 3 oy",
    threeMonthNote: "To'liq tayyorgarlik sikli uchun qulay. Oylik narx o'zgarmaydi, faqat bir martalik to'lov.",
    scanLine: "QR skaner → To'lov → Chek yuborish",
    instructions: [
      "Ushbu QR kod orqali 300,000 UZS to'lang.",
      `To'lov skrinshotini @${telegramBotUsername} ga yuboring.`,
      "Xabarda ro'yxatdan o'tgan emailingizni yozing."
    ],
    proOpens: "Faollashtirilgandan keyin Pro to'liq mock test natijasi, My 1400+ yo'nalishi, cheksiz mashqlar va xatolar kuzatuvini ochadi.",
    cta: "To'ladim — chek yuborish",
    qrAlt: "Pro Subscription 1 Paynet QR to'lov 300,000 UZS",
    lockCard: {
      title: "Bu ma'lumotlar YOPIQ",
      body: "Siz 3 ta zaif mavzuni aniqladingiz — lekin ularni ko'rish uchun Pro kerak!",
      includedTitle: "Pro da siz olasiz:",
      benefits: [
        "Zaif mavzular ro'yxati",
        "Har bir xato tahlili",
        "30 kunlik shaxsiy reja",
        "To'liq 98 savollik Mock Test",
        "Cheksiz mashq testlari"
      ],
      expired: "",
      primary: "🔑 PRO OLISH → 300,000 UZS/OY",
      threeMonth: "💎 3 OY → 900,000 UZS",
      socialProof: "✅ Bu oy 47 o'quvchi Pro oldi"
    },
    paymentModal: {
      title: "Pro to'lov QR kodi",
      body: "QR kodni skaner qiling, to'lovni bajaring va chekni Telegram botga yuklang.",
      planMonthly: "Pro Subscription 1",
      planThreeMonth: "Pro Subscription · 3 oy",
      monthlyPrice: "300,000 UZS / oy",
      threeMonthPrice: "900,000 UZS / 3 oy",
      scanLine: "QR skaner → To'lov → Chek yuklash",
      instructionsTitle: "Telegramga yuboriladigan ma'lumotlar:",
      instructions: [
        "To'lov skrinshoti yoki PDF chek",
        "Ro'yxatdan o'tgan emailingiz",
        "Ism-familiya va telefon raqamingiz"
      ],
      warningTitle: "Ogohlantirish",
      warningBody: "Soxta chek akkaunt bloklanishiga olib keladi. Agar to'lov yozuvlarda topilmasa, Pro kirish darhol bekor qilinishi mumkin.",
      notificationTitle: "Chek yuklangandan keyin",
      notificationBody: "Telegram bot Pro kirishni faollashtiradi va sizni SATTEST.UZ ga qaytaradi. Faollashish odatda 60 soniyagacha davom etadi.",
      telegramCta: "Chekni Telegramga yuklash",
      close: "To'lov QR kodini yopish",
      qrAlt: "Pro subscription to'lov QR kodi"
    },
    restart: "Bepul diagnostikani qayta topshirish",
    missing: "Diagnostika natijalari topilmadi. Bepul diagnostikani qaytadan boshlang."
  }
};

export default function FreeDiagnosticResultsPage() {
  const { language } = useLanguage();
  const copy = resultCopy[language];
  const [stored, setStored] = useState<StoredFreeDiagnostic | null>(null);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

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
    if (result) void trackProLockView("diagnostic_lock");
  }, [result]);

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
      userTelegramId: window.localStorage.getItem(telegramDiagnosticUserKey),
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
  const lockedWeakCount = Math.max(0, Math.max(result.missedQuestions.length, result.weakAreas.length) - 1);

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
          <DiagnosticProLockCard language={language} lockedCount={lockedWeakCount} />
        </RevealSection>
      </section>
    </main>
  );
}

function DiagnosticProLockCard({ language, lockedCount }: { language: keyof typeof resultCopy; lockedCount: number }) {
  const href = `/pricing?lang=${language}&plan=pro&from=diagnostic_lock`;
  return (
    <section className="mt-8 rounded-xl border border-[#FFD700]/35 bg-black/55 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.38)] md:p-7">
      <div className="mx-auto max-w-3xl text-white">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">🔒</span>
          <h2 className="text-3xl font-black leading-tight text-[#FFD700]">Pro tahlil ochiladi</h2>
        </div>

        <p className="mt-5 text-2xl font-semibold leading-9">
          Birinchi tahlilni ko'rdingiz. Qolgan {lockedCount || 1} ta zaif mavzu va 30-kunlik rejangiz Pro'da kutmoqda.
        </p>

        <div className="mt-5 grid gap-3 text-base font-semibold leading-7 text-white/72">
          <p>✅ Qolgan zaif mavzularning to'liq thinking process tahlili</p>
          <p>✅ Evidence va why-wrong breakdown</p>
          <p>✅ 30-kunlik shaxsiy o'quv reja</p>
        </div>

        <Link
          className="mt-7 flex min-h-14 w-full items-center justify-center rounded-xl bg-[#FFD700] px-5 text-center text-lg font-black text-black transition hover:bg-white"
          href={href}
        >
          Pro Olish — 300,000 UZS/oy →
        </Link>
      </div>
    </section>
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
