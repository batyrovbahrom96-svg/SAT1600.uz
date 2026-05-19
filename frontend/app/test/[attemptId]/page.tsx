"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import { API_URL, ApiError, Question, api } from "@/lib/api";

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
    }).catch((error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        router.push("/login");
        return;
      }
      console.log("API unavailable, continue");
    });
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
    try {
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
    } catch {
      console.log("API unavailable, continue");
    }
  }

  async function toggleMark(questionId: string) {
    const next = !marked[questionId];
    setMarked((current) => ({ ...current, [questionId]: next }));
    await save(questionId, answers[questionId] || "", next);
  }

  async function advance() {
    try {
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
    } catch {
      console.log("API unavailable, continue");
    }
  }

  if (!moduleData || !question) {
    return <main className="grid min-h-screen place-items-center bg-white font-bold text-slate-900">Loading test...</main>;
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  const sectionTitle = moduleData.attempt.current_section === "reading_writing" ? "Reading and Writing" : "Math";

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-20 border-b border-[#e5e7eb] bg-white">
        <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center px-5">
          <div className="min-w-0 text-sm font-semibold text-slate-700">
            {sectionTitle}, Module {moduleData.attempt.current_module}
          </div>
          <div className="rounded px-5 py-2 text-center text-lg font-bold tabular-nums text-slate-950" aria-label="Time remaining">
            {minutes}:{seconds}
          </div>
          <div />
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-[1280px] bg-white lg:grid-cols-[minmax(0,3fr)_1px_minmax(0,2fr)]">
        <article className="bg-white p-10">
          <div className="mx-auto max-w-[600px]">
            {question.passage ? (
              <p className="text-[17px] leading-[1.75] text-slate-950">{question.passage}</p>
            ) : null}
            {question.graph_path ? (
              <Image
                alt="SAT graph"
                className="mt-8 h-auto max-h-[420px] w-full object-contain"
                height={480}
                src={`${API_URL}${question.graph_path}`}
                width={640}
              />
            ) : null}
          </div>
        </article>

        <div className="hidden w-px bg-[#e5e7eb] lg:block" aria-hidden="true" />

        <aside className="bg-white p-10">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-600">Question {index + 1} of {moduleData.questions.length}</div>
              <h1 className="text-[21px] font-bold leading-[1.45] text-slate-950">{question.prompt}</h1>
            </div>
            <button
              onClick={() => toggleMark(question.id)}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-100 ${marked[question.id] ? "text-blue-700" : "text-slate-800"}`}
              title="Mark for review"
            >
              <Bookmark size={18} fill={marked[question.id] ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="grid gap-3">
            {question.format === "multiple_choice" ? question.choices.map((choice) => (
              <button
                key={choice.label}
                onClick={() => save(question.id, choice.label)}
                className={`flex w-full items-start gap-4 rounded-[10px] border px-5 py-4 text-left text-[16px] leading-6 transition-colors hover:bg-slate-100 ${
                  answers[question.id] === choice.label
                    ? "border-blue-700 bg-blue-50"
                    : "border-slate-300"
                }`}
              >
                <span className="min-w-6 font-bold text-slate-950">{choice.label}</span>
                <span className="text-slate-950">{choice.text}</span>
              </button>
            )) : (
              <input
                value={answers[question.id] || ""}
                onChange={(event) => save(question.id, event.target.value)}
                className="w-full rounded-[10px] border border-slate-300 px-5 py-4 text-[16px] text-slate-950 outline-blue-700"
                placeholder="Enter answer"
              />
            )}
          </div>
        </aside>
      </section>

      <footer className="sticky bottom-0 z-20 border-t border-[#e5e7eb] bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-3">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
            {moduleData.questions.map((item, itemIndex) => (
              <button
                key={item.id}
                onClick={() => setIndex(itemIndex)}
                className={`h-9 min-w-9 rounded-md border text-sm font-bold ${
                  index === itemIndex
                    ? "border-blue-700 bg-blue-700 text-white"
                    : marked[item.id]
                      ? "border-slate-400 bg-white text-blue-700"
                      : answers[item.id]
                        ? "border-slate-400 bg-slate-100 text-slate-950"
                        : "border-slate-300 bg-white text-slate-950"
                }`}
              >
                {itemIndex + 1}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-sm font-semibold text-slate-600 sm:inline">{answeredCount}/{moduleData.questions.length} answered</span>
            <button
              disabled={index === 0}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 font-bold text-slate-950 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft size={18} /> Back
            </button>
            {index === moduleData.questions.length - 1 ? (
              <button onClick={advance} className="rounded-md bg-blue-700 px-5 py-2 font-bold text-white hover:bg-blue-800">
                Submit
              </button>
            ) : (
              <button
                onClick={() => setIndex((value) => Math.min(moduleData.questions.length - 1, value + 1))}
                className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-5 py-2 font-bold text-white hover:bg-blue-800"
              >
                Next <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}
