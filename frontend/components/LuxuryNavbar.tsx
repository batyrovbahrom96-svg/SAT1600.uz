"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { PremiumButton } from "@/components/PremiumButton";
import { api, clearAuth, getStudentName, getSubscriptionStatus, getToken } from "@/lib/api";
import { languages, useLanguage, type Language } from "@/lib/i18n";

const skipHomeIntroEvent = "sattest:skip-home-intro";

export function LuxuryNavbar() {
  const [studentName, setStudentName] = useState<string | null>(null);
  const [isProActive, setIsProActive] = useState(false);
  const { language, setLanguage } = useLanguage();
  const publicNavCopy: Record<Language, Array<{ label: string; href: string; proHref?: string }>> = {
    en: [
      { label: "About Us", href: "/about-us" },
      { label: "Pricing", href: "/pricing" }
    ],
    ru: [
      { label: "О нас", href: "/about-us" },
      { label: "Цены", href: "/pricing" }
    ],
    uz: [
      { label: "Biz haqimizda", href: "/about-us" },
      { label: "Narxlar", href: "/pricing" }
    ]
  };
  const studentNavCopy: Record<Language, Array<{ label: string; href: string; proHref?: string }>> = {
    en: [],
    ru: [],
    uz: []
  };
  const navItems = studentName ? studentNavCopy[language] : publicNavCopy[language];
  const actionCopy = {
    pricing: {
      en: "Pricing & Paynet",
      ru: "Цены и Paynet",
      uz: "Narx va To'lov"
    },
    login: {
      en: "Login",
      ru: "Войти",
      uz: "Kirish"
    },
    learn: {
      en: "Bepul boshlash →",
      ru: "Bepul boshlash →",
      uz: "Bepul boshlash →"
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

  const withLanguage = (href: string) => {
    const [withoutHash, hash] = href.split("#");
    const [pathname, query = ""] = withoutHash.split("?");
    const params = new URLSearchParams(query);
    params.set("lang", language);
    return `${pathname}?${params.toString()}${hash ? `#${hash}` : ""}`;
  };

  useEffect(() => {
    let active = true;
    const refreshAuth = () => {
      if (!getToken()) {
        setStudentName(null);
        setIsProActive(false);
        return;
      }

      const savedName = getStudentName();
      if (savedName) {
        setStudentName(savedName);
      } else {
        api<{ full_name: string }>("/api/auth/me")
          .then((profile) => {
            if (!active) return;
            localStorage.setItem("sat1600_full_name", profile.full_name);
            setStudentName(profile.full_name);
          })
          .catch(() => {
            if (active) setStudentName(null);
          });
      }

      getSubscriptionStatus()
        .then((status) => {
          if (!active) return;
          setIsProActive(status.has_active_subscription);
        })
        .catch(() => {
          if (active) setIsProActive(false);
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
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 py-3 sm:gap-x-4 sm:px-5 sm:py-4 md:px-8">
        <Link
          className="flex h-10 w-[118px] shrink-0 items-center border border-white/10 bg-black/30 px-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition-colors hover:border-white/30 sm:h-12 sm:w-[180px] sm:px-4 xl:w-[210px]"
          href={withLanguage("/?skipIntro=1")}
          onClick={(event) => {
            if (window.location.pathname === "/") {
              event.preventDefault();
              window.history.replaceState(null, "", withLanguage("/"));
              window.dispatchEvent(new Event(skipHomeIntroEvent));
            }
          }}
        >
          <Image
            className="h-auto w-full object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.32)]"
            src="/assets/brand/sattest-wordmark.png"
            alt="SATTEST.UZ"
            width={620}
            height={113}
            priority
          />
        </Link>

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1 sm:gap-2">
          <div className="flex shrink-0 items-center gap-px border border-white/10 bg-black/20 p-0.5 sm:p-1" aria-label="Language selector">
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
              <span className="hidden lg:block">
                <PremiumButton className="max-w-[230px] 2xl:max-w-[280px]" href={withLanguage("/path")} variant="compact">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{studentName}</span>
                    {isProActive ? (
                      <span className="shrink-0 rounded-full border border-white/35 bg-white/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white">
                        Pro
                      </span>
                    ) : null}
                  </span>
                </PremiumButton>
              </span>
              <button className="flex h-9 min-w-[64px] items-center justify-center whitespace-nowrap border border-white/12 bg-white/[0.035] px-2 text-[8px] font-black uppercase tracking-[0.1em] text-white/70 transition-colors hover:border-white/35 hover:text-white sm:h-11 sm:min-w-[112px] sm:px-4 sm:text-[10px] sm:tracking-[0.22em]" onClick={logout} type="button">
                {actionCopy.logout[language]}
              </button>
            </>
          ) : (
            <>
              <span className="hidden sm:block">
                <PremiumButton href={withLanguage("/learn")} variant="compact">
                  {actionCopy.learn[language]}
                </PremiumButton>
              </span>
              <Link className="h-9 whitespace-nowrap border border-white/12 bg-white/[0.035] px-2 text-[8px] font-black uppercase tracking-[0.1em] leading-[36px] text-white/70 transition-colors hover:border-white/35 hover:text-white sm:h-11 sm:px-4 sm:text-[10px] sm:tracking-[0.22em] sm:leading-[44px]" href={withLanguage("/login")}>
                {actionCopy.login[language]}
              </Link>
            </>
          )}
        </div>

        {navItems.length ? (
          <nav className="order-last flex w-full min-w-0 items-center justify-start gap-1 overflow-x-auto border border-white/10 bg-black/20 px-2 py-1 [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => (
              <Link
                className="shrink-0 whitespace-nowrap px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-white/48 transition-colors hover:text-white sm:px-4 sm:text-[10px] sm:tracking-[0.2em]"
                href={withLanguage(isProActive && item.proHref ? item.proHref : item.href)}
                key={item.label}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
