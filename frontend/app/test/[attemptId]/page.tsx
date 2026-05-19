"use client";

import { useEffect, useRef, useState } from "react";
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
  const sectionNumber = moduleData.attempt.current_section === "reading_writing" ? 1 : 2;
  const fullSectionTitle = `Section ${sectionNumber}, Module ${moduleData.attempt.current_module}: ${sectionTitle}`;

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-20 bg-white">
        <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b border-[#e5e7eb] px-5">
          <div className="flex min-w-0 items-center gap-5">
            <div className="truncate text-sm font-semibold text-slate-900">{fullSectionTitle}</div>
            <details className="relative">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700 hover:text-slate-950">
                Directions
              </summary>
              <div className="absolute left-0 top-7 z-30 w-80 border border-[#d1d5db] bg-white p-4 text-sm leading-6 text-slate-800">
                Answer each question in this module. You may move among questions in this module until time expires.
              </div>
            </details>
          </div>
          <div className="px-5 py-2 text-center text-base font-bold tabular-nums text-slate-950" aria-label="Time remaining">
            {minutes}:{seconds}
          </div>
          <div className="flex justify-end gap-5 text-sm font-semibold text-slate-700">
            <button className="hover:text-slate-950" type="button">Highlights & Notes</button>
            <button className="hover:text-slate-950" type="button">More</button>
          </div>
        </div>
        <div className="bg-[#10294f] px-5 py-2 text-center text-xs font-bold tracking-wide text-white">
          THIS IS A PRACTICE TEST
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-8.5rem)] max-w-[1280px] bg-white lg:grid-cols-[minmax(0,3fr)_1px_minmax(0,2fr)]">
        <article className="bg-white p-10">
          <div className="mx-auto max-w-[600px]">
            {question.passage ? (
              <p className="text-[16px] leading-[1.65] text-slate-950">{question.passage}</p>
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

        <div className="relative hidden w-px bg-[#e5e7eb] lg:block" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 h-12 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d1d5db] bg-white" />
        </div>

        <aside className="bg-white p-10">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 min-w-9 items-center justify-center border border-slate-900 text-base font-bold text-slate-950">
              {index + 1}
            </div>
            <button
              onClick={() => toggleMark(question.id)}
              className={`inline-flex items-center gap-2 text-sm font-semibold hover:text-blue-800 ${marked[question.id] ? "text-blue-700" : "text-slate-700"}`}
              title="Mark for review"
            >
              <Bookmark size={17} fill={marked[question.id] ? "currentColor" : "none"} /> Mark for Review
            </button>
          </div>
          <div className="mb-6 border-t border-dashed border-slate-300" />
          <h1 className="mb-6 text-[20px] font-semibold leading-[1.45] text-slate-950">{question.prompt}</h1>

          <div className="grid gap-4">
            {question.format === "multiple_choice" ? question.choices.map((choice) => (
              <button
                key={choice.label}
                onClick={() => save(question.id, choice.label)}
                className={`flex w-full items-start gap-4 rounded-md border px-4 py-4 text-left text-[16px] leading-6 transition-colors hover:bg-slate-50 ${
                  answers[question.id] === choice.label
                    ? "border-blue-700 bg-blue-50"
                    : "border-slate-300"
                }`}
                role="radio"
                aria-checked={answers[question.id] === choice.label}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                    answers[question.id] === choice.label
                      ? "border-blue-700 bg-blue-700 text-white"
                      : "border-slate-500 bg-white text-slate-950"
                  }`}
                >
                  {choice.label}
                </span>
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
        <div className="mx-auto grid h-14 max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5">
          <div>
            <button
              disabled={index === 0}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft size={18} /> Back
            </button>
          </div>
          <div className="text-sm font-semibold text-slate-700">Question {index + 1} of {moduleData.questions.length}</div>
          <div className="flex justify-end">
            {index === moduleData.questions.length - 1 ? (
              <button onClick={advance} className="rounded bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                Submit
              </button>
            ) : (
              <button
                onClick={() => setIndex((value) => Math.min(moduleData.questions.length - 1, value + 1))}
                className="inline-flex items-center gap-2 rounded bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800"
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
