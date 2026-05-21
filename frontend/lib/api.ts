export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://api.sattest.uz").replace(/\/$/, "");

export type Question = {
  id: string;
  section: "reading_writing" | "math";
  module: number;
  difficulty: number;
  topic: string;
  subtopic?: string | null;
  structure_key: string;
  graph_path?: string | null;
  data_type: "none" | "text_data" | "table" | "graph";
  data_payload?: {
    type?: "cross_text" | string;
    text_1?: string;
    text_2?: string;
    title?: string;
    columns?: string[];
    rows?: Record<string, string | number>[];
    x_label?: string;
    y_label?: string;
    series?: {
      name: string;
      values: [number, number][];
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

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
  } catch (error) {
    console.log("API unavailable, continue");
    throw new ApiError("API unavailable", undefined);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.detail || "Request failed", response.status);
  }
  return response.json();
}

export function saveAuth(token: string) {
  localStorage.setItem("sat1600_token", token);
}
