"use client";

import { ArrowRight, Clock, Copy, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getPaymentOrder, type PaymentOrder } from "@/lib/api";

const fallbackBotUrl = "https://t.me/SATTEST_UZ_Payment_Bot";

export default function PaymentConfirmPage() {
  const [reference, setReference] = useState("");
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(30 * 60);
  const telegramUrl = order?.telegram_url || (reference ? `${fallbackBotUrl}?start=${encodeURIComponent(reference)}` : fallbackBotUrl);

  useEffect(() => {
    setReference(new URLSearchParams(window.location.search).get("ref") || "");
  }, []);

  useEffect(() => {
    if (!reference) return;
    getPaymentOrder(reference).then(setOrder).catch(() => setOrder(null));
  }, [reference]);

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }, [secondsLeft]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-8 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center">
        <div className="border border-[#FFD700]/25 bg-white/[0.035] p-6 text-center shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.34em] text-[#FFD700]">SATTEST.UZ Pro</p>
          <h1 className="mt-5 text-5xl font-black leading-tight">Deyarli bo'ldi! 🎉</h1>
          <div className="mx-auto mt-8 max-w-xl text-left text-lg font-semibold leading-9 text-white/78">
            <p>1. Quyidagi tugmani bosing</p>
            <p>2. Telegramda @SATTEST_UZ_Payment_Bot ga o'ting</p>
            <p>3. To'lov skrinshotini yuboring</p>
            <p>4. 5 daqiqa ichida Pro faollashtiriladi ✅</p>
          </div>

          <div className="mt-8 grid gap-4 border border-white/10 bg-black/30 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Order reference</p>
              <p className="mt-2 text-3xl font-black text-[#FFD700]">{reference || "SAT-XXXXXX"}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Ko'rib chiqish vaqti</p>
              <p className="mt-2 flex items-center justify-center gap-2 text-3xl font-black sm:justify-start">
                <Clock className="text-[#FFD700]" size={26} /> {formattedTime}
              </p>
            </div>
          </div>

          <a
            className="mt-8 flex w-full items-center justify-center gap-3 bg-[#12b76a] px-6 py-5 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#0f9f5d]"
            href={telegramUrl}
            rel="noreferrer"
            target="_blank"
          >
            <Send size={20} /> Telegramga o'tish <ArrowRight size={20} />
          </a>

          <button
            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-white/60 hover:text-white"
            onClick={() => reference && navigator.clipboard?.writeText(reference)}
            type="button"
          >
            <Copy size={16} /> Order reference nusxalash
          </button>

          <p className="mt-6 text-white/55">Sizning so'rovingiz 30 daqiqa ichida ko'rib chiqiladi</p>
        </div>
      </section>
    </main>
  );
}
