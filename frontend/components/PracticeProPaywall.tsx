"use client";

import { LockKeyhole, Zap } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { PaymentQrHandoff } from "@/components/PaymentQrHandoff";
import { useLanguage, type Language } from "@/lib/i18n";

const copy: Record<Language, {
  checking: string;
  eyebrow: string;
  title: string;
  body: string;
  price: string;
  bullets: string[];
}> = {
  en: {
    checking: "Checking Pro access",
    eyebrow: "SATTEST.UZ Pro",
    title: "Practice Bank is a Pro feature.",
    body: "Unlock targeted Reading, Writing, and Math practice with Easy / Medium / Hard sets and progress tracking.",
    price: "300,000 UZS/month",
    bullets: ["Full Practice Bank", "Reading, Writing, and Math drills", "Mistake tracking and progress history", "Full mock tests included"]
  },
  ru: {
    checking: "Проверяем Pro доступ",
    eyebrow: "SATTEST.UZ Pro",
    title: "Practice Bank доступен в Pro.",
    body: "Откройте целевые задания по Reading, Writing и Math с уровнями Easy / Medium / Hard и отслеживанием прогресса.",
    price: "300,000 UZS/месяц",
    bullets: ["Полный Practice Bank", "Reading, Writing и Math задания", "История ошибок и прогресса", "Full mock tests включены"]
  },
  uz: {
    checking: "Pro kirish tekshirilmoqda",
    eyebrow: "SATTEST.UZ Pro",
    title: "Practice Bank Pro uchun ochiladi.",
    body: "Reading, Writing va Math bo'yicha Easy / Medium / Hard mashqlar, xato kuzatuvi va progress tarixini oching.",
    price: "300,000 UZS/oy",
    bullets: ["To'liq Practice Bank", "Reading, Writing va Math mashqlari", "Xatolar va progress tarixi", "Full mock testlar ham kiradi"]
  }
};

const telegramBotUsername = process.env.NEXT_PUBLIC_PAYMENT_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "SATTEST_UZ_Payment_Bot";

export function PracticeProChecking() {
  const { language } = useLanguage();
  const text = copy[language];
  return (
    <main className="sat-lux-page min-h-screen text-white">
      <LuxuryNavbar />
      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-4xl flex-col items-center justify-center px-5 text-center">
        <LockKeyhole className="text-[#FFD700]" size={34} />
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.42em] text-white/38">{text.eyebrow}</p>
        <h1 className="mt-5 text-4xl font-light text-white md:text-5xl">{text.checking}</h1>
      </section>
    </main>
  );
}

export function PracticeProPaywall({ title }: { title?: string }) {
  const { language } = useLanguage();
  const text = copy[language];
  return (
    <main className="sat-lux-page min-h-screen text-white">
      <LuxuryNavbar />
      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-5xl items-center px-5 py-14 md:px-8">
        <article className="w-full rounded-[8px] border border-[#FFD700]/30 bg-[#151515]/92 p-6 shadow-[0_36px_120px_rgba(0,0,0,0.55)] md:p-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FFD700]/35 bg-[#FFD700]/10 text-[#FFD700]">
            <Zap size={30} />
          </div>
          <p className="mt-7 text-[10px] font-black uppercase tracking-[0.42em] text-[#FFD700]/80">{text.eyebrow}</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-white md:text-6xl">{title || text.title}</h1>
          <p className="mt-5 max-w-2xl text-lg font-light leading-8 text-white/60">{text.body}</p>
          <p className="mt-5 text-3xl font-black text-[#FFD700]">{text.price}</p>
          <ul className="mt-7 grid gap-3 text-base font-semibold text-white/72 sm:grid-cols-2">
            {text.bullets.map((item) => (
              <li className="rounded-xl border border-white/10 bg-black/25 px-4 py-3" key={item}>
                {item}
              </li>
            ))}
          </ul>
          <PaymentQrHandoff source="path_type_lock" className="mt-7" />
          <p className="mt-3 text-sm font-bold text-white/45">@{telegramBotUsername}</p>
        </article>
      </section>
    </main>
  );
}
