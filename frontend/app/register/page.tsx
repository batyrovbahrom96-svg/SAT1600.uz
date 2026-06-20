"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, api, saveAuth } from "@/lib/api";
import { markFreeDiagnosticAttachedToAccount } from "@/lib/free-diagnostic-storage";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState("");
  const [nextPath, setNextPath] = useState("/path");
  const [signupSource, setSignupSource] = useState("");
  const [anonymousId, setAnonymousId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPrefillEmail(params.get("email") ?? "");
    setNextPath(params.get("next") || "/path");
    setSignupSource(params.get("source") || "");
    setAnonymousId(params.get("anon") || "");
  }, []);

  function getEmailBotError(err: unknown, fallback: string) {
    if (err instanceof ApiError && err.status === 404) {
      return "Email bot is not deployed on the backend yet. Redeploy the SATTEST.UZ API with the latest code, then set SMTP in Railway.";
    }
    if (err instanceof Error && err.message.startsWith("API unavailable")) {
      return "Email bot is unavailable right now. Check the SATTEST.UZ API deployment and SMTP settings in Railway.";
    }
    return err instanceof Error ? err.message : fallback;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ access_token: string; full_name?: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.get("full_name"),
          email: form.get("email"),
          password: form.get("password"),
          verification_code: form.get("verification_code"),
          signup_source: signupSource || undefined,
          anonymous_id: anonymousId || undefined
        })
      });
      saveAuth(result.access_token, result.full_name);
      markFreeDiagnosticAttachedToAccount();
      router.push(nextPath);
    } catch (err) {
      setError(getEmailBotError(err, "Registration failed"));
    }
  }

  async function sendCode(form: HTMLFormElement) {
    const email = new FormData(form).get("email");
    setError("");
    setMessage("");
    setIsSendingCode(true);

    try {
      const result = await api<{ sent: boolean; dev_code?: string }>("/api/auth/request-verification-code", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setMessage(
        result.dev_code
          ? `Verification code sent. Local test code: ${result.dev_code}`
          : "Verification code sent. Check your email and paste the 6-digit code below."
      );
    } catch (err) {
      setError(getEmailBotError(err, "Unable to send verification code"));
    } finally {
      setIsSendingCode(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#0b0b0b] text-[#d8d8d8] lg:grid-cols-[55%_45%]">
      <section className="flex flex-col justify-between px-6 py-8 md:px-10 lg:px-16 xl:px-24">
        <Link href="/" className="text-lg font-black text-white">SAT1600.uz</Link>
        <div className="py-16">
          <p className="text-xs font-black uppercase tracking-[0.34em] text-[#8f8f8f]">Begin preparation</p>
          <h1 className="mt-6 max-w-2xl text-5xl font-black leading-tight text-white md:text-7xl">Create your testing workspace.</h1>
          <p className="mt-7 max-w-xl text-lg font-semibold leading-8 text-[#a8a8a8]">
            Create your account after the Free Diagnostic, then continue to payment and unlock the existing Full Mock Test with Pro.
          </p>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#666666]">Built for students who want measurable score growth.</p>
      </section>

      <section className="flex items-center border-l border-white/10 bg-[#151515] px-6 py-12 md:px-10 lg:px-16">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <h2 className="text-3xl font-black text-white">Create account</h2>
          <label className="mt-8 block text-xs font-black uppercase tracking-[0.2em] text-[#9f9f9f]">Full name</label>
          <input className="mt-3 w-full border border-white/10 bg-[#0b0b0b] px-4 py-4 text-white outline-none transition-all duration-200 ease-in-out hover:border-white focus:border-white" name="full_name" required />
          <label className="mt-5 block text-xs font-black uppercase tracking-[0.2em] text-[#9f9f9f]">Email</label>
          <input className="mt-3 w-full border border-white/10 bg-[#0b0b0b] px-4 py-4 text-white outline-none transition-all duration-200 ease-in-out hover:border-white focus:border-white" name="email" type="email" defaultValue={prefillEmail} required />
          <button
            className="mt-3 w-full border border-white/15 bg-[#0b0b0b] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#d8d8d8] transition-all duration-200 ease-in-out hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSendingCode}
            onClick={(event) => sendCode(event.currentTarget.form as HTMLFormElement)}
            type="button"
          >
            {isSendingCode ? "Sending code..." : "Send email code"}
          </button>
          <label className="mt-5 block text-xs font-black uppercase tracking-[0.2em] text-[#9f9f9f]">Email code</label>
          <input className="mt-3 w-full border border-white/10 bg-[#0b0b0b] px-4 py-4 text-white outline-none transition-all duration-200 ease-in-out hover:border-white focus:border-white" inputMode="numeric" maxLength={6} minLength={6} name="verification_code" placeholder="6-digit code" required />
          <label className="mt-5 block text-xs font-black uppercase tracking-[0.2em] text-[#9f9f9f]">Password</label>
          <input className="mt-3 w-full border border-white/10 bg-[#0b0b0b] px-4 py-4 text-white outline-none transition-all duration-200 ease-in-out hover:border-white focus:border-white" name="password" type="password" minLength={8} required />
          {message ? <p className="mt-5 border border-emerald-300/25 bg-emerald-950/20 p-3 text-sm font-semibold text-emerald-100">{message}</p> : null}
          {error ? <p className="mt-5 border border-red-400/30 bg-red-950/20 p-3 text-sm font-semibold text-red-200">{error}</p> : null}
          <button className="mt-8 w-full border border-white bg-white px-4 py-4 font-black uppercase tracking-[0.16em] text-black transition-all duration-200 ease-in-out hover:bg-[#151515] hover:text-white">Register</button>
          <Link className="mt-5 block text-center text-sm font-bold text-[#d8d8d8] transition-all duration-200 ease-in-out hover:text-white" href={`/login?next=${encodeURIComponent(nextPath)}`}>Already have account?</Link>
        </form>
      </section>
    </main>
  );
}
