"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clipboard, Loader2, Search, Sparkles, Star, Zap } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { ApiError, analyzePassage, getReadingAnalyzerStats, getToken, type ReadingAnalysisResponse } from "@/lib/api";
import { useLanguage, type Language } from "@/lib/i18n";

const TRANSLATIONS = {
  en: {
    page_title: "Reading made clear.",
    page_subtitle: "Paste any SAT Reading passage and get instant AI analysis",
    analyzer_title: "AI Reading Analyzer",
    input_placeholder: "Paste your SAT reading passage here...",
    analyze_button: "🔍 Analyze Passage",
    free_limit: "FREE: 3 analyses/day",
    pro_limit: "PRO: Unlimited ♾️",
    char_count: "characters",
    min_hint: "Min 50 characters",
    paste: "Paste",
    examples: ["📚 Literature Example", "🔬 Science Example", "📜 History Example"],
    trust: ["🔒 Your text is not stored", "⚡ Results in 3 seconds", "🤖 Powered by Claude AI"],
    features: ["Claude AI", "3 Languages", "SAT-specific", "Instant"],
    remaining: (count: number | null) => count === null ? "♾️ Unlimited — Pro Active" : `✅ ${count} free analyses remaining today`,
    loading_1: "AI analyzing passage...",
    loading_2: "Finding key vocabulary...",
    loading_3: "Generating questions...",
    loading_4: "Almost ready...",
    short: "Please paste at least 50 characters.",
    limit: "Free limit reached. Upgrade to Pro for unlimited analyses.",
    social_today: "passages analyzed today",
    social_rating: "rating from students",
    social_students: "Used by 500+ SAT students",
  },
  ru: {
    page_title: "Понимай тексты легко.",
    page_subtitle: "Вставь любой отрывок SAT и получи мгновенный AI анализ",
    analyzer_title: "AI Анализатор Чтения",
    input_placeholder: "Вставьте отрывок SAT для чтения сюда...",
    analyze_button: "🔍 Анализировать",
    free_limit: "БЕСПЛАТНО: 3 анализа/день",
    pro_limit: "PRO: Безлимитно ♾️",
    char_count: "символов",
    min_hint: "Минимум 50 символов",
    paste: "Вставить",
    examples: ["📚 Пример литературы", "🔬 Пример науки", "📜 Пример истории"],
    trust: ["🔒 Текст не сохраняется публично", "⚡ Результат за 3 секунды", "🤖 Анализ от Claude AI"],
    features: ["Claude AI", "3 языка", "Для SAT", "Мгновенно"],
    remaining: (count: number | null) => count === null ? "♾️ Безлимит — Pro активен" : `✅ Осталось ${count} бесплатных анализа сегодня`,
    loading_1: "AI анализирует текст...",
    loading_2: "Ищем ключевые слова...",
    loading_3: "Генерируем вопросы...",
    loading_4: "Почти готово...",
    short: "Вставьте минимум 50 символов.",
    limit: "Бесплатный лимит исчерпан. Получите Pro для безлимита.",
    social_today: "текстов проанализировано сегодня",
    social_rating: "оценка студентов",
    social_students: "Используют 500+ SAT студентов",
  },
  uz: {
    page_title: "Matnlarni oson tushuning.",
    page_subtitle: "Istalgan SAT matnini joylashtiring va darhol AI tahlil oling",
    analyzer_title: "AI Reading Tahlilchi",
    input_placeholder: "SAT Reading matnini bu yerga joylashtiring...",
    analyze_button: "🔍 Tahlil Qilish",
    free_limit: "BEPUL: Kuniga 3 ta",
    pro_limit: "PRO: Cheksiz ♾️",
    char_count: "belgi",
    min_hint: "Kamida 50 belgi",
    paste: "Joylash",
    examples: ["📚 Adabiyot misoli", "🔬 Fan misoli", "📜 Tarix misoli"],
    trust: ["🔒 Matningiz ommaviy saqlanmaydi", "⚡ Natija 3 soniyada", "🤖 Claude AI bilan"],
    features: ["Claude AI", "3 Til", "SAT uchun", "Darhol"],
    remaining: (count: number | null) => count === null ? "♾️ Cheksiz — Pro faol" : `✅ Bugun ${count} ta bepul tahlil qoldi`,
    loading_1: "AI matnni tahlil qilmoqda...",
    loading_2: "Muhim so'zlar aniqlanmoqda...",
    loading_3: "Savollar tayyorlanmoqda...",
    loading_4: "Deyarli tayyor...",
    short: "Kamida 50 belgi joylashtiring.",
    limit: "Bepul limit tugadi. Cheksiz tahlil uchun Pro oling.",
    social_today: "matn bugun tahlil qilindi",
    social_rating: "o'quvchilar bahosi",
    social_students: "500+ SAT o'quvchi ishlatadi",
  },
} satisfies Record<Language, Record<string, unknown>>;

const examples = {
  literature: "The old house stood at the edge of the field, its windows reflecting the pale morning light. Although Mara had passed it many times, today it seemed less abandoned than expectant, as if it had been waiting for her to notice the faint music drifting from within.",
  science: "Researchers studying coral reefs have found that some species can adapt to warmer waters faster than previously expected. However, the scientists caution that adaptation alone cannot offset the combined pressures of pollution, acidification, and habitat loss.",
  history: "During the late nineteenth century, urban reformers argued that public parks were not luxuries but necessities. They believed green spaces could improve public health, encourage civic pride, and offer working families relief from crowded industrial neighborhoods.",
};

export default function ReadingAnalyzerPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const copy = TRANSLATIONS[language];
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(3);
  const [stats, setStats] = useState({ today: 127, rating: 4.9, total: 500 });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const loadingMessages = useMemo(() => [copy.loading_1, copy.loading_2, copy.loading_3, copy.loading_4] as string[], [copy]);
  const ready = text.trim().length >= 50;

  useEffect(() => {
    getReadingAnalyzerStats().then(setStats).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isLoading) return undefined;
    const timer = window.setInterval(() => setLoadingIndex((current) => (current + 1) % loadingMessages.length), 1000);
    return () => window.clearInterval(timer);
  }, [isLoading, loadingMessages.length]);

  async function submit() {
    setError("");
    if (!getToken()) {
      router.push(`/login?next=/reading-analyzer?lang=${language}`);
      return;
    }
    if (!ready) {
      setError(copy.short as string);
      return;
    }
    setIsLoading(true);
    try {
      const result = await analyzePassage({ text, language });
      setRemaining(result.remaining_free ?? null);
      saveResult(result);
      router.push(`/reading-analyzer/result?lang=${language}`);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) {
        setError(copy.limit as string);
      } else {
        setError(caught instanceof Error ? caught.message : "Unable to analyze this passage.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function pasteFromClipboard() {
    const value = await navigator.clipboard?.readText().catch(() => "");
    if (value) setText(value.slice(0, 9000));
    textareaRef.current?.focus();
  }

  function useExample(value: string) {
    setText(value);
    textareaRef.current?.focus();
  }

  return (
    <main className="min-h-screen bg-[#0d0e0f] text-white">
      <LuxuryNavbar />
      <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl gap-8 px-4 py-8 sm:px-6 md:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div className="space-y-7">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#FFD700]/75">SATTEST.UZ AI</p>
            <h1 className="mt-5 max-w-2xl text-5xl font-light leading-none md:text-7xl">{copy.page_title as string}</h1>
            <p className="mt-5 max-w-xl text-lg font-light leading-8 text-white/62">{copy.page_subtitle as string}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(copy.features as string[]).map((item) => (
              <div className="border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-white/72" key={item}>✓ {item}</div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Proof icon={<Zap size={18} />} value={String(stats.today)} label={copy.social_today as string} />
            <Proof icon={<Star size={18} />} value={`${stats.rating}/5`} label={copy.social_rating as string} />
            <Proof icon={<Sparkles size={18} />} value={`${Math.max(500, stats.total)}+`} label={copy.social_students as string} />
          </div>
        </div>

        <article className="border border-white/10 bg-white/[0.04] p-4 shadow-[0_34px_100px_rgba(0,0,0,0.42)] sm:p-6 md:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center border border-[#FFD700]/25 bg-[#FFD700]/10 text-[#FFD700]">
              <Search size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-light text-white">🔍 {copy.analyzer_title as string}</h2>
              <p className="mt-1 text-sm text-white/50">{copy.free_limit as string}<span className="mx-2 text-white/20">•</span>{copy.pro_limit as string}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {Object.values(examples).map((value, index) => (
              <button className="min-h-11 border border-white/10 bg-black/20 px-3 py-2 text-left text-xs font-black uppercase tracking-[0.08em] text-white/62 transition hover:border-[#FFD700]/50 hover:text-[#FFD700]" key={value} onClick={() => useExample(value)} type="button">
                {(copy.examples as string[])[index]}
              </button>
            ))}
          </div>

          <div className="relative mt-5">
            <textarea
              className="min-h-[240px] w-full resize-y border border-white/10 bg-black/35 p-4 pb-12 text-base font-light leading-7 text-white outline-none transition-colors placeholder:text-white/28 focus:border-[#FFD700]/70 sm:min-h-[300px]"
              maxLength={9000}
              onChange={(event) => setText(event.target.value)}
              placeholder={copy.input_placeholder as string}
              ref={textareaRef}
              value={text}
            />
            <div className="absolute bottom-3 left-4 text-xs font-semibold text-white/35">{copy.min_hint as string}</div>
            <div className="absolute bottom-3 right-4 text-xs text-white/35">{text.length}/9000 {copy.char_count as string}</div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button className="inline-flex min-h-11 items-center gap-2 border border-white/10 bg-black/20 px-4 text-sm font-bold text-white/62 hover:border-white/30 hover:text-white" onClick={pasteFromClipboard} type="button">
              <Clipboard size={16} /> {copy.paste as string}
            </button>
            <div className="text-sm font-semibold text-[#FFD700]">{(copy.remaining as (count: number | null) => string)(remaining)}</div>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-white/50 sm:grid-cols-3">
            {(copy.trust as string[]).map((item) => <span className="border border-white/10 bg-black/20 px-3 py-2" key={item}>{item}</span>)}
          </div>

          {error ? <div className="mt-4 border border-red-300/25 bg-red-950/25 p-4 text-sm text-red-100">{error}</div> : null}

          {isLoading ? (
            <div className="mt-5 flex min-h-16 items-center justify-center gap-3 border border-[#FFD700]/25 bg-[#FFD700]/10 px-5 py-4 text-[#FFD700]">
              <Loader2 className="animate-spin" size={20} />
              <span className="font-semibold">{loadingMessages[loadingIndex]}</span>
            </div>
          ) : (
            <button
              className={["mt-5 flex min-h-14 w-full items-center justify-center gap-3 border border-[#FFD700] bg-[#FFD700] px-5 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-transparent hover:text-[#FFD700]", ready ? "animate-pulse" : "opacity-60"].join(" ")}
              onClick={submit}
              type="button"
            >
              {copy.analyze_button as string} <ArrowRight size={18} />
            </button>
          )}
        </article>
      </section>
    </main>
  );
}

function Proof({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center gap-2 text-[#FFD700]">{icon}<span className="text-2xl font-light text-white">{value}</span></div>
      <p className="mt-1 text-sm text-white/50">{label}</p>
    </div>
  );
}

function saveResult(result: ReadingAnalysisResponse) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("sattest_reading_analysis_latest", JSON.stringify(result));
  window.localStorage.setItem("sattest_reading_analysis_expiry", String(Date.now() + 24 * 60 * 60 * 1000));
}
