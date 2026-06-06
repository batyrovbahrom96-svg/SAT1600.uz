import { useEffect, useState } from "react";

export type Language = "en" | "ru" | "uz";

export const languages: Array<{ code: Language; label: string }> = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "uz", label: "UZ" }
];

const storageKey = "sattest_language";
const languageEvent = "sattest:language-change";

export function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const requested = new URLSearchParams(window.location.search).get("lang");
  if (requested === "ru" || requested === "uz" || requested === "en") return requested;

  try {
    const saved = window.localStorage?.getItem(storageKey);
    if (saved === "ru" || saved === "uz" || saved === "en") return saved;
  } catch {
    return "en";
  }

  return "en";
}

export function setStoredLanguage(language: Language) {
  try {
    window.localStorage?.setItem(storageKey, language);
  } catch {
    // Keep the in-memory UI switch working even when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(languageEvent, { detail: language }));
}

export function useLanguage() {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    setLanguage(getInitialLanguage());

    const onLanguageChange = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next === "en" || next === "ru" || next === "uz") setLanguage(next);
    };

    const onStorage = () => setLanguage(getInitialLanguage());

    window.addEventListener(languageEvent, onLanguageChange);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(languageEvent, onLanguageChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return {
    language,
    setLanguage: (next: Language) => {
      setLanguage(next);
      setStoredLanguage(next);
    }
  };
}

export function pick<T>(value: Record<Language, T>, language: Language): T {
  return value[language] ?? value.en;
}
