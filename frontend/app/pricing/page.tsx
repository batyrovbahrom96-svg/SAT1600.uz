"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, X } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumText } from "@/components/PremiumText";
import { useLanguage, type Language } from "@/lib/i18n";
import { MONTHLY_PRICE_LABEL, THREE_MONTH_PRICE_3_MONTHS } from "@/lib/pricing";

const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "SATTESTUZBot";
const paynetQrPayload =
  "00020101021140440012qr-online.uz01186qz7uqn60TiFsWDuxO0202115204531153038605802UZ5910AO'PAYNET'6008Tashkent610610002164280002uz0106PAYNET0208Toshkent80520012qr-online.uz03097120207070419marketing@paynet.uz630453C8";
const paynetQrImage = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(paynetQrPayload)}`;

function getPlanFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("plan") === "pro";
}

const pricingCopy: Record<
  Language,
  {
    heroEyebrow: string;
    heroTitle: string;
    heroBody: string;
    samePrice: string;
    features: string[];
    cta: string;
    socialProof: string;
    modalTitle: string;
    modalBody: string;
    qrAlt: string;
    instructions: string[];
    receiptCta: string;
    close: string;
  }
> = {
  en: {
    heroEyebrow: "SATTEST.UZ pricing",
    heroTitle: "One plan. Full SAT growth system.",
    heroBody: "Pro opens the complete SATTEST.UZ platform: mock tests, diagnostics, personal planning, practice, and progress tracking.",
    samePrice: "Same monthly price—paid once",
    features: [
      "Full 98-question Mock Test",
      "Diagnostic results unlocked",
      "Personal 30-day study plan",
      "Weak area analysis",
      "Mistake pattern tracking",
      "Unlimited practice tests",
      "Weekly live webinar access",
      "Progress tracking",
      "Priority support",
    ],
    cta: "🔑 Get Pro Now →",
    socialProof: "Join 47+ students already on their path to 1400+",
    modalTitle: "Activate Pro",
    modalBody: "Scan the QR, pay for Pro, then send your receipt to the Telegram bot with your registration email.",
    qrAlt: "SATTEST.UZ Pro Paynet payment QR",
    instructions: [
      "Pay by Paynet QR, Click, Payme, card, or transfer.",
      `Send the payment screenshot to @${telegramBotUsername}.`,
      "Write your registration email in the message.",
      "Pro access opens automatically after activation.",
    ],
    receiptCta: "Send receipt to bot",
    close: "Close Pro payment",
  },
  ru: {
    heroEyebrow: "Цены SATTEST.UZ",
    heroTitle: "Один план. Полная система роста SAT.",
    heroBody: "Pro открывает всю платформу SATTEST.UZ: mock tests, диагностику, личный план, практику и отслеживание прогресса.",
    samePrice: "Та же месячная цена — одним платежом",
    features: [
      "Полный Mock Test из 98 вопросов",
      "Открытые результаты диагностики",
      "Личный план обучения на 30 дней",
      "Анализ слабых мест",
      "Отслеживание типов ошибок",
      "Безлимитные практические тесты",
      "Доступ к еженедельному live webinar",
      "Отслеживание прогресса",
      "Приоритетная поддержка",
    ],
    cta: "🔑 Открыть Pro →",
    socialProof: "47+ учеников уже идут к 1400+",
    modalTitle: "Активировать Pro",
    modalBody: "Отсканируйте QR, оплатите Pro и отправьте чек в Telegram-бот вместе с email регистрации.",
    qrAlt: "QR-код оплаты SATTEST.UZ Pro Paynet",
    instructions: [
      "Оплатите через Paynet QR, Click, Payme, карту или перевод.",
      `Отправьте скриншот оплаты в @${telegramBotUsername}.`,
      "Напишите email регистрации в сообщении.",
      "Pro-доступ откроется автоматически после активации.",
    ],
    receiptCta: "Отправить чек в бот",
    close: "Закрыть оплату Pro",
  },
  uz: {
    heroEyebrow: "SATTEST.UZ narxlari",
    heroTitle: "Bitta reja. To'liq SAT o'sish tizimi.",
    heroBody: "Pro SATTEST.UZ platformasini to'liq ochadi: mock testlar, diagnostika, shaxsiy reja, mashqlar va progress kuzatuvi.",
    samePrice: "Oylik narx bir xil — bir martada to'lanadi",
    features: [
      "To'liq 98 savollik Mock Test",
      "Diagnostika natijalari ochiladi",
      "30 kunlik shaxsiy o'quv reja",
      "Zaif mavzular tahlili",
      "Xato naqshlarini kuzatish",
      "Cheksiz mashq testlari",
      "Haftalik live webinar kirishi",
      "Progress kuzatuvi",
      "Priority support",
    ],
    cta: "🔑 Pro ni hozir ochish →",
    socialProof: "47+ o'quvchi allaqachon 1400+ yo'lida",
    modalTitle: "Pro ni faollashtirish",
    modalBody: "QR kodni skaner qiling, Pro uchun to'lang va chekni ro'yxatdan o'tgan emailingiz bilan Telegram botga yuboring.",
    qrAlt: "SATTEST.UZ Pro Paynet to'lov QR kodi",
    instructions: [
      "Paynet QR, Click, Payme, karta yoki o'tkazma orqali to'lang.",
      `To'lov skrinshotini @${telegramBotUsername} ga yuboring.`,
      "Xabarda ro'yxatdan o'tgan emailingizni yozing.",
      "Pro kirish faollashtirilgandan keyin avtomatik ochiladi.",
    ],
    receiptCta: "Chekni botga yuborish",
    close: "Pro to'lovini yopish",
  },
};

export default function PricingPage() {
  const { language } = useLanguage();
  const copy = pricingCopy[language];
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    setShowPayment(getPlanFromUrl());
  }, []);

  return (
    <main className="sat-lux-page min-h-screen text-white">
      <LuxuryNavbar />

      <section className="relative overflow-hidden border-b border-white/10 px-5 py-14 md:px-8 lg:py-20">
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute left-[12%] top-[-16rem] h-[520px] w-[520px] rounded-full bg-[#FFD700]/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_6%,rgba(255,215,0,0.16),transparent_32%),linear-gradient(90deg,rgba(0,0,0,0.96),rgba(16,17,18,0.9))]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#FFD700]/75">{copy.heroEyebrow}</p>
          <PremiumText
            as="h1"
            className="mt-6 max-w-5xl bg-gradient-to-br from-white via-white to-zinc-500 bg-clip-text text-5xl font-light leading-none text-transparent md:text-7xl"
            variant="hero"
          >
            {copy.heroTitle}
          </PremiumText>
          <p className="mt-7 max-w-3xl text-lg font-light leading-8 text-white/58">{copy.heroBody}</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12 md:px-8">
        <article className="relative overflow-hidden rounded-[8px] border border-[#FFD700]/35 bg-gradient-to-br from-zinc-950/90 via-zinc-900/92 to-black p-6 shadow-[0_36px_120px_rgba(0,0,0,0.55)] md:p-9">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,215,0,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_52%)]" />
          <div className="relative text-center">
            <p className="text-4xl font-black text-[#FFD700]">⭐ PRO</p>
            <p className="mt-6 text-4xl font-black tracking-tight text-white md:text-5xl">{MONTHLY_PRICE_LABEL}/month</p>
            <p className="mt-5 text-2xl font-semibold text-white/90 md:text-3xl">OR&nbsp; {THREE_MONTH_PRICE_3_MONTHS}</p>
            <p className="mt-2 text-sm font-semibold text-[#FFD700]/80">{copy.samePrice}</p>
          </div>

          <ul className="relative mx-auto mt-9 grid max-w-2xl gap-4 text-base leading-6 text-white/76">
            {copy.features.map((feature) => (
              <li className="flex items-start gap-3" key={feature}>
                <Check className="mt-0.5 shrink-0 text-[#FFD700]" size={20} strokeWidth={3} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="relative mt-9 text-center">
            <PremiumButton
              className="mx-auto min-w-[280px]"
              href="#payment"
              icon={<ArrowRight size={18} />}
              onClick={(event) => {
                event.preventDefault();
                setShowPayment(true);
              }}
            >
              {copy.cta}
            </PremiumButton>
            <p className="mx-auto mt-5 max-w-md text-sm font-semibold leading-6 text-[#FFD700]/85">{copy.socialProof}</p>
          </div>
        </article>
      </section>

      {showPayment && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/86 px-3 py-4 backdrop-blur-xl md:items-center md:py-6">
              <div className="relative w-full max-w-3xl rounded-[8px] border border-white/20 bg-[#101112] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.72)] md:p-8">
                <button
                  aria-label={copy.close}
                  className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/62 transition-colors hover:border-white hover:text-white"
                  onClick={() => setShowPayment(false)}
                  type="button"
                >
                  <X size={18} />
                </button>
                <div className="grid gap-6 md:grid-cols-[280px_1fr] md:items-start">
                  <div className="mx-auto w-full max-w-[240px] rounded-[8px] border border-white/14 bg-white p-3 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:max-w-none">
                    <img alt={copy.qrAlt} className="h-auto w-full" height={320} src={paynetQrImage} width={320} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[#FFD700]/75">SATTEST.UZ Pro</p>
                    <h2 className="mt-3 text-3xl font-light text-white">{copy.modalTitle}</h2>
                    <p className="mt-3 text-sm font-light leading-6 text-white/62">{copy.modalBody}</p>
                    <ul className="mt-5 grid gap-3 text-sm leading-6 text-white/70">
                      {copy.instructions.map((instruction) => (
                        <li className="flex gap-3" key={instruction}>
                          <Check className="mt-1 shrink-0 text-[#FFD700]" size={16} />
                          <span>{instruction}</span>
                        </li>
                      ))}
                    </ul>
                    <a
                      className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-[8px] bg-[#FFD700] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-white"
                      href={`https://t.me/${telegramBotUsername}?start=pro`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {copy.receiptCta} <ArrowRight size={18} />
                    </a>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </main>
  );
}
