"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, QrCode } from "lucide-react";
import { getPaymentConfig, type PaymentConfig } from "@/lib/api";
import { useLanguage, type Language } from "@/lib/i18n";

const fallbackBotUrl = "https://t.me/SATTESTUZBot";

const text: Record<Language, {
  qrTitle: string;
  qrFallback: string;
  stepsTitle: string;
  steps: string[];
  botCta: string;
  paymentPageCta: string;
}> = {
  en: {
    qrTitle: "Scan QR and pay",
    qrFallback: "Payment QR",
    stepsTitle: "Clear order",
    steps: ["Pay 300,000 UZS using the QR code.", "Open Telegram bot.", "Upload your receipt and registered email."],
    botCta: "Upload receipt in Telegram",
    paymentPageCta: "Open full payment page"
  },
  ru: {
    qrTitle: "Отсканируйте QR и оплатите",
    qrFallback: "QR для оплаты",
    stepsTitle: "Порядок",
    steps: ["Оплатите 300,000 UZS по QR-коду.", "Откройте Telegram бот.", "Загрузите чек и email регистрации."],
    botCta: "Загрузить чек в Telegram",
    paymentPageCta: "Открыть страницу оплаты"
  },
  uz: {
    qrTitle: "QR orqali to'lang",
    qrFallback: "To'lov QR",
    stepsTitle: "Aniq tartib",
    steps: ["QR orqali 300,000 UZS to'lang.", "Telegram botga o'ting.", "Chek va ro'yxatdan o'tgan emailingizni yuboring."],
    botCta: "Chekni Telegramga yuborish",
    paymentPageCta: "To'lov sahifasini ochish"
  }
};

function generatedQrUrl(language: Language) {
  const payload = [
    "SATTEST.UZ PRO",
    "Amount: 300,000 UZS / month",
    "Pay by Payme, Click, Paynet, card, or transfer.",
    "After payment upload receipt to Telegram bot with your registered email.",
    `Language: ${language}`
  ].join("\n");
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(payload)}`;
}

export function PaymentQrHandoff({
  source,
  compact = false,
  className = ""
}: {
  source: "path_type_lock" | "mock_test_lock" | "analyzer_limit" | "diagnostic_lock";
  compact?: boolean;
  className?: string;
}) {
  const { language } = useLanguage();
  const copy = text[language];
  const [config, setConfig] = useState<PaymentConfig | null>(null);

  useEffect(() => {
    getPaymentConfig().then(setConfig).catch(() => setConfig(null));
  }, []);

  const qrUrl = config?.payme_qr_url || config?.click_qr_url || generatedQrUrl(language);
  const qrLabel = config?.payme_qr_url ? "Payme QR" : config?.click_qr_url ? "Click QR" : copy.qrFallback;
  const telegramUrl = config?.telegram_bot_url || fallbackBotUrl;
  const paymentUrl = `/payment?lang=${language}&plan=pro&from=${source}`;

  const cardClass = useMemo(
    () => [
      "rounded-2xl border border-[#FFD700]/25 bg-black/25",
      compact ? "p-3" : "p-5",
      className
    ].filter(Boolean).join(" "),
    [className, compact]
  );

  return (
    <div className={cardClass}>
      <div className="flex items-center gap-2">
        <QrCode className="text-[#FFD700]" size={compact ? 17 : 20} />
        <p className={["font-black text-[#FFD700]", compact ? "text-sm" : "text-base"].join(" ")}>{copy.qrTitle}</p>
      </div>

      <div className={["mt-3 grid gap-3", compact ? "" : "sm:grid-cols-[150px_1fr] sm:items-center"].join(" ")}>
        <div className="rounded-xl bg-white p-2">
          <img className="aspect-square w-full rounded-lg object-contain" src={qrUrl} alt={qrLabel} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">{copy.stepsTitle}</p>
          <ol className="mt-2 grid gap-1 text-xs font-bold leading-5 text-white/68">
            {copy.steps.map((step, index) => (
              <li key={step}>{index + 1}. {step}</li>
            ))}
          </ol>
        </div>
      </div>

      <div className={["mt-4 grid gap-2", compact ? "" : "sm:grid-cols-2"].join(" ")}>
        <a className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#FFD700]/40 px-4 py-3 text-center text-xs font-black text-[#FFD700] transition hover:bg-[#FFD700] hover:text-black" href={paymentUrl}>
          {copy.paymentPageCta}
        </a>
        <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FFD700] px-4 py-3 text-center text-xs font-black text-black transition hover:bg-white" href={telegramUrl} target="_blank" rel="noreferrer">
          <MessageCircle size={16} /> {copy.botCta}
        </a>
      </div>
    </div>
  );
}
