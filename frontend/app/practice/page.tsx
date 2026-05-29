"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenText, Calculator, LockKeyhole, PenLine, UserPlus } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { getToken } from "@/lib/api";

const practiceSections = [
  {
    title: "SAT Reading",
    description: "Practice command of evidence, inference, main idea, text structure, and words in context.",
    icon: BookOpenText
  },
  {
    title: "SAT Writing",
    description: "Practice transitions, grammar, punctuation, rhetorical synthesis, and sentence boundaries.",
    icon: PenLine
  },
  {
    title: "SAT Math",
    description: "Practice algebra, advanced math, problem solving, data analysis, geometry, and precision.",
    icon: Calculator,
    href: "/practice/math"
  }
];

export default function PracticeAccessPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [selectedSection, setSelectedSection] = useState("SAT Reading");

  useEffect(() => {
    setIsLoggedIn(Boolean(getToken()));
    setHasCheckedAuth(true);
  }, []);

  if (!hasCheckedAuth) {
    return (
      <main className="min-h-screen bg-[#101112] text-white">
        <LuxuryNavbar />
        <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-4xl flex-col items-center justify-center px-5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/38">Practice</p>
          <h1 className="mt-5 text-4xl font-light text-white md:text-5xl">Checking your account</h1>
        </section>
      </main>
    );
  }

  if (isLoggedIn) {
    return (
      <main className="min-h-screen bg-[#101112] text-white">
        <LuxuryNavbar />

        <section className="mx-auto min-h-[calc(100vh-81px)] max-w-7xl px-5 py-14 md:px-8">
          <div className="border-b border-white/10 pb-10">
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Practice unlocked</p>
            <h1 className="mt-6 max-w-5xl text-5xl font-light leading-none text-white md:text-7xl">
              Choose what you want to practice.
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-light leading-8 text-white/50">
              Select a SAT practice area. The next step will connect this choice to targeted drills and section practice.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {practiceSections.map((section) => {
              const Icon = section.icon;
              const isSelected = selectedSection === section.title;
              const cardClass = `block min-h-[260px] border p-6 text-left transition-colors ${
                isSelected
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/[0.035] text-white hover:border-white/35 hover:bg-white/[0.06]"
              }`;
              const content = (
                <>
                  <div className={`flex h-14 w-14 items-center justify-center border ${
                    isSelected ? "border-black/15 bg-black text-white" : "border-white/10 bg-black/25 text-white/70"
                  }`}>
                    <Icon size={24} />
                  </div>
                  <p className={`mt-8 text-[10px] font-black uppercase tracking-[0.32em] ${
                    isSelected ? "text-black/45" : "text-white/38"
                  }`}>
                    Practice section
                  </p>
                  <h2 className="mt-3 text-3xl font-light">{section.title}</h2>
                  <p className={`mt-4 text-sm font-light leading-6 ${
                    isSelected ? "text-black/58" : "text-white/48"
                  }`}>
                    {section.description}
                  </p>
                  <div className={`mt-8 flex h-12 items-center justify-between border px-4 text-xs font-black uppercase tracking-[0.18em] ${
                    isSelected ? "border-black bg-black text-white" : "border-white/15 text-white/70"
                  }`}>
                    {section.href ? "Start practice" : isSelected ? "Selected" : "Choose"} <ArrowRight size={17} />
                  </div>
                </>
              );

              if (section.href) {
                return (
                  <Link className={cardClass} href={section.href} key={section.title}>
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  className={cardClass}
                  key={section.title}
                  onClick={() => setSelectedSection(section.title)}
                  type="button"
                >
                  {content}
                </button>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />

      <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl gap-10 px-5 py-14 md:px-8 lg:grid-cols-[1fr_440px] lg:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Student access required</p>
          <h1 className="mt-6 max-w-4xl text-5xl font-light leading-none text-white md:text-7xl">
            Sign in before starting SAT practice.
          </h1>
          <p className="mt-7 max-w-2xl text-lg font-light leading-8 text-white/50">
            Practice is personalized. Students must create an account or sign in first, then take the diagnostic mock SAT test so SATTEST.UZ can build practice from their own mistakes, weak skills, and score target.
          </p>
        </div>

        <div className="border border-white/10 bg-white/[0.035] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
          <div className="border-b border-white/10 pb-5">
            <div className="flex h-12 w-12 items-center justify-center border border-white/10 bg-black/20 text-white/70">
              <LockKeyhole size={22} />
            </div>
            <h2 className="mt-5 text-2xl font-light text-white">Continue to Practice</h2>
            <p className="mt-3 text-sm font-light leading-6 text-white/48">
              Create an account if this is your first time, or sign in to continue with your saved personal curriculum and weakness drills.
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            <Link className="flex h-13 items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/register">
              Sign Up <UserPlus size={18} />
            </Link>
            <Link className="flex h-13 items-center justify-between border border-white/15 bg-black/20 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-white/35 hover:text-white" href="/login">
              Sign In <ArrowRight size={18} />
            </Link>
          </div>

          <p className="mt-5 text-xs font-light leading-5 text-white/35">
            After signing up or signing in, take the diagnostic mock test to unlock personalized practice.
          </p>
        </div>
      </section>
    </main>
  );
}
