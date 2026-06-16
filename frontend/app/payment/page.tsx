"use client";

import { ArrowRight, Check, CreditCard, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPaymentOrder, getPaymentConfig, getToken, type PaymentConfig } from "@/lib/api";
import { calculateDiagnosticResult } from "@/lib/free-diagnostic";
import { getFreeDiagnosticResult } from "@/lib/free-diagnostic-storage";

type Plan = "monthly" | "three_month";

const fallbackConfig: PaymentConfig = {
  payme_qr_url: "",
  click_qr_url: "",
  telegram_bot_url: "https://t.me/SATTESTUZBot",
  plans: {
    monthly: { amount: 200000, days: 30, label: "1 month" },
    three_month: { amount: 600000, days: 90, label: "3 months" },
  },
};

export default function PaymentPage() {
  const router = useRouter();
  const [config, setConfig] = useState<PaymentConfig>(fallbackConfig);
  const [plan, setPlan] = useState<Plan>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const diagnostic = useMemo(() => getFreeDiagnosticResult(), []);
  const result = useMemo(() => diagnostic ? calculateDiagnosticResult(diagnostic.answers) : null, [diagnostic]);
  const weakAreas = result?.weakAreas.slice(0, 4) ?? ["Reading accuracy", "Grammar precision", "Math timing"];
  const estimatedScore = result?.estimatedTotal ?? 900;

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/register?next=${encodeURIComponent("/payment")}`);
      return;
    }
    getPaymentConfig().then(setConfig).catch(() => setConfig(fallbackConfig));
  }, [router]);

  async function confirmPayment() {
    setLoading(true);
    setError("");
    try {
      const order = await createPaymentOrder({
        subscription_type: plan,
        estimated_score: estimatedScore,
        weak_areas: weakAreas,
      });
      router.push(`/payment/confirm?ref=${encodeURIComponent(order.reference)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "To'lov so'rovini yaratib bo'lmadi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="border border-[#FFD700]/25 bg-white/[0.035] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
            <p className="text-xs font-black uppercase tracking-[0.34em] text-[#FFD700]">SATTEST.UZ Pro</p>
            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-6xl">Pro-ga o'ting va 1400+ ga yeting!</h1>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <ScoreBox label="Hozirgi taxminiy ball" value={`${estimatedScore}`} />
              <ScoreBox label="Maqsad" value="1400+" gold />
            </div>
            <div className="mt-7 border border-white/10 bg-black/30 p-5">
              <div className="flex items-center gap-3">
                <Target className="text-[#FFD700]" size={20} />
                <h2 className="text-2xl font-bold">Aniqlangan zaif joylar</h2>
              </div>
              <div className="mt-4 grid gap-3">
                {weakAreas.map((area) => (
                  <div className="flex items-center gap-3 border border-white/10 bg-white/[0.04] p-3" key={area}>
                    <Check className="text-[#FFD700]" size={18} />
                    <span className="font-semibold">{area}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border border-white/10 bg-white/[0.035] p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <PlanButton active={plan === "monthly"} label="200,000 UZS" sub="1 oy" onClick={() => setPlan("monthly")} />
              <PlanButton active={plan === "three_month"} label="600,000 UZS" sub="3 oy" onClick={() => setPlan("three_month")} badge="Tavsiya" />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <QrCard title="Payme QR" imageUrl={config.payme_qr_url} />
              <QrCard title="Click QR" imageUrl={config.click_qr_url} />
            </div>

            <p className="mt-6 text-center text-lg font-semibold text-white/75">
              To'lovni amalga oshiring, keyin quyidagi tugmani bosing
            </p>
            {error ? <p className="mt-4 border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
            <button
              className="mt-5 flex w-full items-center justify-center gap-3 bg-[#FFD700] px-6 py-5 text-sm font-black uppercase tracking-[0.18em] text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              onClick={confirmPayment}
              type="button"
            >
              <CreditCard size={20} /> {loading ? "Yaratilmoqda..." : "To'lovni tasdiqlash"} <ArrowRight size={20} />
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}

function ScoreBox({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="border border-white/10 bg-black/30 p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p className={["mt-3 text-5xl font-black", gold ? "text-[#FFD700]" : "text-white"].join(" ")}>{value}</p>
    </div>
  );
}

function PlanButton({ active, label, sub, badge, onClick }: { active: boolean; label: string; sub: string; badge?: string; onClick: () => void }) {
  return (
    <button
      className={[
        "relative border p-5 text-left transition",
        active ? "border-[#FFD700] bg-[#FFD700]/10" : "border-white/10 bg-black/25 hover:border-white/35",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {badge ? <span className="absolute right-3 top-3 border border-[#FFD700]/60 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#FFD700]">{badge}</span> : null}
      <p className="text-3xl font-black">{label}</p>
      <p className="mt-2 text-white/55">{sub}</p>
    </button>
  );
}

function QrCard({ title, imageUrl }: { title: string; imageUrl: string }) {
  return (
    <article className="border border-white/10 bg-black/35 p-4">
      <h3 className="text-lg font-black text-[#FFD700]">{title}</h3>
      <div className="mt-4 grid aspect-square place-items-center bg-white p-4">
        {imageUrl ? (
          <img className="h-full w-full object-contain" src={imageUrl} alt={title} />
        ) : (
          <div className="grid h-full w-full place-items-center border border-black/15 text-center text-sm font-black uppercase tracking-[0.2em] text-black/45">
            QR URL
          </div>
        )}
      </div>
    </article>
  );
}
