"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clipboard, Loader2, Search, Sparkles, Star, Zap } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { ApiError, analyzePassage, analyzePassageImage, getReadingAnalyzerStats, getToken, type ReadingAnalysisResponse } from "@/lib/api";
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
    text_tab: "📝 Text",
    photo_tab: "📸 Photo",
    image_title: "Upload screenshot of passage",
    image_cta: "🔍 Analyze This Image",
    examples: ["📚 Literature Example", "🔬 Science Example", "📜 History Example"],
    trust: ["🔒 Your text is not stored", "⚡ Results in 3 seconds", "🤖 Powered by Claude AI"],
    features: ["Claude AI", "3 Languages", "SAT-specific", "Instant"],
    remaining: (count: number | null) => count === null ? "♾️ Unlimited — Pro Active" : `✅ ${count} free analyses remaining today`,
    loading_1: "AI analyzing passage...",
    loading_2: "Finding key vocabulary...",
    loading_3: "Generating questions...",
    loading_4: "Almost ready...",
    image_loading_1: "Extracting text from image...",
    image_loading_2: "Reading the passage...",
    image_loading_3: "Analyzing content...",
    image_loading_4: "Almost ready...",
    short: "Please paste at least 50 characters.",
    limit: "Free limit reached. Upgrade to Pro for unlimited analyses.",
    limit_title: "Today's free analyses are complete.",
    limit_used: (used: number) => `${used}/3 free analyses used today`,
    limit_value: "You already received real SAT value: main idea simplified, key vocabulary explained, tone and purpose identified, and SAT strategy generated.",
    limit_cta: "Upgrade to Pro to continue without stopping:",
    limit_benefits: ["Unlimited text and image analyses", "Full Uzbek/Russian translation", "All questions solved with full explanations"],
    upgrade_button: "🔑 Upgrade to Pro → 300,000 UZS/month",
    image_required: "Please upload or paste a screenshot first.",
    no_text_found: "Could not read this image. Please try: 1) Take a clearer screenshot 2) Make sure text is visible 3) Or paste the text directly",
    image_error: "Could not read this image. Please try: 1) Take a clearer screenshot 2) Make sure text is visible 3) Or paste the text directly",
    image_too_large: "Image too large. Please use image under 10MB.",
    invalid_file_type: "Please upload JPG, PNG or WEBP image.",
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
    text_tab: "📝 Текст",
    photo_tab: "📸 Фото",
    image_title: "Загрузите скриншот текста",
    image_cta: "🔍 Анализировать изображение",
    examples: ["📚 Пример литературы", "🔬 Пример науки", "📜 Пример истории"],
    trust: ["🔒 Текст не сохраняется публично", "⚡ Результат за 3 секунды", "🤖 Анализ от Claude AI"],
    features: ["Claude AI", "3 языка", "Для SAT", "Мгновенно"],
    remaining: (count: number | null) => count === null ? "♾️ Безлимит — Pro активен" : `✅ Осталось ${count} бесплатных анализа сегодня`,
    loading_1: "AI анализирует текст...",
    loading_2: "Ищем ключевые слова...",
    loading_3: "Генерируем вопросы...",
    loading_4: "Почти готово...",
    image_loading_1: "Извлекаем текст из изображения...",
    image_loading_2: "Читаем текст...",
    image_loading_3: "Анализируем содержание...",
    image_loading_4: "Почти готово...",
    short: "Вставьте минимум 50 символов.",
    limit: "Бесплатный лимит исчерпан. Получите Pro для безлимита.",
    limit_title: "Бесплатные анализы на сегодня закончились.",
    limit_used: (used: number) => `${used}/3 бесплатных анализа использовано сегодня`,
    limit_value: "Вы уже получили реальную пользу для SAT: главную идею, ключевые слова, тон и цель, а также стратегию решения.",
    limit_cta: "Перейдите на Pro, чтобы продолжить без остановки:",
    limit_benefits: ["Безлимитный анализ текста и фото", "Полный перевод на русский/узбекский", "Все вопросы решены с подробными объяснениями"],
    upgrade_button: "🔑 Получить Pro → 300,000 UZS/месяц",
    image_required: "Сначала загрузите или вставьте скриншот.",
    no_text_found: "Не удалось прочитать изображение. Попробуйте: 1) Более чёткий скриншот 2) Убедитесь что текст виден 3) Или вставьте текст напрямую",
    image_error: "Не удалось прочитать изображение. Попробуйте: 1) Более чёткий скриншот 2) Убедитесь что текст виден 3) Или вставьте текст напрямую",
    image_too_large: "Файл слишком большой. Используйте до 10МБ.",
    invalid_file_type: "Загрузите JPG, PNG или WEBP.",
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
    text_tab: "📝 Matn",
    photo_tab: "📸 Rasm",
    image_title: "Passage screenshotini yuklang",
    image_cta: "🔍 Bu rasmni tahlil qilish",
    examples: ["📚 Adabiyot misoli", "🔬 Fan misoli", "📜 Tarix misoli"],
    trust: ["🔒 Matningiz ommaviy saqlanmaydi", "⚡ Natija 3 soniyada", "🤖 Claude AI bilan"],
    features: ["Claude AI", "3 Til", "SAT uchun", "Darhol"],
    remaining: (count: number | null) => count === null ? "♾️ Cheksiz — Pro faol" : `✅ Bugun ${count} ta bepul tahlil qoldi`,
    loading_1: "AI matnni tahlil qilmoqda...",
    loading_2: "Muhim so'zlar aniqlanmoqda...",
    loading_3: "Savollar tayyorlanmoqda...",
    loading_4: "Deyarli tayyor...",
    image_loading_1: "Rasmdan matn olinmoqda...",
    image_loading_2: "Matn o'qilmoqda...",
    image_loading_3: "Mazmun tahlil qilinmoqda...",
    image_loading_4: "Deyarli tayyor...",
    short: "Kamida 50 belgi joylashtiring.",
    limit: "Bepul limit tugadi. Cheksiz tahlil uchun Pro oling.",
    limit_title: "Bugungi bepul tahlillar tugadi.",
    limit_used: (used: number) => `Bugun ${used}/3 bepul tahlil ishlatildi`,
    limit_value: "Siz allaqachon haqiqiy SAT qiymatini oldingiz: asosiy g'oya, muhim so'zlar, ton va maqsad, hamda SAT strategiyasi.",
    limit_cta: "To'xtamasdan davom etish uchun Pro oling:",
    limit_benefits: ["Cheksiz matn va rasm tahlili", "To'liq Uzbek/Russian tarjima", "Barcha savollar to'liq yechim va izoh bilan"],
    upgrade_button: "🔑 Pro Olish → 300,000 UZS/oy",
    image_required: "Avval screenshot yuklang yoki joylashtiring.",
    no_text_found: "Rasmni o'qib bo'lmadi. Sinab ko'ring: 1) Aniqroq screenshot 2) Matn ko'rinishini tekshiring 3) Yoki matnni to'g'ridan joylashtiring",
    image_error: "Rasmni o'qib bo'lmadi. Sinab ko'ring: 1) Aniqroq screenshot 2) Matn ko'rinishini tekshiring 3) Yoki matnni to'g'ridan joylashtiring",
    image_too_large: "Rasm juda katta. 10MB gacha yuklang.",
    invalid_file_type: "JPG, PNG yoki WEBP yuklang.",
    social_today: "matn bugun tahlil qilindi",
    social_rating: "o'quvchilar bahosi",
    social_students: "500+ SAT o'quvchi ishlatadi",
  },
} satisfies Record<Language, Record<string, unknown>>;

const examples = {
  literature: `The following passage is adapted from a novel published in 1890.

Sarah walked slowly through the garden, each step heavy with memory. The roses, once vibrant and full of life, now drooped sadly in the autumn rain. She had planted them with her mother twenty years ago, and now the garden seemed to hold both the warmth of that afternoon and the silence that followed her mother's absence.

Questions:
1. The main purpose of this passage is to:
A) Describe a garden
B) Show Sarah's emotional state
C) Explain rose cultivation
D) Compare past and present weather

2. The word "vibrant" in line 2 most nearly means:
A) Dark
B) Full of energy
C) Artificial
D) Faded`,
  science: `Recent studies have shown that photosynthesis, the process by which plants convert sunlight into energy, is more complex than previously thought. Scientists have discovered that plants can adjust the efficiency of this process depending on temperature, water availability, and the amount of light they receive. This flexibility may help some species survive in changing climates, although it cannot protect plants from every environmental stress.

Questions:
1. According to the passage, photosynthesis:
A) Was recently discovered
B) Is simpler than thought
C) Is more complex than thought
D) Converts energy into sunlight`,
  history: `The Industrial Revolution, which began in Britain in the late 18th century, fundamentally transformed society. Factories replaced many traditional workshops, cities expanded rapidly, and new forms of transportation connected markets more efficiently. Although these changes increased production, they also created difficult working conditions and forced governments to reconsider their role in protecting citizens.

Questions:
1. The author's primary purpose is to:
A) Criticize the Industrial Revolution
B) Explain its historical significance
C) Compare it to modern industry
D) Describe specific inventions`,
};

export default function ReadingAnalyzerPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const copy = TRANSLATIONS[language];
  const [text, setText] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "image">("text");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [error, setError] = useState("");
  const [limitReached, setLimitReached] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(3);
  const [stats, setStats] = useState({ today: 127, rating: 4.9, total: 500 });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const loadingMessages = useMemo(() => {
    if (inputMode === "image") return [copy.image_loading_1, copy.image_loading_2, copy.image_loading_3, copy.image_loading_4] as string[];
    return [copy.loading_1, copy.loading_2, copy.loading_3, copy.loading_4] as string[];
  }, [copy, inputMode]);
  const ready = text.trim().length >= 50;
  const canAnalyze = inputMode === "text" ? ready : Boolean(imageFile);
  const usedToday = remaining === null ? 0 : Math.max(0, 3 - remaining);

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
    setLimitReached(false);
    if (!getToken()) {
      router.push(`/login?next=/reading-analyzer?lang=${language}`);
      return;
    }
    if (inputMode === "text" && !ready) {
      setError(copy.short as string);
      return;
    }
    if (inputMode === "image" && !imageFile) {
      setError(copy.image_required as string);
      return;
    }
    setIsLoading(true);
    try {
      const result = inputMode === "image" && imageFile ? await analyzeImageWithFallback(imageFile, language) : await analyzePassage({ text, language });
      setRemaining(result.remaining_free ?? null);
      setLimitReached(false);
      saveResult(result);
      router.push(`/reading-analyzer/result?lang=${language}`);
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (isLimitError(caught)) {
          setRemaining(0);
          setLimitReached(true);
          setError("");
          return;
        }
        setError(errorMessage(caught, copy));
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

          <div className="mt-5 grid grid-cols-2 overflow-hidden border border-white/10">
            <button className={["min-h-12 text-sm font-black uppercase tracking-[0.12em] transition", inputMode === "text" ? "bg-[#FFD700] text-black" : "bg-black/20 text-white/55 hover:text-white"].join(" ")} onClick={() => setInputMode("text")} type="button">
              {copy.text_tab as string}
            </button>
            <button className={["min-h-12 text-sm font-black uppercase tracking-[0.12em] transition", inputMode === "image" ? "bg-[#FFD700] text-black" : "bg-black/20 text-white/55 hover:text-white"].join(" ")} onClick={() => setInputMode("image")} type="button">
              {copy.photo_tab as string}
            </button>
          </div>

          {inputMode === "text" ? (
            <>
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
            </>
          ) : (
            <div className="mt-5">
              <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-white/45">{copy.image_title as string}</p>
              <ImageUpload lang={language} onImageSelect={setImageFile} />
              <div className="mt-3 text-sm font-semibold text-[#FFD700]">{(copy.remaining as (count: number | null) => string)(remaining)}</div>
            </div>
          )}

          <div className="mt-4 grid gap-2 text-sm text-white/50 sm:grid-cols-3">
            {(copy.trust as string[]).map((item) => <span className="border border-white/10 bg-black/20 px-3 py-2" key={item}>{item}</span>)}
          </div>

          {limitReached ? (
            <LimitReachedCard
              copy={copy}
              onUpgrade={() => router.push(`/pricing?lang=${language}`)}
              used={Math.max(3, usedToday)}
            />
          ) : null}

          {error ? <div className="mt-4 border border-red-300/25 bg-red-950/25 p-4 text-sm text-red-100">{error}</div> : null}

          {isLoading ? (
            <div className="mt-5 flex min-h-16 items-center justify-center gap-3 border border-[#FFD700]/25 bg-[#FFD700]/10 px-5 py-4 text-[#FFD700]">
              <Loader2 className="animate-spin" size={20} />
              <span className="font-semibold">{loadingMessages[loadingIndex]}</span>
            </div>
          ) : (
            <button
              className={["mt-5 flex min-h-14 w-full items-center justify-center gap-3 border border-[#FFD700] bg-[#FFD700] px-5 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-transparent hover:text-[#FFD700]", canAnalyze ? "animate-pulse" : "opacity-60"].join(" ")}
              onClick={submit}
              type="button"
            >
              {(inputMode === "image" ? copy.image_cta : copy.analyze_button) as string} <ArrowRight size={18} />
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

function LimitReachedCard({ copy, used, onUpgrade }: { copy: Record<string, unknown>; used: number; onUpgrade: () => void }) {
  const benefits = copy.limit_benefits as string[];
  return (
    <div className="mt-4 border border-[#FFD700]/35 bg-[#1d1908] p-5 shadow-[0_18px_60px_rgba(255,215,0,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#FFD700]/80">
            {(copy.limit_used as (used: number) => string)(used)}
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{copy.limit_title as string}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">{copy.limit_value as string}</p>
        </div>
        <Sparkles className="shrink-0 text-[#FFD700]" size={28} />
      </div>

      <div className="mt-4 border border-white/10 bg-black/25 p-4">
        <p className="text-sm font-semibold text-white">{copy.limit_cta as string}</p>
        <ul className="mt-3 grid gap-2 text-sm text-white/72">
          {benefits.map((benefit) => (
            <li className="flex gap-2" key={benefit}>
              <span className="text-[#FFD700]">✓</span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 border border-[#FFD700] bg-[#FFD700] px-4 text-sm font-black uppercase tracking-[0.12em] text-black transition hover:bg-transparent hover:text-[#FFD700]"
        onClick={onUpgrade}
        type="button"
      >
        {copy.upgrade_button as string} <ArrowRight size={17} />
      </button>
    </div>
  );
}

function saveResult(result: ReadingAnalysisResponse) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("sattest_reading_analysis_latest", JSON.stringify(result));
  window.localStorage.setItem("sattest_reading_analysis_expiry", String(Date.now() + 24 * 60 * 60 * 1000));
}

function errorMessage(error: ApiError, copy: Record<string, unknown>) {
  const message = error.message || "";
  if (error.status === 403) return copy.limit as string;
  if (message.includes("limit_reached")) return copy.limit as string;
  if (message.includes("image_error")) return copy.image_error as string;
  if (message.includes("no_text_found")) return copy.no_text_found as string;
  if (message.includes("image_too_large")) return copy.image_too_large as string;
  if (message.includes("invalid_file_type")) return copy.invalid_file_type as string;
  if (message.includes("text_too_short")) return copy.short as string;
  return message;
}

function isLimitError(error: ApiError) {
  const message = error.message || "";
  return error.status === 403 || message.includes("limit_reached");
}

async function analyzeImageWithFallback(file: File, language: Language): Promise<ReadingAnalysisResponse> {
  const normalizedFile = await normalizeImageForClaude(file);
  try {
    return await analyzePassageImage({ file: normalizedFile, language });
  } catch (error) {
    if (!(error instanceof ApiError) || !isImageReadError(error)) {
      throw error;
    }
    const extractedText = await extractTextWithBrowserOcr(normalizedFile);
    if (extractedText.trim().length < 50) {
      throw error;
    }
    return analyzePassage({ text: extractedText.slice(0, 9000), language });
  }
}

function isImageReadError(error: ApiError) {
  const message = error.message.toLowerCase();
  return message.includes("image_error") || message.includes("no_text_found") || message.includes("could not read");
}

async function extractTextWithBrowserOcr(file: File): Promise<string> {
  const { recognize } = await import("tesseract.js");
  const result = await recognize(file, "eng");
  return result.data.text || "";
}

async function normalizeImageForClaude(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(dataUrl);
    const maxWidth = 1800;
    const maxHeight = 2400;
    const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return file;
    return new File([blob], "sattest-reading-screenshot.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image"));
    image.src = src;
  });
}
