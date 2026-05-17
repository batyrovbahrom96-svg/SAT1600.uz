"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Crown, LineChart } from "lucide-react";
import { Nav } from "@/components/Nav";
import { api } from "@/lib/api";

type Test = { id: string; title: string; description: string; is_premium: boolean };

export default function DashboardPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [history, setHistory] = useState<{ score_history: { score: number; date: string }[]; attempts: number } | null>(null);

  useEffect(() => {
    api<Test[]>("/api/tests").then(setTests).catch(() => router.push("/login"));
    api<{ score_history: { score: number; date: string }[]; attempts: number }>("/api/analytics/me").then(setHistory).catch(() => null);
  }, [router]);

  async function start(testId: string) {
    const result = await api<{ attempt_id: string }>(`/api/tests/${testId}/attempts`, { method: "POST" });
    router.push(`/test/${result.attempt_id}`);
  }

  return (
    <main className="min-h-screen bg-paper">
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-ink">Mock tests</h1>
            <p className="mt-1 text-slate-600">Adaptive Digital SAT practice with analytics after submission.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
            <div className="font-black">{history?.attempts ?? 0} attempts</div>
            <div className="text-slate-500">Latest score {history?.score_history.at(-1)?.score ?? "none"}</div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {tests.map((test) => (
            <article key={test.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <LineChart className="text-brand" />
                {test.is_premium ? <Crown className="text-warning" /> : null}
              </div>
              <h2 className="text-xl font-black text-ink">{test.title}</h2>
              <p className="mt-2 min-h-12 text-sm text-slate-600">{test.description}</p>
              <button onClick={() => start(test.id)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 font-bold text-white hover:bg-blue-700">
                Start test <ArrowRight size={18} />
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
