"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, LockKeyhole, MessageCircle, Target } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { PremiumButton } from "@/components/PremiumButton";
import { api, getSubscriptionStatus, getToken, trackProLockView } from "@/lib/api";
import { useLanguage, type Language } from "@/lib/i18n";

type Test = { id: string; title: string; description: string; is_premium: boolean };

const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "SATTEST_Welcome_Bot";
const telegramPaymentUrl = `https://t.me/${telegramBotUsername}?start=pro_mock`;

const copy: Record<Language, {
  checking: string;
  title: string;
  body: string;
  loginTitle: string;
  loginBody: string;
  payTitle: string;
  payBody: string;
  errorTitle: string;
  startButton: string;
  loginButton: string;
  pricingButton: string;
  payStepsTitle: string;
  paySteps: string[];
}> = {
  en: {
    checking: "Opening SAT Mock Test",
    title: "Starting your full SAT Mock Test.",
    body: "Pro access is active. We are creating your timed SAT attempt and will move you into the test screen automatically.",
    loginTitle: "Login required",
    loginBody: "Sign in first, then SATTEST.UZ can attach the mock test result to your account and My 1400+ route.",
    payTitle: "Pro required",
    payBody: "Full Mock Test — real SAT format, 98 questions, with exact timing.\n\nThis is available for Pro students:",
    errorTitle: "Unable to start SAT Mock Test",
    startButton: "Try again",
    loginButton: "Login",
    pricingButton: "Pay in Telegram bot",
    payStepsTitle: "Payment order",
    paySteps: ["Open the Telegram bot.", "Choose Pro payment.", "Send your receipt and registered email in the bot."]
  },
  ru: {
    checking: "Открываем SAT Mock Test",
    title: "Запускаем ваш полный SAT Mock Test.",
    body: "Доступ Pro активен. Мы создаем timed SAT attempt и автоматически переведем вас в экран теста.",
    loginTitle: "Нужен вход",
    loginBody: "Сначала войдите, чтобы SATTEST.UZ сохранил результат mock test в вашем аккаунте и маршруте My 1400+.",
    payTitle: "Нужен Pro",
    payBody: "Полный Mock Test — настоящий формат SAT, 98 вопросов, с точным временем.\n\nДоступно для Pro учеников:",
    errorTitle: "Не удалось запустить SAT Mock Test",
    startButton: "Попробовать снова",
    loginButton: "Войти",
    pricingButton: "Оплатить в Telegram боте",
    payStepsTitle: "Порядок оплаты",
    paySteps: ["Откройте Telegram бот.", "Выберите оплату Pro.", "Отправьте чек и email регистрации в бот."]
  },
  uz: {
    checking: "SAT Mock Test ochilmoqda",
    title: "To'liq SAT Mock Test boshlanmoqda.",
    body: "Pro kirish faol. Biz timed SAT attempt yaratamiz va sizni avtomatik test ekraniga o'tkazamiz.",
    loginTitle: "Login kerak",
    loginBody: "Avval kiring, shunda SATTEST.UZ mock test natijasini akkauntingiz va My 1400+ yo'nalishingizga bog'laydi.",
    payTitle: "Pro kerak",
    payBody: "To'liq Mock Test — haqiqiy SAT formatida, 98 savol, aniq vaqt bilan.\n\nBu Pro o'quvchilar uchun mavjud:",
    errorTitle: "SAT Mock Test boshlanmadi",
    startButton: "Qayta urinish",
    loginButton: "Kirish",
    pricingButton: "Telegram botda to'lash",
    payStepsTitle: "To'lov tartibi",
    paySteps: ["Telegram botga o'ting.", "Pro to'lovni tanlang.", "Chek va ro'yxatdan o'tgan emailingizni botga yuboring."]
  }
};

export default function SatMockPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const text = copy[language];
  const [status, setStatus] = useState<"checking" | "login" | "pay" | "error">("checking");
  const [message, setMessage] = useState(text.body);

  async function startMock() {
    if (!getToken()) {
      setStatus("login");
      return;
    }

    setStatus("checking");
    setMessage(text.body);

    try {
      const subscription = await getSubscriptionStatus();
      if (!subscription.has_active_subscription) {
        void trackProLockView("mock_test_lock");
        setStatus("pay");
        return;
      }

      const tests = await api<Test[]>("/api/tests");
      const mockTest = tests.find((test) => test.is_premium) ?? tests[0];
      if (!mockTest) {
        throw new Error("No SAT mock test is available yet.");
      }

      const attempt = await api<{ attempt_id: string }>(`/api/tests/${mockTest.id}/attempts`, { method: "POST" });
      router.replace(`/test/${attempt.attempt_id}`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to start SAT Mock Test.");
    }
  }

  useEffect(() => {
    void startMock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = status === "login" ? text.loginTitle : status === "pay" ? text.payTitle : status === "error" ? text.errorTitle : text.title;
  const body = status === "login" ? text.loginBody : status === "pay" ? text.payBody : message;
  const eyebrow = status === "checking" ? text.checking : status === "login" ? text.loginTitle : status === "pay" ? text.payTitle : text.errorTitle;

  return (
    <main className="sat-lux-page min-h-screen text-white">
      <LuxuryNavbar />
      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-4xl flex-col items-center justify-center px-5 py-14 text-center" data-sattest-no-translate="true">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/12 bg-white/[0.045] text-white/70">
          {status === "checking" ? <Loader2 className="animate-spin" size={26} /> : status === "pay" ? <LockKeyhole size={26} /> : <Target size={26} />}
        </div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.42em] text-white/38">{eyebrow}</p>
        <h1 className="mt-5 text-4xl font-light leading-tight text-white md:text-6xl">{title}</h1>
        <p className="mt-5 max-w-2xl whitespace-pre-line text-base font-light leading-7 text-white/56">{body}</p>
        {status === "pay" ? (
          <div className="mt-6 w-full max-w-xl rounded-2xl border border-[#FFD700]/25 bg-[#FFD700]/10 p-5 text-left">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FFD700]">{text.payStepsTitle}</p>
            <ol className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-white/72">
              {text.paySteps.map((step, index) => (
                <li key={step}>{index + 1}. {step}</li>
              ))}
            </ol>
            <p className="mt-3 text-sm font-black text-[#FFD700]">300,000 UZS/oy</p>
          </div>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {status === "login" ? (
            <PremiumButton href={`/login?lang=${language}&next=${encodeURIComponent(`/sat-mock?lang=${language}`)}`} icon={<ArrowRight size={18} />}>{text.loginButton}</PremiumButton>
          ) : status === "pay" ? (
            <PremiumButton href={telegramPaymentUrl} icon={<MessageCircle size={18} />}>{text.pricingButton}</PremiumButton>
          ) : status === "error" ? (
            <PremiumButton icon={<ArrowRight size={18} />} onClick={startMock}>{text.startButton}</PremiumButton>
          ) : null}
        </div>
      </section>
    </main>
  );
}
