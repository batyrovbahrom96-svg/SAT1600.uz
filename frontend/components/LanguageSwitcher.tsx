"use client";

import { useEffect, useState } from "react";
import { getToken, getUserProfile, updatePreferredLanguage } from "@/lib/api";
import { languages, setStoredLanguage, useLanguage, type Language } from "@/lib/i18n";

const flags: Record<Language, string> = {
  uz: "🇺🇿",
  ru: "🇷🇺",
  en: "🇬🇧",
};

function isLanguage(value: unknown): value is Language {
  return value === "uz" || value === "ru" || value === "en";
}

function updateUrlLanguage(language: Language) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("lang", language);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  const [savingLanguage, setSavingLanguage] = useState<Language | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    const params = new URLSearchParams(window.location.search);
    if (isLanguage(params.get("lang"))) return;

    getUserProfile()
      .then((profile) => {
        if (!isLanguage(profile.preferred_language)) return;
        setStoredLanguage(profile.preferred_language);
        updateUrlLanguage(profile.preferred_language);
      })
      .catch(() => undefined);
  }, []);

  async function chooseLanguage(next: Language) {
    setLanguage(next);
    updateUrlLanguage(next);

    if (!getToken()) return;
    setSavingLanguage(next);
    try {
      await updatePreferredLanguage(next);
    } finally {
      setSavingLanguage(null);
    }
  }

  return (
    <div className={["inline-flex items-center rounded-full border border-white/10 bg-[#161616]/90 p-1 shadow-[0_12px_34px_rgba(0,0,0,0.24)]", className].filter(Boolean).join(" ")} aria-label="Language selector">
      {languages.map((item) => {
        const active = item.code === language;
        return (
          <button
            aria-pressed={active}
            className={[
              "min-h-9 rounded-full px-2.5 text-xs font-black transition duration-200 sm:px-3",
              active ? "bg-[#FFD700] text-black" : "border border-transparent text-white/55 hover:border-white/15 hover:text-[#FFD700]",
              savingLanguage === item.code ? "opacity-70" : ""
            ].join(" ")}
            disabled={savingLanguage !== null}
            key={item.code}
            onClick={() => chooseLanguage(item.code)}
            type="button"
          >
            <span className="sm:mr-1">{flags[item.code]}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
