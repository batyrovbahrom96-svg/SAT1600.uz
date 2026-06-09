"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, clearAuth, getStudentName, getToken } from "@/lib/api";
import { languages, useLanguage, type Language } from "@/lib/i18n";

const skipHomeIntroEvent = "sattest:skip-home-intro";

export function LuxuryNavbar() {
  const [studentName, setStudentName] = useState<string | null>(null);
  const { language, setLanguage } = useLanguage();
  const navCopy: Record<Language, Array<{ label: string; href: string }>> = {
    en: [
      { label: "About Us", href: "/about-us" },
      { label: "Free Diagnostic", href: "/mock-test" },
      { label: "Practice", href: "/practice" },
      { label: "Demo Report", href: "/results/demo" },
      { label: "My 1400+", href: "/my-1400" },
      { label: "Pricing & Pay", href: "/pricing" }
    ],
    ru: [
      { label: "О нас", href: "/about-us" },
      { label: "Бесплатная диагностика", href: "/mock-test" },
      { label: "Практика", href: "/practice" },
      { label: "Демо отчет", href: "/results/demo" },
      { label: "Мой 1400+", href: "/my-1400" },
      { label: "Цены и оплата", href: "/pricing" }
    ],
    uz: [
      { label: "Biz haqimizda", href: "/about-us" },
      { label: "Bepul diagnostika", href: "/mock-test" },
      { label: "Mashqlar", href: "/practice" },
      { label: "Demo hisobot", href: "/results/demo" },
      { label: "Mening 1400+", href: "/my-1400" },
      { label: "Narx va to'lov", href: "/pricing" }
    ]
  };
  const navItems = navCopy[language];
  const actionCopy = {
    pricing: {
      en: "Pricing & Paynet",
      ru: "Цены и Paynet",
      uz: "Narx va Paynet"
    },
    login: {
      en: "Login",
      ru: "Войти",
      uz: "Kirish"
    },
    logout: {
      en: "Log out",
      ru: "Выйти",
      uz: "Chiqish"
    }
  };

  const changeLanguage = (next: Language) => {
    setLanguage(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  useEffect(() => {
    let active = true;
    const refreshAuth = () => {
      if (!getToken()) {
        setStudentName(null);
        return;
      }

      const savedName = getStudentName();
      if (savedName) {
        setStudentName(savedName);
        return;
      }

      api<{ full_name: string }>("/api/auth/me")
        .then((profile) => {
          if (!active) return;
          localStorage.setItem("sat1600_full_name", profile.full_name);
          setStudentName(profile.full_name);
        })
        .catch(() => {
          if (active) setStudentName(null);
        });
    };

    refreshAuth();
    window.addEventListener("storage", refreshAuth);
    window.addEventListener("sattest:auth-change", refreshAuth);
    return () => {
      active = false;
      window.removeEventListener("storage", refreshAuth);
      window.removeEventListener("sattest:auth-change", refreshAuth);
    };
  }, []);

  function logout() {
    clearAuth();
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#101112]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4 md:px-8">
        <Link
          className="flex h-10 w-[118px] shrink-0 items-center border border-white/10 bg-black/30 px-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition-colors hover:border-white/30 sm:h-12 sm:w-[180px] sm:px-4 xl:w-[210px]"
          href="/?skipIntro=1"
          onClick={(event) => {
            if (window.location.pathname === "/") {
              event.preventDefault();
              window.history.replaceState(null, "", "/");
              window.dispatchEvent(new Event(skipHomeIntroEvent));
            }
          }}
        >
          <img className="h-auto w-full object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.32)]" src="/assets/brand/sattest-wordmark.png" alt="SATTEST.UZ" />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden border border-white/10 bg-black/20 px-2 py-1 2xl:flex">
          {navItems.map((item) => (
            <Link
              className="whitespace-nowrap px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-white/48 transition-colors hover:text-white 2xl:px-4 2xl:text-[10px] 2xl:tracking-[0.24em]"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1 sm:gap-2">
          <div className="flex shrink-0 items-center border border-white/10 bg-black/20 p-0.5 sm:p-1" aria-label="Language selector">
            {languages.map((item) => (
              <button
                className={[
                  "h-8 px-1.5 text-[8px] font-black uppercase tracking-[0.08em] transition-colors sm:h-9 sm:px-2 sm:text-[10px] sm:tracking-[0.12em]",
                  language === item.code ? "bg-white text-black" : "text-white/50 hover:text-white"
                ].join(" ")}
                key={item.code}
                onClick={() => changeLanguage(item.code)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          {studentName ? (
            <>
              <Link className="hidden h-11 max-w-[190px] items-center border border-white bg-white px-4 text-[10px] font-black uppercase tracking-[0.14em] text-black transition-colors hover:bg-transparent hover:text-white lg:flex 2xl:max-w-[240px] 2xl:px-5 2xl:tracking-[0.16em]" href="/dashboard">
                <span className="truncate">{studentName}</span>
              </Link>
              <button className="flex h-9 min-w-[64px] items-center justify-center whitespace-nowrap border border-white/12 bg-white/[0.035] px-2 text-[8px] font-black uppercase tracking-[0.1em] text-white/70 transition-colors hover:border-white/35 hover:text-white sm:h-11 sm:min-w-[112px] sm:px-4 sm:text-[10px] sm:tracking-[0.22em]" onClick={logout} type="button">
                {actionCopy.logout[language]}
              </button>
            </>
          ) : (
            <>
              <Link className="hidden h-11 items-center border border-white bg-white px-5 text-[10px] font-black uppercase tracking-[0.22em] text-black transition-colors hover:bg-transparent hover:text-white sm:flex" href="/pricing">
                {actionCopy.pricing[language]}
              </Link>
              <Link className="h-9 whitespace-nowrap border border-white/12 bg-white/[0.035] px-2 text-[8px] font-black uppercase tracking-[0.1em] leading-[36px] text-white/70 transition-colors hover:border-white/35 hover:text-white sm:h-11 sm:px-4 sm:text-[10px] sm:tracking-[0.22em] sm:leading-[44px]" href="/login">
                {actionCopy.login[language]}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
