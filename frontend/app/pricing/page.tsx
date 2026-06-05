"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";

const telegramUsername = "FounderSATTESTUZ";
const telegramDisplayName = "@FounderSATTESTUZ";
const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "SATTESTUZBot";
const paynetQrPayload =
  "00020101021140440012qr-online.uz01186qz7uqn60TiFsWDuxO0202115204531153038605802UZ5910AO'PAYNET'6008Tashkent610610002164280002uz0106PAYNET0208Toshkent80520012qr-online.uz03097120207070419marketing@paynet.uz630453C8";
const paynetQrImage = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(paynetQrPayload)}`;

const prices = {
  pro: "200 000 UZS"
} as const;

const platformFeatures = [
  "Unlimited SAT practice by Reading, Writing, and Math",
  "Full diagnostic analytics after every mock test",
  "Mistake and weakness targeting by topic",
  "Personal My 1400+ curriculum route",
  "Progress tracking for score growth"
];

type PlanAction =
  {
    href: string;
    text: string;
  };

type SelectedPlan = {
  description: string;
  label: string;
  planKey: "pro";
  price: string;
  title: string;
};

function PriceCard({
  action,
  accent,
  description,
  features,
  label,
  price,
  title
}: {
  action: PlanAction;
  accent: "light" | "dark";
  description: string;
  features: string[];
  label: string;
  price: string;
  title: string;
}) {
  const isLight = accent === "light";

  return (
    <article
      className={[
        "group relative flex min-h-[620px] flex-col overflow-hidden border p-5 transition-all duration-300",
        isLight
          ? "border-white bg-white text-black shadow-[0_30px_80px_rgba(255,255,255,0.08)]"
          : "border-white/12 bg-white/[0.035] text-white hover:border-white/30"
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden border p-6",
          isLight ? "border-black/10 bg-black text-white" : "border-white/12 bg-white/[0.04]"
        ].join(" ")}
      >
        <div
          className={[
            "absolute inset-0 opacity-80",
            isLight
              ? "bg-[radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.24),transparent_32%),linear-gradient(135deg,#050505,#202020)]"
              : "bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.14),transparent_28%),linear-gradient(135deg,#191919,#101112)]"
          ].join(" ")}
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/58">{label}</p>
            <Sparkles size={20} />
          </div>
          <h2 className="mt-5 text-3xl font-light leading-tight md:text-4xl">{title}</h2>
          <p className="mt-5 text-4xl font-black tracking-tight md:text-5xl">{price}</p>
          <p className="mt-4 max-w-xl text-base font-light leading-7 text-white/66">{description}</p>
        </div>
      </div>

      <ul className="mt-7 grid gap-4">
        {features.map((feature) => (
          <li className="flex gap-3 text-base leading-7" key={feature}>
            <span
              className={[
                "mt-1 flex h-6 w-6 shrink-0 items-center justify-center border",
                isLight ? "border-black/15 bg-black text-white" : "border-white/15 bg-white/5 text-white"
              ].join(" ")}
            >
              <Check size={14} />
            </span>
            <span className={isLight ? "text-black/68" : "text-white/68"}>{feature}</span>
          </li>
        ))}
      </ul>

      <a
        className={[
          "mt-auto flex h-16 items-center justify-between border px-6 text-xs font-black uppercase tracking-[0.24em] transition-colors",
          isLight
            ? "border-black bg-black text-white hover:bg-transparent hover:text-black"
            : "border-white bg-white text-black hover:bg-transparent hover:text-white"
        ].join(" ")}
        href={action.href}
      >
        {action.text}
        <ArrowRight size={20} />
      </a>
    </article>
  );
}

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);

  function telegramReceiptUrl(plan: SelectedPlan) {
    return `https://t.me/${telegramBotUsername}?start=${plan.planKey}`;
  }

  function getPlanSelection(plan: string): SelectedPlan | null {
    if (plan === "pro") {
      return {
        description: "The main plan for students who want targeted SAT practice, full analytics, and a personal My 1400+ route.",
        label: "Most useful",
        planKey: "pro",
        price: `${prices.pro} / month`,
        title: "SATTEST Pro"
      };
    }

    return null;
  }

  function closePlanPanel() {
    setSelectedPlan(null);
    window.history.replaceState(null, "", "/pricing");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");

    if (plan) {
      setSelectedPlan(getPlanSelection(plan));
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />

      <section className="relative overflow-hidden border-b border-white/10 px-5 py-14 md:px-8 lg:py-18">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -left-40 top-0 h-[520px] w-[520px] rounded-full border border-white/[0.045]" />
          <div className="absolute right-[-16rem] top-[-12rem] h-[620px] w-[620px] rounded-full border border-white/[0.06]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_10%,rgba(255,255,255,0.10),transparent_32%),linear-gradient(90deg,rgba(0,0,0,0.92),rgba(16,17,18,0.92))]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">SAT pricing</p>
          <h1 className="mt-6 max-w-5xl text-5xl font-light leading-none md:text-7xl">
            Tariffs and prices for serious SAT improvement.
          </h1>
          <p className="mt-7 max-w-3xl text-lg font-light leading-8 text-white/52">
            Choose a plan when you are ready to unlock practice, analytics, and My 1400+. If you are unsure, take the free diagnostic first.
          </p>
          <div className="mt-8 grid gap-2 sm:grid-cols-5">
            {["Choose plan", "Pay any method", "Send receipt to bot", "Founder approves", "Start practice"].map((step, index) => (
              <div className="border border-white/10 bg-black/25 p-3" key={step}>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Step {index + 1}</p>
                <p className="mt-2 text-sm font-semibold leading-5 text-white/72">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <PriceCard
            action={{ href: "/mock-test", text: "Start Free Diagnostic" }}
            accent="dark"
            description="For students who want to see their real SAT level before choosing a paid route."
            features={[
              "1 free diagnostic SAT mock test",
              "Overall score preview",
              "Reading/Writing and Math section scores",
              "Limited mistake preview",
              "Upgrade when the weak areas are clear"
            ]}
            label="Free plan"
            price="0 UZS"
            title="Diagnostic Mock"
          />

          <PriceCard
            action={{
              href: "/pricing?plan=pro",
              text: "Pay and activate"
            }}
            accent="light"
            description="The main plan for students who want targeted SAT practice and a visible score-growth route."
            features={platformFeatures}
            label="Most useful"
            price={`${prices.pro} / month`}
            title="SATTEST Pro"
          />
        </div>

        <section className="mt-6 border border-white/10 bg-black/25 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.38em] text-white/42">Main funnel</p>
              <h2 className="mt-4 max-w-4xl text-4xl font-light leading-tight text-white md:text-5xl">
                Ready to continue? Choose Pro, pay by Click, Payme, Paynet, card, or transfer, then activate through Telegram.
              </h2>
            </div>
            <Link className="flex h-16 min-w-[270px] items-center justify-between border border-white bg-white px-6 text-xs font-black uppercase tracking-[0.22em] text-black transition-colors hover:bg-transparent hover:text-white" href="/pricing?plan=pro">
              Choose Pro
              <ArrowRight size={20} />
            </Link>
          </div>
        </section>
      </section>

      {selectedPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 px-3 py-3 backdrop-blur-xl">
          <div className="relative max-h-[calc(100vh-24px)] w-full max-w-4xl overflow-y-auto border border-white/18 bg-[#101112] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.65)] md:p-5">
            <button
              aria-label="Close pricing plan"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center border border-white/15 bg-black/30 text-white/62 transition-colors hover:border-white hover:text-white"
              onClick={closePlanPanel}
              type="button"
            >
              <X size={18} />
            </button>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/42">Selected tariff</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-light leading-none text-white md:text-5xl">
                  {selectedPlan.title}
                </h2>
                <p className="mt-4 text-3xl font-black text-white md:text-4xl">{selectedPlan.price}</p>
                <p className="mt-4 max-w-2xl text-base font-light leading-7 text-white/58">{selectedPlan.description}</p>

                <div className="mt-5 hidden gap-3 sm:grid sm:grid-cols-2">
                  <div className="border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">Plan</p>
                    <p className="mt-2 text-lg text-white">{selectedPlan.label}</p>
                  </div>
                  <div className="border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">Status</p>
                    <p className="mt-2 text-lg text-white">Ready</p>
                  </div>
                </div>
              </div>

              <aside className="flex flex-col border border-white/10 bg-white/[0.035] p-4">
                <Sparkles className="text-white/70" size={20} />
                <h3 className="mt-3 text-2xl font-light text-white">Pay by any method</h3>
                <p className="mt-3 text-sm font-light leading-6 text-white/54">
                  Pay by Click, Payme, Paynet, card, or transfer. Then send your receipt to the SATTEST.UZ bot for Founder approval.
                </p>
                <div className="mt-4 border border-white/12 bg-white p-3">
                  <img
                    alt="Paynet payment QR code"
                    className="mx-auto aspect-square w-full max-w-[210px]"
                    src={paynetQrImage}
                  />
                </div>
                <ol className="mt-4 grid gap-2 text-xs font-light leading-5 text-white/58">
                  <li>1. Use this Paynet QR or pay by Click, Payme, card, or transfer.</li>
                  <li>2. Complete payment for {selectedPlan.title}.</li>
                  <li>3. Open the bot and send receipt with caption: your-email@example.com {selectedPlan.planKey}.</li>
                  <li>4. Founder {telegramDisplayName} approves access for 30 days.</li>
                </ol>
                <div className="mt-auto grid gap-2 pt-4">
                  <a
                    className="flex h-11 items-center justify-between border border-white bg-white px-4 text-[11px] font-black uppercase tracking-[0.18em] text-black transition-colors hover:bg-transparent hover:text-white"
                    href={telegramReceiptUrl(selectedPlan)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Send receipt to bot
                    <ArrowRight size={18} />
                  </a>
                  <div className="border border-white/12 bg-black/25 p-3 text-xs font-light leading-5 text-white/52">
                    The bot forwards your receipt to Founder for manual approval and activates your subscription after confirmation.
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
