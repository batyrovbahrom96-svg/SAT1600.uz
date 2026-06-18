"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, CheckCircle, Clock, Copy, Eye, Lightbulb, Lock, Share2, Sparkles, Target, Theater, XCircle } from "lucide-react";
import type { ReadingAnalysis, ReadingAnalysisResponse } from "@/lib/api";
import type { Language } from "@/lib/i18n";

type Props = {
  result: ReadingAnalysisResponse;
  language: Language;
  onLanguageChange?: (language: Language) => void;
  showSource?: boolean;
  sharedPreview?: boolean;
};

const T = {
  en: {
    result_title: "Your AI Analysis",
    complete: "Analysis Complete!",
    passage_type: "Passage type",
    difficulty: "Difficulty",
    reading_time: "Reading time",
    main_idea: "💡 Main Idea",
    one_sentence: "One sentence summary",
    sat_connection: "🔑 SAT Connection",
    vocabulary: "📚 Key Vocabulary",
    definition: "Definition",
    in_context: "In context",
    memory: "Memory trick",
    frequency: "SAT frequency",
    tone_purpose: "🎭 Tone & Purpose",
    tone: "Tone",
    purpose: "Purpose",
    author_view: "Author's view",
    why_matters: "Why this matters for SAT",
    strategy: "🎯 SAT Strategy",
    for_type: "For THIS passage type",
    do: "DO",
    avoid: "AVOID",
    time_tip: "Time tip",
    score_impact: "Score impact",
    practice: "📝 Practice Questions",
    locked_questions: "3 SAT-style questions with full explanations available in Pro",
    improvement: "📈 Your Reading Improvement Plan",
    locked_plan: "Your 3-week plan is available in Pro.",
    week1: "Week 1",
    week2: "Week 2",
    week3: "Week 3",
    upgrade: "🔑 Upgrade to Pro →",
    analyze_again: "🔍 Analyze Another Passage",
    share: "📤 Share Results",
    copied: "Copied",
    cta_title: "Unlock the full SAT Reading route",
    social: "47 students upgraded this week",
    saved_for: "Results saved for",
    expired: "⚠️ Results expired! Analyze again to see results",
    original: "Original passage",
    full_analysis: "Full analysis at SATTEST.UZ",
    sign_up: "Start your own analysis",
    show_answer: "Show answer",
    answer: "Answer",
  },
  ru: {
    result_title: "Ваш AI Анализ",
    complete: "Анализ готов!",
    passage_type: "Тип текста",
    difficulty: "Сложность",
    reading_time: "Время чтения",
    main_idea: "💡 Главная Идея",
    one_sentence: "Краткое резюме",
    sat_connection: "🔑 Связь с SAT",
    vocabulary: "📚 Ключевые Слова",
    definition: "Определение",
    in_context: "В контексте",
    memory: "Как запомнить",
    frequency: "Частота в SAT",
    tone_purpose: "🎭 Тон и Цель",
    tone: "Тон",
    purpose: "Цель",
    author_view: "Позиция автора",
    why_matters: "Почему это важно для SAT",
    strategy: "🎯 Стратегия SAT",
    for_type: "Для ЭТОГО типа текста",
    do: "ДЕЛАЙТЕ",
    avoid: "ИЗБЕГАЙТЕ",
    time_tip: "Совет по времени",
    score_impact: "Влияние на балл",
    practice: "📝 Практические Вопросы",
    locked_questions: "3 SAT-вопроса с полными объяснениями доступны в Pro",
    improvement: "📈 Ваш план улучшения Reading",
    locked_plan: "Ваш 3-недельный план доступен в Pro.",
    week1: "Неделя 1",
    week2: "Неделя 2",
    week3: "Неделя 3",
    upgrade: "🔑 Получить Pro →",
    analyze_again: "🔍 Анализировать другой текст",
    share: "📤 Поделиться",
    copied: "Скопировано",
    cta_title: "Откройте полный маршрут SAT Reading",
    social: "47 студентов перешли на Pro на этой неделе",
    saved_for: "Результаты сохранены на",
    expired: "⚠️ Результаты истекли! Сделайте анализ снова",
    original: "Исходный текст",
    full_analysis: "Полный анализ на SATTEST.UZ",
    sign_up: "Начать свой анализ",
    show_answer: "Показать ответ",
    answer: "Ответ",
  },
  uz: {
    result_title: "Sizning AI Tahliliz",
    complete: "Tahlil Tayyor!",
    passage_type: "Passage turi",
    difficulty: "Qiyinlik",
    reading_time: "O'qish vaqti",
    main_idea: "💡 Asosiy G'oya",
    one_sentence: "Bir jumladagi xulosa",
    sat_connection: "🔑 SAT bilan bog'lanishi",
    vocabulary: "📚 Muhim So'zlar",
    definition: "Ta'rif",
    in_context: "Kontekstda",
    memory: "Eslab qolish",
    frequency: "SAT chastotasi",
    tone_purpose: "🎭 Ton va Maqsad",
    tone: "Ton",
    purpose: "Maqsad",
    author_view: "Muallif nuqtai nazari",
    why_matters: "Bu SAT uchun nega muhim",
    strategy: "🎯 SAT Strategiyasi",
    for_type: "AYNAN shu passage turi uchun",
    do: "QILING",
    avoid: "SAQLANING",
    time_tip: "Vaqt maslahati",
    score_impact: "Ballga ta'siri",
    practice: "📝 Mashq Savollari",
    locked_questions: "3 ta SAT uslubidagi savol va to'liq izohlar Pro da mavjud",
    improvement: "📈 Reading rivojlanish rejangiz",
    locked_plan: "3 haftalik rejangiz Pro da mavjud.",
    week1: "1-hafta",
    week2: "2-hafta",
    week3: "3-hafta",
    upgrade: "🔑 Pro Olish →",
    analyze_again: "🔍 Boshqa matn tahlil qilish",
    share: "📤 Ulashish",
    copied: "Nusxalandi",
    cta_title: "To'liq SAT Reading yo'lini oching",
    social: "Bu hafta 47 o'quvchi Pro oldi",
    saved_for: "Natijalar saqlanadi",
    expired: "⚠️ Natija muddati tugadi! Qayta tahlil qiling",
    original: "Asl matn",
    full_analysis: "To'liq tahlil SATTEST.UZ da",
    sign_up: "O'z tahlilingizni boshlang",
    show_answer: "Javobni ko'rsatish",
    answer: "Javob",
  },
} satisfies Record<Language, Record<string, string>>;

const languageLabels: Record<Language, string> = { uz: "UZ", ru: "RU", en: "EN" };

export function ReadingAnalysisView({ result, language, onLanguageChange, showSource = true, sharedPreview = false }: Props) {
  const copy = T[language];
  const analysis = result.analysis;
  const words = (analysis.vocabulary?.length ? analysis.vocabulary : analysis.difficult_words) || [];
  const shareUrl = result.share_url || `https://www.sattest.uz/reading-analyzer/shared/${result.share_id}`;
  const [copied, setCopied] = useState(false);
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});
  const [remaining, setRemaining] = useState("23:59:59");
  const isPro = Boolean(result.is_pro);

  useEffect(() => {
    const key = `sattest_reading_analysis_expiry_${result.share_id}`;
    let expiry = Number(window.localStorage.getItem(key) || window.localStorage.getItem("sattest_reading_analysis_expiry") || 0);
    if (!expiry || expiry < Date.now()) {
      expiry = Date.now() + 24 * 60 * 60 * 1000;
      window.localStorage.setItem(key, String(expiry));
    }
    const tick = () => {
      const diff = Math.max(0, expiry - Date.now());
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [result.share_id]);

  function copyShareLink() {
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }).catch(() => undefined);
  }

  if (sharedPreview) {
    return (
      <div className="grid gap-5">
        <TopBar analysis={analysis} copy={copy} />
        <AnalysisCard icon={<Lightbulb size={22} />} title={copy.main_idea}>
          <p className="text-base font-light leading-7 text-white/72">{mainDetailed(analysis, language)}</p>
          <p className="mt-4 border-t border-white/10 pt-4 text-lg font-semibold text-white">{analysis.main_idea.one_sentence}</p>
        </AnalysisCard>
        <div className="border border-[#FFD700]/25 bg-[#FFD700]/10 p-6 text-center">
          <p className="text-xl font-semibold text-white">{copy.full_analysis}</p>
          <Link className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 border border-[#FFD700] bg-[#FFD700] px-6 text-sm font-black uppercase tracking-[0.14em] text-black" href={`/reading-analyzer?lang=${language}`}>
            {copy.sign_up} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/[0.04] p-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#FFD700]/75">AI Reading Analyzer</p>
          <h2 className="mt-2 text-2xl font-light text-white">{copy.result_title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-white/10 bg-black/20 p-1">
            {(["uz", "ru", "en"] as Language[]).map((item) => (
              <button className={["min-h-9 px-3 text-[10px] font-black uppercase tracking-[0.16em]", language === item ? "bg-white text-black" : "text-white/50 hover:text-white"].join(" ")} disabled={!onLanguageChange} key={item} onClick={() => onLanguageChange?.(item)} type="button">
                {languageLabels[item]}
              </button>
            ))}
          </div>
          <button className="inline-flex min-h-11 items-center gap-2 border border-white/15 bg-black/20 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-white/70 hover:border-white/35 hover:text-white" onClick={copyShareLink} type="button">
            <Share2 size={15} /> {copied ? copy.copied : copy.share}
          </button>
        </div>
      </div>

      <TopBar analysis={analysis} copy={copy} />

      {showSource ? (
        <section className="border border-white/10 bg-black/20 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">{copy.original}</p>
          <p className="mt-3 max-h-48 overflow-auto text-base font-light leading-7 text-white/62">{result.source_text}</p>
        </section>
      ) : null}

      <AnalysisCard icon={<Lightbulb size={22} />} title={copy.main_idea}>
        <p className="text-base font-light leading-7 text-white/75">{mainDetailed(analysis, language)}</p>
        <div className="mt-5 border-t border-white/10 pt-5">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-white/35">{copy.one_sentence}</p>
          <p className="mt-2 text-xl font-semibold leading-8 text-white">"{analysis.main_idea.one_sentence}"</p>
        </div>
        <div className="mt-5 border border-[#FFD700]/20 bg-[#FFD700]/10 p-4 text-sm leading-6 text-white/70">
          <span className="font-bold text-[#FFD700]">{copy.sat_connection}:</span> {analysis.main_idea.sat_connection}
        </div>
      </AnalysisCard>

      <AnalysisCard icon={<BookOpen size={22} />} title={copy.vocabulary}>
        <div className="grid gap-3">
          {words.length ? words.map((item) => (
            <div className="border border-white/10 bg-black/20 p-4" key={`${item.word}-${item.in_context || item.example}`}>
              <p className="text-xl font-semibold text-white">WORD: "{item.word}"</p>
              <p className="mt-3 text-sm leading-6 text-white/64">📖 <b>{copy.definition}:</b> {wordDefinition(item, language)}</p>
              <p className="mt-2 text-sm leading-6 text-white/56">💬 <b>{copy.in_context}:</b> {item.in_context || item.example}</p>
              <p className="mt-2 text-sm leading-6 text-white/56">🧠 <b>{copy.memory}:</b> {item.memory_trick}</p>
              <p className="mt-2 text-sm font-semibold text-[#FFD700]">⭐ {copy.frequency}: {item.sat_frequency || "Medium"}</p>
            </div>
          )) : <p className="text-white/55">No vocabulary detected.</p>}
        </div>
      </AnalysisCard>

      <AnalysisCard icon={<Theater size={22} />} title={copy.tone_purpose}>
        <div className="grid gap-4 md:grid-cols-2">
          <Meter label={copy.tone} value={analysis.tone.primary || analysis.tone.type || "Informative"} percent={analysis.tone.percentage || 75} body={localizedExplanation(analysis.tone, language)} />
          <Meter label={copy.purpose} value={analysis.purpose.primary || analysis.purpose.type || "To inform"} percent={analysis.purpose.percentage || 65} body={localizedExplanation(analysis.purpose, language)} />
        </div>
        <div className="mt-4 border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-white/35">{copy.author_view}</p>
          <p className="mt-2 text-base leading-7 text-white/68">{analysis.author_perspective?.[language]}</p>
          <p className="mt-4 text-sm font-semibold text-[#FFD700]">💡 {copy.why_matters}: {strategyTime(analysis, language)}</p>
        </div>
      </AnalysisCard>

      <AnalysisCard icon={<Target size={22} />} title={copy.strategy}>
        <p className="text-sm font-black uppercase tracking-[0.2em] text-white/35">{copy.for_type}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TipList icon={<CheckCircle size={17} />} title={copy.do} items={strategyDo(analysis, language)} tone="good" />
          <TipList icon={<XCircle size={17} />} title={copy.avoid} items={strategyAvoid(analysis, language)} tone="bad" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <InfoPill label={`⏱️ ${copy.time_tip}`} value={strategyTime(analysis, language)} />
          <InfoPill label={`🏆 ${copy.score_impact}`} value={analysis.sat_strategy?.score_impact || "+20 points"} />
        </div>
      </AnalysisCard>

      <AnalysisCard icon={<Eye size={22} />} title={copy.practice}>
        {analysis.practice_questions === "LOCKED" ? (
          <LockedBlock copy={copy} />
        ) : (
          <div className="grid gap-4">
            {analysis.practice_questions.map((question, index) => (
              <div className="border border-white/10 bg-black/20 p-5" key={`${question.question}-${index}`}>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FFD700]">Q{index + 1} • {question.question_type}</p>
                <p className="mt-2 text-lg font-semibold leading-7 text-white">{question.question}</p>
                <div className="mt-4 grid gap-2">
                  {(["A", "B", "C", "D"] as const).map((option) => (
                    <div className="border border-white/10 px-4 py-3 text-sm text-white/62" key={option}><span className="font-black text-white">{option}.</span> {question.options?.[option]}</div>
                  ))}
                </div>
                <button className="mt-4 min-h-11 border border-[#FFD700]/40 px-4 text-sm font-bold text-[#FFD700]" onClick={() => setShowAnswers((state) => ({ ...state, [index]: !state[index] }))} type="button">{copy.show_answer}</button>
                {showAnswers[index] ? (
                  <div className="mt-4 border border-[#FFD700]/20 bg-[#FFD700]/10 p-4">
                    <p className="text-sm font-semibold text-[#FFD700]">✅ {copy.answer}: {question.correct}</p>
                    <p className="mt-2 text-sm font-light leading-6 text-white/65">{questionExplanation(question, language)}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </AnalysisCard>

      <AnalysisCard icon={<Sparkles size={22} />} title={`${copy.improvement}${isPro ? "" : " 🔒"}`}>
        {isPro ? (
          <div className="grid gap-3">
            <InfoPill label={copy.week1} value={planWeek(analysis, language, 1)} />
            <InfoPill label={copy.week2} value={planWeek(analysis, language, 2)} />
            <InfoPill label={copy.week3} value={planWeek(analysis, language, 3)} />
            <InfoPill label={copy.score_impact} value={analysis.improvement_plan?.predicted_improvement || "+30 points"} />
          </div>
        ) : (
          <LockedBlock copy={{ ...copy, locked_questions: copy.locked_plan }} />
        )}
      </AnalysisCard>

      <section className="border border-[#FFD700]/25 bg-[#FFD700]/10 p-6 text-center shadow-[0_24px_80px_rgba(255,215,0,0.08)]">
        <p className="text-2xl font-light text-white">{copy.cta_title}</p>
        <p className="mt-2 text-sm font-semibold text-white/62">{copy.social}</p>
        <p className={["mt-5 text-3xl font-black text-[#FFD700]", remaining.startsWith("00:") ? "animate-pulse text-red-300" : ""].join(" ")}>
          <Clock className="mr-2 inline" size={25} /> {remaining === "00:00:00" ? copy.expired : `${copy.saved_for}: ${remaining}`}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link className="inline-flex min-h-14 items-center justify-center gap-2 border border-[#FFD700] bg-[#FFD700] px-5 text-sm font-black uppercase tracking-[0.14em] text-black" href={`/pricing?lang=${language}`}>
            {copy.upgrade} <ArrowRight size={16} />
          </Link>
          <Link className="inline-flex min-h-14 items-center justify-center gap-2 border border-white/15 bg-black/20 px-5 text-sm font-black uppercase tracking-[0.14em] text-white/75" href={`/reading-analyzer?lang=${language}`}>
            {copy.analyze_again}
          </Link>
        </div>
      </section>
    </div>
  );
}

function TopBar({ analysis, copy }: { analysis: ReadingAnalysis; copy: Record<string, string> }) {
  return (
    <div className="grid gap-3 border border-white/10 bg-white/[0.04] p-5 sm:grid-cols-3">
      <Metric label={copy.passage_type} value={analysis.passage_type || "SAT Passage"} />
      <Metric label={copy.difficulty} value={`⭐⭐⭐ ${analysis.difficulty || "Medium"}`} />
      <Metric label={copy.reading_time} value={`~${analysis.reading_time || "2 minutes"}`} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">{label}</p><p className="mt-2 text-lg font-semibold text-white">{value}</p></div>;
}

function AnalysisCard({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return <section className="border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] md:p-6"><div className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#FFD700]/20 bg-[#FFD700]/10 text-[#FFD700]">{icon}</div><h2 className="text-2xl font-light text-white">{title}</h2></div>{children}</section>;
}

function Meter({ label, value, percent, body }: { label: string; value: string; percent: number; body: string }) {
  const safePercent = Math.max(5, Math.min(100, percent));
  return <div className="border border-white/10 bg-black/20 p-4"><p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">{label}</p><p className="mt-2 text-xl font-light text-white">{value}</p><div className="mt-3 h-3 bg-white/10"><div className="h-full bg-[#FFD700]" style={{ width: `${safePercent}%` }} /></div><p className="mt-2 text-xs text-white/40">{safePercent}% {value}</p><p className="mt-3 text-sm font-light leading-6 text-white/58">{body}</p></div>;
}

function TipList({ icon, title, items, tone }: { icon: ReactNode; title: string; items: string[]; tone: "good" | "bad" }) {
  return <div className="border border-white/10 bg-black/20 p-4"><p className={["flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em]", tone === "good" ? "text-emerald-300" : "text-red-300"].join(" ")}>{icon}{title}</p><div className="mt-3 grid gap-2">{items.map((item) => <p className="text-sm leading-6 text-white/64" key={item}>{tone === "good" ? "✅" : "❌"} {item}</p>)}</div></div>;
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return <div className="border border-white/10 bg-black/20 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{label}</p><p className="mt-2 text-sm leading-6 text-white/68">{value}</p></div>;
}

function LockedBlock({ copy }: { copy: Record<string, string> }) {
  return <div className="border border-[#FFD700]/25 bg-[#FFD700]/10 p-5 text-center"><div className="mx-auto h-20 max-w-md space-y-2 overflow-hidden blur-sm"><p className="h-3 bg-white/30" /><p className="h-3 bg-white/20" /><p className="h-3 bg-white/15" /></div><Lock className="mx-auto mt-4 text-[#FFD700]" size={30} /><p className="mt-3 text-lg font-semibold text-white">{copy.locked_questions}</p><Link className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 border border-[#FFD700] bg-[#FFD700] px-6 text-sm font-black uppercase tracking-[0.14em] text-black" href="/pricing">{copy.upgrade}<ArrowRight size={16} /></Link></div>;
}

function mainDetailed(analysis: ReadingAnalysis, language: Language) {
  if (language === "ru") return analysis.main_idea.detailed_ru || analysis.main_idea.russian || analysis.main_idea.english || "";
  if (language === "en") return analysis.main_idea.detailed_en || analysis.main_idea.english || analysis.main_idea.uzbek || "";
  return analysis.main_idea.detailed_uz || analysis.main_idea.uzbek || analysis.main_idea.english || "";
}

function localizedExplanation(value: ReadingAnalysis["tone"] | ReadingAnalysis["purpose"], language: Language) {
  if (language === "ru") return value?.explanation_ru || value?.explanation_en || value?.explanation_uz || "";
  if (language === "en") return value?.explanation_en || value?.explanation_uz || value?.explanation_ru || "";
  return value?.explanation_uz || value?.explanation_en || value?.explanation_ru || "";
}

function wordDefinition(item: NonNullable<ReadingAnalysis["vocabulary"]>[number], language: Language) {
  if (language === "ru") return item.definition_ru || item.definition_en || item.definition_uz || "";
  if (language === "en") return item.definition_en || item.definition_uz || item.definition_ru || "";
  return item.definition_uz || item.definition_en || item.definition_ru || "";
}

function strategyDo(analysis: ReadingAnalysis, language: Language) {
  return analysis.sat_strategy?.[`do_${language}` as "do_uz"] || analysis.sat_strategy?.do_en || [];
}

function strategyAvoid(analysis: ReadingAnalysis, language: Language) {
  return analysis.sat_strategy?.[`avoid_${language}` as "avoid_uz"] || analysis.sat_strategy?.avoid_en || [];
}

function strategyTime(analysis: ReadingAnalysis, language: Language) {
  return analysis.sat_strategy?.[`time_tip_${language}` as "time_tip_uz"] || analysis.sat_strategy?.time_tip_en || "";
}

function questionExplanation(question: Exclude<ReadingAnalysis["practice_questions"], "LOCKED">[number], language: Language) {
  if (language === "ru") return question.explanation_ru || question.explanation_en || question.explanation;
  if (language === "en") return question.explanation_en || question.explanation;
  return question.explanation_uz || question.explanation_en || question.explanation;
}

function planWeek(analysis: ReadingAnalysis, language: Language, week: 1 | 2 | 3) {
  const key = `week${week}_${language}` as keyof NonNullable<ReadingAnalysis["improvement_plan"]>;
  const fallback = `week${week}_en` as keyof NonNullable<ReadingAnalysis["improvement_plan"]>;
  return String(analysis.improvement_plan?.[key] || analysis.improvement_plan?.[fallback] || "");
}
