"use server";

type FullMockNotificationPayload = {
  timestamp: string;
  totalScore: number;
  rwScore: number;
  mathScore: number;
  weakAreas: string[];
  language: "EN" | "RU" | "UZ";
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "https://api.sattest.uz").replace(/\/$/, "");

export async function notifyFullMockResult(payload: FullMockNotificationPayload) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Full mock Telegram notification skipped: TELEGRAM_WEBHOOK_SECRET is missing.");
    return { ok: false, skipped: "TELEGRAM_WEBHOOK_SECRET missing" };
  }

  const totalScore = Math.round(Number(payload.totalScore));
  const rwScore = Math.round(Number(payload.rwScore));
  const mathScore = Math.round(Number(payload.mathScore));

  if (![totalScore, rwScore, mathScore].every(Number.isFinite)) {
    console.error("Full mock Telegram notification skipped: invalid score payload.", payload);
    return { ok: false, skipped: "invalid_score" };
  }

  const response = await fetch(`${API_URL}/api/telegram/full-mock-result`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": secret,
    },
    body: JSON.stringify({
      timestamp: payload.timestamp || new Date().toISOString(),
      total_score: totalScore,
      rw_score: rwScore,
      math_score: mathScore,
      weak_areas: payload.weakAreas.slice(0, 5),
      language: payload.language,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("Full mock Telegram notification failed.", {
      status: response.status,
      body,
    });
    return { ok: false, status: response.status };
  }

  return response.json();
}
