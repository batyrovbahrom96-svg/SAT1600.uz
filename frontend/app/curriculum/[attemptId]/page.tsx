"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, BookOpenCheck, CalendarDays, GraduationCap, Target, Timer, Trophy } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { ApiError, api } from "@/lib/api";

type ResultQuestion = {
  id: string;
  section?: "reading_writing" | "math" | string;
  topic: string;
  is_correct: boolean;
  selected_answer?: string | null;
  correct_answer: string;
  explanation: string;
};

type Results = {
  attempt_id?: string;
  score_total: number;
  score_reading_writing: number;
  score_math: number;
  topic_accuracy: Record<string, number>;
  weaknesses: string[];
  strengths: string[];
  report: string;
  questions: ResultQuestion[];
};

type CurriculumBlock = {
  title: string;
  section: "Reading and Writing" | "Math";
  focus: string[];
  hours: string;
  testLabel: string;
};

const knownLabels: Record<string, string> = {
  command_of_evidence_quantitative_graph: "Command of Evidence Quantitative Graph",
  cross_text_connection: "Cross Text Connection",
  text_structure_function: "Text Structure and Function",
  functions: "Functions"
};

export default function CurriculumPage() {
  const params = useParams<{ attemptId?: string | string[] }>();
  const attemptId = Array.isArray(params.attemptId) ? params.attemptId[0] : params.attemptId;
  const router = useRouter();
  const [results, setResults] = useState<Results | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!attemptId) return;
    api<Results>(`/api/attempts/${attemptId}/results`).then(setResults).catch((error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
        router.push("/dashboard");
        return;
      }
      setMessage(error instanceof Error ? error.message : "Unable to load your curriculum.");
    });
  }, [attemptId, router]);

  const plan = useMemo(() => results ? buildCurriculum(results) : null, [results]);

  if (!results || !plan) {
    return (
      <main className="min-h-screen bg-[#101112] text-white">
        <LuxuryNavbar />
        <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-5 text-center">
          <GraduationCap size={42} className="text-white/70" />
          <h1 className="mt-6 text-4xl font-light text-white md:text-5xl">Preparing curriculum</h1>
          <p className="mt-4 max-w-xl text-sm font-light leading-7 text-white/48">
            {message || "We are converting your diagnostic report into a 1400+ SAT study route."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <div className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Personal curriculum</p>
            <h1 className="mt-5 text-5xl font-light leading-none text-white md:text-7xl">1400+ SAT route</h1>
            <p className="mt-6 max-w-3xl text-lg font-light leading-8 text-white/50">
              This plan is built from your diagnostic mistakes, weak topics, and section scores. Start with the weakest skills, then prove improvement through Reading/Writing and Math section tests.
            </p>
          </div>
          <div className="grid grid-cols-2 border border-white/10 bg-white/[0.035]">
            <Metric label="Current" value={results.score_total} />
            <Metric label="Target" value="1400+" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryCard icon={<CalendarDays size={22} />} label="Plan length" value="30 days" detail="7-day sprint repeated with harder targets" />
          <SummaryCard icon={<Timer size={22} />} label="Daily study" value={plan.dailyHours} detail="Based on distance from 1400+" />
          <SummaryCard icon={<Trophy size={22} />} label="Score gap" value={`${Math.max(0, 1400 - results.score_total)} pts`} detail="Main goal for this cycle" />
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          {plan.blocks.map((block) => (
            <article className="border border-white/10 bg-white/[0.035] p-6" key={block.section}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.32em] text-white/38">{block.section}</p>
                  <h2 className="mt-3 text-3xl font-light text-white">{block.title}</h2>
                </div>
                <BookOpenCheck className="text-white/55" size={28} />
              </div>
              <div className="mt-5 grid gap-2">
                {block.focus.map((topic) => (
                  <div className="flex items-center justify-between border border-white/10 bg-black/20 px-4 py-3" key={topic}>
                    <span className="text-sm font-light text-white/70">{topic}</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Weakness</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 border border-white/10 bg-black/20 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">Bound test</div>
                <div className="mt-2 text-xl font-light text-white">{block.testLabel}</div>
                <p className="mt-2 text-sm font-light leading-6 text-white/48">
                  Study {block.hours}, then take this section test to confirm that the weakness is improving.
                </p>
              </div>
              <button
                className="mt-5 flex h-12 w-full items-center justify-between border border-white bg-white px-5 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white"
                onClick={() => router.push("/dashboard")}
                type="button"
              >
                Start section work <ArrowRight size={18} />
              </button>
            </article>
          ))}
        </section>

        <section className="mt-6 border border-white/10 bg-white/[0.035] p-6">
          <div className="flex items-center gap-3">
            <Target className="text-yellow-100/70" />
            <h2 className="text-2xl font-light text-white">First 7 days</h2>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {plan.days.map((day, index) => (
              <div className="border border-white/10 bg-black/20 p-4" key={day}>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">Day {index + 1}</div>
                <p className="mt-2 text-sm font-light leading-6 text-white/62">{day}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function buildCurriculum(results: Results) {
  const weaknesses = normalizeList(results.weaknesses.length ? results.weaknesses : Object.entries(results.topic_accuracy || {})
    .filter(([, accuracy]) => accuracy < 0.7)
    .map(([topic]) => topic));
  const readingWeaknesses = sectionWeaknesses(results, "reading_writing", weaknesses);
  const mathWeaknesses = sectionWeaknesses(results, "math", weaknesses);
  const scoreGap = Math.max(0, 1400 - results.score_total);
  const dailyHours = scoreGap >= 300 ? "3-4 hours" : scoreGap >= 150 ? "2-3 hours" : "90-120 min";
  const blocks: CurriculumBlock[] = [
    {
      section: "Reading and Writing",
      title: "Evidence, structure, and grammar recovery",
      focus: readingWeaknesses.slice(0, 4),
      hours: "45-70 minutes daily",
      testLabel: "Full Reading and Writing Section Test"
    },
    {
      section: "Math",
      title: "Algebra, advanced math, and precision recovery",
      focus: mathWeaknesses.slice(0, 4),
      hours: "45-70 minutes daily",
      testLabel: "Full Math Section Test"
    }
  ];

  const primary = weaknesses[0] || "mixed weak topics";
  const secondary = weaknesses[1] || "timing and accuracy";

  return {
    dailyHours,
    blocks,
    days: [
      `Review every missed ${primary} question. Write the rule, the trap, and the correct proof.`,
      `Drill ${primary} without a timer until accuracy reaches 75%.`,
      `Complete a focused Reading and Writing set tied to the weakest report topic.`,
      `Complete a focused Math set tied to the weakest report topic.`,
      `Retake missed question types and track whether the same trap appears again.`,
      `Take one full section test for ${secondary}; stop and review immediately after.`,
      `Take a mixed checkpoint and update the next 7-day sprint from the new mistakes.`
    ]
  };
}

function sectionWeaknesses(results: Results, section: "reading_writing" | "math", fallback: string[]) {
  const topics = results.questions
    .filter((question) => question.section === section && !question.is_correct)
    .map((question) => formatTopicLabel(question.topic));
  const merged = [...topics, ...fallback];
  return normalizeList(merged).length ? normalizeList(merged) : [section === "math" ? "Algebra" : "Command of Evidence"];
}

function normalizeList(values: string[]) {
  const seen = new Set<string>();
  return values.reduce<string[]>((items, value) => {
    const label = formatTopicLabel(value);
    if (label && !seen.has(label)) {
      seen.add(label);
      items.push(label);
    }
    return items;
  }, []);
}

function formatTopicLabel(value: string) {
  const cleaned = value.replace(/[_/\\-]/g, " ").replace(/\s+/g, " ").trim();
  const known = knownLabels[value.trim().toLowerCase()];
  if (known) return known;
  return cleaned
    .toLowerCase()
    .split(" ")
    .map((word, index) => index > 0 && ["and", "of", "the", "to"].includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-r border-white/10 p-5 last:border-r-0">
      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">{label}</div>
      <div className="mt-4 text-4xl font-light text-white">{value}</div>
    </div>
  );
}

function SummaryCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">{label}</div>
        <div className="text-white/55">{icon}</div>
      </div>
      <div className="mt-4 text-3xl font-light text-white">{value}</div>
      <div className="mt-3 text-sm font-light leading-6 text-white/48">{detail}</div>
    </div>
  );
}
