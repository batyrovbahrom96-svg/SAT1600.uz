"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, BookOpen, CalendarDays, Check, CheckCircle2, Clock, FileText, LockKeyhole, Target, Users, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { api, getToken } from "@/lib/api";

type ScoreHistoryItem = { attempt_id: string; score: number; date: string };
type AnalyticsHistory = { score_history: ScoreHistoryItem[]; attempts: number };

const topicProgress = [
  ["Information and Ideas", 62, "14 question set + evidence traps"],
  ["Craft and Structure", 58, "Words in context + function questions"],
  ["Expression of Ideas", 70, "Transitions, boundaries, logical order"],
  ["Standard English Conventions", 66, "Punctuation, modifiers, verbs"],
  ["Algebra", 74, "Linear equations, systems, inequalities"],
  ["Advanced Math", 52, "Quadratics, functions, nonlinear models"],
  ["Problem-Solving and Data", 61, "Ratios, charts, probability, units"],
  ["Geometry and Trigonometry", 47, "Angles, circles, triangles, trig"]
] as const;

const weeklyTargets = [
  {
    week: "Week 1",
    title: "Repair the score leaks",
    hours: "12.5h",
    target: "1210 to 1260",
    work: "Theory supervision, weak-topic drills, and one mini module retake."
  },
  {
    week: "Week 2",
    title: "Build accuracy under time",
    hours: "14h",
    target: "1260 to 1310",
    work: "Timed Reading/Writing sets, Advanced Math blocks, and mistake notebook review."
  },
  {
    week: "Week 3",
    title: "Mixed module pressure",
    hours: "15h",
    target: "1310 to 1360",
    work: "Full mixed modules, hard-question review, and parent progress update."
  },
  {
    week: "Week 4",
    title: "Mock retake and 1400+ push",
    hours: "16h",
    target: "1360 to 1400+",
    work: "Two full mock cycles, final weak-topic sprint, and timing strategy correction."
  }
] as const;

const nextAssignments = [
  "Watch supervised theory: Advanced Math functions and vertex form",
  "Solve 18 nonlinear equation questions with explanation review",
  "Complete 12 transition and sentence-placement questions",
  "Update mistake notebook: write the trap, rule, and faster method",
  "Send parent progress snapshot after the weekly checkpoint"
] as const;

const scoreStats: { icon: LucideIcon; label: string; value: string }[] = [
  { icon: Target, label: "Target score", value: "1400+" },
  { icon: Clock, label: "Today", value: "2h 20m" },
  { icon: CalendarDays, label: "Retake", value: "Day 25" },
  { icon: Users, label: "Support", value: "Teacher check" }
];

const routeSteps = [
  ["1", "Take diagnostic", "SATTEST.UZ finds weak skills, timing problems, and repeated traps."],
  ["2", "Follow today's work", "The dashboard gives one clear theory block, question set, and review task."],
  ["3", "Retake and adjust", "Mock retakes update the route, parent summary, and next-week priorities."]
] as const;

const sampleDayPlan = [
  ["Theory", "Functions: vertex form, roots, graph meaning", "25 min"],
  ["Practice", "18 Advanced Math questions, first 10 untimed", "55 min"],
  ["Timed set", "12 transition and sentence-placement questions", "25 min"],
  ["Review", "Write trap, rule, and faster method for every miss", "35 min"]
] as const;

const routeSampleQuestions = [
  {
    label: "Assignment 1",
    skill: "Advanced Math",
    prompt: "A quadratic has roots 3 and 7. Which expression could represent the quadratic?",
    options: ["(x + 3)(x + 7)", "(x - 3)(x - 7)", "(x - 10)(x + 21)", "(x - 4)(x - 6)"],
    correctIndex: 1,
    explanation:
      "Roots are the x-values that make the expression equal to zero. To make x = 3 and x = 7 work, the factors must be (x - 3)(x - 7)."
  },
  {
    label: "Assignment 2",
    skill: "Writing",
    prompt:
      "The experiment produced accurate results. ___, the team repeated the trial to confirm that the pattern was reliable.",
    options: ["Nevertheless", "For this reason", "Similarly", "In contrast"],
    correctIndex: 1,
    explanation:
      "The second sentence gives the reason for repeating the trial. 'For this reason' connects the accurate results to the confirmation step."
  }
] as const;

export default function My1400Page() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "login" | "diagnostic">("checking");

  useEffect(() => {
    if (!getToken()) {
      setState("login");
      return;
    }

    api<AnalyticsHistory>("/api/analytics/me")
      .then((history) => {
        const latestAttemptId = history.score_history.at(-1)?.attempt_id;
        if (latestAttemptId) {
          router.replace(`/curriculum/${latestAttemptId}`);
          return;
        }
        setState("diagnostic");
      })
      .catch((error) => {
        console.log("Unable to open My 1400+ curriculum", error);
        setState("diagnostic");
      });
  }, [router]);

  if (state === "login") {
    return (
      <main className="min-h-screen bg-[#101112] text-white">
        <LuxuryNavbar />
        <My1400PreviewDashboard showAuthActions />
      </main>
    );
  }

  if (state === "diagnostic") {
    return (
      <main className="min-h-screen bg-[#101112] text-white">
        <LuxuryNavbar />
        <My1400PreviewDashboard diagnosticMode />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />
      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-4xl flex-col items-center justify-center px-5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/38">My 1400+</p>
        <h1 className="mt-5 text-4xl font-light text-white md:text-5xl">Opening your personal curriculum</h1>
      </section>
    </main>
  );
}

function My1400PreviewDashboard({
  diagnosticMode = false,
  showAuthActions = false
}: {
  diagnosticMode?: boolean;
  showAuthActions?: boolean;
}) {
  return (
    <section className="mx-auto max-w-[1320px] px-5 py-10 md:px-8 md:py-14">
      <div className="grid gap-5 lg:grid-cols-[0.86fr_0.74fr] lg:items-start">
        <div className="border border-white/10 bg-white/[0.035] p-5 md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">
            {diagnosticMode ? "Diagnostic required" : "My 1400+ preview"}
          </p>
          <h1 className="mt-5 max-w-4xl text-5xl font-light leading-none text-white md:text-7xl">
            See exactly what to study next.
          </h1>
          <p className="mt-6 max-w-3xl text-lg font-light leading-8 text-white/54">
            My 1400+ turns one diagnostic into a simple daily route: target score, weak topics, today's
            assignment, teacher-supervised theory, and the next mock retake date.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {scoreStats.map(({ icon: StatIcon, label, value }) => {
              return (
                <div className="border border-white/10 bg-black/20 p-4" key={label}>
                  <StatIcon className="text-white/46" size={18} />
                  <p className="mt-4 text-[10px] font-black uppercase tracking-[0.28em] text-white/36">{label}</p>
                  <strong className="mt-2 block text-2xl font-light text-white">{value}</strong>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-3">
            {showAuthActions ? (
              <>
                <Link className="flex items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/pricing">
                  Choose plan <ArrowRight size={18} />
                </Link>
                <Link className="flex items-center justify-between border border-white/15 bg-black/20 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-white/35 hover:text-white" href="/mock-test">
                  Start free diagnostic <ArrowRight size={18} />
                </Link>
              </>
            ) : (
              <Link className="flex items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/pricing">
                Choose plan <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </div>

        <div className="border border-white/10 bg-white/[0.035] p-5 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/38">Sample student dashboard</p>
              <h2 className="mt-3 text-3xl font-light text-white md:text-4xl">Today: Advanced Math repair</h2>
            </div>
            <div className="border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100">
              1210 to 1400+
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {sampleDayPlan.map(([label, task, time]) => (
              <div className="grid gap-3 border border-white/10 bg-black/20 p-4 sm:grid-cols-[92px_1fr_72px] sm:items-center" key={label}>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/36">{label}</p>
                <p className="text-sm leading-6 text-white/72">{task}</p>
                <span className="text-sm font-semibold text-white/50 sm:text-right">{time}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/36">Next mock retake</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <strong className="text-2xl font-light text-white">Day 25</strong>
              <span className="text-sm leading-6 text-white/54">The route updates after the score report.</span>
            </div>
          </div>
        </div>
      </div>

      <RouteSampleQuestions />

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {routeSteps.map(([step, title, body]) => (
          <div className="border border-white/10 bg-white/[0.035] p-5" key={step}>
            <span className="flex h-10 w-10 items-center justify-center border border-white/10 bg-black/20 text-sm font-semibold text-white/62">
              {step}
            </span>
            <h2 className="mt-5 text-2xl font-light text-white">{title}</h2>
            <p className="mt-3 text-sm font-light leading-7 text-white/54">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="border border-white/10 bg-white/[0.035] p-5 md:p-6">
          <div className="flex items-center gap-3">
            <BarChart3 size={19} className="text-white/50" />
            <h2 className="text-2xl font-light text-white">Weak-topic map</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/48">
            Students do not need to guess what to study. The weakest SAT domains appear first.
          </p>
          <div className="mt-5 grid gap-4">
            {topicProgress.slice(0, 6).map(([topic, value, detail]) => (
              <div key={topic}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-white/78">{topic}</span>
                  <span className="text-white/45">{value}%</span>
                </div>
                <div className="mt-2 h-2 bg-white/10">
                  <span className="block h-full bg-white/78" style={{ width: `${value}%` }} />
                </div>
                <p className="mt-2 text-xs leading-5 text-white/42">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="border border-white/10 bg-white/[0.035] p-5 md:p-6">
            <div className="flex items-center gap-3">
              <FileText size={19} className="text-white/50" />
              <h2 className="text-2xl font-light text-white">What the student sees next</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {nextAssignments.slice(0, 4).map((assignment) => (
                <div className="flex gap-3 border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white/62" key={assignment}>
                  <Check className="mt-1 shrink-0 text-emerald-200/72" size={15} />
                  <span>{assignment}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/10 bg-white/[0.035] p-5 md:p-6">
            <div className="flex items-center gap-3">
              <BookOpen size={19} className="text-white/50" />
              <h2 className="text-2xl font-light text-white">Theory is supervised</h2>
            </div>
            <p className="mt-4 text-sm font-light leading-7 text-white/54">
              Each weak skill gets a short rule lesson, worked examples, monitored practice, mistake
              explanation, and a retest before the topic is treated as improved.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 border border-white/10 bg-white/[0.035] p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/38">1-month roadmap</p>
            <h2 className="mt-3 text-3xl font-light text-white md:text-4xl">Four clear weeks, not thirty confusing rows.</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-white/48">
            The real plan becomes more detailed after the diagnostic, but the student always sees only the next useful step.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {weeklyTargets.map((week) => (
            <div className="border border-white/10 bg-black/20 p-4" key={week.week}>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/36">{week.week}</p>
              <h3 className="mt-3 text-xl font-light text-white">{week.title}</h3>
              <div className="mt-4 grid gap-2 text-sm text-white/54">
                <span>{week.hours}</span>
                <strong className="font-semibold text-white/82">{week.target}</strong>
                <span className="leading-6">{week.work}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RouteSampleQuestions() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answeredCount = Object.keys(answers).length;

  return (
    <section className="mt-5 border border-white/10 bg-white/[0.035] p-5 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Today unlocked preview</p>
          <h2 className="mt-4 text-4xl font-light leading-tight text-white md:text-5xl">
            Try the first 2 tasks from the route.
          </h2>
          <p className="mt-4 text-sm font-light leading-7 text-white/52">
            The student should not only read a plan. They should feel the plan start correcting them immediately:
            answer, see the trap, then continue into the locked Pro assignment.
          </p>
          <div className="mt-5 border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/36">Progress</p>
            <strong className="mt-2 block text-2xl font-light text-white">{answeredCount}/2 explanations opened</strong>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {routeSampleQuestions.map((question, questionIndex) => {
            const selected = answers[questionIndex];
            const hasAnswer = selected !== undefined;
            const isCorrect = selected === question.correctIndex;

            return (
              <article className="flex min-h-[420px] flex-col border border-white/10 bg-black/20 p-4" key={question.label}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/36">{question.label}</p>
                    <h3 className="mt-2 text-2xl font-light text-white">{question.skill}</h3>
                  </div>
                  {hasAnswer ? (
                    <span className={`border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                      isCorrect ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-red-300/30 bg-red-300/10 text-red-100"
                    }`}>
                      {isCorrect ? "Ready" : "Fix"}
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 text-sm leading-6 text-white/66">{question.prompt}</p>

                <div className="mt-4 grid gap-2">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selected === optionIndex;
                    const isRight = question.correctIndex === optionIndex;
                    const optionClass = hasAnswer
                      ? isRight
                        ? "border-emerald-300/45 bg-emerald-300/10 text-white"
                        : isSelected
                          ? "border-red-300/45 bg-red-300/10 text-white"
                          : "border-white/10 bg-transparent text-white/45"
                      : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/35 hover:text-white";

                    return (
                      <button
                        className={`min-h-12 border px-3 py-3 text-left text-sm leading-5 transition-colors ${optionClass}`}
                        key={option}
                        onClick={() => setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))}
                        type="button"
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-auto pt-4">
                  {hasAnswer ? (
                    <div className="border border-white/10 bg-white/[0.04] p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <CheckCircle2 size={16} className="text-emerald-200/80" />
                        Route feedback
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/56">{question.explanation}</p>
                    </div>
                  ) : (
                    <div className="border border-dashed border-white/15 p-3 text-sm leading-6 text-white/40">
                      Choose an answer to see how My 1400+ corrects the mistake.
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-4 border border-white/10 bg-black/30 p-5 md:grid-cols-[1fr_340px] md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <LockKeyhole size={18} className="text-white/50" />
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-white/38">Locked after preview</p>
          </div>
          <h3 className="mt-3 text-2xl font-light text-white">Today still has 28 tasks, a timed set, and parent progress snapshot locked.</h3>
          <p className="mt-2 text-sm leading-6 text-white/48">
            Pro opens the full daily route, updates it after each result, and keeps the student from guessing what to study.
          </p>
        </div>
        <Link className="flex items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/pricing?plan=pro">
          Unlock Pro <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
