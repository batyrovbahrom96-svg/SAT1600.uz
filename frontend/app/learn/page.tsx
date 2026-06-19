"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Check, ChevronDown, Star, TrendingUp } from "lucide-react";
import { API_URL, api, getToken, saveAuth } from "@/lib/api";
import { useLanguage, type Language } from "@/lib/i18n";

type SignupData = {
  name: string;
  targetScore: string;
  level: "beginner" | "intermediate" | "ready" | "";
  email: string;
  password: string;
  verificationCode: string;
};

const lionLogo = "/assets/brand/sattest-lion-crest.png";

const languageNames: Record<Language, string> = {
  uz: "O'zbek",
  ru: "Русский",
  en: "English"
};

const welcomeCopy: Record<Language, { headline: string; start: string; login: string; continuePath: string; accountNote: string }> = {
  uz: {
    headline: "SAT'ga BEPUL va samarali tayyorlaning!",
    start: "BOSHLASH",
    login: "MENDA ALLAQACHON HISOB BOR",
    continuePath: "YO'LIMNI DAVOM ETTIRISH",
    accountNote: "Akkauntingiz topildi. Davom etish uchun tugmani bosing."
  },
  ru: {
    headline: "Готовьтесь к SAT бесплатно и эффективно!",
    start: "НАЧАТЬ",
    login: "У МЕНЯ УЖЕ ЕСТЬ АККАУНТ",
    continuePath: "ПРОДОЛЖИТЬ МОЙ ПУТЬ",
    accountNote: "Аккаунт найден. Нажмите кнопку, чтобы продолжить."
  },
  en: {
    headline: "Prepare for the SAT for free and effectively!",
    start: "START",
    login: "I ALREADY HAVE AN ACCOUNT",
    continuePath: "CONTINUE MY PATH",
    accountNote: "Account found. Press the button to continue."
  }
};

const stepsCopy = {
  name: {
    uz: "Ismingiz?",
    ru: "Как вас зовут?",
    en: "What is your name?"
  },
  target: {
    uz: "SAT da maqsad ballingiz?",
    ru: "Какой ваш целевой балл SAT?",
    en: "What is your SAT target score?"
  },
  level: {
    uz: "Hozir o'zingizni qanday baholaysiz?",
    ru: "Как вы оцениваете свой уровень сейчас?",
    en: "How do you rate yourself right now?"
  },
  account: {
    uz: "Email va parol yarating",
    ru: "Создайте email и пароль",
    en: "Create email and password"
  },
  continue: {
    uz: "Davom etish →",
    ru: "Продолжить →",
    en: "Continue →"
  },
  create: {
    uz: "Hisob Yaratish →",
    ru: "Создать аккаунт →",
    en: "Create Account →"
  },
  sendCode: {
    uz: "Email kod yuborish",
    ru: "Отправить код",
    en: "Send email code"
  },
  code: {
    uz: "Emailingizga kelgan 6 xonali kod",
    ru: "6-значный код из email",
    en: "6-digit code from your email"
  },
  google: {
    uz: "Google bilan davom etish",
    ru: "Продолжить с Google",
    en: "Continue with Google"
  },
  loading: {
    uz: "Sizning shaxsiy yo'lingiz tayyorlanmoqda...",
    ru: "Ваш личный путь готовится...",
    en: "Your personal path is being prepared..."
  }
};

const levelOptions = [
  { key: "beginner", icon: "🌱", uz: "Yangi boshlovchi", ru: "Новичок", en: "Beginner" },
  { key: "intermediate", icon: "📈", uz: "O'rtacha bilaman", ru: "Средний уровень", en: "I know the basics" },
  { key: "ready", icon: "🏆", uz: "Yaxshi tayyorman", ru: "Хорошо готов", en: "Well prepared" }
] as const;

export default function WelcomePage() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [mode, setMode] = useState<"welcome" | "signup" | "loading">("welcome");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [data, setData] = useState<SignupData>({
    name: "",
    targetScore: "1400",
    level: "",
    email: "",
    password: "",
    verificationCode: ""
  });
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeMessage, setCodeMessage] = useState("");
  const [hasExistingAccount, setHasExistingAccount] = useState(false);

  useEffect(() => {
    setHasExistingAccount(Boolean(getToken()));
  }, []);

  function update<K extends keyof SignupData>(key: K, value: SignupData[K]) {
    setData((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function nextStep() {
    if (step === 1 && data.name.trim().length < 2) {
      setError("Ism kamida 2 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    if (step === 2 && (!Number(data.targetScore) || Number(data.targetScore) < 400 || Number(data.targetScore) > 1600)) {
      setError("SAT ball 400 va 1600 orasida bo'lishi kerak.");
      return;
    }
    if (step === 3 && !data.level) {
      setError("Bitta darajani tanlang.");
      return;
    }
    setStep((current) => current + 1);
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data.email.includes("@") || data.password.length < 8) {
      setError("Email to'g'ri bo'lishi va parol kamida 8 belgidan iborat bo'lishi kerak.");
      return;
    }
    if (!/^\d{6}$/.test(data.verificationCode.trim())) {
      setError("Emailingizga kelgan 6 xonali kodni kiriting.");
      return;
    }

    try {
      const result = await api<{ access_token: string; full_name?: string }>("/api/auth/onboarding-register", {
        method: "POST",
        body: JSON.stringify({
          full_name: data.name.trim(),
          email: data.email.trim(),
          password: data.password,
          verification_code: data.verificationCode.trim(),
          target_score: Number(data.targetScore),
          self_assessed_level: data.level
        })
      });
      saveAuth(result.access_token, result.full_name || data.name.trim());
      window.localStorage.setItem("sattest_onboarding_target_score", data.targetScore);
      window.localStorage.setItem("sattest_onboarding_level", data.level);
      setMode("loading");
      window.setTimeout(() => router.push(`/reading-path?lang=${language}`), 2300);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed");
    }
  }

  async function sendEmailCode() {
    if (!data.email.includes("@")) {
      setError("Avval emailingizni to'g'ri kiriting.");
      return;
    }
    setError("");
    setCodeMessage("");
    setIsSendingCode(true);
    try {
      const result = await api<{ sent: boolean; dev_code?: string }>("/api/auth/request-verification-code", {
        method: "POST",
        body: JSON.stringify({ email: data.email.trim() })
      });
      setCodeMessage(result.dev_code ? `Email code sent. Local test code: ${result.dev_code}` : "Email code sent. Check your inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send email code");
    } finally {
      setIsSendingCode(false);
    }
  }

  if (mode === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-5 text-white">
        <div className="text-center">
          <div className="mx-auto grid h-36 w-36 place-items-center rounded-full border-4 border-[#FFD700]/20">
            <div className="grid h-28 w-28 animate-spin place-items-center rounded-full border-4 border-[#FFD700] border-t-transparent" />
            <Image className="absolute h-16 w-16 rounded-full object-cover" src={lionLogo} alt="SATTEST lion crest" width={96} height={96} />
          </div>
          <h1 className="mt-8 max-w-md text-3xl font-black">{stepsCopy.loading[language]}</h1>
        </div>
      </main>
    );
  }

  if (mode === "signup") {
    return (
      <main className="min-h-screen bg-[#0a0a0a] px-5 py-6 text-white">
        <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-xl flex-col justify-between">
          <div>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((item) => (
                <span className={["h-2.5 rounded-full transition-all", item === step ? "w-8 bg-[#FFD700]" : item < step ? "w-2.5 bg-[#FFD700]/70" : "w-2.5 bg-white/18"].join(" ")} key={item} />
              ))}
            </div>
            <p className="mt-5 text-center text-sm font-bold text-white/45">Step {step} of 5</p>
          </div>

          <section className="py-10">
            {step === 1 ? (
              <QuestionFrame title={stepsCopy.name[language]}>
                <input className="mt-8 min-h-14 w-full rounded-xl border border-white/15 bg-[#151515] px-5 text-lg font-bold text-white outline-none focus:border-[#FFD700]" autoFocus value={data.name} onChange={(event) => update("name", event.target.value)} placeholder="Bakrom" />
                <PrimaryButton onClick={nextStep}>{stepsCopy.continue[language]}</PrimaryButton>
              </QuestionFrame>
            ) : null}

            {step === 2 ? (
              <QuestionFrame title={stepsCopy.target[language]}>
                <input className="mt-8 min-h-14 w-full rounded-xl border border-white/15 bg-[#151515] px-5 text-lg font-bold text-white outline-none focus:border-[#FFD700]" inputMode="numeric" value={data.targetScore} onChange={(event) => update("targetScore", event.target.value)} placeholder="1400" />
                <PrimaryButton onClick={nextStep}>{stepsCopy.continue[language]}</PrimaryButton>
              </QuestionFrame>
            ) : null}

            {step === 3 ? (
              <QuestionFrame title={stepsCopy.level[language]}>
                <div className="mt-8 grid gap-3">
                  {levelOptions.map((option) => (
                    <button
                      className={["min-h-14 rounded-xl border px-5 text-left text-lg font-black transition", data.level === option.key ? "border-[#FFD700] bg-[#FFD700] text-black" : "border-white/15 bg-[#151515] text-white hover:border-[#FFD700]"].join(" ")}
                      key={option.key}
                      onClick={() => update("level", option.key)}
                      type="button"
                    >
                      <span className="mr-3">{option.icon}</span>
                      {option[language]}
                    </button>
                  ))}
                </div>
                <PrimaryButton onClick={nextStep}>{stepsCopy.continue[language]}</PrimaryButton>
              </QuestionFrame>
            ) : null}

            {step === 4 ? (
              <form onSubmit={createAccount}>
                <QuestionFrame title={stepsCopy.account[language]}>
                  <input className="mt-8 min-h-14 w-full rounded-xl border border-white/15 bg-[#151515] px-5 text-lg font-bold text-white outline-none focus:border-[#FFD700]" type="email" value={data.email} onChange={(event) => update("email", event.target.value)} placeholder="email@example.com" />
                  <button
                    className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl border border-[#FFD700]/35 px-5 text-sm font-black text-[#FFD700] transition hover:bg-[#FFD700] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSendingCode}
                    onClick={sendEmailCode}
                    type="button"
                  >
                    {isSendingCode ? "Sending..." : stepsCopy.sendCode[language]}
                  </button>
                  <input className="mt-4 min-h-14 w-full rounded-xl border border-white/15 bg-[#151515] px-5 text-lg font-bold text-white outline-none focus:border-[#FFD700]" inputMode="numeric" maxLength={6} minLength={6} value={data.verificationCode} onChange={(event) => update("verificationCode", event.target.value)} placeholder={stepsCopy.code[language]} />
                  <input className="mt-4 min-h-14 w-full rounded-xl border border-white/15 bg-[#151515] px-5 text-lg font-bold text-white outline-none focus:border-[#FFD700]" type="password" minLength={8} value={data.password} onChange={(event) => update("password", event.target.value)} placeholder="Password" />
                  <a className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl border border-white/15 px-5 text-sm font-black text-white transition hover:border-white hover:bg-white hover:text-black" href={`${API_URL}/api/auth/google/start?next=${encodeURIComponent(`/reading-path?lang=${language}`)}`}>
                    {stepsCopy.google[language]}
                  </a>
                  {codeMessage ? <p className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-950/20 p-3 text-sm font-bold text-emerald-100">{codeMessage}</p> : null}
                  <PrimaryButton type="submit">{stepsCopy.create[language]}</PrimaryButton>
                </QuestionFrame>
              </form>
            ) : null}

            {error ? <p className="mt-5 rounded-xl border border-red-400/35 bg-red-500/10 p-4 text-sm font-bold text-red-100">{error}</p> : null}
          </section>

          <button className="mx-auto text-sm font-bold text-white/45 hover:text-white" onClick={() => (step === 1 ? setMode("welcome") : setStep((current) => current - 1))} type="button">
            Orqaga
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-white">
      <div className="absolute right-5 top-5 z-10">
        <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#151515]/85 px-3 py-2 text-sm font-black text-white/80">
          <select
            className="bg-transparent outline-none"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
          >
            <option value="uz">O'zbek</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
          <ChevronDown size={16} />
        </label>
      </div>

      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-[1fr_0.95fr]">
        <GoldIllustrationCluster />

        <div className="mx-auto w-full max-w-md">
          <h1 className="text-5xl font-black leading-tight text-white sm:text-6xl">
            {welcomeCopy[language].headline}
          </h1>
          <div className="mt-10 grid gap-4">
            {hasExistingAccount ? (
              <p className="rounded-xl border border-[#FFD700]/25 bg-[#FFD700]/10 px-4 py-3 text-sm font-bold leading-6 text-[#FFD700]">
                {welcomeCopy[language].accountNote}
              </p>
            ) : null}
            <button className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#FFD700] px-5 text-base font-black text-black transition hover:bg-white" onClick={() => (hasExistingAccount ? router.push(`/reading-path?lang=${language}`) : setMode("signup"))} type="button">
              {hasExistingAccount ? welcomeCopy[language].continuePath : welcomeCopy[language].start}
              <ArrowRight size={20} />
            </button>
            <Link className="flex min-h-14 w-full items-center justify-center rounded-xl border border-[#FFD700]/45 px-5 text-center text-base font-black text-[#FFD700] transition hover:bg-[#FFD700] hover:text-black" href={`/login?lang=${language}&next=/reading-path?lang=${language}`}>
              {welcomeCopy[language].login}
            </Link>
          </div>
        </div>
      </section>

      <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-3">
        <Image className="h-10 w-10 rounded-full object-cover" src={lionLogo} alt="SATTEST lion crest" width={80} height={80} />
        <span className="text-lg font-black">SATTEST.UZ</span>
      </div>
    </main>
  );
}

function QuestionFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h1 className="text-center text-4xl font-black leading-tight text-white sm:text-5xl">{title}</h1>
      {children}
    </div>
  );
}

function PrimaryButton({ children, onClick, type = "button" }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button className="mt-8 flex min-h-14 w-full items-center justify-center rounded-xl bg-[#FFD700] px-5 text-base font-black text-black transition hover:bg-white" onClick={onClick} type={type}>
      {children}
    </button>
  );
}

function GoldIllustrationCluster() {
  return (
    <div className="relative mx-auto h-[360px] w-full max-w-[460px]">
      <div className="absolute left-8 top-20 h-44 w-44 rotate-[-8deg] rounded-xl border border-[#FFD700]/45 bg-[#FFD700]/5" />
      <div className="absolute left-16 top-36 flex h-28 w-28 items-end gap-2 rounded-xl border border-[#FFD700]/40 p-4">
        <span className="h-10 w-5 rounded-t bg-[#FFD700]" />
        <span className="h-16 w-5 rounded-t bg-[#FFD700]" />
        <span className="h-24 w-5 rounded-t bg-[#FFD700]" />
      </div>
      <div className="absolute right-10 top-8 grid h-28 w-28 place-items-center rounded-full border border-[#FFD700]/45 bg-[#FFD700]/10">
        <Star className="text-[#FFD700]" size={48} />
      </div>
      <div className="absolute bottom-12 left-28 grid h-24 w-32 place-items-center rounded-xl border border-[#FFD700]/45 bg-black">
        <BookOpen className="text-[#FFD700]" size={52} />
      </div>
      <div className="absolute bottom-28 right-20 flex h-24 w-24 items-center justify-center rounded-full border border-[#FFD700]/55 bg-[#151515]">
        <Image className="h-16 w-16 rounded-full object-cover" src={lionLogo} alt="SATTEST lion crest" width={96} height={96} />
      </div>
      <div className="absolute right-4 top-48 rounded-xl border border-[#FFD700]/35 p-4">
        <TrendingUp className="text-[#FFD700]" size={58} />
      </div>
      <div className="absolute left-4 top-8 flex items-center gap-2 rounded-full border border-[#FFD700]/35 px-4 py-2 text-sm font-black text-[#FFD700]">
        <Check size={16} />
        1400+
      </div>
    </div>
  );
}
