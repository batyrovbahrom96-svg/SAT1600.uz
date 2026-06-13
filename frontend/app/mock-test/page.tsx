"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Mail, X } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { freeDiagnosticQuestions, type DiagnosticAnswers } from "@/lib/free-diagnostic";
import { buildStoredFreeDiagnostic, FREE_DIAGNOSTIC_EMAIL_KEY, saveFreeDiagnosticResult } from "@/lib/free-diagnostic-storage";
import { useLanguage } from "@/lib/i18n";

const emailPromptCopy = {
  en: {
    title: "Save your results?",
    body: "Enter your email and we will keep this diagnostic session ready for your next step.",
    placeholder: "your-email@example.com",
    save: "Save my results",
    skip: "Skip"
  },
  ru: {
    title: "Сохранить результат?",
    body: "Введите email, и мы сохраним эту диагностику для следующего шага.",
    placeholder: "your-email@example.com",
    save: "Сохранить результат",
    skip: "Пропустить"
  },
  uz: {
    title: "Natijangiz saqlansinmi?",
    body: "Emailingizni kiriting, biz bu diagnostika sessiyasini keyingi qadam uchun saqlab qo'yamiz.",
    placeholder: "your-email@example.com",
    save: "Natijamni saqlash",
    skip: "O'tkazib yuborish"
  }
};

const pageCopy = {
  en: {
    eyebrow: "Free Diagnostic",
    title: "25 questions. Estimated SAT level. No signup.",
    body: "Start with a short diagnostic before Pro. You will see an estimated score, weak areas, mistake patterns, and one worked explanation before any payment wall.",
    bullets: ["No login required", "25 SAT-style questions", "Estimated score from 25 questions", "Payment wall only after results"],
    question: "Question",
    of: "of",
    answered: "answered",
    next: "Next question",
    finish: "See estimated score",
    progress: "Progress"
  },
  ru: {
    eyebrow: "Бесплатная диагностика",
    title: "25 вопросов. Оценочный уровень SAT. Без регистрации.",
    body: "Начните с короткой диагностики перед Pro. Вы увидите оценочный балл, слабые места, типы ошибок и одно подробное объяснение до любой оплаты.",
    bullets: ["Без логина", "25 вопросов в стиле SAT", "Оценочный балл по 25 вопросам", "Оплата только после результата"],
    question: "Вопрос",
    of: "из",
    answered: "отвечено",
    next: "Следующий вопрос",
    finish: "Показать оценочный балл",
    progress: "Прогресс"
  },
  uz: {
    eyebrow: "Bepul diagnostika",
    title: "25 ta savol. Taxminiy SAT darajasi. Ro'yxatdan o'tish shart emas.",
    body: "Pro'dan oldin qisqa diagnostikadan boshlang. To'lov devoridan oldin taxminiy ball, zaif joylar, xato turlari va bitta to'liq tushuntirishni ko'rasiz.",
    bullets: ["Login shart emas", "SAT uslubidagi 25 ta savol", "25 savoldan taxminiy ball", "To'lov faqat natijadan keyin"],
    question: "Savol",
    of: "dan",
    answered: "javob berildi",
    next: "Keyingi savol",
    finish: "Taxminiy ballni ko'rish",
    progress: "Jarayon"
  }
};

export default function FreeDiagnosticPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const copy = pageCopy[language];
  const emailCopy = emailPromptCopy[language];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<DiagnosticAnswers>({});
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailPromptDone, setEmailPromptDone] = useState(false);
  const [email, setEmail] = useState("");

  const currentQuestion = freeDiagnosticQuestions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const progress = Math.round((answeredCount / freeDiagnosticQuestions.length) * 100);

  function chooseAnswer(choice: string) {
    if (!currentQuestion) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: choice }));
  }

  function continueDiagnostic() {
    if (currentIndex === 9 && !emailPromptDone) {
      setShowEmailPrompt(true);
      return;
    }

    if (currentIndex < freeDiagnosticQuestions.length - 1) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    if (typeof window !== "undefined") {
      const sessionId = `fd-${Date.now()}`;
      const diagnosticPayload = buildStoredFreeDiagnostic({
        sessionId,
        answers,
        email: email || window.localStorage.getItem(FREE_DIAGNOSTIC_EMAIL_KEY) || ""
      });
      saveFreeDiagnosticResult(diagnosticPayload);
    }
    router.push("/mock-test/results");
  }

  function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (trimmed && typeof window !== "undefined") {
      window.localStorage.setItem(FREE_DIAGNOSTIC_EMAIL_KEY, trimmed);
    }
    setEmailPromptDone(true);
    setShowEmailPrompt(false);
    setCurrentIndex((index) => index + 1);
  }

  function skipEmail() {
    setEmailPromptDone(true);
    setShowEmailPrompt(false);
    setCurrentIndex((index) => index + 1);
  }

  return (
    <main className="min-h-screen bg-[#080908] text-white">
      <LuxuryNavbar />
      <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl gap-8 px-5 py-10 md:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#c8bd88]">{copy.eyebrow}</p>
          <h1 className="mt-6 max-w-4xl text-5xl font-light leading-none text-white md:text-7xl">{copy.title}</h1>
          <p className="mt-7 max-w-2xl text-lg font-light leading-8 text-white/58">{copy.body}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {copy.bullets.map((item) => (
              <div className="flex items-center gap-3 border border-white/10 bg-white/[0.035] p-3 text-sm text-white/68" key={item}>
                <Check className="text-[#c8bd88]" size={16} />
                {item}
              </div>
            ))}
          </div>
        </div>

        {currentQuestion ? (
          <section className="border border-white/10 bg-white/[0.035] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="border-b border-white/10 pb-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/42">
                    {copy.question} {currentIndex + 1} {copy.of} {freeDiagnosticQuestions.length}
                  </p>
                  <h2 className="mt-3 text-3xl font-light text-white" data-sattest-no-translate="true">
                    {currentQuestion.topic}
                  </h2>
                </div>
                <div className="border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/58">
                  {answeredCount}/{freeDiagnosticQuestions.length} {copy.answered}
                </div>
              </div>
              <div className="mt-5 h-1.5 overflow-hidden bg-white/10">
                <div className="h-full bg-[#c8bd88] transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <p className="mt-8 max-w-4xl text-2xl font-light leading-snug text-white md:text-3xl" data-sattest-no-translate="true">
              {currentQuestion.prompt}
            </p>

            <div className="mt-8 grid gap-3">
              {currentQuestion.choices.map((choice, index) => {
                const isSelected = selectedAnswer === choice;
                return (
                  <button
                    className={[
                      "flex min-h-14 items-center gap-4 border px-4 py-4 text-left text-base transition-colors",
                      isSelected
                        ? "border-[#c8bd88]/65 bg-[#c8bd88]/12 text-white"
                        : "border-white/10 bg-black/20 text-white/72 hover:border-white/35 hover:bg-white/[0.06]"
                    ].join(" ")}
                    data-sattest-no-translate="true"
                    key={choice}
                    onClick={() => chooseAnswer(choice)}
                    type="button"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current text-xs font-black">
                      {String.fromCharCode(65 + index)}
                    </span>
                    {choice}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                className="flex h-13 min-w-[260px] items-center justify-between border border-white bg-white px-5 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                disabled={selectedAnswer === undefined}
                onClick={continueDiagnostic}
                type="button"
              >
                {currentIndex === freeDiagnosticQuestions.length - 1 ? copy.finish : copy.next} <ArrowRight size={18} />
              </button>
            </div>
          </section>
        ) : null}
      </section>

      {showEmailPrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
          <form className="w-full max-w-lg border border-white/15 bg-[#111211] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.5)]" onSubmit={saveEmail}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center border border-white/10 bg-black/30 text-[#c8bd88]">
                <Mail size={21} />
              </div>
              <button className="text-white/50 transition-colors hover:text-white" onClick={skipEmail} type="button" aria-label={emailCopy.skip}>
                <X size={22} />
              </button>
            </div>
            <h2 className="mt-5 text-3xl font-light text-white">{emailCopy.title}</h2>
            <p className="mt-3 text-sm leading-6 text-white/58">{emailCopy.body}</p>
            <input
              className="mt-5 w-full border border-white/10 bg-black/30 px-4 py-4 text-white outline-none transition-colors focus:border-white"
              onChange={(event) => setEmail(event.target.value)}
              placeholder={emailCopy.placeholder}
              type="email"
              value={email}
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button className="border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-black transition-colors hover:bg-transparent hover:text-white" type="submit">
                {emailCopy.save}
              </button>
              <button className="border border-white/15 bg-black/20 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-white/68 transition-colors hover:border-white/35 hover:text-white" onClick={skipEmail} type="button">
                {emailCopy.skip}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
