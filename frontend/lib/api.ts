export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export type Question = {
  id: string;
  section: "reading_writing" | "math";
  module: number;
  difficulty: number;
  topic: string;
  subtopic?: string | null;
  structure_key: string;
  graph_path?: string | null;
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

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "Request failed");
  }
  return response.json();
}

export function saveAuth(token: string) {
  localStorage.setItem("sat1600_token", token);
}
