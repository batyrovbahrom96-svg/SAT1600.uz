"use client";

import { ArrowRight, Check, CheckCircle2, Lock, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSubscriptionStatus, getToken } from "@/lib/api";
import { FULL_MOCK_RESULTS_KEY, safeReadJson, safeWriteJson, type FullMockResult } from "@/lib/full-mock-test";

const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "SATTESTUZBot";
const telegramBotUrl = `https://t.me/${telegramBotUsername}?start=pro`;
const paynetQrPayload =
  "00020101021140440012qr-online.uz01186qz7uqn60TiFsWDuxO0202115204531153038605802UZ5910AO'PAYNET'6008Tashkent610610002164280002uz0106PAYNET0208Toshkent80520012qr-online.uz03097120207070419marketing@paynet.uz630453C8";
const paynetQrImage = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(paynetQrPayload)}`;

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
  const [result, setResult] = useState<FullMockResult | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [checkingPro, setCheckingPro] = useState(true);

  useEffect(() => {
    const stored = safeReadJson<FullMockResult>(FULL_MOCK_RESULTS_KEY);
    setResult(stored);

    const query = new URLSearchParams(window.location.search);
    const wantsUnlock = query.get("unlocked") === "true";

    async function check() {
      if (!stored) {
        setCheckingPro(false);
        return;
      }
      if (stored.paid) {
        setUnlocked(true);
        setCheckingPro(false);
        return;
      }
      if (!getToken()) {
        setUnlocked(false);
        setCheckingPro(false);
        return;
      }
      try {
        const status = await getSubscriptionStatus();
        const isPro = Boolean(status.has_active_subscription);
        if (isPro && wantsUnlock) {
          const next = { ...stored, paid: true };
          safeWriteJson(FULL_MOCK_RESULTS_KEY, next);
          setResult(next);
        }
        setUnlocked(isPro);
      } catch {
        setUnlocked(false);
      } finally {
        setCheckingPro(false);
      }
    }

    check();
  }, []);

  const firstWrong = useMemo(() => result?.answers.find((answer) => !answer.isCorrect), [result]);
  const bars = result?.topicAccuracy.slice(0, 4) ?? [];

  if (!result) {
    return (
      <main className="sat-lux-page min-h-screen px-6 py-16 text-white">
        <section className="mx-auto max-w-3xl border border-white/15 bg-black/30 p-8 text-center">
          <Lock className="mx-auto text-[#b9f3cc]" size={42} />
          <h1 className="mt-4 text-4xl font-light">Result not found</h1>
          <p className="mt-3 text-white/65">Complete the full mock test first. Your progress will be saved in this browser.</p>
          <Link className="mt-8 inline-flex items-center gap-3 bg-[#b9f3cc] px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-black" href="/sat-test">
            Start full test <ArrowRight size={18} />
          </Link>
        </section>
      </main>
    );
  }

  if (unlocked) {
    return (
      <main className="sat-lux-page min-h-screen px-5 py-14 text-white">
        <section className="mx-auto max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#b9f3cc]">Ваш результат SAT</p>
          <h1 className="mt-4 text-6xl font-black sm:text-8xl">{result.totalScore}</h1>
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
            <h2 className="text-2xl font-light">Trap types to fix</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {result.trapTypes.map((trap) => (
                <span className="border border-white/15 px-3 py-2 text-sm text-white/70" key={trap}>{trap}</span>
              ))}
            </div>
          </div>
          <Link className="mt-8 inline-flex items-center gap-3 bg-[#b9f3cc] px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-black" href="/my-1400">
            Open Pro Curriculum <ArrowRight size={18} />
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
          <h1 className="mt-4 text-4xl font-light">Тест завершён. 98 из 98 вопросов.</h1>
          <p className="mt-3 text-lg text-white/65">Вы прошли полный Digital SAT тест в формате Bluebook.</p>
        </header>

        <section className="border border-white/15 bg-white/[0.04] p-7 text-center">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#d8d09b]">Ваш результат</p>
          <p className="mt-5 text-7xl font-black"><LockedBlocks /></p>
          <p className="mt-4 text-2xl text-white/60">R&W: <LockedBlocks /> · Math: <LockedBlocks /></p>
          <a className="mt-8 inline-flex items-center gap-3 bg-[#b9f3cc] px-7 py-4 text-xs font-black uppercase tracking-[0.18em] text-black" href="#pay">
            Открыть результат <ArrowRight size={18} />
          </a>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="relative overflow-hidden border border-white/15 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-light">Ваши слабые места</h2>
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
                <Lock size={18} /> Locked
              </div>
            </div>
          </article>

          <article className="border border-white/15 bg-white/[0.04] p-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d8d09b]">Пример разбора ошибки</p>
            {firstWrong ? (
              <>
                <h2 className="mt-4 text-2xl font-light">{firstWrong.question.prompt}</h2>
                <p className="mt-4 text-white/60">{firstWrong.question.passage}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="border border-red-300/25 bg-red-500/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-red-200">Ваш ответ</p>
                    <p className="mt-2 text-lg">{firstWrong.selectedAnswer ?? "No answer"}</p>
                  </div>
                  <div className="border border-[#b9f3cc]/35 bg-[#b9f3cc]/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#b9f3cc]">Правильный ответ</p>
                    <p className="mt-2 text-lg">{firstWrong.correctAnswer}</p>
                  </div>
                </div>
                <p className="mt-5 text-white/70">{firstWrong.explanation}</p>
              </>
            ) : (
              <p className="mt-4 text-white/65">You answered everything correctly in this browser result. Full analysis unlocks after payment.</p>
            )}
          </article>
        </section>

        <section className="border border-[#b9f3cc]/30 bg-[#b9f3cc]/10 p-7" id="pay">
          <h2 className="max-w-3xl text-4xl font-light">Вы прошли полный SAT тест. Ваш план готов. Откройте результат.</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              "Ваш точный балл SAT (400-1600)",
              "Разбивка по секциям R&W и Math",
              "Анализ каждого вопроса",
              "Слабые темы с процентами",
              "Разбор ловушек для каждой ошибки",
              "30-дневный план из ваших ошибок",
              "Безлимитные mock тесты",
            ].map((item) => (
              <p className="flex items-center gap-3 text-white/78" key={item}>
                <Check className="text-[#b9f3cc]" size={18} /> {item}
              </p>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="border border-white/15 bg-white/[0.04] p-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">Pro · 1 месяц</p>
            <h3 className="mt-3 text-4xl font-black">200,000 сум</h3>
            <div className="mt-6">
              <QrImage alt="Paynet QR оплата 200,000 сум" />
            </div>
            <p className="mt-4 text-center text-white/70">Отсканируй → Оплати → Получи доступ</p>
            <a className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-3 border border-[#b9f3cc]/35 bg-[#b9f3cc] px-5 text-center text-[11px] font-black uppercase tracking-[0.18em] text-black" href={telegramBotUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={18} /> Оплатил — отправить чек в @{telegramBotUsername}
            </a>
          </article>

          <article className="relative border border-[#d8d09b]/45 bg-white/[0.06] p-6 shadow-[0_0_80px_rgba(216,208,155,0.08)]">
            <span className="absolute right-5 top-5 border border-[#d8d09b]/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#d8d09b]">Лучшая ценность</span>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">Pro · 3 месяца</p>
            <h3 className="mt-3 text-4xl font-black">600,000 сум</h3>
            <div className="mt-6">
              <QrImage alt="Paynet QR оплата 600,000 сум" />
            </div>
            <p className="mt-4 text-center text-white/70">Отсканируй → Оплати → Получи доступ</p>
            <a className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-3 border border-[#b9f3cc]/35 bg-[#b9f3cc] px-5 text-center text-[11px] font-black uppercase tracking-[0.18em] text-black" href={telegramBotUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={18} /> Оплатил — отправить чек в @{telegramBotUsername}
            </a>
          </article>
        </section>

        <section className="border border-white/15 bg-white/[0.04] p-7">
          <h2 className="text-3xl font-light">Как получить доступ:</h2>
          <ol className="mt-5 space-y-3 text-lg text-white/72">
            <li>1. Отсканируй QR код выше</li>
            <li>2. Оплати через Paynet / Click / Payme</li>
            <li>3. Нажми кнопку выше и отправь скриншот оплаты боту: @{telegramBotUsername} с email регистрации</li>
            <li>4. Доступ откроется автоматически в течение 60 секунд</li>
          </ol>
          <p className="mt-5 text-white/65">Или напиши напрямую: @FounderSATTESTUZ</p>
        </section>

        <p className="border border-white/15 bg-black/35 p-5 text-center text-lg text-white/70">
          Ваши результаты сохранены 48 часов. После этого тест нужно пройти заново.
        </p>
        {checkingPro ? <p className="text-center text-sm text-white/45">Checking Pro status...</p> : null}
      </section>
    </main>
  );
}
