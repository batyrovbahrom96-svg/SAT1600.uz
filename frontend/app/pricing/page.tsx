"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { useLanguage, type Language } from "@/lib/i18n";

const telegramDisplayName = "@FounderSATTESTUZ";
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
      paymentTitle: "Short payment note",
      paymentBody:
        "Payment can be made through Click, Payme, Paynet, card, or transfer. Send the receipt to the Telegram bot with the email used during registration. The bot activates Pro automatically for 30 days.",
      steps: ["Choose plan", "Pay any method", "Send receipt to bot", "Bot activates Pro", "Start practice"],
      stepLabel: "Step"
    },
    plans: {
      free: {
        action: "Start Free Diagnostic",
        description: "For students who want to see their real SAT level before choosing a paid route.",
        features: [
          "1 free diagnostic SAT mock test",
          "Overall score preview",
          "Reading/Writing and Math section scores",
          "Limited mistake preview",
          "Upgrade when the weak areas are clear"
        ],
        label: "Free plan",
        price: "0 UZS",
        title: "Diagnostic Mock"
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
      title: "Ready to continue? Choose Pro, pay by Click, Payme, Paynet, card, or transfer, then activate through Telegram.",
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
        "Pay by Click, Payme, Paynet, card, or transfer. Then send your receipt to the SATTEST.UZ bot and Pro opens automatically.",
      qrAlt: "Paynet payment QR code",
      instructions: [
        "Use this Paynet QR or pay by Click, Payme, card, or transfer.",
        "Complete payment for SATTEST Pro.",
        "Open the bot and send receipt with caption: your-email@example.com pro.",
        "The bot activates Pro for 30 days immediately after receiving the receipt."
      ],
      receiptCta: "Send receipt to bot",
      note: `The bot still notifies ${telegramDisplayName} for records while Pro opens automatically.`
    }
  },
  ru: {
    hero: {
      eyebrow: "Цены SAT",
      title: "Тарифы для серьезного роста результата SAT.",
      body: "Выберите план, когда будете готовы открыть практику, аналитику и маршрут My 1400+. Если сомневаетесь, сначала пройдите бесплатную диагностику.",
      paymentLabel: "Для родителей",
      paymentTitle: "Кратко об оплате",
      paymentBody:
        "Оплату можно сделать через Click, Payme, Paynet, карту или перевод. Отправьте чек в Telegram-бот вместе с email, указанным при регистрации. Бот автоматически откроет Pro на 30 дней.",
      steps: ["Выбрать план", "Оплатить удобным способом", "Отправить чек в бот", "Бот открывает Pro", "Начать практику"],
      stepLabel: "Шаг"
    },
    plans: {
      free: {
        action: "Начать диагностику",
        description: "Для учеников, которые хотят понять свой реальный уровень SAT до выбора платного маршрута.",
        features: [
          "1 бесплатный диагностический SAT mock test",
          "Предварительный общий балл",
          "Баллы Reading/Writing и Math",
          "Ограниченный просмотр ошибок",
          "Переход на Pro после выявления слабых мест"
        ],
        label: "Бесплатный план",
        price: "0 UZS",
        title: "Diagnostic Mock"
      },
      pro: {
        action: "Оплатить и активировать",
        description: "Основной план для учеников, которым нужна целевая SAT-практика и видимый маршрут роста балла.",
        features: [
          "Неограниченная практика SAT по Reading, Writing и Math",
          "Полная аналитика после каждого mock test",
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
      title: "Готовы продолжить? Выберите Pro, оплатите через Click, Payme, Paynet, карту или перевод, затем активируйте доступ через Telegram.",
      cta: "Выбрать Pro"
    },
    modal: {
      close: "Закрыть тариф",
      selected: "Выбранный тариф",
      plan: "План",
      status: "Статус",
      ready: "Готов",
      payTitle: "Оплата любым способом",
      payBody: "Оплатите через Click, Payme, Paynet, карту или перевод. Затем отправьте чек в бот SATTEST.UZ, и Pro откроется автоматически.",
      qrAlt: "QR-код оплаты Paynet",
      instructions: [
        "Используйте этот Paynet QR или оплатите через Click, Payme, карту либо перевод.",
        "Оплатите тариф SATTEST Pro.",
        "Откройте бот и отправьте чек с подписью: your-email@example.com pro.",
        "Бот сразу активирует Pro на 30 дней после получения чека."
      ],
      receiptCta: "Отправить чек в бот",
      note: `Бот уведомит ${telegramDisplayName} для учета, а Pro откроется автоматически.`
    }
  },
  uz: {
    hero: {
      eyebrow: "SAT narxlari",
      title: "Jiddiy SAT o'sishi uchun tariflar va narxlar.",
      body: "Practice, analytics va My 1400+ yo'nalishini ochishga tayyor bo'lsangiz, rejani tanlang. Ishonchingiz komil bo'lmasa, avval bepul diagnostikadan o'ting.",
      paymentLabel: "Ota-onalar uchun",
      paymentTitle: "Qisqa to'lov izohi",
      paymentBody:
        "To'lov Click, Payme, Paynet, karta yoki o'tkazma orqali qilinadi. Chekni Telegram botga ro'yxatdan o'tgan email bilan yuboring. Bot Pro kirishni 30 kunga avtomatik ochadi.",
      steps: ["Rejani tanlash", "Istalgan usulda to'lash", "Chekni botga yuborish", "Bot Pro ochadi", "Practice boshlash"],
      stepLabel: "Qadam"
    },
    plans: {
      free: {
        action: "Bepul diagnostika",
        description: "Pullik yo'nalishni tanlashdan oldin real SAT darajasini ko'rmoqchi bo'lgan o'quvchilar uchun.",
        features: [
          "1 ta bepul diagnostik SAT mock test",
          "Umumiy ball ko'rinishi",
          "Reading/Writing va Math bo'lim ballari",
          "Cheklangan xato ko'rinishi",
          "Zaif joylar aniq bo'lganda Pro'ga o'tish"
        ],
        label: "Bepul reja",
        price: "0 UZS",
        title: "Diagnostic Mock"
      },
      pro: {
        action: "To'lash va faollashtirish",
        description: "Maqsadli SAT practice va ko'rinadigan ball o'sish yo'nalishini xohlaydigan o'quvchilar uchun asosiy reja.",
        features: [
          "Reading, Writing va Math bo'yicha cheksiz SAT practice",
          "Har bir mock testdan keyin to'liq diagnostik analytics",
          "Mavzu bo'yicha xato va zaifliklarni tuzatish",
          "Shaxsiy My 1400+ curriculum yo'nalishi",
          "Ball o'sishini kuzatish"
        ],
        label: "Eng foydali",
        price: `${prices.pro} / oy`,
        title: "SATTEST Pro"
      }
    },
    funnel: {
      eyebrow: "Asosiy yo'l",
      title: "Davom etishga tayyormisiz? Pro'ni tanlang, Click, Payme, Paynet, karta yoki o'tkazma orqali to'lang, keyin Telegram orqali faollashtiring.",
      cta: "Pro tanlash"
    },
    modal: {
      close: "Tarifni yopish",
      selected: "Tanlangan tarif",
      plan: "Reja",
      status: "Holat",
      ready: "Tayyor",
      payTitle: "Istalgan usulda to'lash",
      payBody: "Click, Payme, Paynet, karta yoki o'tkazma orqali to'lang. Keyin chekni SATTEST.UZ botga yuboring, Pro avtomatik ochiladi.",
      qrAlt: "Paynet to'lov QR kodi",
      instructions: [
        "Ushbu Paynet QR'dan foydalaning yoki Click, Payme, karta yoxud o'tkazma orqali to'lang.",
        "SATTEST Pro uchun to'lovni yakunlang.",
        "Botni oching va chekni quyidagi izoh bilan yuboring: your-email@example.com pro.",
        "Bot chekni olgandan keyin Pro kirishni 30 kunga darhol faollashtiradi."
      ],
      receiptCta: "Chekni botga yuborish",
      note: `Bot ${telegramDisplayName} ga hisob uchun xabar beradi, Pro esa avtomatik ochiladi.`
    }
  }
};

type PlanAction =
  {
    href: string;
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
    <motion.article
      className="relative h-full"
      initial={{ filter: "blur(8px)", opacity: 0.65, y: 18 }}
      whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: "easeOut", delay: spotlight ? 0.12 : 0 }}
    >
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

        <a
          className={[
            "relative mt-auto flex h-[52px] min-h-[52px] items-center justify-center gap-3 rounded-[6px] border px-5 text-[11px] font-black uppercase tracking-[0.18em] transition-colors",
            spotlight
              ? "border-white bg-white text-black hover:bg-transparent hover:text-white"
              : "border-white/14 bg-white/[0.045] text-white/76 hover:border-white/36 hover:bg-white/[0.075] hover:text-white"
          ].join(" ")}
          href={action.href}
          onClick={(event) => {
            if (!action.onClick) return;
            event.preventDefault();
            action.onClick();
          }}
        >
          {action.text}
          <ArrowRight size={17} />
        </a>
      </div>
    </motion.article>
  );
}

export default function PricingPage() {
  const { language } = useLanguage();
  const copy = pricingCopy[language];
  const [selectedPlanKey, setSelectedPlanKey] = useState<"pro" | null>(() => getPlanFromUrl());
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
  const proHref = `/pricing?lang=${language}&plan=pro`;

  useEffect(() => {
    setSelectedPlanKey(getPlanFromUrl());
  }, []);

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />

      <section className="relative overflow-hidden border-b border-white/10 px-5 py-14 md:px-8 lg:py-20">
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute left-[12%] top-[-16rem] h-[520px] w-[520px] rounded-full bg-white/[0.075] blur-3xl" />
          <div className="absolute right-[-16rem] top-[-12rem] h-[620px] w-[620px] rounded-full border border-white/[0.06]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_6%,rgba(255,255,255,0.12),transparent_32%),linear-gradient(90deg,rgba(0,0,0,0.94),rgba(16,17,18,0.88))]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">{copy.hero.eyebrow}</p>
          <h1 className="mt-6 max-w-5xl bg-gradient-to-br from-white via-white to-zinc-500 bg-clip-text text-5xl font-light leading-none text-transparent md:text-7xl">
            {copy.hero.title}
          </h1>
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
          <div className="mt-8 grid gap-2 sm:grid-cols-5">
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
            action={{ href: "/mock-test", text: copy.plans.free.action }}
            benefits={freeBenefits}
            description={copy.plans.free.description}
            label={copy.plans.free.label}
            price={copy.plans.free.price}
            title={copy.plans.free.title}
          />

          <PriceCard
            action={{
              href: proHref,
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
              <h2 className="mt-4 max-w-4xl text-4xl font-light leading-tight text-white md:text-5xl">
                {copy.funnel.title}
              </h2>
            </div>
            <Link
              className="flex h-16 min-w-[270px] items-center justify-between border border-white bg-white px-6 text-xs font-black uppercase tracking-[0.22em] text-black transition-colors hover:bg-transparent hover:text-white"
              href={proHref}
              onClick={(event) => {
                event.preventDefault();
                openProPanel();
              }}
            >
              {copy.funnel.cta}
              <ArrowRight size={20} />
            </Link>
          </div>
        </section>
      </section>

      {selectedPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 px-3 py-3 backdrop-blur-xl">
          <div className="relative max-h-[calc(100vh-24px)] w-full max-w-4xl overflow-y-auto border border-white/18 bg-[#101112] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.65)] md:p-5">
            <button
              aria-label={copy.modal.close}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center border border-white/15 bg-black/30 text-white/62 transition-colors hover:border-white hover:text-white"
              onClick={closePlanPanel}
              type="button"
            >
              <X size={18} />
            </button>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/42">{copy.modal.selected}</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-light leading-none text-white md:text-5xl">
                  {selectedPlan.title}
                </h2>
                <p className="mt-4 text-3xl font-black text-white md:text-4xl">{selectedPlan.price}</p>
                <p className="mt-4 max-w-2xl text-base font-light leading-7 text-white/58">{selectedPlan.description}</p>

                <div className="mt-5 hidden gap-3 sm:grid sm:grid-cols-2">
                  <div className="border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">{copy.modal.plan}</p>
                    <p className="mt-2 text-lg text-white">{selectedPlan.label}</p>
                  </div>
                  <div className="border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">{copy.modal.status}</p>
                    <p className="mt-2 text-lg text-white">{copy.modal.ready}</p>
                  </div>
                </div>
              </div>

              <aside className="flex flex-col border border-white/10 bg-white/[0.035] p-4">
                <Sparkles className="text-white/70" size={20} />
                <h3 className="mt-3 text-2xl font-light text-white">{copy.modal.payTitle}</h3>
                <p className="mt-3 text-sm font-light leading-6 text-white/54">
                  {copy.modal.payBody}
                </p>
                <div className="mt-4 border border-white/12 bg-white p-3">
                  <img
                    alt={copy.modal.qrAlt}
                    className="mx-auto aspect-square w-full max-w-[210px]"
                    src={paynetQrImage}
                  />
                </div>
                <ol className="mt-4 grid gap-2 text-xs font-light leading-5 text-white/58">
                  {copy.modal.instructions.map((instruction, index) => (
                    <li key={instruction}>{index + 1}. {instruction}</li>
                  ))}
                </ol>
                <div className="mt-4 grid gap-2">
                  <div className="border border-white/10 bg-black/25 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">{copy.hero.paymentTitle}</p>
                    <p className="mt-2 text-xs font-light leading-5 text-white/58">{copy.hero.paymentBody}</p>
                  </div>
                </div>
                <div className="mt-auto grid gap-2 pt-4">
                  <a
                    className="flex h-11 items-center justify-between border border-white bg-white px-4 text-[11px] font-black uppercase tracking-[0.18em] text-black transition-colors hover:bg-transparent hover:text-white"
                    href={telegramReceiptUrl(selectedPlan)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {copy.modal.receiptCta}
                    <ArrowRight size={18} />
                  </a>
                  <div className="border border-white/12 bg-black/25 p-3 text-xs font-light leading-5 text-white/52">
                    {copy.modal.note}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
