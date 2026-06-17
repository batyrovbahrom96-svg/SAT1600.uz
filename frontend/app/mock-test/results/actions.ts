"use server";

type DiagnosticLanguage = "EN" | "RU" | "UZ";

type DiagnosticNotificationPayload = {
  timestamp: string;
  estimatedScore: number;
  weakAreas: string[];
  language: DiagnosticLanguage;
  userTelegramId?: string | null;
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "https://api.sattest.uz").replace(/\/$/, "");

export async function notifyDiagnosticResult(payload: DiagnosticNotificationPayload) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const estimatedScore = Math.round(Number(payload.estimatedScore));
  const timestamp = payload.timestamp || new Date().toISOString();

  if (!secret) {
    console.error("Diagnostic Telegram notification skipped: TELEGRAM_WEBHOOK_SECRET is missing in the frontend server environment.");
    return { ok: false, skipped: "TELEGRAM_WEBHOOK_SECRET missing" };
  }

  if (!Number.isFinite(estimatedScore) || estimatedScore < 400 || estimatedScore > 1600) {
    console.error("Diagnostic Telegram notification skipped: invalid estimated score.", { estimatedScore });
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
      user_telegram_id: payload.userTelegramId || undefined,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("Diagnostic Telegram notification failed.", {
      status: response.status,
      body,
    });
    return { ok: false, status: response.status };
  }

  const body = await response.json();
  if (!body?.ok) {
    console.error("Diagnostic Telegram notification returned a non-ok response.", body);
  }
  return body;
}
