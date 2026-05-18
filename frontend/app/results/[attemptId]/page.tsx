"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Nav } from "@/components/Nav";
import { ApiError, api } from "@/lib/api";

type Results = {
  score_total: number;
  score_reading_writing: number;
  score_math: number;
  topic_accuracy: Record<string, number>;
  weaknesses: string[];
  strengths: string[];
  report: string;
  questions: {
    id: string;
    topic: string;
    prompt: string;
    selected_answer?: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: string;
    trap_type?: string;
    time_spent_seconds: number;
  }[];
};

export default function ResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const [results, setResults] = useState<Results | null>(null);

  useEffect(() => {
    if (attemptId === "demo") return;
    api<Results>(`/api/attempts/${attemptId}/results`).then(setResults).catch((error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
        router.push("/dashboard");
        return;
      }
      console.log("API unavailable, continue");
    });
  }, [attemptId, router]);

  const data = results ? Object.entries(results.topic_accuracy).map(([topic, accuracy]) => ({ topic, accuracy: Math.round(accuracy * 100) })) : [];

  return (
    <main className="min-h-screen bg-paper">
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-black text-ink">Performance report</h1>
        {!results ? <p className="mt-4 text-slate-600">Complete a mock test to see full analytics here.</p> : (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Metric title="Total score" value={results.score_total} />
              <Metric title="Reading & Writing" value={results.score_reading_writing} />
              <Metric title="Math" value={results.score_math} />
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-black">Accuracy by topic</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="topic" hide />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="accuracy" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black">Automatic diagnosis</h2>
                <p className="mt-3 text-slate-600">{results.report}</p>
                <h3 className="mt-5 font-black">Weaknesses</h3>
                <div className="mt-2 flex flex-wrap gap-2">{results.weaknesses.map((item) => <span className="rounded-md bg-red-50 px-2 py-1 text-sm font-bold text-red-700" key={item}>{item}</span>)}</div>
                <h3 className="mt-5 font-black">Strengths</h3>
                <div className="mt-2 flex flex-wrap gap-2">{results.strengths.map((item) => <span className="rounded-md bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-700" key={item}>{item}</span>)}</div>
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5 text-lg font-black">Problem review</div>
              <div className="divide-y divide-slate-200">
                {results.questions.map((question) => (
                  <div className="p-5" key={question.id}>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold">{question.topic}</span>
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${question.is_correct ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{question.is_correct ? "Correct" : "Incorrect"}</span>
                    </div>
                    <p className="font-semibold">{question.prompt}</p>
                    <p className="mt-2 text-sm text-slate-600">Your answer: {question.selected_answer || "blank"} · Correct: {question.correct_answer}</p>
                    <p className="mt-2 text-sm text-slate-700">{question.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-bold text-slate-500">{title}</div>
      <div className="mt-2 text-4xl font-black text-ink">{value}</div>
    </div>
  );
}
