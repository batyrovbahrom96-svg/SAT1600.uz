"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, Search } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { ReadingAnalysisView } from "@/components/ReadingAnalysisView";
import { getReadingAnalyzerHistory, type ReadingAnalysisResponse } from "@/lib/api";
import { useLanguage, type Language } from "@/lib/i18n";

const T = {
  en: {
    back: "Analyzer",
    eyebrow: "AI result",
    title: "Your AI Analysis",
    no_analysis: "No analysis yet",
    no_analysis_sub: "Paste a SAT passage first, then your result will appear here.",
    start_btn: "Start Analyzer",
    get: ["💡 Main idea simplified", "📚 Vocabulary explained", "🎭 Tone & purpose", "🎯 SAT strategy tips", "📝 Practice questions (Pro)"],
    example: "Example results",
    example_preview: "💡 Main idea → 📚 Key vocabulary → 🎯 SAT strategy → 📝 Pro questions",
    history: "📊 Your Analysis History",
    empty_history: "Your last analyses will appear here.",
  },
  ru: {
    back: "Анализатор",
    eyebrow: "AI результат",
    title: "Ваш AI Анализ",
    no_analysis: "Анализ ещё не готов",
    no_analysis_sub: "Вставьте отрывок SAT и результат появится здесь.",
    start_btn: "Начать анализ",
    get: ["💡 Главная идея простыми словами", "📚 Объяснение слов", "🎭 Тон и цель", "🎯 SAT стратегия", "📝 Вопросы для практики (Pro)"],
    example: "Пример результата",
    example_preview: "💡 Главная идея → 📚 Ключевые слова → 🎯 SAT стратегия → 📝 Pro вопросы",
    history: "📊 История анализов",
    empty_history: "Ваши последние анализы появятся здесь.",
  },
  uz: {
    back: "Analyzer",
    eyebrow: "AI natija",
    title: "Sizning AI Tahliliz",
    no_analysis: "Tahlil hali yo'q",
    no_analysis_sub: "SAT matnini joylashtiring va natija bu yerda chiqadi.",
    start_btn: "Tahlilni Boshlash",
    get: ["💡 Asosiy g'oya sodda tushuntiriladi", "📚 So'zlar izohlanadi", "🎭 Ton va maqsad", "🎯 SAT strategiyasi", "📝 Mashq savollari (Pro)"],
    example: "Namuna natija",
    example_preview: "💡 Asosiy g'oya → 📚 Muhim so'zlar → 🎯 SAT strategiyasi → 📝 Pro savollar",
    history: "📊 Tahlil tarixingiz",
    empty_history: "Oxirgi tahlillaringiz shu yerda chiqadi.",
  },
} satisfies Record<Language, Record<string, string | string[]>>;

export default function ReadingAnalyzerResultPage() {
  const { language, setLanguage } = useLanguage();
  const copy = T[language];
  const [result, setResult] = useState<ReadingAnalysisResponse | null>(null);
  const [history, setHistory] = useState<Array<{ share_id: string; created_at: string; passage_type: string; difficulty: string; source_preview: string }>>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("sattest_reading_analysis_latest");
      setResult(saved ? JSON.parse(saved) : null);
    } catch {
      setResult(null);
    }
    getReadingAnalyzerHistory().then(setHistory).catch(() => undefined);
  }, []);

  function changeLanguage(next: Language) {
    setLanguage(next);
  }

  return (
    <main className="min-h-screen bg-[#0d0e0f] text-white">
      <LuxuryNavbar />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:px-8">
        <Link className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-white/45 hover:text-white" href={`/reading-analyzer?lang=${language}`}>
          <ArrowLeft size={16} /> {copy.back as string}
        </Link>

        <div className="mt-6 border-b border-white/10 pb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#FFD700]/75">{copy.eyebrow as string}</p>
          <h1 className="mt-4 text-4xl font-light leading-tight text-white md:text-6xl">{copy.title as string}</h1>
        </div>

        <div className="mt-8">
          {result ? (
            <ReadingAnalysisView result={result} language={language} onLanguageChange={changeLanguage} />
          ) : (
            <div className="border border-white/10 bg-white/[0.04] p-6 text-center md:p-10">
              <Search className="mx-auto text-[#FFD700]" size={44} />
              <h2 className="mt-4 text-3xl font-light text-white">{copy.no_analysis as string}</h2>
              <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-white/55">{copy.no_analysis_sub as string}</p>
              <div className="mx-auto mt-6 grid max-w-xl gap-2 text-left text-sm text-white/65 sm:grid-cols-2">
                {(copy.get as string[]).map((item) => <div className="border border-white/10 bg-black/20 p-3" key={item}>{item}</div>)}
              </div>
              <Link className="mt-7 inline-flex min-h-12 items-center justify-center border border-[#FFD700] bg-[#FFD700] px-7 text-sm font-black uppercase tracking-[0.14em] text-black" href={`/reading-analyzer?lang=${language}`}>
                {copy.start_btn as string}
              </Link>
              <div className="mx-auto mt-7 max-w-md border border-white/10 bg-black/20 p-4 text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">{copy.example as string}</p>
                <p className="mt-3 text-sm leading-6 text-white/62">{copy.example_preview as string}</p>
              </div>
            </div>
          )}
        </div>

        <section className="mt-8 border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-[#FFD700]" size={22} />
            <h2 className="text-2xl font-light text-white">{copy.history as string}</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {history.length ? history.map((item) => (
              <Link className="border border-white/10 bg-black/20 p-4 transition hover:border-[#FFD700]/40" href={`/reading-analyzer/shared/${item.share_id}?lang=${language}`} key={item.share_id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">{translatePassageType(item.passage_type, language)} • {translateDifficulty(item.difficulty, language)}</p>
                  <p className="text-xs text-white/38">{new Date(item.created_at).toLocaleDateString()}</p>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-white/45">{item.source_preview}</p>
              </Link>
            )) : <p className="text-sm text-white/45">{copy.empty_history as string}</p>}
          </div>
        </section>
      </section>
    </main>
  );
}

function translateDifficulty(value: string | undefined, language: Language) {
  const normalized = (value || "Medium").toLowerCase();
  if (language === "ru") {
    if (normalized.includes("easy")) return "Лёгкий";
    if (normalized.includes("hard")) return "Сложный";
    return "Средний";
  }
  if (language === "uz") {
    if (normalized.includes("easy")) return "Oson";
    if (normalized.includes("hard")) return "Qiyin";
    return "O'rtacha";
  }
  if (normalized.includes("easy")) return "Easy";
  if (normalized.includes("hard")) return "Hard";
  return "Medium";
}

function translatePassageType(value: string | undefined, language: Language) {
  const normalized = (value || "").toLowerCase();
  const map = {
    en: { literature: "Literature", science: "Science", history: "History", social: "Social Science", fallback: "SAT Passage" },
    ru: { literature: "Литература", science: "Наука", history: "История", social: "Социальные науки", fallback: "Текст SAT" },
    uz: { literature: "Adabiyot", science: "Fan", history: "Tarix", social: "Ijtimoiy fan", fallback: "SAT matni" },
  }[language];
  if (normalized.includes("literature")) return map.literature;
  if (normalized.includes("science") && !normalized.includes("social")) return map.science;
  if (normalized.includes("history")) return map.history;
  if (normalized.includes("social")) return map.social;
  return map.fallback;
}
