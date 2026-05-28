"use client";

import Link from "next/link";

export function LuxuryNavbar() {
  const navItems = [
    { label: "Mock Test", href: "/mock-test" },
    { label: "Practice", href: "/practice" },
    { label: "Results", href: "/results/demo" },
    { label: "Pricing", href: "/#pricing" }
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#101112]/90 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 md:grid-cols-[1fr_auto_1fr] md:px-8">
        <Link
          className="flex h-12 w-[210px] items-center border border-white/10 bg-black/30 px-4 shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition-colors hover:border-white/30"
          href="/?skipIntro=1"
        >
          <img className="h-auto w-full object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.32)]" src="/assets/brand/sattest-wordmark.png" alt="SATTEST.UZ" />
        </Link>

        <nav className="hidden items-center gap-1 border border-white/10 bg-black/20 px-2 py-1 md:flex">
          {navItems.map((item) => (
            <Link
              className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/48 transition-colors hover:text-white"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2">
          <Link className="hidden h-11 items-center border border-white bg-white px-5 text-[10px] font-black uppercase tracking-[0.22em] text-black transition-colors hover:bg-transparent hover:text-white sm:flex" href="/mock-test">
            Start Test
          </Link>
          <Link className="h-11 border border-white/12 bg-white/[0.035] px-4 text-[10px] font-black uppercase tracking-[0.22em] leading-[44px] text-white/70 transition-colors hover:border-white/35 hover:text-white" href="/login">
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
