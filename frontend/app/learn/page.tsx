"use client";

import Image from "next/image";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, saveAuth } from "@/lib/api";
import type { Language } from "@/lib/i18n";

type SignupData = {
  name: string;
  targetScore: string;
  examDate: string;
  experience: "first_time" | "tried_before" | "sat_before" | "";
  dailyGoal: string;
  email: string;
  password: string;
  verificationCode: string;
};

const lionLogo = "/assets/brand/sattest-lion-crest.png";

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
    uz: "Hozir SAT bo'yicha tajribangiz qanday?",
    ru: "Какой у вас опыт с SAT сейчас?",
    en: "What is your SAT experience right now?"
  },
  account: {
    uz: "SATTEST'ga xush kelibsiz",
    ru: "Добро пожаловать в SATTEST",
    en: "Welcome to SATTEST"
  },
  timeline: {
    uz: "Imtihon sanangiz bormi?",
    ru: "У вас есть дата экзамена?",
    en: "Do you have an exam date?"
  },
  noDate: {
    uz: "Hali bilmayman",
    ru: "Пока не знаю",
    en: "I do not know yet"
  },
  diagnostic: {
    uz: "Endi diagnostikadan boshlaymiz",
    ru: "Теперь начнём с диагностики",
    en: "Now we start with the diagnostic"
  },
  diagnosticBody: {
    uz: "Bu majburiy birinchi qadam: taxminiy ballingiz, zaif joylaringiz va birinchi darsingiz shu testdan keyin chiqadi.",
    ru: "Это обязательный первый шаг: после теста появятся ваш примерный балл, слабые места и первый урок.",
    en: "This is the required first step: your estimated score, weak areas, and first lesson come from this test."
  },
  startDiagnostic: {
    uz: "Diagnostikani boshlash →",
    ru: "Начать диагностику →",
    en: "Start diagnostic →"
  },
  dailyGoal: {
    uz: "Kunlik maqsad: nechta dars?",
    ru: "Дневная цель: сколько уроков?",
    en: "Daily goal: how many lessons?"
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
  loading: {
    uz: "Sizning shaxsiy yo'lingiz tayyorlanmoqda...",
    ru: "Ваш личный путь готовится...",
    en: "Your personal path is being prepared..."
  }
};

const levelOptions = [
  { key: "first_time", icon: "🌱", uz: "Birinchi marta tayyorlanaman", ru: "Готовлюсь впервые", en: "Preparing for the first time" },
  { key: "tried_before", icon: "📈", uz: "Avval o'qigan/sinab ko'rganman", ru: "Я уже готовился/пробовал", en: "I have studied or tried before" },
  { key: "sat_before", icon: "🏆", uz: "Oldin SAT topshirganman", ru: "Я уже сдавал SAT", en: "I have taken the SAT before" }
] as const;

export default function LearnPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("uz");
  const [mode, setMode] = useState<"signup" | "loading">("signup");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [data, setData] = useState<SignupData>({
    name: "",
    targetScore: "1400",
    examDate: "",
    experience: "",
    dailyGoal: "2",
    email: "",
    password: "",
    verificationCode: ""
  });
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeMessage, setCodeMessage] = useState("");
  const [hasExistingAccount, setHasExistingAccount] = useState(false);

  useEffect(() => {
    const hasToken = Boolean(getToken());
    setHasExistingAccount(hasToken);
    if (hasToken) setStep(2);
    const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
    if (requestedLanguage === "uz" || requestedLanguage === "ru" || requestedLanguage === "en") {
      setLanguage(requestedLanguage);
    }
  }, []);

  function changeLanguage(next: Language) {
    setLanguage(next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function update<K extends keyof SignupData>(key: K, value: SignupData[K]) {
    setData((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function nextStep() {
    if (step === 2 && (!Number(data.targetScore) || Number(data.targetScore) < 400 || Number(data.targetScore) > 1600)) {
      setError("SAT ball 400 va 1600 orasida bo'lishi kerak.");
      return;
    }
    if (step === 4 && !data.experience) {
      setError("Bitta darajani tanlang.");
      return;
    }
    setStep((current) => current + 1);
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (data.name.trim().length < 2) {
      setError("Ism kamida 2 ta belgidan iborat bo'lishi kerak.");
      return;
    }
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
          target_score: 1400,
          self_assessed_level: "beginner"
        })
      });
      saveAuth(result.access_token, result.full_name || data.name.trim());
      setHasExistingAccount(true);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed");
    }
  }

  async function startDiagnostic() {
    setError("");
    if (!getToken()) {
      setStep(1);
      setError("Avval account yarating.");
      return;
    }
    if (!data.experience) {
      setStep(4);
      setError("Tajribangizni tanlang.");
      return;
    }

    const goToDiagnostic = () => {
      window.localStorage.setItem("sattest_onboarding_target_score", data.targetScore);
      window.localStorage.setItem("sattest_onboarding_exam_date", data.examDate);
      window.localStorage.setItem("sattest_onboarding_experience", data.experience);
      window.localStorage.setItem("sattest_path_daily_goal", data.dailyGoal);
      window.localStorage.setItem("sattest_after_diagnostic_next", `/path?lang=${language}`);
      setMode("loading");
      window.setTimeout(() => router.push(`/mock-test/diagnostic?lang=${language}&from=learn`), 1200);
    };

    goToDiagnostic();

    try {
      await api<{ ok: boolean }>("/api/auth/onboarding-profile", {
        method: "POST",
        body: JSON.stringify({
          target_score: Number(data.targetScore),
          exam_date: data.examDate || null,
          sat_experience: data.experience,
          daily_goal: Number(data.dailyGoal) || 2
        })
      });
    } catch (err) {
      console.warn("Onboarding profile sync failed; continuing to diagnostic.", err);
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
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <span className={["h-2.5 rounded-full transition-all", item === step ? "w-8 bg-[#FFD700]" : item < step ? "w-2.5 bg-[#FFD700]/70" : "w-2.5 bg-white/18"].join(" ")} key={item} />
              ))}
            </div>
            <p className="mt-5 text-center text-sm font-bold text-white/45">Step {step} of 6</p>
          </div>

          <section className="py-10">
            {step === 1 ? (
              <form onSubmit={createAccount}>
                <QuestionFrame title={stepsCopy.account[language]}>
                  <input className="mt-8 min-h-14 w-full rounded-xl border border-white/15 bg-[#151515] px-5 text-lg font-bold text-white outline-none focus:border-[#FFD700]" autoFocus value={data.name} onChange={(event) => update("name", event.target.value)} placeholder={stepsCopy.name[language]} />
                  <input className="mt-4 min-h-14 w-full rounded-xl border border-white/15 bg-[#151515] px-5 text-lg font-bold text-white outline-none focus:border-[#FFD700]" type="email" value={data.email} onChange={(event) => update("email", event.target.value)} placeholder="email@example.com" />
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
                  {codeMessage ? <p className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-950/20 p-3 text-sm font-bold text-emerald-100">{codeMessage}</p> : null}
                  <PrimaryButton type="submit">{stepsCopy.create[language]}</PrimaryButton>
                </QuestionFrame>
              </form>
            ) : null}

            {step === 2 ? (
              <QuestionFrame title={stepsCopy.target[language]}>
                <input className="mt-8 min-h-14 w-full rounded-xl border border-white/15 bg-[#151515] px-5 text-lg font-bold text-white outline-none focus:border-[#FFD700]" inputMode="numeric" value={data.targetScore} onChange={(event) => update("targetScore", event.target.value)} placeholder="1400" />
                <PrimaryButton onClick={nextStep}>{stepsCopy.continue[language]}</PrimaryButton>
              </QuestionFrame>
            ) : null}

            {step === 3 ? (
              <QuestionFrame title={stepsCopy.timeline[language]}>
                <input className="mt-8 min-h-14 w-full rounded-xl border border-white/15 bg-[#151515] px-5 text-lg font-bold text-white outline-none focus:border-[#FFD700]" value={data.examDate} onChange={(event) => update("examDate", event.target.value)} type="date" />
                <button className="mt-4 min-h-12 w-full rounded-xl border border-white/15 px-5 text-sm font-black text-white/70 hover:border-[#FFD700] hover:text-[#FFD700]" onClick={() => update("examDate", "")} type="button">
                  {stepsCopy.noDate[language]}
                </button>
                <PrimaryButton onClick={nextStep}>{stepsCopy.continue[language]}</PrimaryButton>
              </QuestionFrame>
            ) : null}

            {step === 4 ? (
              <QuestionFrame title={stepsCopy.level[language]}>
                <div className="mt-8 grid gap-3">
                  {levelOptions.map((option) => (
                    <button
                      className={["min-h-14 rounded-xl border px-5 text-left text-lg font-black transition", data.experience === option.key ? "border-[#FFD700] bg-[#FFD700] text-black" : "border-white/15 bg-[#151515] text-white hover:border-[#FFD700]"].join(" ")}
                      key={option.key}
                      onClick={() => update("experience", option.key)}
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

            {step === 5 ? (
              <QuestionFrame title={stepsCopy.diagnostic[language]}>
                <p className="mt-6 rounded-2xl border border-[#FFD700]/25 bg-[#FFD700]/10 p-5 text-center text-base font-bold leading-7 text-white/75">
                  {stepsCopy.diagnosticBody[language]}
                </p>
                <label className="mt-6 grid gap-2 text-sm font-bold text-white/65">
                  {stepsCopy.dailyGoal[language]}
                  <input className="min-h-14 rounded-xl border border-white/15 bg-[#151515] px-5 text-lg font-bold text-white outline-none focus:border-[#FFD700]" min={1} max={8} type="number" value={data.dailyGoal} onChange={(event) => update("dailyGoal", event.target.value)} />
                </label>
                <PrimaryButton onClick={startDiagnostic}>{stepsCopy.startDiagnostic[language]}</PrimaryButton>
              </QuestionFrame>
            ) : null}

            {error ? <p className="mt-5 rounded-xl border border-red-400/35 bg-red-500/10 p-4 text-sm font-bold text-red-100">{error}</p> : null}
          </section>

          <button className="mx-auto text-sm font-bold text-white/45 hover:text-white" onClick={() => setStep((current) => Math.max(hasExistingAccount ? 2 : 1, current - 1))} type="button">
            Orqaga
          </button>
        </div>
      </main>
    );
  }

  return null;
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
