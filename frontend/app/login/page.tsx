"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, saveAuth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ access_token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") })
      });
      saveAuth(result.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-ink">Login</h1>
        <p className="mt-2 text-sm text-slate-600">Demo student: student@sat1600.uz / student123</p>
        <label className="mt-6 block text-sm font-bold">Email</label>
        <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="email" type="email" required />
        <label className="mt-4 block text-sm font-bold">Password</label>
        <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="password" type="password" required />
        {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <button className="mt-6 w-full rounded-md bg-brand px-4 py-3 font-bold text-white hover:bg-blue-700">Login</button>
        <Link className="mt-4 block text-center text-sm font-semibold text-brand" href="/register">Create account</Link>
      </form>
    </main>
  );
}
