export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://web-production-a1ec0.up.railway.app"
).replace(/\/$/, "");

export type Question = {
  id: string;
  section: "reading_writing" | "math";
  module: number;
  order_index?: number;
  difficulty: number;
  topic: string;
  subtopic?: string | null;
  structure_key: string;
  graph_path?: string | null;
  data_type: "none" | "text_data" | "table" | "graph";
  data_payload?: {
    type?: "cross_text" | "notes" | string;
    text_1?: string;
    text_2?: string;
    task_goal?: "contrast" | "summarize" | "support" | string;
    entities?: string[];
    notes?: string[];
    title?: string;
    columns?: string[];
    rows?: Record<string, string | number>[];
    x_label?: string;
    y_label?: string;
    series?: {
      name: string;
      values: [number, number][];
      labels?: string[];
    }[];
    [key: string]: unknown;
  } | null;
  passage?: string | null;
  prompt: string;
  question_type: string;
  format: "multiple_choice" | "grid_in";
  estimated_time: number;
  choices: { label: string; text: string }[];
};

export type SubscriptionStatus = {
  has_active_subscription: boolean;
  subscription: {
    plan: string;
    status: string;
    provider?: string | null;
    current_period_end?: string | null;
  } | null;
};

export type UserProfile = {
  full_name: string;
  role: string;
  track_type?: "beginner" | "diagnostic" | null;
  preferred_language?: "uz" | "ru" | "en";
};

export type PaymentConfig = {
  payme_qr_url: string;
  click_qr_url: string;
  telegram_bot_url: string;
  plans: Record<string, { amount: number; days: number; label: string }>;
};

export type PaymentOrder = {
  id: string;
  reference: string;
  status: string;
  student_name: string;
  email: string;
  subscription_type: "monthly" | "three_month";
  amount: number;
  currency: string;
  estimated_score: number | null;
  weak_areas: string[];
  telegram_url: string;
  payme_qr_url: string;
  click_qr_url: string;
  created_at: string;
  activation_date: string | null;
  expiry_date: string | null;
};

export type ReadingAnalysis = {
  full_translation?: {
    uzbek?: string;
    russian?: string;
  };
  main_idea: {
    one_sentence?: string;
    one_sentence_en?: string;
    one_sentence_ru?: string;
    one_sentence_uz?: string;
    detailed_uz?: string;
    detailed_ru?: string;
    detailed_en?: string;
    sat_connection?: string;
    sat_connection_en?: string;
    sat_connection_ru?: string;
    sat_connection_uz?: string;
    uzbek?: string;
    russian?: string;
    english?: string;
  };
  vocabulary?: Array<{
    word: string;
    definition_uz?: string;
    definition_ru?: string;
    definition_en?: string;
    in_context?: string;
    in_context_en?: string;
    in_context_ru?: string;
    in_context_uz?: string;
    memory_trick?: string;
    memory_trick_en?: string;
    memory_trick_ru?: string;
    memory_trick_uz?: string;
    sat_frequency?: string;
    example?: string;
  }>;
  difficult_words: Array<{
    word: string;
    definition_uz?: string;
    definition_ru?: string;
    definition_en?: string;
    example?: string;
    in_context?: string;
    in_context_en?: string;
    in_context_ru?: string;
    in_context_uz?: string;
    memory_trick?: string;
    memory_trick_en?: string;
    memory_trick_ru?: string;
    memory_trick_uz?: string;
    sat_frequency?: string;
  }>;
  tone: {
    primary?: string;
    primary_en?: string;
    primary_ru?: string;
    primary_uz?: string;
    percentage?: number;
    type?: string;
    explanation_uz?: string;
    explanation_ru?: string;
    explanation_en?: string;
  };
  purpose: {
    primary?: string;
    primary_en?: string;
    primary_ru?: string;
    primary_uz?: string;
    percentage?: number;
    type?: string;
    explanation_uz?: string;
    explanation_ru?: string;
    explanation_en?: string;
  };
  author_perspective?: {
    uz?: string;
    ru?: string;
    en?: string;
  };
  sat_strategy?: {
    do_uz?: string[];
    do_ru?: string[];
    do_en?: string[];
    avoid_uz?: string[];
    avoid_ru?: string[];
    avoid_en?: string[];
    time_tip_uz?: string;
    time_tip_ru?: string;
    time_tip_en?: string;
    score_impact?: string;
  };
  how_to_approach?: {
    steps_en?: string[];
    steps_ru?: string[];
    steps_uz?: string[];
    time_management_en?: string;
    time_management_ru?: string;
    time_management_uz?: string;
    common_traps_en?: string[];
    common_traps_ru?: string[];
    common_traps_uz?: string[];
  };
  questions_solved?: Array<{
    question_number?: number;
    question_text?: string;
    question_text_ru?: string;
    question_text_uz?: string;
    options?: Record<"A" | "B" | "C" | "D", string>;
    options_ru?: Record<"A" | "B" | "C" | "D", string>;
    options_uz?: Record<"A" | "B" | "C" | "D", string>;
    correct_answer?: string;
    thinking_process_en?: string;
    thinking_process_ru?: string;
    thinking_process_uz?: string;
    why_correct_en?: string;
    why_correct_ru?: string;
    why_correct_uz?: string;
    why_wrong_en?: Partial<Record<"A" | "B" | "C" | "D", string>>;
    why_wrong_ru?: Partial<Record<"A" | "B" | "C" | "D", string>>;
    why_wrong_uz?: Partial<Record<"A" | "B" | "C" | "D", string>>;
    evidence_line?: string;
    question_type?: string;
    question_type_ru?: string;
    question_type_uz?: string;
    question_type_strategy_en?: string;
    question_type_strategy_ru?: string;
    question_type_strategy_uz?: string;
    difficulty?: string;
    tip_en?: string;
    tip_ru?: string;
    tip_uz?: string;
  }>;
  questions_solved_locked?: number;
  translation_locked?: boolean;
  vocabulary_locked?: boolean;
  improvement_plan_locked?: boolean;
  sat_tip: {
    uzbek?: string;
    russian?: string;
    english?: string;
  };
  practice_questions:
    | "LOCKED"
    | Array<{
        question: string;
        options: Record<"A" | "B" | "C" | "D", string>;
        correct: string;
        explanation: string;
        explanation_uz?: string;
        explanation_ru?: string;
        explanation_en?: string;
        question_type?: string;
      }>;
  improvement_plan?: {
    week1_uz?: string;
    week1_ru?: string;
    week1_en?: string;
    week2_uz?: string;
    week2_ru?: string;
    week2_en?: string;
    week3_uz?: string;
    week3_ru?: string;
    week3_en?: string;
    predicted_improvement?: string;
    predicted_improvement_en?: string;
    predicted_improvement_ru?: string;
    predicted_improvement_uz?: string;
  };
  difficulty?: string;
  passage_type?: string;
  reading_time?: string;
};

export type ReadingAnalysisResponse = {
  id?: string;
  share_id: string;
  share_url?: string;
  is_pro?: boolean;
  remaining_free?: number | null;
  analysis: ReadingAnalysis;
  source_text: string;
  input_type?: "text" | "image";
  created_at: string;
};

function getSafeStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function getToken() {
  return getSafeStorage()?.getItem("sat1600_token") ?? null;
}

function writeAuthCookie(token: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `sat1600_token=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`;
}

function clearAuthCookie() {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `sat1600_token=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function getStudentName() {
  return getSafeStorage()?.getItem("sat1600_full_name") ?? null;
}

export class ApiError extends Error {
  status?: number;
  detail?: unknown;

  constructor(message: string, status?: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function formatApiErrorDetail(detail: unknown) {
  if (!detail) return "Request failed";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const record = item as { loc?: unknown[]; msg?: unknown };
          const field = Array.isArray(record.loc) ? record.loc.filter((part) => part !== "body").join(".") : "";
          const message = typeof record.msg === "string" ? record.msg : "Invalid value";
          return field ? `${field}: ${message}` : message;
        }
        return String(item);
      })
      .join("; ");
  }
  if (typeof detail === "object") {
    return JSON.stringify(detail);
  }
  return String(detail);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const hasBody = options.body !== undefined;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    console.log("API unavailable:", error);
    throw new ApiError(`API unavailable: ${message}`, undefined);
  }

  if (!response.ok) {
    const body = await response.json().catch(async () => {
      const text = await response.text().catch(() => "");
      return text ? { detail: text } : {};
    });
    if (response.status === 404 && body.detail === "Not Found") {
      throw new ApiError("This API endpoint is not deployed yet. Redeploy the SATTEST.UZ backend with the latest code.", response.status);
    }
    throw new ApiError(formatApiErrorDetail(body.detail), response.status, body.detail);
  }
  return response.json();
}

export function getReadingAnalyzerAnonymousId() {
  const storage = getSafeStorage();
  if (!storage) return "";
  const existing = storage.getItem("sattest_ra_anon_id");
  if (existing) return existing;
  const generated = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ra_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  storage.setItem("sattest_ra_anon_id", generated);
  return generated;
}

export async function getSubscriptionStatus() {
  return api<SubscriptionStatus>("/api/subscriptions/me");
}

export async function getUserProfile() {
  return api<UserProfile>("/api/auth/me");
}

export async function updatePreferredLanguage(language: "uz" | "ru" | "en") {
  return api<{ ok: boolean; preferred_language: "uz" | "ru" | "en" }>("/api/auth/preferred-language", {
    method: "POST",
    body: JSON.stringify({ preferred_language: language }),
  });
}

export async function getPaymentConfig() {
  return api<PaymentConfig>("/api/payment/config");
}

export async function createPaymentOrder(payload: {
  subscription_type: "monthly" | "three_month";
  estimated_score?: number | null;
  weak_areas?: string[];
  conversion_source?: "diagnostic_lock" | "analyzer_limit" | "path_type_lock" | "mock_test_lock" | null;
}) {
  return api<PaymentOrder>("/api/payment/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function trackProLockView(source: "diagnostic_lock" | "analyzer_limit" | "path_type_lock" | "mock_test_lock") {
  if (!getToken()) return Promise.resolve({ ok: false });
  return api<{ ok: boolean }>("/api/platform/progress", {
    method: "POST",
    body: JSON.stringify({ event: "pro_lock_viewed", pro_conversion_source: source }),
  }).catch(() => ({ ok: false }));
}

export async function getPaymentOrder(reference: string) {
  return api<PaymentOrder>(`/api/payment/orders/${encodeURIComponent(reference)}`);
}

export async function analyzePassage(payload: { text: string; language: "uz" | "ru" | "en" }) {
  return api<ReadingAnalysisResponse>("/api/reading-analyzer/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function analyzePassagePublic(payload: { text: string; language: "uz" | "ru" | "en" }) {
  return api<ReadingAnalysisResponse>("/api/reading-analyzer/public/analyze", {
    method: "POST",
    headers: { "X-SATTEST-RA-ID": getReadingAnalyzerAnonymousId() },
    body: JSON.stringify(payload),
  });
}

export async function analyzePassageImage(payload: { file: File; language: "uz" | "ru" | "en" }) {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("language", payload.language);
  return api<ReadingAnalysisResponse>("/api/reading-analyzer/analyze-image", {
    method: "POST",
    body: formData,
  });
}

export async function analyzePassageImagePublic(payload: { file: File; language: "uz" | "ru" | "en" }) {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("language", payload.language);
  return api<ReadingAnalysisResponse>("/api/reading-analyzer/public/analyze-image", {
    method: "POST",
    headers: { "X-SATTEST-RA-ID": getReadingAnalyzerAnonymousId() },
    body: formData,
  });
}

export async function getSharedReadingAnalysis(shareId: string) {
  return api<ReadingAnalysisResponse>(`/api/shared/${encodeURIComponent(shareId)}`);
}

export async function getReadingAnalyzerHistory() {
  return api<Array<{
    id: string;
    share_id: string;
    language: string;
    created_at: string;
    source_preview: string;
    passage_type: string;
    difficulty: string;
  }>>("/api/reading-analyzer/history");
}

export async function getReadingAnalyzerStats() {
  return api<{ today: number; total: number; rating: number }>("/api/reading-analyzer/stats");
}

export function saveAuth(token: string, fullName?: string | null) {
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem("sat1600_token", token);
  writeAuthCookie(token);
  if (fullName) {
    storage.setItem("sat1600_full_name", fullName);
  }
  window.dispatchEvent(new Event("sattest:auth-change"));
}

export function clearAuth() {
  const storage = getSafeStorage();
  storage?.removeItem("sat1600_token");
  storage?.removeItem("sat1600_full_name");
  clearAuthCookie();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sattest:auth-change"));
  }
}
