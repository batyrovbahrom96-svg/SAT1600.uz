"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, Copy, Lightbulb, Lock, MessageCircle, Share2, Sparkles, Theater } from "lucide-react";
import type { ReadingAnalysis, ReadingAnalysisResponse } from "@/lib/api";
import type { Language } from "@/lib/i18n";

type Props = {
  result: ReadingAnalysisResponse;
  language: Language;
  onLanguageChange?: (language: Language) => void;
  showSource?: boolean;
};

const languageLabels: Record<Language, string> = {
  uz: "UZ",
  ru: "RU",
  en: "EN",
};

export function ReadingAnalysisView({ result, language, onLanguageChange, showSource = true }: Props) {
  const analysis = result.analysis;
  const shareUrl = result.share_url || `https://www.sattest.uz/shared/${result.share_id}`;
  const mainIdea = localized(analysis.main_idea, language);
  const tip = localized(analysis.sat_tip, language);
  const tone = localizedExplanation(analysis.tone, language);
  const purpose = localizedExplanation(analysis.purpose, language);
  const words = Array.isArray(analysis.difficult_words) ? analysis.difficult_words : [];

  function copyShareLink() {
    if (typeof navigator !== "undefined") {
      navigator.clipboard?.writeText(shareUrl).catch(() => undefined);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/[0.035] p-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-white/38">AI Reading Analyzer</p>
          <p className="mt-2 text-sm text-white/55">
            {analysis.passage_type || "SAT Passage"} • {analysis.difficulty || "Medium"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-white/10 bg-black/20 p-1">
            {(["uz", "ru", "en"] as Language[]).map((item) => (
              <button
                className={[
                  "h-9 px-3 text-[10px] font-black uppercase tracking-[0.16em]",
                  language === item ? "bg-white text-black" : "text-white/50 hover:text-white",
                ].join(" ")}
                disabled={!onLanguageChange}
                key={item}
                onClick={() => onLanguageChange?.(item)}
                type="button"
              >
                {languageLabels[item]}
              </button>
            ))}
          </div>
          <button
            className="inline-flex h-11 items-center gap-2 border border-white/15 bg-black/20 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/70 hover:border-white/35 hover:text-white"
            onClick={copyShareLink}
            type="button"
          >
            <Share2 size={15} /> Share Results
          </button>
        </div>
      </div>

      {showSource ? (
        <section className="border border-white/10 bg-black/20 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">Original passage</p>
          <p className="mt-3 max-h-48 overflow-auto text-sm font-light leading-7 text-white/58">{result.source_text}</p>
        </section>
      ) : null}

      <AnalysisCard icon={<Lightbulb size={22} />} title="💡 ASOSIY G'OYA">
        <p className="text-base font-light leading-7 text-white/72">{mainIdea}</p>
      </AnalysisCard>

      <AnalysisCard icon={<BookOpen size={22} />} title="📚 QIYIN SO'ZLAR">
        <div className="grid gap-3">
          {words.length ? (
            words.map((item) => (
              <div className="border border-white/10 bg-black/20 p-4" key={`${item.word}-${item.example}`}>
                <p className="text-lg font-semibold text-white">{item.word}</p>
                <p className="mt-2 text-sm font-light leading-6 text-white/62">{wordDefinition(item, language)}</p>
                {item.example ? <p className="mt-2 text-xs font-light leading-5 text-white/40">Example: {item.example}</p> : null}
              </div>
            ))
          ) : (
            <p className="text-white/55">No difficult words detected.</p>
          )}
        </div>
      </AnalysisCard>

      <AnalysisCard icon={<Theater size={22} />} title="🎭 TON VA MAQSAD">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">Ton</p>
            <p className="mt-2 text-xl font-light text-white">{analysis.tone?.type || "Informative"}</p>
            <p className="mt-2 text-sm font-light leading-6 text-white/58">{tone}</p>
          </div>
          <div className="border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">Maqsad</p>
            <p className="mt-2 text-xl font-light text-white">{analysis.purpose?.type || "To inform"}</p>
            <p className="mt-2 text-sm font-light leading-6 text-white/58">{purpose}</p>
          </div>
        </div>
      </AnalysisCard>

      <AnalysisCard icon={<MessageCircle size={22} />} title="📝 MASHQ SAVOLLARI">
        {analysis.practice_questions === "LOCKED" ? (
          <div className="border border-[#FFD700]/25 bg-[#FFD700]/10 p-5 text-center">
            <Lock className="mx-auto text-[#FFD700]" size={28} />
            <p className="mt-3 text-lg font-semibold text-white">Practice questions locked for free users.</p>
            <p className="mt-2 text-sm text-white/55">Pro olish uchun:</p>
            <Link
              className="mt-4 inline-flex h-12 items-center gap-3 border border-[#FFD700] bg-[#FFD700] px-6 text-xs font-black uppercase tracking-[0.18em] text-black"
              href="/pricing?lang=en"
            >
              300,000 UZS/oy <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {analysis.practice_questions.map((question, index) => (
              <div className="border border-white/10 bg-black/20 p-5" key={`${question.question}-${index}`}>
                <p className="text-lg font-semibold leading-7 text-white">{index + 1}. {question.question}</p>
                <div className="mt-4 grid gap-2">
                  {(["A", "B", "C", "D"] as const).map((option) => (
                    <div className="border border-white/10 px-4 py-3 text-sm text-white/62" key={option}>
                      <span className="font-black text-white">{option}.</span> {question.options?.[option]}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm font-semibold text-[#FFD700]">Correct: {question.correct}</p>
                <p className="mt-2 text-sm font-light leading-6 text-white/58">{question.explanation}</p>
              </div>
            ))}
          </div>
        )}
      </AnalysisCard>

      <AnalysisCard icon={<Sparkles size={22} />} title="💡 SAT MASLAHATI">
        <p className="text-base font-light leading-7 text-white/72">{tip}</p>
        <div className="mt-5 border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-semibold text-white">Bu passage turida zaif emasmisiz? 🤔</p>
          <Link className="mt-2 inline-flex items-center gap-2 text-sm font-black text-[#FFD700]" href="/diagnostic">
            Diagnostic test topshing <ArrowRight size={15} />
          </Link>
        </div>
      </AnalysisCard>
    </div>
  );
}

function AnalysisCard({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <section className="border border-white/10 bg-white/[0.035] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.2)] md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center border border-white/10 bg-black/25 text-[#FFD700]">{icon}</div>
        <h2 className="text-2xl font-light text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function localized(value: ReadingAnalysis["main_idea"] | ReadingAnalysis["sat_tip"], language: Language) {
  if (language === "ru") return value.russian || value.english || value.uzbek || "";
  if (language === "en") return value.english || value.uzbek || value.russian || "";
  return value.uzbek || value.english || value.russian || "";
}

function localizedExplanation(value: ReadingAnalysis["tone"] | ReadingAnalysis["purpose"], language: Language) {
  if (language === "ru") return value?.explanation_ru || value?.explanation_en || value?.explanation_uz || "";
  if (language === "en") return value?.explanation_en || value?.explanation_uz || value?.explanation_ru || "";
  return value?.explanation_uz || value?.explanation_en || value?.explanation_ru || "";
}

function wordDefinition(item: ReadingAnalysis["difficult_words"][number], language: Language) {
  if (language === "ru") return item.definition_ru || item.definition_en || item.definition_uz || "";
  if (language === "en") return item.definition_en || item.definition_uz || item.definition_ru || "";
  return item.definition_uz || item.definition_en || item.definition_ru || "";
}
