"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { ReadingAnalysisView } from "@/components/ReadingAnalysisView";
import type { ReadingAnalysisResponse } from "@/lib/api";
import { useLanguage, type Language } from "@/lib/i18n";

export default function ReadingAnalyzerResultPage() {
  const { language, setLanguage } = useLanguage();
  const [result, setResult] = useState<ReadingAnalysisResponse | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("sattest_reading_analysis_latest");
      setResult(saved ? JSON.parse(saved) : null);
    } catch {
      setResult(null);
    }
  }, []);

  function changeLanguage(next: Language) {
    setLanguage(next);
  }

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />
      <section className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <Link className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-white/45 hover:text-white" href="/reading-analyzer">
          <ArrowLeft size={16} /> Analyzer
        </Link>

        <div className="mt-6 border-b border-white/10 pb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#FFD700]/75">AI result</p>
          <h1 className="mt-4 text-4xl font-light leading-tight text-white md:text-6xl">Reading analysis result</h1>
        </div>

        <div className="mt-8">
          {result ? (
            <ReadingAnalysisView result={result} language={language} onLanguageChange={changeLanguage} />
          ) : (
            <div className="border border-white/10 bg-white/[0.035] p-8 text-center">
              <Search className="mx-auto text-[#FFD700]" size={34} />
              <h2 className="mt-4 text-2xl font-light text-white">No analysis yet</h2>
              <p className="mt-3 text-sm text-white/50">Paste a SAT passage first, then your result will appear here.</p>
              <Link className="mt-6 inline-flex h-12 items-center border border-white bg-white px-6 text-xs font-black uppercase tracking-[0.18em] text-black" href="/reading-analyzer">
                Start analyzer
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
