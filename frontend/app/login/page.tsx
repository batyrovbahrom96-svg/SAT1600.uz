"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL, api, saveAuth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [emailFromLink, setEmailFromLink] = useState("");
  const [nextPath, setNextPath] = useState("/path");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email") || "";
    const requestedNext = params.get("next") || "";
    const googleError = params.get("google_error");
    setEmailFromLink(email);
    setNextPath(requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/path");
    if (googleError === "not_configured") {
      setError("Google login is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Railway, or use email login for now.");
    }
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ access_token: string; full_name?: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") })
      });
      saveAuth(result.access_token, result.full_name);
      router.push(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="grid min-h-screen bg-[#0b0b0b] text-[#d8d8d8] lg:grid-cols-[55%_45%]">
      <section className="flex flex-col justify-between px-6 py-8 md:px-10 lg:px-16 xl:px-24">
        <Link href="/" className="text-lg font-black text-white">SAT1600.uz</Link>
        <div className="py-16">
          <p className="text-xs font-black uppercase tracking-[0.34em] text-[#8f8f8f]">Student access</p>
          <h1 className="mt-6 max-w-2xl text-5xl font-black leading-tight text-white md:text-7xl">Return to your score path.</h1>
          <p className="mt-7 max-w-xl text-lg font-semibold leading-8 text-[#a8a8a8]">
            Continue your mock tests, review score reports, and keep every missed question connected to the next study move.
          </p>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#666666]">Adaptive practice. Clear feedback. Better execution.</p>
      </section>

      <section className="flex items-center border-l border-white/10 bg-[#151515] px-6 py-12 md:px-10 lg:px-16">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <h2 className="text-3xl font-black text-white">Login</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#9f9f9f]">Use the account you created to continue your SAT practice.</p>
          <label className="mt-8 block text-xs font-black uppercase tracking-[0.2em] text-[#9f9f9f]">Email</label>
          <input className="mt-3 w-full border border-white/10 bg-[#0b0b0b] px-4 py-4 text-white outline-none transition-all duration-200 ease-in-out hover:border-white focus:border-white" name="email" onChange={(event) => setEmailFromLink(event.target.value)} type="email" value={emailFromLink} required />
          <label className="mt-5 block text-xs font-black uppercase tracking-[0.2em] text-[#9f9f9f]">Password</label>
          <input className="mt-3 w-full border border-white/10 bg-[#0b0b0b] px-4 py-4 text-white outline-none transition-all duration-200 ease-in-out hover:border-white focus:border-white" name="password" type="password" required />
          {error ? <p className="mt-5 border border-red-400/30 bg-red-950/20 p-3 text-sm font-semibold text-red-200">{error}</p> : null}
          <button className="mt-8 w-full border border-white bg-white px-4 py-4 font-black uppercase tracking-[0.16em] text-black transition-all duration-200 ease-in-out hover:bg-[#151515] hover:text-white">Login</button>
          <a className="mt-4 flex w-full items-center justify-center border border-white/15 px-4 py-4 text-center font-black uppercase tracking-[0.16em] text-white transition-all duration-200 ease-in-out hover:border-white hover:bg-white hover:text-black" href={`${API_URL}/api/auth/google/start?next=${encodeURIComponent(nextPath)}&source=login`}>
            Continue with Google
          </a>
          <Link className="mt-5 block text-center text-sm font-bold text-[#d8d8d8] transition-all duration-200 ease-in-out hover:text-white" href={`/register?next=${encodeURIComponent(nextPath)}`}>Create account</Link>
        </form>
      </section>
    </main>
  );
}
