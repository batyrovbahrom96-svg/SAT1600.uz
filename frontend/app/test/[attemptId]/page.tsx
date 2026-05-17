"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Bookmark, Calculator, ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react";
import { API_URL, Question, api } from "@/lib/api";

type ModulePayload = {
  attempt: { id: string; current_section: string; current_module: number; status: string; route: Record<string, unknown> };
  duration_seconds: number;
  questions: Question[];
  answers: Record<string, { selected_answer: string | null; marked_for_review: boolean; time_spent_seconds: number }>;
};

export default function TestPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const [moduleData, setModuleData] = useState<ModulePayload | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [dark, setDark] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const questionStartedAt = useRef(Date.now());
  const spentByQuestion = useRef<Record<string, number>>({});
  const firstInteractionByQuestion = useRef<Record<string, number>>({});
  const interactionCountByQuestion = useRef<Record<string, number>>({});

  useEffect(() => {
    api<ModulePayload>(`/api/attempts/${attemptId}/module`).then((data) => {
      setModuleData(data);
      setSecondsLeft(data.duration_seconds);
      setAnswers(Object.fromEntries(Object.entries(data.answers).map(([id, answer]) => [id, answer.selected_answer || ""])));
      setMarked(Object.fromEntries(Object.entries(data.answers).map(([id, answer]) => [id, answer.marked_for_review])));
      spentByQuestion.current = Object.fromEntries(Object.entries(data.answers).map(([id, answer]) => [id, answer.time_spent_seconds || 0]));
      firstInteractionByQuestion.current = {};
      interactionCountByQuestion.current = {};
    }).catch(() => router.push("/login"));
  }, [attemptId, router]);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const blockBack = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", blockBack);
    return () => window.removeEventListener("popstate", blockBack);
  }, []);

  useEffect(() => {
    if (!moduleData || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [moduleData, secondsLeft]);

  useEffect(() => {
    if (moduleData && secondsLeft === 0) void advance();
  }, [secondsLeft]);

  const question = moduleData?.questions[index];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  useEffect(() => {
    questionStartedAt.current = Date.now();
  }, [question?.id]);

  async function save(questionId: string, value: string, review = marked[questionId] || false) {
    const previousAnswer = answers[questionId] || "";
    const firstInteraction = firstInteractionByQuestion.current[questionId] || Date.now();
    if (!firstInteractionByQuestion.current[questionId]) {
      firstInteractionByQuestion.current[questionId] = firstInteraction;
    }
    interactionCountByQuestion.current[questionId] = (interactionCountByQuestion.current[questionId] || 0) + 1;
    const hesitationSeconds = Math.max(0, Math.round((firstInteraction - questionStartedAt.current) / 1000));
    const elapsed = Math.max(1, Math.round((Date.now() - questionStartedAt.current) / 1000));
    const totalSpent = (spentByQuestion.current[questionId] || 0) + elapsed;
    spentByQuestion.current[questionId] = totalSpent;
    questionStartedAt.current = Date.now();
    setAnswers((current) => ({ ...current, [questionId]: value }));
    await api(`/api/attempts/${attemptId}/answers`, {
      method: "POST",
      body: JSON.stringify({
        question_id: questionId,
        selected_answer: value,
        previous_answer: previousAnswer || null,
        answer_changed: Boolean(previousAnswer && previousAnswer !== value),
        marked_for_review: review,
        hesitation_seconds: hesitationSeconds,
        time_spent_seconds: totalSpent,
        interaction_count: interactionCountByQuestion.current[questionId]
      })
    });
  }

  async function toggleMark(questionId: string) {
    const next = !marked[questionId];
    setMarked((current) => ({ ...current, [questionId]: next }));
    await save(questionId, answers[questionId] || "", next);
  }

  async function advance() {
    const result = await api<{ status: string; current_section: string; current_module: number }>(`/api/attempts/${attemptId}/advance`, { method: "POST" });
    if (result.status === "completed") {
      router.push(`/results/${attemptId}`);
      return;
    }
    const data = await api<ModulePayload>(`/api/attempts/${attemptId}/module`);
    setModuleData(data);
    setSecondsLeft(data.duration_seconds);
    setIndex(0);
    setAnswers(Object.fromEntries(Object.entries(data.answers).map(([id, answer]) => [id, answer.selected_answer || ""])));
    setMarked(Object.fromEntries(Object.entries(data.answers).map(([id, answer]) => [id, answer.marked_for_review])));
    spentByQuestion.current = Object.fromEntries(Object.entries(data.answers).map(([id, answer]) => [id, answer.time_spent_seconds || 0]));
    firstInteractionByQuestion.current = {};
    interactionCountByQuestion.current = {};
  }

  if (!moduleData || !question) {
    return <main className="grid min-h-screen place-items-center bg-paper font-bold text-ink">Loading test...</main>;
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  const shell = dark ? "bg-slate-950 text-white" : "bg-paper text-ink";
  const panel = dark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white";

  return (
    <main className={`min-h-screen ${shell}`}>
      <header className={`sticky top-0 z-10 border-b ${panel}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm font-black uppercase tracking-wide">{moduleData.attempt.current_section.replace("_", " & ")}</div>
            <div className="text-xs opacity-70">Module {moduleData.attempt.current_module} locked test mode</div>
          </div>
          <div className="rounded-md border border-slate-300 px-4 py-2 text-lg font-black tabular-nums">{minutes}:{seconds}</div>
          <div className="flex items-center gap-2">
            <button title="Calculator" onClick={() => setCalculatorOpen((value) => !value)} className="rounded-md border border-slate-300 p-2"><Calculator size={18} /></button>
            <button title="Theme" onClick={() => setDark((value) => !value)} className="rounded-md border border-slate-300 p-2">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[260px_1fr]">
        <aside className={`rounded-lg border p-4 ${panel}`}>
          <div className="mb-3 text-sm font-black">Question navigator</div>
          <div className="grid grid-cols-5 gap-2">
            {moduleData.questions.map((item, itemIndex) => (
              <button
                key={item.id}
                onClick={() => setIndex(itemIndex)}
                className={`aspect-square rounded-md border text-sm font-black ${index === itemIndex ? "border-brand bg-brand text-white" : marked[item.id] ? "border-warning bg-yellow-50 text-ink" : answers[item.id] ? "border-mint bg-emerald-50 text-ink" : "border-slate-300"}`}
              >
                {itemIndex + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 text-sm opacity-70">{answeredCount}/{moduleData.questions.length} answered</div>
          <button onClick={advance} className="mt-4 w-full rounded-md bg-ink px-4 py-3 font-bold text-white">Submit module</button>
        </aside>

        <article className={`rounded-lg border ${panel}`}>
          <div className="grid min-h-[620px] lg:grid-cols-2">
            <div className="border-b border-slate-200 p-6 lg:border-b-0 lg:border-r">
              {question.passage ? <p className="leading-8">{question.passage}</p> : null}
              {question.graph_path ? (
                <Image
                  alt="SAT graph"
                  className="mt-4 h-auto max-h-80 rounded-md border border-slate-200 bg-white object-contain"
                  height={480}
                  src={`${API_URL}${question.graph_path}`}
                  width={640}
                />
              ) : null}
              {calculatorOpen ? (
                <div className="mt-4 rounded-md border border-slate-300 p-4">
                  <div className="mb-2 text-sm font-black">Calculator</div>
                  <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-ink" placeholder="Use your device calculator logic here" />
                </div>
              ) : null}
            </div>
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-md bg-blue-50 px-3 py-1 text-sm font-bold text-brand">{question.topic} · L{question.difficulty}</span>
                <button onClick={() => toggleMark(question.id)} className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold">
                  <Bookmark size={16} fill={marked[question.id] ? "currentColor" : "none"} /> Review
                </button>
              </div>
              <h1 className="text-xl font-black leading-8">{question.prompt}</h1>
              <div className="mt-6 grid gap-3">
                {question.format === "multiple_choice" ? question.choices.map((choice) => (
                  <button key={choice.label} onClick={() => save(question.id, choice.label)} className={`rounded-md border p-4 text-left font-semibold ${answers[question.id] === choice.label ? "border-brand bg-blue-50 text-ink" : "border-slate-300"}`}>
                    <span className="mr-3 font-black">{choice.label}</span>{choice.text}
                  </button>
                )) : (
                  <input value={answers[question.id] || ""} onChange={(event) => save(question.id, event.target.value)} className="rounded-md border border-slate-300 px-4 py-3 text-ink" placeholder="Enter answer" />
                )}
              </div>
              <div className="mt-8 flex justify-between">
                <button disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))} className="flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 font-bold disabled:opacity-40"><ChevronLeft size={18} /> Back</button>
                <button disabled={index === moduleData.questions.length - 1} onClick={() => setIndex((value) => Math.min(moduleData.questions.length - 1, value + 1))} className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 font-bold text-white disabled:opacity-40">Next <ChevronRight size={18} /></button>
              </div>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
