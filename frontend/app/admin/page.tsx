"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, Flag, RefreshCw, Save } from "lucide-react";
import { Nav } from "@/components/Nav";
import { api } from "@/lib/api";

type QualityQuestion = {
  id: string;
  section: string;
  module: number;
  topic: string;
  subtopic: string | null;
  prompt: string;
  difficulty: number;
  effective_difficulty: number;
  discrimination_score: number;
  calibration_confidence: number;
  confusion_index: number;
  trap_efficiency: number;
  time_pressure_score: number;
  quality_score: number;
  auto_quality_flag: string;
  calibration_attempts: number;
  percent_correct: number | null;
  average_time: number | null;
  average_hesitation: number | null;
  answer_change_rate: number;
  drop_off_rate: number;
  is_active: boolean;
  validation_status: string;
  validation_notes: string | null;
  distractor_effectiveness: {
    label: string;
    text: string;
    trap_role: string;
    selected_count: number;
    selection_rate: number;
    error_basis: string | null;
  }[];
};

export default function AdminPage() {
  const [questions, setQuestions] = useState<QualityQuestion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    api<QualityQuestion[]>("/api/admin/question-quality").then((data) => {
      setQuestions(data);
      setSelectedId((current) => current || data[0]?.id || null);
    }).catch((err) => setMessage(err.message));
  }

  useEffect(() => {
    void load();
  }, []);

  const selected = useMemo(() => questions.find((question) => question.id === selectedId) || questions[0], [questions, selectedId]);

  async function updateQuestion(patch: Partial<Pick<QualityQuestion, "difficulty" | "is_active" | "validation_status" | "validation_notes">>) {
    if (!selected) return;
    const result = await api<Partial<QualityQuestion>>(`/api/admin/questions/${selected.id}/validation`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    });
    setQuestions((current) => current.map((question) => question.id === selected.id ? { ...question, ...result } : question));
    setMessage("Question updated.");
  }

  return (
    <main className="min-h-screen bg-paper">
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-ink">Question quality control</h1>
            <p className="mt-1 text-slate-600">Review telemetry, distractor effectiveness, manual difficulty, and weak item status before public launch.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => api("/api/admin/graphs/sat-set", { method: "POST" }).then(() => setMessage("SAT graph set generated."))} className="rounded-md border border-slate-300 bg-white px-4 py-3 font-bold text-ink">
              Generate graphs
            </button>
            <button onClick={load} className="flex items-center gap-2 rounded-md bg-brand px-4 py-3 font-bold text-white">
              <RefreshCw size={18} /> Refresh
            </button>
          </div>
        </div>

        {message ? <p className="mt-4 rounded-md bg-blue-50 p-3 font-semibold text-brand">{message}</p> : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-[380px_1fr]">
          <aside className="max-h-[760px] overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            {questions.map((question) => (
              <button
                key={question.id}
                onClick={() => setSelectedId(question.id)}
                className={`block w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50 ${selected?.id === question.id ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-ink">{question.topic}</span>
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${question.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {question.is_active ? "active" : "disabled"}
                  </span>
                </div>
                <p className="mt-2 max-h-10 overflow-hidden text-sm text-slate-600">{question.prompt}</p>
                <div className="mt-3 flex gap-2 text-xs font-bold text-slate-500">
                  <span>L{question.difficulty}</span>
                  <span>{question.auto_quality_flag}</span>
                  <span>{question.validation_status}</span>
                  <span>{question.calibration_attempts} logs</span>
                </div>
              </button>
            ))}
          </aside>

          {selected ? (
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold uppercase tracking-wide text-brand">{selected.section} · module {selected.module}</div>
                  <h2 className="mt-2 text-2xl font-black text-ink">{selected.topic}</h2>
                  <p className="mt-3 max-w-3xl leading-7 text-slate-700">{selected.prompt}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => updateQuestion({ validation_status: "approved", is_active: true })} className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 font-bold text-white">
                    <CheckCircle2 size={17} /> Approve
                  </button>
                  <button onClick={() => updateQuestion({ validation_status: "flagged" })} className="flex items-center gap-2 rounded-md bg-yellow-500 px-3 py-2 font-bold text-white">
                    <Flag size={17} /> Flag
                  </button>
                  <button onClick={() => updateQuestion({ validation_status: "disabled", is_active: false })} className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 font-bold text-white">
                    <Ban size={17} /> Disable
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-4">
                <Metric label="Correct" value={selected.percent_correct === null ? "n/a" : `${Math.round(selected.percent_correct * 100)}%`} />
                <Metric label="Avg time" value={selected.average_time === null ? "n/a" : `${selected.average_time}s`} />
                <Metric label="Hesitation" value={selected.average_hesitation === null ? "n/a" : `${selected.average_hesitation}s`} />
                <Metric label="Changed" value={`${Math.round(selected.answer_change_rate * 100)}%`} />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-5">
                <Metric label="Effective L" value={selected.effective_difficulty.toFixed(1)} />
                <Metric label="Confusion" value={`${Math.round(selected.confusion_index * 100)}%`} />
                <Metric label="Trap balance" value={`${Math.round(selected.trap_efficiency * 100)}%`} />
                <Metric label="Time pressure" value={`${Math.round(selected.time_pressure_score * 100)}%`} />
                <Metric label="Confidence" value={`${Math.round(selected.calibration_confidence * 100)}%`} />
              </div>
              <div className={`mt-4 rounded-md px-3 py-2 text-sm font-black ${selected.auto_quality_flag === "good" ? "bg-emerald-50 text-emerald-700" : selected.auto_quality_flag === "bad" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"}`}>
                Auto quality: {selected.auto_quality_flag} · score {Math.round(selected.quality_score * 100)}%
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="rounded-lg border border-slate-200 p-4">
                  <label className="text-sm font-black">Manual difficulty</label>
                  <input
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
                    type="number"
                    min={1}
                    max={10}
                    defaultValue={selected.difficulty}
                    onBlur={(event) => updateQuestion({ difficulty: Number(event.target.value) })}
                  />
                  <div className="mt-4 text-sm text-slate-600">
                    Discrimination: <span className="font-black">{selected.discrimination_score.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Drop-off: <span className="font-black">{Math.round(selected.drop_off_rate * 100)}%</span>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <label className="text-sm font-black">Validation notes</label>
                  <textarea
                    className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2"
                    defaultValue={selected.validation_notes || ""}
                    onBlur={(event) => updateQuestion({ validation_notes: event.target.value })}
                    placeholder="Write what felt weird, confusing, too easy, or unfair."
                  />
                  <button onClick={() => updateQuestion({ validation_status: "reviewed" })} className="mt-3 flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 font-bold">
                    <Save size={17} /> Mark reviewed
                  </button>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 p-3 font-black">Distractor effectiveness</div>
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="p-3">Choice</th>
                      <th className="p-3">Trap role</th>
                      <th className="p-3">Selected</th>
                      <th className="p-3">Error basis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.distractor_effectiveness.map((choice) => (
                      <tr key={choice.label} className="border-b border-slate-100">
                        <td className="p-3 font-bold">{choice.label}. {choice.text}</td>
                        <td className="p-3">{choice.trap_role}</td>
                        <td className="p-3">{choice.selected_count} · {Math.round(choice.selection_rate * 100)}%</td>
                        <td className="p-3 text-slate-600">{choice.error_basis}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-ink">{value}</div>
    </div>
  );
}
