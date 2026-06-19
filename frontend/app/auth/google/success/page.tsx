"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAuth } from "@/lib/api";

export default function GoogleAuthSuccessPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const name = params.get("name");
    const next = params.get("next") || "/reading-path";
    if (!token) {
      setMessage("Google login failed. Please try again.");
      window.setTimeout(() => router.replace("/login"), 1200);
      return;
    }
    saveAuth(token, name);
    router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/reading-path");
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#0a0a0a] px-5 text-center text-white">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#FFD700]">SATTEST.UZ</p>
        <h1 className="mt-4 text-3xl font-black">{message}</h1>
      </div>
    </main>
  );
}
