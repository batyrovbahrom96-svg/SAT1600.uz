import { useEffect, useState } from "react";

export type Language = "en" | "ru" | "uz";

export const languages: Array<{ code: Language; label: string }> = [
  { code: "uz", label: "UZ" },
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" }
];

const storageKey = "sattest_language";
const languageEvent = "sattest:language-change";
let activeLanguage: Language | null = null;
const languageSubscribers = new Set<(language: Language) => void>();

export function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "uz";

  const requested = new URLSearchParams(window.location.search).get("lang");
  if (requested === "ru" || requested === "uz" || requested === "en") {
    try {
      window.localStorage?.setItem(storageKey, requested);
    } catch {
      // URL language still wins even when storage cannot be written.
    }
    return requested;
  }

  try {
    const stored = window.localStorage?.getItem(storageKey);
    if (stored === "ru" || stored === "uz" || stored === "en") return stored;
  } catch {
    // Continue to browser language detection.
  }

  const browserLanguage = window.navigator.language.toLowerCase();
  if (browserLanguage.startsWith("ru")) return "ru";
  if (browserLanguage.startsWith("en")) return "en";
  return "uz";
}

export function setStoredLanguage(language: Language) {
  activeLanguage = language;
  try {
    window.localStorage?.setItem(storageKey, language);
  } catch {
    // Keep the in-memory UI switch working even when storage is unavailable.
  }
  languageSubscribers.forEach((subscriber) => subscriber(language));
  if (typeof window.CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent(languageEvent, { detail: language }));
  }
}

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage());

  useEffect(() => {
    const syncLanguage = () => {
      const next = getInitialLanguage();
      activeLanguage = next;
      setLanguageState(next);
    };
    syncLanguage();

    const onLanguageChange = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next === "en" || next === "ru" || next === "uz") setLanguageState(next);
    };

    const onSharedLanguageChange = (next: Language) => setLanguageState(next);

    languageSubscribers.add(onSharedLanguageChange);
    window.addEventListener(languageEvent, onLanguageChange);
    window.addEventListener("popstate", syncLanguage);

    return () => {
      languageSubscribers.delete(onSharedLanguageChange);
      window.removeEventListener(languageEvent, onLanguageChange);
      window.removeEventListener("popstate", syncLanguage);
    };
  }, []);

  return {
    language,
    setLanguage: (next: Language) => {
      setLanguageState(next);
      setStoredLanguage(next);
    }
  };
}

export function pick<T>(value: Record<Language, T>, language: Language): T {
  return value[language] ?? value.en;
}
