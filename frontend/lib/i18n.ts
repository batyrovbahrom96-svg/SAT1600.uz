import { useEffect, useState } from "react";

export type Language = "en" | "ru" | "uz";

export const languages: Array<{ code: Language; label: string }> = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "uz", label: "UZ" }
];

const storageKey = "sattest_language";
const languageEvent = "sattest:language-change";
let activeLanguage: Language | null = null;
const languageSubscribers = new Set<(language: Language) => void>();

export function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const requested = new URLSearchParams(window.location.search).get("lang");
  if (requested === "ru" || requested === "uz" || requested === "en") {
    try {
      window.localStorage?.setItem(storageKey, requested);
    } catch {
      // URL language still wins even when storage cannot be written.
    }
    return requested;
  }

  return "en";
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
  const [language, setLanguageState] = useState<Language>(() => activeLanguage ?? getInitialLanguage());

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
