import type { DiagnosticAnswers } from "@/lib/free-diagnostic";

export const FREE_DIAGNOSTIC_STORAGE_KEY = "sattest_free_diagnostic";
export const FREE_DIAGNOSTIC_EMAIL_KEY = "sattest_free_diagnostic_email";
export const FREE_DIAGNOSTIC_TTL_MS = 48 * 60 * 60 * 1000;

export type StoredFreeDiagnostic = {
  sessionId: string;
  answers: DiagnosticAnswers;
  email?: string;
  completedAt: string;
  expiresAt: string;
  attachedToAccountAt?: string;
};

type StorageKind = "localStorage" | "sessionStorage";

function getStorage(kind: StorageKind) {
  if (typeof window === "undefined") return null;
  try {
    return window[kind];
  } catch {
    return null;
  }
}

function normalizeStoredDiagnostic(parsed: Partial<StoredFreeDiagnostic>): StoredFreeDiagnostic | null {
  if (!parsed.sessionId || !parsed.answers || !parsed.completedAt) return null;
  const completedAtMs = Date.parse(parsed.completedAt);
  if (Number.isNaN(completedAtMs)) return null;

  const expiresAt = parsed.expiresAt || new Date(completedAtMs + FREE_DIAGNOSTIC_TTL_MS).toISOString();
  return {
    sessionId: parsed.sessionId,
    answers: parsed.answers,
    email: parsed.email,
    completedAt: parsed.completedAt,
    expiresAt,
    attachedToAccountAt: parsed.attachedToAccountAt
  };
}

function isExpired(diagnostic: StoredFreeDiagnostic) {
  return Date.parse(diagnostic.expiresAt) <= Date.now();
}

export function buildStoredFreeDiagnostic({
  sessionId,
  answers,
  email
}: {
  sessionId: string;
  answers: DiagnosticAnswers;
  email?: string | null;
}): StoredFreeDiagnostic {
  const completedAt = new Date();
  return {
    sessionId,
    answers,
    email: email?.trim() || undefined,
    completedAt: completedAt.toISOString(),
    expiresAt: new Date(completedAt.getTime() + FREE_DIAGNOSTIC_TTL_MS).toISOString()
  };
}

export function saveFreeDiagnosticResult(diagnostic: StoredFreeDiagnostic) {
  const raw = JSON.stringify(diagnostic);
  getStorage("localStorage")?.setItem(FREE_DIAGNOSTIC_STORAGE_KEY, raw);
  getStorage("sessionStorage")?.setItem(FREE_DIAGNOSTIC_STORAGE_KEY, raw);
}

export function clearFreeDiagnosticResult() {
  getStorage("localStorage")?.removeItem(FREE_DIAGNOSTIC_STORAGE_KEY);
  getStorage("sessionStorage")?.removeItem(FREE_DIAGNOSTIC_STORAGE_KEY);
}

export function getFreeDiagnosticResult() {
  const sessionStorage = getStorage("sessionStorage");
  const localStorage = getStorage("localStorage");
  const raw = sessionStorage?.getItem(FREE_DIAGNOSTIC_STORAGE_KEY) ?? localStorage?.getItem(FREE_DIAGNOSTIC_STORAGE_KEY);
  if (!raw) return null;

  try {
    const diagnostic = normalizeStoredDiagnostic(JSON.parse(raw));
    if (!diagnostic || isExpired(diagnostic)) {
      clearFreeDiagnosticResult();
      return null;
    }

    saveFreeDiagnosticResult(diagnostic);
    return diagnostic;
  } catch {
    clearFreeDiagnosticResult();
    return null;
  }
}

export function markFreeDiagnosticAttachedToAccount() {
  const diagnostic = getFreeDiagnosticResult();
  if (!diagnostic) return null;
  const attached = { ...diagnostic, attachedToAccountAt: new Date().toISOString() };
  saveFreeDiagnosticResult(attached);
  return attached;
}
