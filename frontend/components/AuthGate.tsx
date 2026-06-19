"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/api";

const publicPrefixes = [
  "/",
  "/login",
  "/register",
  "/pricing",
  "/about-us",
  "/auth/google/success",
  "/shared",
  "/reading-analyzer/shared"
];

const protectedPrefixes = [
  "/dashboard",
  "/diagnostic",
  "/mock-test",
  "/my-1400",
  "/path",
  "/payment",
  "/practice",
  "/reading-analyzer",
  "/reading-path",
  "/roadmap",
  "/sat-mock",
  "/sat-test",
  "/test",
  "/results",
  "/curriculum"
];

function isProtectedPath(pathname: string) {
  if (publicPrefixes.some((prefix) => pathname === prefix || (prefix !== "/" && pathname.startsWith(`${prefix}/`)))) {
    return false;
  }
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  const protectedPath = useMemo(() => isProtectedPath(pathname || "/"), [pathname]);

  useEffect(() => {
    if (!protectedPath) {
      setAllowed(true);
      return;
    }
    if (getToken()) {
      setAllowed(true);
      return;
    }
    setAllowed(false);
    const query = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
    const next = `${pathname || "/"}${query ? `?${query}` : ""}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [pathname, protectedPath, router]);

  if (!protectedPath) {
    return children;
  }

  if (!allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0a0a0a] px-5 text-center text-white">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#FFD700]">SATTEST.UZ</p>
          <h1 className="mt-4 text-3xl font-black">Account required</h1>
          <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-white/55">Create an account or log in to use the SATTEST platform.</p>
        </div>
      </main>
    );
  }

  return children;
}
