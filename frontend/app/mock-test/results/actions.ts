"use server";

type DiagnosticLanguage = "EN" | "RU" | "UZ";

type DiagnosticNotificationPayload = {
  timestamp: string;
  estimatedScore: number;
  weakAreas: string[];
  language: DiagnosticLanguage;
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "https://api.sattest.uz").replace(/\/$/, "");

export async function notifyDiagnosticResult(payload: DiagnosticNotificationPayload) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const estimatedScore = Math.round(Number(payload.estimatedScore));
  const timestamp = new Date().toISOString();

  if (!secret) {
    return { ok: false, skipped: "TELEGRAM_WEBHOOK_SECRET missing" };
  }

  if (!Number.isFinite(estimatedScore) || estimatedScore < 400 || estimatedScore > 1600) {
    return { ok: false, skipped: "invalid_estimated_score" };
  }

  const response = await fetch(`${API_URL}/api/telegram/diagnostic-result`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": secret,
    },
    body: JSON.stringify({
      timestamp,
      estimated_score: estimatedScore,
      weak_areas: payload.weakAreas.slice(0, 5),
      language: payload.language,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  return response.json();
}
