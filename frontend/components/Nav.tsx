"use client";

import Link from "next/link";
import { BarChart3, BookOpenCheck, Shield } from "lucide-react";

export function Nav() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-xl font-black tracking-tight text-ink">
          SAT1600.uz
        </Link>
        <nav className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Link className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-100" href="/dashboard">
            <BookOpenCheck size={18} /> Tests
          </Link>
          <Link className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-100" href="/results/demo">
            <BarChart3 size={18} /> Analytics
          </Link>
          <Link className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-100" href="/admin">
            <Shield size={18} /> Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
