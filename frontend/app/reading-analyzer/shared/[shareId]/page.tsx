"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { ReadingAnalysisView } from "@/components/ReadingAnalysisView";
import { ApiError, getSharedReadingAnalysis, type ReadingAnalysisResponse } from "@/lib/api";
import { useLanguage, type Language } from "@/lib/i18n";

const T = {
  en: {
    back: "Try analyzer",
    eyebrow: "Shared SATTEST.UZ analysis",
    title: "AI Reading preview",
    missing: "Shared result not found.",
    loading: "Loading shared result...",
  },
  ru: {
    back: "Попробовать анализатор",
    eyebrow: "Общий анализ SATTEST.UZ",
    title: "AI предпросмотр чтения",
    missing: "Общий результат не найден.",
    loading: "Загружаем общий результат...",
  },
  uz: {
    back: "Tahlilchini sinash",
    eyebrow: "SATTEST.UZ ulashilgan tahlil",
    title: "AI Reading oldindan ko'rish",
    missing: "Ulashilgan natija topilmadi.",
    loading: "Ulashilgan natija yuklanmoqda...",
  },
} satisfies Record<Language, Record<string, string>>;

export default function SharedReadingAnalysisPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = use(params);
  const { language, setLanguage } = useLanguage();
  const copy = T[language];
  const [result, setResult] = useState<ReadingAnalysisResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSharedReadingAnalysis(shareId)
      .then(setResult)
      .catch((caught) => {
        setError(caught instanceof ApiError ? caught.message : copy.missing);
      });
  }, [shareId, copy.missing]);

  function changeLanguage(next: Language) {
    setLanguage(next);
  }

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />
      <section className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <Link className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-white/45 hover:text-white" href={`/reading-analyzer?lang=${language}`}>
          <ArrowLeft size={16} /> {copy.back}
        </Link>
        <div className="mt-6 border-b border-white/10 pb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#FFD700]/75">{copy.eyebrow}</p>
          <h1 className="mt-4 text-4xl font-light leading-tight text-white md:text-6xl">{copy.title}</h1>
        </div>
        <div className="mt-8">
          {result ? (
            <ReadingAnalysisView result={result} language={language} onLanguageChange={changeLanguage} showSource={false} sharedPreview />
          ) : (
            <div className="border border-white/10 bg-white/[0.035] p-8 text-center">
              <AlertCircle className="mx-auto text-[#FFD700]" size={34} />
              <h2 className="mt-4 text-2xl font-light text-white">{error || copy.loading}</h2>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
