"use client";

import Link from "next/link";
import { ArrowRight, LockKeyhole, UserPlus } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";

export default function PracticeAccessPage() {
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
