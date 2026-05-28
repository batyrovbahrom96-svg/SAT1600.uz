export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://api.sattest.uz").replace(/\/$/, "");

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

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sat1600_token");
}

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
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
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
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
    const body = await response.json().catch(() => ({}));
    if (response.status === 404 && body.detail === "Not Found") {
      throw new ApiError("This API endpoint is not deployed yet. Redeploy the SATTEST.UZ backend with the latest code.", response.status);
    }
    throw new ApiError(formatApiErrorDetail(body.detail), response.status);
  }
  return response.json();
}

export function saveAuth(token: string) {
  localStorage.setItem("sat1600_token", token);
}
