"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, CheckCircle, ChevronDown, ChevronUp, Clock, Compass, Eye, Globe2, Lightbulb, Lock, Share2, Sparkles, Target, Theater, XCircle } from "lucide-react";
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
    full_translation: "🌐 Full Translation",
    translation_tip: "Use this to fully understand difficult passages",
    show_russian: "🇷🇺 Russian",
    show_uzbek: "🇺🇿 Uzbek",
    first_sentences: "First 3 sentences",
    unlock_full: "Unlock full translation",
    how_to_approach: "🧭 How To Approach",
    time_plan: "⏱️ Time Management",
    common_traps: "⚠️ Common Traps to Avoid",
    questions_solved: "✅ Questions Solved",
    how_to_think: "🧠 How To Think",
    why_correct: "✅ Why This Is Correct",
    evidence: "📍 Evidence From Text",
    why_wrong: "❌ Why Others Are Wrong",
    tip_for_type: "💡 Tip For This Question Type",
    show_thinking: "Show thinking process",
    hide_thinking: "Hide thinking process",
    question_locked: "Questions 2+ available in Pro",
    see_all_questions: "See all questions solved",
    locked_questions: "3 SAT-style questions with full explanations available in Pro",
    improvement: "📈 Your Reading Improvement Plan",
    locked_plan: "Your 3-week plan is available in Pro.",
    week1: "Week 1",
    week2: "Week 2",
    week3: "Week 3",
    upgrade: "🔑 Upgrade to Pro →",
    pro_price: "300,000 UZS / month",
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
    analyzer_label: "AI Reading Analyzer",
    no_vocabulary: "No vocabulary detected.",
    default_passage: "SAT Passage",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
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
    full_translation: "🌐 Полный перевод",
    translation_tip: "Используйте для полного понимания текста",
    show_russian: "🇷🇺 Русский",
    show_uzbek: "🇺🇿 Узбекский",
    first_sentences: "Первые 3 предложения",
    unlock_full: "Разблокировать полный перевод",
    how_to_approach: "🧭 Как подходить к тексту",
    time_plan: "⏱️ Управление временем",
    common_traps: "⚠️ Типичные ловушки",
    questions_solved: "✅ Решённые вопросы",
    how_to_think: "🧠 Как думать",
    why_correct: "✅ Почему это правильно",
    evidence: "📍 Доказательство из текста",
    why_wrong: "❌ Почему другие неверны",
    tip_for_type: "💡 Совет для этого типа",
    show_thinking: "Показать процесс мышления",
    hide_thinking: "Скрыть процесс мышления",
    question_locked: "Вопросы 2+ доступны в Pro",
    see_all_questions: "Смотреть все решённые вопросы",
    locked_questions: "3 SAT-вопроса с полными объяснениями доступны в Pro",
    improvement: "📈 Ваш план улучшения Reading",
    locked_plan: "Ваш 3-недельный план доступен в Pro.",
    week1: "Неделя 1",
    week2: "Неделя 2",
    week3: "Неделя 3",
    upgrade: "🔑 Получить Pro →",
    pro_price: "300,000 UZS / месяц",
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
    analyzer_label: "AI Анализатор Чтения",
    no_vocabulary: "Ключевые слова не найдены.",
    default_passage: "Текст SAT",
    easy: "Лёгкий",
    medium: "Средний",
    hard: "Сложный",
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
    full_translation: "🌐 To'liq Tarjima",
    translation_tip: "Qiyin matnlarni to'liq tushunish uchun foydalaning",
    show_russian: "🇷🇺 Ruscha",
    show_uzbek: "🇺🇿 O'zbekcha",
    first_sentences: "Birinchi 3 jumla",
    unlock_full: "To'liq tarjimani ochish",
    how_to_approach: "🧭 Qanday Yondashish Kerak",
    time_plan: "⏱️ Vaqt Boshqaruvi",
    common_traps: "⚠️ Keng Tarqalgan Tuzoklar",
    questions_solved: "✅ Yechilgan Savollar",
    how_to_think: "🧠 Qanday O'ylash Kerak",
    why_correct: "✅ Nima Uchun Bu To'g'ri",
    evidence: "📍 Matndan Dalil",
    why_wrong: "❌ Nima Uchun Boshqalar Xato",
    tip_for_type: "💡 Bu Turdagi Savol Uchun Maslahat",
    show_thinking: "O'ylash jarayonini ko'rsatish",
    hide_thinking: "O'ylash jarayonini yashirish",
    question_locked: "2+ savollar Pro da mavjud",
    see_all_questions: "Barcha yechilgan savollarni ko'rish",
    locked_questions: "3 ta SAT uslubidagi savol va to'liq izohlar Pro da mavjud",
    improvement: "📈 Reading rivojlanish rejangiz",
    locked_plan: "3 haftalik rejangiz Pro da mavjud.",
    week1: "1-hafta",
    week2: "2-hafta",
    week3: "3-hafta",
    upgrade: "🔑 Pro Olish →",
    pro_price: "300,000 UZS / oy",
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
    analyzer_label: "AI Reading Tahlilchi",
    no_vocabulary: "Muhim so'zlar topilmadi.",
    default_passage: "SAT matni",
    easy: "Oson",
    medium: "O'rtacha",
    hard: "Qiyin",
  },
} satisfies Record<Language, Record<string, string>>;

const languageLabels: Record<Language, string> = { uz: "UZ", ru: "RU", en: "EN" };

export function ReadingAnalysisView({ result, language, onLanguageChange, showSource = true, sharedPreview = false }: Props) {
  const copy = T[language];
  const analysis = result.analysis;
  const words = (analysis.vocabulary?.length ? analysis.vocabulary : analysis.difficult_words) || [];
  const shareUrl = result.share_url || `https://www.sattest.uz/reading-analyzer/shared/${result.share_id}`;
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState<Record<number, boolean>>({});
  const [translationLanguage, setTranslationLanguage] = useState<"ru" | "uz">(language === "ru" ? "ru" : "uz");
  const [remaining, setRemaining] = useState("23:59:59");
  const isPro = Boolean(result.is_pro);

  useEffect(() => {
    if (language === "ru") setTranslationLanguage("ru");
    if (language === "uz") setTranslationLanguage("uz");
  }, [language]);

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
          <p className="mt-4 border-t border-white/10 pt-4 text-lg font-semibold text-white">{oneSentence(analysis, language)}</p>
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
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#FFD700]/75">{copy.analyzer_label}</p>
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

      <AnalysisCard icon={<Globe2 size={22} />} title={copy.full_translation}>
        <div className="mb-4 flex flex-wrap gap-2">
          <button className={["min-h-10 border px-4 text-xs font-black uppercase tracking-[0.12em]", translationLanguage === "ru" ? "border-[#FFD700] bg-[#FFD700] text-black" : "border-white/10 bg-black/20 text-white/60"].join(" ")} onClick={() => setTranslationLanguage("ru")} type="button">{copy.show_russian}</button>
          <button className={["min-h-10 border px-4 text-xs font-black uppercase tracking-[0.12em]", translationLanguage === "uz" ? "border-[#FFD700] bg-[#FFD700] text-black" : "border-white/10 bg-black/20 text-white/60"].join(" ")} onClick={() => setTranslationLanguage("uz")} type="button">{copy.show_uzbek}</button>
        </div>
        <div className="border border-white/10 bg-black/20 p-5">
          <p className="whitespace-pre-line text-base font-light leading-8 text-white/75">{translationText(analysis, translationLanguage, isPro)}</p>
        </div>
        {!isPro ? (
          <div className="mt-4">
            <LockedBlock copy={{ ...copy, locked_questions: `${copy.unlock_full} · ${copy.first_sentences}` }} />
          </div>
        ) : null}
        <p className="mt-4 text-sm font-semibold text-[#FFD700]">💡 {copy.translation_tip}</p>
      </AnalysisCard>

      <AnalysisCard icon={<Lightbulb size={22} />} title={copy.main_idea}>
        <p className="text-base font-light leading-7 text-white/75">{mainDetailed(analysis, language)}</p>
        <div className="mt-5 border-t border-white/10 pt-5">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-white/35">{copy.one_sentence}</p>
          <p className="mt-2 text-xl font-semibold leading-8 text-white">"{oneSentence(analysis, language)}"</p>
        </div>
        <div className="mt-5 border border-[#FFD700]/20 bg-[#FFD700]/10 p-4 text-sm leading-6 text-white/70">
          <span className="font-bold text-[#FFD700]">{copy.sat_connection}:</span> {satConnection(analysis, language)}
        </div>
      </AnalysisCard>

      <AnalysisCard icon={<BookOpen size={22} />} title={copy.vocabulary}>
        <div className="grid gap-3">
          {words.length ? words.map((item) => (
            <div className="border border-white/10 bg-black/20 p-4" key={`${item.word}-${item.in_context || item.example}`}>
              <p className="text-xl font-semibold text-white">WORD: "{item.word}"</p>
              <p className="mt-3 text-sm leading-6 text-white/64">📖 <b>{copy.definition}:</b> {wordDefinition(item, language)}</p>
              <p className="mt-2 text-sm leading-6 text-white/56">💬 <b>{copy.in_context}:</b> {wordContext(item, language)}</p>
              <p className="mt-2 text-sm leading-6 text-white/56">🧠 <b>{copy.memory}:</b> {wordMemory(item, language)}</p>
              <p className="mt-2 text-sm font-semibold text-[#FFD700]">⭐ {copy.frequency}: {translateFrequency(item.sat_frequency, copy)}</p>
            </div>
          )) : <p className="text-white/55">{copy.no_vocabulary}</p>}
        </div>
      </AnalysisCard>

      <AnalysisCard icon={<Theater size={22} />} title={copy.tone_purpose}>
        <div className="grid gap-4 md:grid-cols-2">
          <Meter label={copy.tone} value={localizedPrimary(analysis.tone, language, "Informative")} percent={analysis.tone.percentage || 75} body={localizedExplanation(analysis.tone, language)} />
          <Meter label={copy.purpose} value={localizedPrimary(analysis.purpose, language, "To inform")} percent={analysis.purpose.percentage || 65} body={localizedExplanation(analysis.purpose, language)} />
        </div>
        <div className="mt-4 border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-white/35">{copy.author_view}</p>
          <p className="mt-2 text-base leading-7 text-white/68">{analysis.author_perspective?.[language]}</p>
          <p className="mt-4 text-sm font-semibold text-[#FFD700]">💡 {copy.why_matters}: {strategyTime(analysis, language)}</p>
        </div>
      </AnalysisCard>

      <AnalysisCard icon={<Compass size={22} />} title={copy.how_to_approach}>
        <div className="grid gap-3">
          {approachSteps(analysis, language).map((step) => (
            <div className="border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/68" key={step}>✅ {step}</div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <InfoPill label={copy.time_plan} value={approachTime(analysis, language)} />
          <div className="border border-red-300/15 bg-red-950/15 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-200">{copy.common_traps}</p>
            <div className="mt-3 grid gap-2">
              {approachTraps(analysis, language).map((trap) => <p className="text-sm leading-6 text-white/64" key={trap}>❌ {trap}</p>)}
            </div>
          </div>
        </div>
      </AnalysisCard>

      <AnalysisCard icon={<Eye size={22} />} title={copy.questions_solved}>
        <SolvedQuestions
          analysis={analysis}
          copy={copy}
          isPro={isPro}
          language={language}
          showThinking={showThinking}
          toggleThinking={(index) => setShowThinking((state) => ({ ...state, [index]: !state[index] }))}
        />
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

      <AnalysisCard icon={<Sparkles size={22} />} title={`${copy.improvement}${isPro ? "" : " 🔒"}`}>
        {isPro ? (
          <div className="grid gap-3">
            <InfoPill label={copy.week1} value={planWeek(analysis, language, 1)} />
            <InfoPill label={copy.week2} value={planWeek(analysis, language, 2)} />
            <InfoPill label={copy.week3} value={planWeek(analysis, language, 3)} />
            <InfoPill label={copy.score_impact} value={planImpact(analysis, language)} />
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
            {copy.upgrade} · {copy.pro_price} <ArrowRight size={16} />
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
      <Metric label={copy.passage_type} value={translatePassageType(analysis.passage_type, copy)} />
      <Metric label={copy.difficulty} value={`⭐⭐⭐ ${translateDifficulty(analysis.difficulty, copy)}`} />
      <Metric label={copy.reading_time} value={`~${analysis.reading_time || "2 minutes"}`} />
    </div>
  );
}

function SolvedQuestions({
  analysis,
  copy,
  isPro,
  language,
  showThinking,
  toggleThinking,
}: {
  analysis: ReadingAnalysis;
  copy: Record<string, string>;
  isPro: boolean;
  language: Language;
  showThinking: Record<number, boolean>;
  toggleThinking: (index: number) => void;
}) {
  const questions = analysis.questions_solved || [];
  if (!questions.length) {
    return <LockedBlock copy={{ ...copy, locked_questions: copy.locked_questions }} />;
  }
  const lockedCount = !isPro ? Math.max(Number(analysis.questions_solved_locked || 0), questions.length > 1 ? questions.length - 1 : 1) : 0;
  return (
    <div className="grid gap-5">
      {questions.map((question, index) => {
        const correct = (question.correct_answer || "B").toUpperCase();
        const options = questionOptions(question, language);
        return (
          <div className="border border-white/10 bg-black/20 p-5" key={`${question.question_number || index}-${question.question_text}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FFD700]">Q{question.question_number || index + 1} • {question.question_type || "SAT Reading"}</p>
              <span className="border border-white/10 px-3 py-1 text-xs font-bold text-white/55">{translateDifficulty(question.difficulty, copy)}</span>
            </div>
            <p className="mt-3 text-lg font-semibold leading-8 text-white">{questionText(question, language)}</p>
            <div className="mt-4 grid gap-2">
              {(["A", "B", "C", "D"] as const).map((option) => (
                <div className={["border px-4 py-3 text-sm", option === correct ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-100" : "border-white/10 text-white/62"].join(" ")} key={option}>
                  <span className="font-black text-white">{option}.</span> {options[option]} {option === correct ? <span className="ml-2 font-black text-emerald-300">← ✅</span> : null}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-none border border-emerald-300/25 bg-emerald-500/10 p-4">
              <p className="text-sm font-black text-emerald-200">✅ {copy.answer}: {correct}</p>
              <p className="mt-2 text-sm leading-6 text-white/70"><b>{copy.why_correct}:</b> {whyCorrect(question, language)}</p>
            </div>
            <button className="mt-4 flex min-h-11 w-full items-center justify-between border border-[#FFD700]/30 bg-[#FFD700]/10 px-4 text-left text-sm font-bold text-[#FFD700]" onClick={() => toggleThinking(index)} type="button">
              {showThinking[index] ? copy.hide_thinking : copy.show_thinking}
              {showThinking[index] ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </button>
            {showThinking[index] ? (
              <div className="mt-4 border border-white/10 bg-black/30 p-4">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-white/35">{copy.how_to_think}</p>
                <p className="mt-2 text-sm font-light leading-7 text-white/70">{thinkingProcess(question, language)}</p>
              </div>
            ) : null}
            <blockquote className="mt-4 border-l-4 border-[#FFD700] bg-[#FFD700]/10 p-4 text-sm italic leading-7 text-white/72">
              <p className="font-black not-italic text-[#FFD700]">{copy.evidence}</p>
              "{question.evidence_line || "Find the exact sentence in the passage that proves the answer."}"
            </blockquote>
            <div className="mt-4 border border-red-300/15 bg-red-950/15 p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-200">{copy.why_wrong}</p>
              <div className="mt-3 grid gap-2">
                {Object.entries(whyWrong(question, language)).map(([letter, reason]) => (
                  <p className="text-sm leading-6 text-white/64" key={letter}>❌ {letter} — {reason}</p>
                ))}
              </div>
            </div>
            <p className="mt-4 border border-[#FFD700]/20 bg-[#FFD700]/10 p-4 text-sm font-semibold leading-6 text-[#FFD700]">{copy.tip_for_type}: {questionTip(question, language)}</p>
          </div>
        );
      })}
      {lockedCount > 0 ? (
        <LockedBlock copy={{ ...copy, locked_questions: `${copy.question_locked}. ${copy.see_all_questions}.` }} />
      ) : null}
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
  return <div className="border border-[#FFD700]/25 bg-[#FFD700]/10 p-5 text-center"><div className="mx-auto h-20 max-w-md space-y-2 overflow-hidden blur-sm"><p className="h-3 bg-white/30" /><p className="h-3 bg-white/20" /><p className="h-3 bg-white/15" /></div><Lock className="mx-auto mt-4 text-[#FFD700]" size={30} /><p className="mt-3 text-lg font-semibold text-white">{copy.locked_questions}</p><p className="mt-2 text-sm font-bold text-[#FFD700]">{copy.pro_price}</p><Link className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 border border-[#FFD700] bg-[#FFD700] px-6 text-sm font-black uppercase tracking-[0.14em] text-black" href="/pricing">{copy.upgrade}<ArrowRight size={16} /></Link></div>;
}

function mainDetailed(analysis: ReadingAnalysis, language: Language) {
  if (language === "ru") return analysis.main_idea.detailed_ru || analysis.main_idea.russian || analysis.main_idea.english || "";
  if (language === "en") return analysis.main_idea.detailed_en || analysis.main_idea.english || analysis.main_idea.uzbek || "";
  return analysis.main_idea.detailed_uz || analysis.main_idea.uzbek || analysis.main_idea.english || "";
}

function oneSentence(analysis: ReadingAnalysis, language: Language) {
  if (language === "ru") return analysis.main_idea.one_sentence_ru || analysis.main_idea.one_sentence || analysis.main_idea.detailed_ru || "";
  if (language === "en") return analysis.main_idea.one_sentence_en || analysis.main_idea.one_sentence || analysis.main_idea.detailed_en || "";
  return analysis.main_idea.one_sentence_uz || analysis.main_idea.one_sentence || analysis.main_idea.detailed_uz || "";
}

function satConnection(analysis: ReadingAnalysis, language: Language) {
  if (language === "ru") return analysis.main_idea.sat_connection_ru || analysis.main_idea.sat_connection || "";
  if (language === "en") return analysis.main_idea.sat_connection_en || analysis.main_idea.sat_connection || "";
  return analysis.main_idea.sat_connection_uz || analysis.main_idea.sat_connection || "";
}

function localizedExplanation(value: ReadingAnalysis["tone"] | ReadingAnalysis["purpose"], language: Language) {
  if (language === "ru") return value?.explanation_ru || value?.explanation_en || value?.explanation_uz || "";
  if (language === "en") return value?.explanation_en || value?.explanation_uz || value?.explanation_ru || "";
  return value?.explanation_uz || value?.explanation_en || value?.explanation_ru || "";
}

function localizedPrimary(value: ReadingAnalysis["tone"] | ReadingAnalysis["purpose"], language: Language, fallback: string) {
  if (language === "ru") return value?.primary_ru || value?.primary_en || value?.primary || value?.type || fallback;
  if (language === "en") return value?.primary_en || value?.primary || value?.type || fallback;
  return value?.primary_uz || value?.primary_en || value?.primary || value?.type || fallback;
}

function wordDefinition(item: NonNullable<ReadingAnalysis["vocabulary"]>[number], language: Language) {
  if (language === "ru") return item.definition_ru || item.definition_en || item.definition_uz || "";
  if (language === "en") return item.definition_en || item.definition_uz || item.definition_ru || "";
  return item.definition_uz || item.definition_en || item.definition_ru || "";
}

function wordContext(item: NonNullable<ReadingAnalysis["vocabulary"]>[number], language: Language) {
  if (language === "ru") return item.in_context_ru || item.in_context_en || item.in_context || item.example || "";
  if (language === "en") return item.in_context_en || item.in_context || item.example || "";
  return item.in_context_uz || item.in_context_en || item.in_context || item.example || "";
}

function wordMemory(item: NonNullable<ReadingAnalysis["vocabulary"]>[number], language: Language) {
  if (language === "ru") return item.memory_trick_ru || item.memory_trick_en || item.memory_trick || "";
  if (language === "en") return item.memory_trick_en || item.memory_trick || "";
  return item.memory_trick_uz || item.memory_trick_en || item.memory_trick || "";
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

function translationText(analysis: ReadingAnalysis, translationLanguage: "ru" | "uz", isPro: boolean) {
  const value = translationLanguage === "ru" ? analysis.full_translation?.russian : analysis.full_translation?.uzbek;
  const text = value || "";
  if (isPro) return text;
  return firstSentences(text, 3);
}

function firstSentences(value: string, limit: number) {
  const sentences = value.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g) || [];
  return sentences.slice(0, limit).join(" ").trim() || value;
}

function approachSteps(analysis: ReadingAnalysis, language: Language) {
  if (language === "ru") return analysis.how_to_approach?.steps_ru || analysis.how_to_approach?.steps_en || [];
  if (language === "en") return analysis.how_to_approach?.steps_en || [];
  return analysis.how_to_approach?.steps_uz || analysis.how_to_approach?.steps_en || [];
}

function approachTime(analysis: ReadingAnalysis, language: Language) {
  if (language === "ru") return analysis.how_to_approach?.time_management_ru || analysis.how_to_approach?.time_management_en || "";
  if (language === "en") return analysis.how_to_approach?.time_management_en || "";
  return analysis.how_to_approach?.time_management_uz || analysis.how_to_approach?.time_management_en || "";
}

function approachTraps(analysis: ReadingAnalysis, language: Language) {
  if (language === "ru") return analysis.how_to_approach?.common_traps_ru || analysis.how_to_approach?.common_traps_en || [];
  if (language === "en") return analysis.how_to_approach?.common_traps_en || [];
  return analysis.how_to_approach?.common_traps_uz || analysis.how_to_approach?.common_traps_en || [];
}

type SolvedQuestion = NonNullable<ReadingAnalysis["questions_solved"]>[number];

function questionText(question: SolvedQuestion, language: Language) {
  if (language === "ru") return question.question_text_ru || question.question_text || "";
  if (language === "en") return question.question_text || question.question_text_ru || question.question_text_uz || "";
  return question.question_text_uz || question.question_text || "";
}

function questionOptions(question: SolvedQuestion, language: Language) {
  if (language === "ru") return question.options_ru || question.options || emptyOptions();
  if (language === "uz") return question.options_uz || question.options || emptyOptions();
  return question.options || emptyOptions();
}

function thinkingProcess(question: SolvedQuestion, language: Language) {
  if (language === "ru") return question.thinking_process_ru || question.thinking_process_en || "";
  if (language === "en") return question.thinking_process_en || "";
  return question.thinking_process_uz || question.thinking_process_en || "";
}

function whyCorrect(question: SolvedQuestion, language: Language) {
  if (language === "ru") return question.why_correct_ru || question.why_correct_en || "";
  if (language === "en") return question.why_correct_en || "";
  return question.why_correct_uz || question.why_correct_en || "";
}

function whyWrong(question: SolvedQuestion, language: Language) {
  if (language === "ru") return question.why_wrong_ru || question.why_wrong_en || {};
  if (language === "en") return question.why_wrong_en || {};
  return question.why_wrong_uz || question.why_wrong_en || {};
}

function questionTip(question: SolvedQuestion, language: Language) {
  if (language === "ru") return question.tip_ru || question.tip_en || "";
  if (language === "en") return question.tip_en || "";
  return question.tip_uz || question.tip_en || "";
}

function emptyOptions(): Record<"A" | "B" | "C" | "D", string> {
  return { A: "", B: "", C: "", D: "" };
}

function planWeek(analysis: ReadingAnalysis, language: Language, week: 1 | 2 | 3) {
  const key = `week${week}_${language}` as keyof NonNullable<ReadingAnalysis["improvement_plan"]>;
  const fallback = `week${week}_en` as keyof NonNullable<ReadingAnalysis["improvement_plan"]>;
  return String(analysis.improvement_plan?.[key] || analysis.improvement_plan?.[fallback] || "");
}

function planImpact(analysis: ReadingAnalysis, language: Language) {
  if (language === "ru") return analysis.improvement_plan?.predicted_improvement_ru || analysis.improvement_plan?.predicted_improvement_en || analysis.improvement_plan?.predicted_improvement || "+30 баллов";
  if (language === "en") return analysis.improvement_plan?.predicted_improvement_en || analysis.improvement_plan?.predicted_improvement || "+30 points";
  return analysis.improvement_plan?.predicted_improvement_uz || analysis.improvement_plan?.predicted_improvement_en || analysis.improvement_plan?.predicted_improvement || "+30 ball";
}

function translateDifficulty(value: string | undefined, copy: Record<string, string>) {
  const normalized = (value || "Medium").toLowerCase();
  if (normalized.includes("easy")) return copy.easy;
  if (normalized.includes("hard")) return copy.hard;
  return copy.medium;
}

function translatePassageType(value: string | undefined, copy: Record<string, string>) {
  const normalized = (value || "").toLowerCase();
  if (!normalized) return copy.default_passage;
  if (normalized.includes("literature")) {
    if (copy.default_passage === "Текст SAT") return "Литература";
    if (copy.default_passage === "SAT matni") return "Adabiyot";
    return "Literature";
  }
  if (normalized.includes("science") && !normalized.includes("social")) {
    if (copy.default_passage === "Текст SAT") return "Наука";
    if (copy.default_passage === "SAT matni") return "Fan";
    return "Science";
  }
  if (normalized.includes("history")) {
    if (copy.default_passage === "Текст SAT") return "История";
    if (copy.default_passage === "SAT matni") return "Tarix";
    return "History";
  }
  if (normalized.includes("social")) {
    if (copy.default_passage === "Текст SAT") return "Социальные науки";
    if (copy.default_passage === "SAT matni") return "Ijtimoiy fan";
    return "Social Science";
  }
  return value || copy.default_passage;
}

function translateFrequency(value: string | undefined, copy: Record<string, string>) {
  const normalized = (value || "Medium").toLowerCase();
  if (normalized.includes("high")) {
    if (copy.default_passage === "Текст SAT") return "Высокая";
    if (copy.default_passage === "SAT matni") return "Yuqori";
    return "High";
  }
  if (normalized.includes("low")) {
    if (copy.default_passage === "Текст SAT") return "Низкая";
    if (copy.default_passage === "SAT matni") return "Past";
    return "Low";
  }
  if (copy.default_passage === "Текст SAT") return "Средняя";
  if (copy.default_passage === "SAT matni") return "O'rtacha";
  return "Medium";
}
