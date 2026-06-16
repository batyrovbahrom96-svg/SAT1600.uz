"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, X } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumText } from "@/components/PremiumText";
import { useLanguage, type Language } from "@/lib/i18n";

const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "SATTESTUZBot";
const paynetQrPayload =
  "00020101021140440012qr-online.uz01186qz7uqn60TiFsWDuxO0202115204531153038605802UZ5910AO'PAYNET'6008Tashkent610610002164280002uz0106PAYNET0208Toshkent80520012qr-online.uz03097120207070419marketing@paynet.uz630453C8";
const paynetQrImage = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(paynetQrPayload)}`;

const prices = {
  pro: "200 000 UZS"
} as const;

function getPlanFromUrl(): "pro" | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("plan") === "pro" ? "pro" : null;
}

function updatePricingUrl(plan: "pro" | null) {
  const params = new URLSearchParams(window.location.search);
  if (plan) {
    params.set("plan", plan);
  } else {
    params.delete("plan");
  }
  const query = params.toString();
  window.history.replaceState(null, "", `/pricing${query ? `?${query}` : ""}`);
}

const pricingCopy: Record<
  Language,
  {
    hero: {
      eyebrow: string;
      title: string;
      body: string;
      paymentLabel: string;
      paymentTitle: string;
      paymentBody: string;
      steps: string[];
      stepLabel: string;
    };
    plans: {
      free: {
        action: string;
        description: string;
        features: string[];
        label: string;
        price: string;
        title: string;
      };
      pro: {
        action: string;
        description: string;
        features: string[];
        label: string;
        price: string;
        title: string;
      };
    };
    funnel: {
      eyebrow: string;
      title: string;
      cta: string;
    };
    modal: {
      close: string;
      selected: string;
      plan: string;
      status: string;
      ready: string;
      payTitle: string;
      payBody: string;
      qrAlt: string;
      instructions: string[];
      receiptCta: string;
      note: string;
    };
  }
> = {
  en: {
    hero: {
      eyebrow: "SAT pricing",
      title: "Tariffs and prices for serious SAT improvement.",
      body: "Choose a plan when you are ready to unlock practice, analytics, and My 1400+. If you are unsure, take the free diagnostic first.",
      paymentLabel: "For parents",
      paymentTitle: "Instant Pro access",
      paymentBody:
        "Pay by Click, Payme, Paynet, card, or transfer. Send the receipt to the Telegram bot with your registered email. Pro access opens automatically via Telegram bot — usually within 60 seconds.",
      steps: ["Pay", "Bot activates instantly", "Start"],
      stepLabel: "Step"
    },
    plans: {
      free: {
        action: "Start Free Diagnostic",
        description: "For students who want to see their real SAT level before choosing a paid route.",
        features: [
          "25-question Free Diagnostic",
          "Estimated score from 25 questions",
          "Reading/Writing and Math section scores",
          "Limited mistake preview",
          "Upgrade when the weak areas are clear"
        ],
        label: "Free plan",
        price: "0 UZS",
        title: "Free Diagnostic"
      },
      pro: {
        action: "Pay and activate",
        description: "The main plan for students who want targeted SAT practice and a visible score-growth route.",
        features: [
          "Unlimited SAT practice by Reading, Writing, and Math",
          "Full diagnostic analytics after every mock test",
          "Mistake and weakness targeting by topic",
          "Personal My 1400+ curriculum route",
          "Progress tracking for score growth"
        ],
        label: "Most useful",
        price: `${prices.pro} / month`,
        title: "SATTEST Pro"
      }
    },
    funnel: {
      eyebrow: "Main funnel",
      title: "Pay by Click, Payme, Paynet, card, or transfer. Pro access opens automatically via Telegram bot — usually within 60 seconds.",
      cta: "Choose Pro"
    },
    modal: {
      close: "Close pricing plan",
      selected: "Selected tariff",
      plan: "Plan",
      status: "Status",
      ready: "Ready",
      payTitle: "Pay by any method",
      payBody:
        "Pay by Click, Payme, Paynet, card, or transfer. Send the receipt to the SATTEST.UZ bot with your registered email. Pro access opens automatically via Telegram bot — usually within 60 seconds.",
      qrAlt: "Paynet payment QR code",
      instructions: [
        "Pay for SATTEST Pro by Paynet QR, Click, Payme, card, or transfer.",
        "Open the bot and send the receipt with caption: your-email@example.com pro.",
        "Pro access opens automatically via Telegram bot — usually within 60 seconds. Start practice."
      ],
      receiptCta: "Send receipt to bot",
      note: "Fake receipts lead to account ban. Receipts are checked against payment records and Pro can be revoked."
    }
  },
  ru: {
    hero: {
      eyebrow: "Цены SAT",
      title: "Тарифы для серьезного роста результата SAT.",
      body: "Выберите план, когда будете готовы открыть практику, аналитику и маршрут My 1400+. Если сомневаетесь, сначала пройдите бесплатную диагностику.",
      paymentLabel: "Для родителей",
      paymentTitle: "Мгновенный доступ Pro",
      paymentBody:
        "Оплатите через Click, Payme, Paynet, карту или перевод. Отправьте чек в Telegram-бот вместе с email регистрации. Доступ Pro открывается автоматически через Telegram-бота — обычно в течение 60 секунд.",
      steps: ["Оплатить", "Бот мгновенно активирует", "Начать"],
      stepLabel: "Шаг"
    },
    plans: {
      free: {
        action: "Начать диагностику",
        description: "Для учеников, которые хотят понять свой реальный уровень SAT до выбора платного маршрута.",
        features: [
          "Бесплатная диагностика из 25 вопросов",
          "Оценочный балл по 25 вопросам",
          "Баллы по чтению, письму и математике",
          "Ограниченный просмотр ошибок",
          "Переход на Pro после выявления слабых мест"
        ],
        label: "Бесплатный план",
        price: "0 UZS",
        title: "Бесплатная диагностика"
      },
      pro: {
        action: "Оплатить и активировать",
        description: "Основной план для учеников, которым нужна целевая SAT-практика и видимый маршрут роста балла.",
        features: [
          "Неограниченная SAT-практика по чтению, письму и математике",
          "Полная аналитика после каждого пробного теста",
          "Работа по слабым темам и ошибкам",
          "Личный маршрут My 1400+",
          "Отслеживание роста результата"
        ],
        label: "Самый полезный",
        price: `${prices.pro} / месяц`,
        title: "SATTEST Pro"
      }
    },
    funnel: {
      eyebrow: "Основной путь",
      title: "Оплатите через Click, Payme, Paynet, карту или перевод. Доступ Pro открывается автоматически через Telegram-бота — обычно в течение 60 секунд.",
      cta: "Выбрать Pro"
    },
    modal: {
      close: "Закрыть тариф",
      selected: "Выбранный тариф",
      plan: "План",
      status: "Статус",
      ready: "Готов",
      payTitle: "Оплата любым способом",
      payBody: "Оплатите через Click, Payme, Paynet, карту или перевод. Отправьте чек в бот SATTEST.UZ вместе с email регистрации. Доступ Pro открывается автоматически через Telegram-бота — обычно в течение 60 секунд.",
      qrAlt: "QR-код оплаты Paynet",
      instructions: [
        "Оплатите SATTEST Pro через Paynet QR, Click, Payme, карту или перевод.",
        "Откройте бот и отправьте чек с подписью: your-email@example.com pro.",
        "Доступ Pro открывается автоматически через Telegram-бота — обычно в течение 60 секунд. Начните практику."
      ],
      receiptCta: "Отправить чек в бот",
      note: "Фальшивый чек приводит к бану аккаунта. Чеки сверяются с платежными записями, а Pro может быть отозван."
    }
  },
  uz: {
    hero: {
      eyebrow: "SAT narxlari",
      title: "Jiddiy SAT o'sishi uchun tariflar va narxlar.",
      body: "Mashqlar, tahlil va My 1400+ yo'nalishini ochishga tayyor bo'lsangiz, rejani tanlang. Ishonchingiz komil bo'lmasa, avval bepul diagnostikadan o'ting.",
      paymentLabel: "Ota-onalar uchun",
      paymentTitle: "Pro darhol ochiladi",
      paymentBody:
        "Click, Payme, Paynet, karta yoki o'tkazma orqali to'lang. Chekni Telegram botga ro'yxatdan o'tgan email bilan yuboring. Pro kirish Telegram bot orqali avtomatik ochiladi — odatda 60 soniya ichida.",
      steps: ["To'lash", "Bot darhol faollashtiradi", "Boshlash"],
      stepLabel: "Qadam"
    },
    plans: {
      free: {
        action: "Bepul diagnostika",
        description: "Pullik yo'nalishni tanlashdan oldin real SAT darajasini ko'rmoqchi bo'lgan o'quvchilar uchun.",
        features: [
          "25 savollik bepul diagnostika",
          "25 savoldan taxminiy ball",
          "O'qish, yozish va matematika bo'lim ballari",
          "Cheklangan xato ko'rinishi",
          "Zaif joylar aniq bo'lganda Pro'ga o'tish"
        ],
        label: "Bepul reja",
        price: "0 UZS",
        title: "Bepul diagnostika"
      },
      pro: {
        action: "To'lash va faollashtirish",
        description: "Maqsadli SAT mashqlari va ko'rinadigan ball o'sish yo'nalishini xohlaydigan o'quvchilar uchun asosiy reja.",
        features: [
          "O'qish, yozish va matematika bo'yicha cheksiz SAT mashqlari",
          "Har bir sinov testidan keyin to'liq diagnostik tahlil",
          "Mavzu bo'yicha xato va zaifliklarni tuzatish",
          "Shaxsiy My 1400+ o'quv yo'nalishi",
          "Ball o'sishini kuzatish"
        ],
        label: "Eng foydali",
        price: `${prices.pro} / oy`,
        title: "SATTEST Pro"
      }
    },
    funnel: {
      eyebrow: "Asosiy yo'l",
      title: "Click, Payme, Paynet, karta yoki o'tkazma orqali to'lang. Pro kirish Telegram bot orqali avtomatik ochiladi — odatda 60 soniya ichida.",
      cta: "Pro tanlash"
    },
    modal: {
      close: "Tarifni yopish",
      selected: "Tanlangan tarif",
      plan: "Reja",
      status: "Holat",
      ready: "Tayyor",
      payTitle: "Istalgan usulda to'lash",
      payBody: "Click, Payme, Paynet, karta yoki o'tkazma orqali to'lang. Chekni ro'yxatdan o'tgan email bilan SATTEST.UZ botga yuboring. Pro kirish Telegram bot orqali avtomatik ochiladi — odatda 60 soniya ichida.",
      qrAlt: "Paynet to'lov QR kodi",
      instructions: [
        "SATTEST Pro uchun Paynet QR, Click, Payme, karta yoki o'tkazma orqali to'lang.",
        "Botni oching va chekni quyidagi izoh bilan yuboring: your-email@example.com pro.",
        "Pro kirish Telegram bot orqali avtomatik ochiladi — odatda 60 soniya ichida. Mashqni boshlang."
      ],
      receiptCta: "Chekni botga yuborish",
      note: "Soxta chek akkaunt bloklanishiga olib keladi. Cheklar to'lov yozuvlari bilan solishtiriladi va Pro bekor qilinishi mumkin."
    }
  }
};

type PlanAction =
  {
    href?: string;
    onClick?: () => void;
    text: string;
  };

type SelectedPlan = {
  description: string;
  label: string;
  planKey: "pro";
  price: string;
  title: string;
};

type Benefit = {
  checked: boolean;
  text: string;
};

function BenefitRow({ checked, text }: Benefit) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={[
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border",
          checked
            ? "border-white/18 bg-white text-black"
            : "border-white/10 bg-white/[0.045] text-white/42"
        ].join(" ")}
      >
        {checked ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={2.5} />}
      </span>
      <span className={checked ? "text-white/72" : "text-white/38"}>{text}</span>
    </li>
  );
}

function PriceCard({
  action,
  benefits,
  description,
  label,
  price,
  spotlight,
  title
}: {
  action: PlanAction;
  benefits: Benefit[];
  description: string;
  label: string;
  price: string;
  spotlight?: boolean;
  title: string;
}) {
  return (
    <article className={["relative h-full pricing-card-reveal", spotlight ? "is-spotlight" : ""].join(" ")}>
      <div
        className={[
          "relative flex min-h-[610px] flex-col overflow-hidden rounded-[8px] border p-6 shadow-[0_34px_110px_rgba(0,0,0,0.38)]",
          spotlight
            ? "border-white/24 bg-gradient-to-br from-zinc-950/80 via-zinc-900/86 to-zinc-800/70"
            : "border-white/12 bg-gradient-to-br from-zinc-950/50 via-zinc-900/60 to-zinc-950/86"
        ].join(" ")}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-white/[0.10] blur-3xl" />
          <div className="absolute bottom-[-9rem] left-[-8rem] h-72 w-72 rounded-full bg-white/[0.045] blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_32%,rgba(255,255,255,0.035)_72%,transparent)]" />
        </div>

        <div className="relative flex flex-col items-center border-b border-white/10 pb-7 text-center">
          <span className="mb-6 inline-flex min-h-9 items-center rounded-full border border-white/10 bg-white/[0.045] px-4 text-[10px] font-black uppercase tracking-[0.28em] text-white/58">
            {label}
          </span>
          <h2 className="text-2xl font-medium text-white md:text-3xl">{title}</h2>
          <span className="mt-5 bg-gradient-to-br from-white via-white to-zinc-500 bg-clip-text text-4xl font-semibold tracking-tight text-transparent md:text-5xl">
            {price}
          </span>
          <p className="mt-5 max-w-md text-sm font-light leading-6 text-white/56 md:text-base md:leading-7">
            {description}
          </p>
        </div>

        <ul className="relative grid gap-4 py-9 text-sm leading-6">
          {benefits.map((benefit) => (
            <BenefitRow key={`${benefit.checked}-${benefit.text}`} {...benefit} />
          ))}
        </ul>

        <PremiumButton
          className="mt-auto w-full"
          href={action.href}
          icon={<ArrowRight size={17} />}
          onClick={(event) => {
            if (!action.onClick) return;
            event.preventDefault();
            action.onClick();
          }}
          variant={spotlight ? "primary" : "glass"}
        >
          {action.text}
        </PremiumButton>
      </div>
    </article>
  );
}

export default function PricingPage() {
  const { language } = useLanguage();
  const copy = pricingCopy[language];
  const [selectedPlanKey, setSelectedPlanKey] = useState<"pro" | null>(null);
  const selectedPlan: SelectedPlan | null = selectedPlanKey
    ? {
        description: copy.plans.pro.description,
        label: copy.plans.pro.label,
        planKey: "pro",
        price: copy.plans.pro.price,
        title: copy.plans.pro.title
      }
    : null;

  function telegramReceiptUrl(plan: SelectedPlan) {
    return `https://t.me/${telegramBotUsername}?start=${plan.planKey}`;
  }

  function closePlanPanel() {
    setSelectedPlanKey(null);
    updatePricingUrl(null);
  }

  function openProPanel() {
    setSelectedPlanKey("pro");
    updatePricingUrl("pro");
  }

  const freeBenefits: Benefit[] = [
    ...copy.plans.free.features.map((feature) => ({ checked: true, text: feature })),
    ...copy.plans.pro.features.slice(1, 4).map((feature) => ({ checked: false, text: feature }))
  ];
  const proBenefits: Benefit[] = copy.plans.pro.features.map((feature) => ({ checked: true, text: feature }));
  const proPaymentHref = "#payment-panel";
  useEffect(() => {
    setSelectedPlanKey(getPlanFromUrl());
    const syncPlanFromUrl = () => setSelectedPlanKey(getPlanFromUrl());
    window.addEventListener("popstate", syncPlanFromUrl);
    return () => window.removeEventListener("popstate", syncPlanFromUrl);
  }, []);

  return (
    <main className="sat-lux-page min-h-screen text-white">
      <LuxuryNavbar />

      <section className="relative overflow-hidden border-b border-white/10 px-5 py-14 md:px-8 lg:py-20">
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute left-[12%] top-[-16rem] h-[520px] w-[520px] rounded-full bg-white/[0.075] blur-3xl" />
          <div className="absolute right-[-16rem] top-[-12rem] h-[620px] w-[620px] rounded-full border border-white/[0.06]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_6%,rgba(255,255,255,0.12),transparent_32%),linear-gradient(90deg,rgba(0,0,0,0.94),rgba(16,17,18,0.88))]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">{copy.hero.eyebrow}</p>
          <PremiumText
            as="h1"
            className="mt-6 max-w-5xl bg-gradient-to-br from-white via-white to-zinc-500 bg-clip-text text-5xl font-light leading-none text-transparent md:text-7xl"
            variant="hero"
          >
            {copy.hero.title}
          </PremiumText>
          <p className="mt-7 max-w-3xl text-lg font-light leading-8 text-white/52">
            {copy.hero.body}
          </p>
          <div className="mt-6 grid gap-3">
            <div className="border border-white/10 bg-black/25 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/35">{copy.hero.paymentLabel}</p>
              <h2 className="mt-2 text-lg font-semibold text-white">{copy.hero.paymentTitle}</h2>
              <p className="mt-2 text-sm font-light leading-6 text-white/58">{copy.hero.paymentBody}</p>
            </div>
          </div>
          <div className="mt-8 grid gap-2 sm:grid-cols-3">
            {copy.hero.steps.map((step, index) => (
              <div className="border border-white/10 bg-black/25 p-3" key={step}>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">{copy.hero.stepLabel} {index + 1}</p>
                <p className="mt-2 text-sm font-semibold leading-5 text-white/72">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <PriceCard
            action={{ href: "/mock-test/diagnostic", text: copy.plans.free.action }}
            benefits={freeBenefits}
            description={copy.plans.free.description}
            label={copy.plans.free.label}
            price={copy.plans.free.price}
            title={copy.plans.free.title}
          />

          <PriceCard
            action={{
              href: proPaymentHref,
              onClick: openProPanel,
              text: copy.plans.pro.action
            }}
            benefits={proBenefits}
            description={copy.plans.pro.description}
            label={copy.plans.pro.label}
            price={copy.plans.pro.price}
            spotlight
            title={copy.plans.pro.title}
          />
        </div>

        <section className="mt-6 border border-white/10 bg-black/25 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.38em] text-white/42">{copy.funnel.eyebrow}</p>
              <PremiumText as="h2" className="mt-4 max-w-4xl text-4xl font-light leading-tight text-white md:text-5xl" variant="faq">
                {copy.funnel.title}
              </PremiumText>
            </div>
            <PremiumButton
              className="min-w-[270px]"
              href={proPaymentHref}
              icon={<ArrowRight size={20} />}
              onClick={(event) => {
                event.preventDefault();
                openProPanel();
              }}
            >
              {copy.funnel.cta}
            </PremiumButton>
          </div>
        </section>

      </section>

      {selectedPlan && typeof document !== "undefined" ? createPortal((
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/86 px-3 py-4 backdrop-blur-xl md:items-center md:py-6">
          <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[8px] border border-white/20 bg-[#101112] shadow-[0_40px_120px_rgba(0,0,0,0.72)]">
            <button
              aria-label={copy.modal.close}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/62 transition-colors hover:border-white hover:text-white"
              onClick={closePlanPanel}
              type="button"
            >
              <X size={18} />
            </button>

            <div className="relative border-b border-white/10 p-6 pr-14 md:p-7 md:pr-16">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.14),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_54%)]" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/42">{copy.modal.selected}</p>
                  <h2 className="mt-3 text-3xl font-light leading-tight text-white md:text-4xl">{copy.modal.payTitle}</h2>
                  <p className="mt-3 max-w-xl text-sm font-light leading-6 text-white/58">{copy.modal.payBody}</p>
                </div>
                <div className="shrink-0 border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 text-left sm:text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/50">{selectedPlan.title}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{selectedPlan.price}</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-200">{copy.modal.ready}</p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="grid gap-6 md:grid-cols-[280px_1fr] md:items-start">
                <div className="mx-auto w-full max-w-[220px] rounded-[8px] border border-white/14 bg-white p-3 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:max-w-none">
                  <img
                    alt={copy.modal.qrAlt}
                    className="h-auto w-full"
                    height={320}
                    src={paynetQrImage}
                    width={320}
                  />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.32em] text-white/42">Payment steps</p>
                  <ol className="mt-4 grid gap-3">
                    {copy.modal.instructions.map((instruction, index) => (
                      <li className="flex gap-3 text-sm font-light leading-6 text-white/64" key={instruction}>
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/14 bg-white text-xs font-black text-black">
                          {index + 1}
                        </span>
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ol>

                  <a
                    className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-[8px] border border-white/18 bg-white px-5 text-center text-[11px] font-black uppercase tracking-[0.24em] text-black transition-transform hover:-translate-y-0.5"
                    href={telegramReceiptUrl(selectedPlan)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {copy.modal.receiptCta}
                    <ArrowRight size={17} />
                  </a>

                  <p className="mt-5 border border-amber-200/18 bg-amber-200/[0.06] p-3 text-xs font-light leading-5 text-amber-100/72">
                    {copy.modal.note}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ), document.body) : null}

      <div className="pricing-payment-target" id="payment-panel">
        <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[8px] border border-white/20 bg-[#101112] shadow-[0_40px_120px_rgba(0,0,0,0.72)]">
          <a
            aria-label={copy.modal.close}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/62 transition-colors hover:border-white hover:text-white"
            href="#"
          >
            <X size={18} />
          </a>

          <div className="relative border-b border-white/10 p-6 pr-14 md:p-7 md:pr-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.14),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_54%)]" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/42">{copy.modal.selected}</p>
                <h2 className="mt-3 text-3xl font-light leading-tight text-white md:text-4xl">{copy.modal.payTitle}</h2>
                <p className="mt-3 max-w-xl text-sm font-light leading-6 text-white/58">{copy.modal.payBody}</p>
              </div>
              <div className="shrink-0 border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 text-left sm:text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/50">{copy.plans.pro.title}</p>
                <p className="mt-1 text-lg font-semibold text-white">{copy.plans.pro.price}</p>
                <p className="mt-1 text-xs font-semibold text-emerald-200">{copy.modal.ready}</p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-[280px_1fr] md:items-start">
              <div className="mx-auto w-full max-w-[220px] rounded-[8px] border border-white/14 bg-white p-3 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:max-w-none">
                <img
                  alt={copy.modal.qrAlt}
                  className="h-auto w-full"
                  height={320}
                  src={paynetQrImage}
                  width={320}
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-white/42">Payment steps</p>
                <ol className="mt-4 grid gap-3">
                  {copy.modal.instructions.map((instruction, index) => (
                    <li className="flex gap-3 text-sm font-light leading-6 text-white/64" key={instruction}>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/14 bg-white text-xs font-black text-black">
                        {index + 1}
                      </span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>

                <a
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-[8px] border border-white/18 bg-white px-5 text-center text-[11px] font-black uppercase tracking-[0.24em] text-black transition-transform hover:-translate-y-0.5"
                  href={`https://t.me/${telegramBotUsername}?start=pro`}
                  rel="noreferrer"
                  target="_blank"
                >
                  {copy.modal.receiptCta}
                  <ArrowRight size={17} />
                </a>

                <p className="mt-5 border border-amber-200/18 bg-amber-200/[0.06] p-3 text-xs font-light leading-5 text-amber-100/72">
                  {copy.modal.note}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
