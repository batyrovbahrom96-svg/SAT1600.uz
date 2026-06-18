"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Brain, Loader2, Lock, Search, Sparkles } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { ApiError, analyzePassage, getToken, type ReadingAnalysisResponse } from "@/lib/api";
import { useLanguage, type Language } from "@/lib/i18n";

const loadingCopy: Record<Language, string[]> = {
  uz: ["AI passage tahlil qilmoqda... 🤖", "Qiyin so'zlar aniqlanmoqda... 📚", "Savol tayyorlanmoqda... 📝"],
  ru: ["AI анализирует passage... 🤖", "Сложные слова находятся... 📚", "Вопросы готовятся... 📝"],
  en: ["AI analyzing passage... 🤖", "Finding difficult words... 📚", "Generating questions... 📝"],
};

const pageCopy: Record<Language, { title: string; subtitle: string; placeholder: string; cta: string; free: string; pro: string }> = {
  uz: {
    title: "AI READING ANALYZER",
    subtitle: "SAT passages ni tushunish endi OSON! 🎯",
    placeholder: "Passage yoki gapni bu yerga joylashtiring...",
    cta: "Tahlil Qilish",
    free: "FREE: 3 ta tahlil/kun",
    pro: "PRO: Cheksiz ♾️",
  },
  ru: {
    title: "AI READING ANALYZER",
    subtitle: "Понимать SAT passages теперь проще! 🎯",
    placeholder: "Вставьте passage или предложение сюда...",
    cta: "Анализировать",
    free: "FREE: 3 анализа/день",
    pro: "PRO: Безлимит ♾️",
  },
  en: {
    title: "AI READING ANALYZER",
    subtitle: "SAT passages are now easier to understand! 🎯",
    placeholder: "Paste a passage or sentence here...",
    cta: "Analyze",
    free: "FREE: 3 analyses/day",
    pro: "PRO: Unlimited ♾️",
  },
};

export default function ReadingAnalyzerPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const copy = pageCopy[language];
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [error, setError] = useState("");
  const loadingMessages = useMemo(() => loadingCopy[language], [language]);

  useEffect(() => {
    if (!isLoading) return undefined;
    const timer = window.setInterval(() => setLoadingIndex((current) => (current + 1) % loadingMessages.length), 1200);
    return () => window.clearInterval(timer);
  }, [isLoading, loadingMessages.length]);

  async function submit() {
    setError("");
    if (!getToken()) {
      router.push(`/login?next=/reading-analyzer`);
      return;
    }
    if (text.trim().length < 20) {
      setError("Please paste at least one full SAT sentence.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await analyzePassage({ text, language });
      saveResult(result);
      router.push("/reading-analyzer/result");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) {
        setError("Free limit reached. Upgrade to Pro for unlimited analyses.");
      } else {
        setError(caught instanceof Error ? caught.message : "Unable to analyze this passage.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />
      <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-6xl gap-8 px-5 py-12 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#FFD700]/75">SATTEST.UZ AI</p>
          <h1 className="mt-6 text-5xl font-light leading-none md:text-7xl">Reading made clear.</h1>
          <p className="mt-6 max-w-xl text-lg font-light leading-8 text-white/55">
            Paste any SAT Reading passage and get the main idea, difficult words, tone, purpose, SAT tips, and Pro practice questions.
          </p>
          <div className="mt-7 grid gap-3 text-sm text-white/58">
            <span className="inline-flex items-center gap-3"><Sparkles className="text-[#FFD700]" size={18} /> Main idea simplified in 3 languages</span>
            <span className="inline-flex items-center gap-3"><Brain className="text-[#FFD700]" size={18} /> Claude-powered SAT tutor analysis</span>
            <span className="inline-flex items-center gap-3"><Lock className="text-[#FFD700]" size={18} /> Free: 3/day. Pro: unlimited</span>
          </div>
        </div>

        <article className="border border-white/10 bg-white/[0.035] p-5 shadow-[0_34px_100px_rgba(0,0,0,0.35)] md:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center border border-white/10 bg-black/25 text-[#FFD700]">
              <Search size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-light text-white">🔍 {copy.title}</h2>
              <p className="mt-1 text-sm text-white/50">{copy.subtitle}</p>
            </div>
          </div>

          <textarea
            className="mt-6 min-h-[280px] w-full resize-y border border-white/10 bg-black/30 p-4 text-base font-light leading-7 text-white outline-none transition-colors placeholder:text-white/28 focus:border-[#FFD700]/60"
            maxLength={9000}
            onChange={(event) => setText(event.target.value)}
            placeholder={copy.placeholder}
            value={text}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold text-white/42">
              {copy.free}<span className="mx-2 text-white/20">•</span>{copy.pro}
            </div>
            <div className="text-xs text-white/35">{text.length}/9000</div>
          </div>

          {error ? <div className="mt-4 border border-red-300/25 bg-red-950/25 p-4 text-sm text-red-100">{error}</div> : null}

          {isLoading ? (
            <div className="mt-5 flex min-h-16 items-center justify-center gap-3 border border-[#FFD700]/25 bg-[#FFD700]/10 px-5 py-4 text-[#FFD700]">
              <Loader2 className="animate-spin" size={20} />
              <span className="font-semibold">{loadingMessages[loadingIndex]}</span>
            </div>
          ) : (
            <button
              className="mt-5 flex h-14 w-full items-center justify-center gap-3 border border-[#FFD700] bg-[#FFD700] px-5 text-sm font-black uppercase tracking-[0.18em] text-black transition-colors hover:bg-transparent hover:text-[#FFD700]"
              onClick={submit}
              type="button"
            >
              🔍 {copy.cta} <ArrowRight size={18} />
            </button>
          )}
        </article>
      </section>
    </main>
  );
}

function saveResult(result: ReadingAnalysisResponse) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("sattest_reading_analysis_latest", JSON.stringify(result));
}
