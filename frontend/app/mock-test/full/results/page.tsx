"use client";

import { ArrowRight, Check, CheckCircle2, Lock, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSubscriptionStatus, getToken } from "@/lib/api";
import { FULL_MOCK_RESULTS_KEY, safeReadJson, type FullMockResult } from "@/lib/full-mock-test";
import { pick, useLanguage, type Language } from "@/lib/i18n";

const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "SATTESTUZBot";
const telegramBotUrl = `https://t.me/${telegramBotUsername}?start=pro`;
const paynetQrPayload =
  "00020101021140440012qr-online.uz01186qz7uqn60TiFsWDuxO0202115204531153038605802UZ5910AO'PAYNET'6008Tashkent610610002164280002uz0106PAYNET0208Toshkent80520012qr-online.uz03097120207070419marketing@paynet.uz630453C8";
const paynetQrImage = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(paynetQrPayload)}`;

const resultsCopy: Record<Language, {
  missingTitle: string;
  missingBody: string;
  missingCta: string;
  scoreLabel: string;
  channelLine: string;
  trapsTitle: string;
  curriculumCta: string;
  completedTitle: string;
  completedBody: string;
  lockedScoreLabel: string;
  unlockScoreCta: string;
  weakAreas: string;
  locked: string;
  mistakeExample: string;
  yourAnswer: string;
  correctAnswer: string;
  perfectFallback: string;
  paywallHeadline: string;
  unlocks: string[];
  monthlyPlan: string;
  threeMonthPlan: string;
  monthlyPrice: string;
  threeMonthPrice: string;
  bestValue: string;
  scanLine: string;
  paidCta: string;
  instructionsTitle: string;
  instructions: string[];
  directLine: string;
  urgency: string;
  checking: string;
  qrMonthlyAlt: string;
  qrThreeMonthAlt: string;
  noAnswer: string;
}> = {
  en: {
    missingTitle: "Result not found",
    missingBody: "Complete the full mock test first. Your progress will be saved in this browser.",
    missingCta: "Start full test",
    scoreLabel: "Your SAT score",
    channelLine: "Yangi SAT materiallari va foydali maslahatlar uchun: @sattestuz",
    trapsTitle: "Trap types to fix",
    curriculumCta: "Open Pro Curriculum",
    completedTitle: "Test completed. 98 of 98 questions.",
    completedBody: "You completed a full Digital SAT test in the Bluebook format.",
    lockedScoreLabel: "Your result",
    unlockScoreCta: "Open result",
    weakAreas: "Your weak areas",
    locked: "Locked",
    mistakeExample: "Mistake review sample",
    yourAnswer: "Your answer",
    correctAnswer: "Correct answer",
    perfectFallback: "You answered everything correctly in this browser result. Full analysis unlocks after payment.",
    paywallHeadline: "You completed the full SAT test. Your plan is ready. Open your result.",
    unlocks: [
      "Your exact SAT score (400-1600)",
      "R&W and Math section breakdown",
      "Analysis of every question",
      "Weak topics with percentages",
      "Trap review for every mistake",
      "30-day plan from your mistakes",
      "Unlimited mock tests",
    ],
    monthlyPlan: "Pro · 1 month",
    threeMonthPlan: "Pro · 3 months",
    monthlyPrice: "200,000 UZS",
    threeMonthPrice: "600,000 UZS",
    bestValue: "Best value",
    scanLine: "Scan → Pay → Get access",
    paidCta: "Paid — send receipt to",
    instructionsTitle: "How to get access:",
    instructions: [
      "Scan the QR code above",
      "Pay through Paynet / Click / Payme",
      `Press the button above and send the payment screenshot to @${telegramBotUsername} with your registration email`,
      "Access opens automatically within 60 seconds",
    ],
    directLine: "Or write directly: @FounderSATTESTUZ",
    urgency: "Your results are saved for 48 hours. After that, you need to take the test again.",
    checking: "Checking Pro status...",
    qrMonthlyAlt: "Paynet QR payment 200,000 UZS",
    qrThreeMonthAlt: "Paynet QR payment 600,000 UZS",
    noAnswer: "No answer",
  },
  ru: {
    missingTitle: "Результат не найден",
    missingBody: "Сначала завершите полный mock test. Ваш прогресс сохранится в этом браузере.",
    missingCta: "Начать полный тест",
    scoreLabel: "Ваш результат SAT",
    channelLine: "Yangi SAT materiallari va foydali maslahatlar uchun: @sattestuz",
    trapsTitle: "Ловушки, которые нужно исправить",
    curriculumCta: "Открыть Pro Curriculum",
    completedTitle: "Тест завершён. 98 из 98 вопросов.",
    completedBody: "Вы прошли полный Digital SAT тест в формате Bluebook.",
    lockedScoreLabel: "Ваш результат",
    unlockScoreCta: "Открыть результат",
    weakAreas: "Ваши слабые места",
    locked: "Закрыто",
    mistakeExample: "Пример разбора ошибки",
    yourAnswer: "Ваш ответ",
    correctAnswer: "Правильный ответ",
    perfectFallback: "В этом результате нет ошибок. Полный анализ откроется после оплаты.",
    paywallHeadline: "Вы прошли полный SAT тест. Ваш план готов. Откройте результат.",
    unlocks: [
      "Ваш точный балл SAT (400-1600)",
      "Разбивка по секциям R&W и Math",
      "Анализ каждого вопроса",
      "Слабые темы с процентами",
      "Разбор ловушек для каждой ошибки",
      "30-дневный план из ваших ошибок",
      "Безлимитные mock тесты",
    ],
    monthlyPlan: "Pro · 1 месяц",
    threeMonthPlan: "Pro · 3 месяца",
    monthlyPrice: "200,000 сум",
    threeMonthPrice: "600,000 сум",
    bestValue: "Лучшая ценность",
    scanLine: "Отсканируй → Оплати → Получи доступ",
    paidCta: "Оплатил — отправить чек в",
    instructionsTitle: "Как получить доступ:",
    instructions: [
      "Отсканируй QR код выше",
      "Оплати через Paynet / Click / Payme",
      `Нажми кнопку выше и отправь скриншот оплаты боту @${telegramBotUsername} с email регистрации`,
      "Доступ откроется автоматически в течение 60 секунд",
    ],
    directLine: "Или напиши напрямую: @FounderSATTESTUZ",
    urgency: "Ваши результаты сохранены 48 часов. После этого тест нужно пройти заново.",
    checking: "Проверяем Pro статус...",
    qrMonthlyAlt: "Paynet QR оплата 200,000 сум",
    qrThreeMonthAlt: "Paynet QR оплата 600,000 сум",
    noAnswer: "Нет ответа",
  },
  uz: {
    missingTitle: "Natija topilmadi",
    missingBody: "Avval to'liq mock testni yakunlang. Progressingiz shu brauzerda saqlanadi.",
    missingCta: "To'liq testni boshlash",
    scoreLabel: "SAT natijangiz",
    channelLine: "Yangi SAT materiallari va foydali maslahatlar uchun: @sattestuz",
    trapsTitle: "Tuzatish kerak bo'lgan xato tuzoqlari",
    curriculumCta: "Pro Curriculumni ochish",
    completedTitle: "Test yakunlandi. 98 ta savoldan 98 tasi bajarildi.",
    completedBody: "Siz Bluebook formatidagi to'liq Digital SAT testini tugatdingiz.",
    lockedScoreLabel: "Natijangiz",
    unlockScoreCta: "Natijani ochish",
    weakAreas: "Sizning zaif mavzularingiz",
    locked: "Yopiq",
    mistakeExample: "Xato tahlili namunasi",
    yourAnswer: "Sizning javobingiz",
    correctAnswer: "To'g'ri javob",
    perfectFallback: "Bu brauzerdagi natijada xatolar yo'q. To'liq tahlil to'lovdan keyin ochiladi.",
    paywallHeadline: "Siz to'liq SAT testini tugatdingiz. Shaxsiy rejangiz tayyor. Natijani oching.",
    unlocks: [
      "Aniq SAT balingiz (400-1600)",
      "R&W va Math bo'yicha bo'lim tahlili",
      "Har bir savol bo'yicha tahlil",
      "Zaif mavzular foizlar bilan",
      "Har bir xato uchun tuzoq tahlili",
      "Xatolaringiz asosida 30 kunlik reja",
      "Cheksiz mock testlar",
    ],
    monthlyPlan: "Pro · 1 oy",
    threeMonthPlan: "Pro · 3 oy",
    monthlyPrice: "200,000 so'm",
    threeMonthPrice: "600,000 so'm",
    bestValue: "Eng foydali",
    scanLine: "Skaner qiling → To'lang → Kirish oling",
    paidCta: "To'ladim — chekni yuborish",
    instructionsTitle: "Qanday kirish olinadi:",
    instructions: [
      "Yuqoridagi QR kodni skaner qiling",
      "Paynet / Click / Payme orqali to'lang",
      `Yuqoridagi tugmani bosing va to'lov skrinshotini ro'yxatdan o'tgan emailingiz bilan @${telegramBotUsername} botiga yuboring`,
      "Kirish 60 soniya ichida avtomatik ochiladi",
    ],
    directLine: "Yoki to'g'ridan-to'g'ri yozing: @FounderSATTESTUZ",
    urgency: "Natijalaringiz 48 soat saqlanadi. Shundan keyin testni qayta topshirish kerak.",
    checking: "Pro status tekshirilmoqda...",
    qrMonthlyAlt: "Paynet QR to'lov 200,000 so'm",
    qrThreeMonthAlt: "Paynet QR to'lov 600,000 so'm",
    noAnswer: "Javob yo'q",
  },
};

function LockedBlocks() {
  return <span aria-label="locked score" className="tracking-[0.12em]">████</span>;
}

function QrImage({ alt }: { alt: string }) {
  return (
    <div className="grid min-h-[260px] place-items-center border border-white/15 bg-white p-4">
      <img className="h-[250px] w-[250px] object-contain" src={paynetQrImage} alt={alt} />
    </div>
  );
}

export default function FullMockResultsPage() {
  const { language } = useLanguage();
  const copy = pick(resultsCopy, language);
  const [result, setResult] = useState<FullMockResult | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [checkingPro, setCheckingPro] = useState(false);

  useEffect(() => {
    const stored = safeReadJson<FullMockResult>(FULL_MOCK_RESULTS_KEY);
    setResult(stored);
  }, []);

  async function unlockWithPro() {
    if (!getToken()) {
      window.location.href = `/login?next=${encodeURIComponent("/mock-test/full/results")}`;
      return;
    }
    setCheckingPro(true);
    try {
      const status = await getSubscriptionStatus();
      if (status.has_active_subscription) {
        setUnlocked(true);
        return;
      }
      document.getElementById("pay")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      document.getElementById("pay")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      setCheckingPro(false);
    }
  }

  const firstWrong = useMemo(() => result?.answers.find((answer) => !answer.isCorrect), [result]);
  const bars = result?.topicAccuracy.slice(0, 4) ?? [];

  if (!result) {
    return (
      <main className="sat-lux-page min-h-screen px-6 py-16 text-white">
        <section className="mx-auto max-w-3xl border border-white/15 bg-black/30 p-8 text-center">
          <Lock className="mx-auto text-[#b9f3cc]" size={42} />
          <h1 className="mt-4 text-4xl font-light">{copy.missingTitle}</h1>
          <p className="mt-3 text-white/65">{copy.missingBody}</p>
          <Link className="mt-8 inline-flex items-center gap-3 bg-[#b9f3cc] px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-black" href="/sat-test">
            {copy.missingCta} <ArrowRight size={18} />
          </Link>
        </section>
      </main>
    );
  }

  if (unlocked) {
    return (
      <main className="sat-lux-page min-h-screen px-5 py-14 text-white">
        <section className="mx-auto max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#b9f3cc]">{copy.scoreLabel}</p>
          <h1 className="mt-4 text-6xl font-black sm:text-8xl">{result.totalScore}</h1>
          <a className="mt-4 inline-flex text-sm font-semibold text-[#b9f3cc] underline-offset-4 hover:underline" href="https://t.me/sattestuz" target="_blank" rel="noreferrer">
            {copy.channelLine}
          </a>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="border border-white/15 bg-white/[0.04] p-6">
              <p className="text-white/55">R&W</p>
              <p className="text-4xl font-black">{result.rwScore}</p>
            </div>
            <div className="border border-white/15 bg-white/[0.04] p-6">
              <p className="text-white/55">Math</p>
              <p className="text-4xl font-black">{result.mathScore}</p>
            </div>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {result.topicAccuracy.map((topic) => (
              <article className="border border-white/15 bg-white/[0.04] p-5" key={topic.topic}>
                <div className="flex justify-between gap-4">
                  <h2 className="text-xl font-bold">{topic.topic}</h2>
                  <span className="font-black">{topic.percent}%</span>
                </div>
                <div className="mt-4 h-2 bg-white/10">
                  <div className="h-full bg-[#b9f3cc]" style={{ width: `${topic.percent}%` }} />
                </div>
                <p className="mt-3 text-sm text-white/55">{topic.correct}/{topic.total} correct</p>
              </article>
            ))}
          </div>
          <div className="mt-10 border border-white/15 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-light">{copy.trapsTitle}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {result.trapTypes.map((trap) => (
                <span className="border border-white/15 px-3 py-2 text-sm text-white/70" key={trap}>{trap}</span>
              ))}
            </div>
          </div>
          <Link className="mt-8 inline-flex items-center gap-3 bg-[#b9f3cc] px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-black" href="/my-1400">
            {copy.curriculumCta} <ArrowRight size={18} />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="sat-lux-page min-h-screen px-5 py-14 text-white">
      <section className="mx-auto max-w-6xl space-y-10">
        <header className="border border-white/15 bg-black/30 p-7 text-center">
          <CheckCircle2 className="mx-auto text-[#7bf2a5]" size={56} />
          <h1 className="mt-4 text-4xl font-light">{copy.completedTitle}</h1>
          <p className="mt-3 text-lg text-white/65">{copy.completedBody}</p>
        </header>

        <section className="border border-white/15 bg-white/[0.04] p-7 text-center">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#d8d09b]">{copy.lockedScoreLabel}</p>
          <p className="mt-5 text-7xl font-black"><LockedBlocks /></p>
          <p className="mt-4 text-2xl text-white/60">R&W: <LockedBlocks /> · Math: <LockedBlocks /></p>
          <button className="mt-8 inline-flex items-center gap-3 bg-[#b9f3cc] px-7 py-4 text-xs font-black uppercase tracking-[0.18em] text-black" onClick={unlockWithPro} type="button">
            {copy.unlockScoreCta} <ArrowRight size={18} />
          </button>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="relative overflow-hidden border border-white/15 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-light">{copy.weakAreas}</h2>
            <div className="mt-6 space-y-4 blur-[6px]">
              {bars.map((topic) => (
                <div key={topic.topic}>
                  <div className="flex justify-between text-sm">
                    <span>{topic.topic}</span>
                    <span>{topic.percent}%</span>
                  </div>
                  <div className="mt-2 h-3 bg-white/10">
                    <div className="h-full bg-[#b9f3cc]" style={{ width: `${topic.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute inset-0 grid place-items-center bg-black/25">
              <div className="inline-flex items-center gap-2 border border-white/20 bg-black/70 px-4 py-3 text-sm font-black uppercase tracking-[0.16em]">
                <Lock size={18} /> {copy.locked}
              </div>
            </div>
          </article>

          <article className="border border-white/15 bg-white/[0.04] p-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d8d09b]">{copy.mistakeExample}</p>
            {firstWrong ? (
              <>
                <h2 className="mt-4 text-2xl font-light">{firstWrong.question.prompt}</h2>
                <p className="mt-4 text-white/60">{firstWrong.question.passage}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="border border-red-300/25 bg-red-500/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-red-200">{copy.yourAnswer}</p>
                    <p className="mt-2 text-lg">{firstWrong.selectedAnswer ?? copy.noAnswer}</p>
                  </div>
                  <div className="border border-[#b9f3cc]/35 bg-[#b9f3cc]/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#b9f3cc]">{copy.correctAnswer}</p>
                    <p className="mt-2 text-lg">{firstWrong.correctAnswer}</p>
                  </div>
                </div>
                <p className="mt-5 text-white/70">{firstWrong.explanation}</p>
              </>
            ) : (
              <p className="mt-4 text-white/65">{copy.perfectFallback}</p>
            )}
          </article>
        </section>

        <section className="border border-[#b9f3cc]/30 bg-[#b9f3cc]/10 p-7" id="pay">
          <h2 className="max-w-3xl text-4xl font-light">{copy.paywallHeadline}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {copy.unlocks.map((item) => (
              <p className="flex items-center gap-3 text-white/78" key={item}>
                <Check className="text-[#b9f3cc]" size={18} /> {item}
              </p>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="border border-white/15 bg-white/[0.04] p-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">{copy.monthlyPlan}</p>
            <h3 className="mt-3 text-4xl font-black">{copy.monthlyPrice}</h3>
            <div className="mt-6">
              <QrImage alt={copy.qrMonthlyAlt} />
            </div>
            <p className="mt-4 text-center text-white/70">{copy.scanLine}</p>
            <a className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-3 border border-[#b9f3cc]/35 bg-[#b9f3cc] px-5 text-center text-[11px] font-black uppercase tracking-[0.18em] text-black" href={telegramBotUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={18} /> {copy.paidCta} @{telegramBotUsername}
            </a>
          </article>

          <article className="relative border border-[#d8d09b]/45 bg-white/[0.06] p-6 shadow-[0_0_80px_rgba(216,208,155,0.08)]">
            <span className="absolute right-5 top-5 border border-[#d8d09b]/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#d8d09b]">{copy.bestValue}</span>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">{copy.threeMonthPlan}</p>
            <h3 className="mt-3 text-4xl font-black">{copy.threeMonthPrice}</h3>
            <div className="mt-6">
              <QrImage alt={copy.qrThreeMonthAlt} />
            </div>
            <p className="mt-4 text-center text-white/70">{copy.scanLine}</p>
            <a className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-3 border border-[#b9f3cc]/35 bg-[#b9f3cc] px-5 text-center text-[11px] font-black uppercase tracking-[0.18em] text-black" href={telegramBotUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={18} /> {copy.paidCta} @{telegramBotUsername}
            </a>
          </article>
        </section>

        <section className="border border-white/15 bg-white/[0.04] p-7">
          <h2 className="text-3xl font-light">{copy.instructionsTitle}</h2>
          <ol className="mt-5 space-y-3 text-lg text-white/72">
            {copy.instructions.map((instruction, index) => (
              <li key={instruction}>{index + 1}. {instruction}</li>
            ))}
          </ol>
          <p className="mt-5 text-white/65">{copy.directLine}</p>
        </section>

        <p className="border border-white/15 bg-black/35 p-5 text-center text-lg text-white/70">
          {copy.urgency}
        </p>
        {checkingPro ? <p className="text-center text-sm text-white/45">{copy.checking}</p> : null}
      </section>
    </main>
  );
}
