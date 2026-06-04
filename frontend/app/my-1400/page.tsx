"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, BookOpen, CalendarDays, Check, Clock, FileText, Target, Users, type LucideIcon } from "lucide-react";
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
    target: "1210 -> 1260",
    work: "Theory supervision, weak-topic drills, and one mini module retake."
  },
  {
    week: "Week 2",
    title: "Build accuracy under time",
    hours: "14h",
    target: "1260 -> 1310",
    work: "Timed Reading/Writing sets, Advanced Math blocks, and mistake notebook review."
  },
  {
    week: "Week 3",
    title: "Mixed module pressure",
    hours: "15h",
    target: "1310 -> 1360",
    work: "Full mixed modules, hard-question review, and parent progress update."
  },
  {
    week: "Week 4",
    title: "Mock retake and 1400+ push",
    hours: "16h",
    target: "1360 -> 1400+",
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
  { icon: Clock, label: "Weekly load", value: "12.5-16h" },
  { icon: CalendarDays, label: "Mock retake", value: "Day 25 + Day 29" },
  { icon: Users, label: "Supervision", value: "Teacher + parent update" }
];

const dailyCurriculum = [
  ["Day 1", "2h 10m", "Diagnostic breakdown", "Read score report, classify every mistake by skill, set target score gap.", "No new questions; rebuild mistake notebook and choose first weak topics.", "Teacher checks notebook categories."],
  ["Day 2", "2h 20m", "Algebra foundations", "Linear equations, systems, inequalities, percent-base rules.", "32 Algebra questions: 18 untimed accuracy, 14 timed.", "Review wrong setup steps."],
  ["Day 3", "2h", "Information and Ideas", "Command of evidence, inference, main idea, data-based reading.", "24 Reading questions across evidence and inference.", "Mark why each wrong answer looked attractive."],
  ["Day 4", "2h 30m", "Standard English", "Independent clauses, comma rules, semicolons, modifiers.", "34 grammar questions, grouped by punctuation trap.", "Teacher supervises rule correction."],
  ["Day 5", "2h", "Problem-Solving and Data", "Ratios, percentages, units, tables, scatterplots.", "28 Math questions with calculator/no-calculator method notes.", "Rewrite slow solutions."],
  ["Day 6", "2h 15m", "Advanced Math intro", "Quadratics, factoring, roots, equivalent forms.", "26 Advanced Math questions, first pass untimed.", "Flag formulas to memorize."],
  ["Day 7", "1h 45m", "Checkpoint 1", "Mini-module strategy: skip, return, timing splits.", "1 timed Reading/Writing mini module + 1 timed Math mini module.", "Weekly score-gap update."],
  ["Day 8", "2h 20m", "Craft and Structure", "Words in context, purpose, function, tone, structure.", "28 Reading questions; separate vocabulary from function mistakes.", "Teacher reviews answer-choice elimination."],
  ["Day 9", "2h 30m", "Functions", "Function notation, transformations, graph meaning, domain/range.", "30 Advanced Math function questions.", "Build function formula sheet."],
  ["Day 10", "2h", "Expression of Ideas", "Transitions, sentence placement, precision, logical sequence.", "32 Writing questions in transition and organization sets.", "Review each transition category."],
  ["Day 11", "2h 15m", "Geometry", "Lines, angles, triangles, circles, coordinate geometry.", "30 Geometry questions with diagram annotation.", "Correct missing theorem notes."],
  ["Day 12", "2h 30m", "Mixed Reading/Writing", "Switching strategy between reading logic and grammar rules.", "One timed RW module; full explanation review.", "Track timing by question type."],
  ["Day 13", "2h 30m", "Mixed Math", "Algebra + Advanced Math + PSD mixed pressure.", "One timed Math module; redo every wrong question untimed.", "Mark avoidable vs knowledge mistakes."],
  ["Day 14", "2h", "Checkpoint 2", "Weekly theory review and strategy correction.", "Targeted 40-question mixed drill from missed topics.", "Parent progress summary."],
  ["Day 15", "2h 20m", "Hard inference", "Paired evidence, graph support, subtle conclusion gaps.", "26 hard Reading questions.", "Teacher checks reasoning notes."],
  ["Day 16", "2h 30m", "Nonlinear equations", "Quadratics, systems with nonlinear equations, roots and intercepts.", "34 Advanced Math questions.", "Create faster-method notes."],
  ["Day 17", "2h 15m", "Grammar speed", "Boundary rules, modifiers, pronouns, verb agreement.", "45 grammar questions with 60-second pacing.", "Review rule misses only."],
  ["Day 18", "2h 20m", "Data and probability", "Percent change, two-way tables, probability, mean/median.", "30 PSD questions with unit tracking.", "Redo calculation errors."],
  ["Day 19", "2h 45m", "Full module pair", "Real test pacing and stamina.", "One RW module + one Math module timed.", "Deep review of last 10 hard questions."],
  ["Day 20", "2h 15m", "Weak-topic sprint", "Return to the lowest two dashboard skills.", "50 adaptive questions from weakest categories.", "Update mastery percentages."],
  ["Day 21", "2h", "Checkpoint 3", "Review score movement and adjust target plan.", "Timed mini mock retake.", "Teacher approves Week 4 plan."],
  ["Day 22", "2h 30m", "Advanced Math hard set", "Function models, equivalent forms, exponent/radical equations.", "36 hard Math questions.", "Separate careless vs concept misses."],
  ["Day 23", "2h 15m", "Reading hard set", "Longer passages, purpose, evidence, rhetoric.", "30 hard RW questions.", "Elimination strategy supervision."],
  ["Day 24", "2h 30m", "Writing perfecting", "Transitions, concision, boundaries, standard English.", "44 Writing questions, mixed timed.", "Build final grammar checklist."],
  ["Day 25", "3h 15m", "Full mock 1", "Bluebook-style full test stamina and pacing.", "Complete full diagnostic retake.", "Score report and mistake sorting."],
  ["Day 26", "2h 30m", "Mock 1 review", "Analyze every lost point from the full mock.", "Redo wrong questions; write rule/faster method.", "Teacher validates corrections."],
  ["Day 27", "2h 20m", "Final weak sprint", "Only skills still below 75% mastery.", "60-question adaptive drill from weak topics.", "Recheck mastery dashboard."],
  ["Day 28", "2h", "Timing repair", "Guessing rules, skip strategy, last-5-question plan.", "Two timed mini modules with strict pacing.", "Fix timing notes."],
  ["Day 29", "3h 15m", "Full mock 2", "Final 1400+ simulation.", "Complete second full mock retake.", "Compare score gap to target."],
  ["Day 30", "2h 30m", "Final plan", "Review score, next month path, and exam readiness.", "Personal final assignment pack by remaining weak topics.", "Parent/student progress report."]
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
    <section className="mx-auto max-w-[1560px] px-5 py-10 md:px-8 md:py-14">
      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="border border-white/10 bg-white/[0.035] p-5 md:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">
            {diagnosticMode ? "Diagnostic required" : "My 1400+ preview"}
          </p>
          <h1 className="mt-5 max-w-4xl text-5xl font-light leading-none text-white md:text-7xl">
            A 30-day SAT curriculum dashboard, not just a task list.
          </h1>
          <p className="mt-6 max-w-3xl text-lg font-light leading-8 text-white/54">
            This sample is built for a student starting near 1210 and aiming for 1400+. The real route
            changes after the diagnostic: weak topics, daily hours, supervised theory, practice sets,
            mock retake dates, and parent progress updates.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

          <div className="mt-5 grid gap-3">
            {showAuthActions ? (
              <>
                <Link className="flex items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/register">
                  Create account <ArrowRight size={18} />
                </Link>
                <Link className="flex items-center justify-between border border-white/15 bg-black/20 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-white/35 hover:text-white" href="/login">
                  Sign in <ArrowRight size={18} />
                </Link>
              </>
            ) : (
              <Link className="flex items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/mock-test">
                Start diagnostic <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="border border-white/10 bg-white/[0.035] p-5 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/38">Sample dashboard</p>
                <h2 className="mt-3 text-3xl font-light text-white md:text-4xl">Score route: 1210 to 1400+</h2>
              </div>
              <div className="border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100">
                Next mock retake: Day 25
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
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

          <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
            <div className="border border-white/10 bg-white/[0.035] p-5 md:p-6">
              <div className="flex items-center gap-3">
                <BarChart3 size={19} className="text-white/50" />
                <h2 className="text-2xl font-light text-white">Topic progress map</h2>
              </div>
              <div className="mt-5 grid gap-4">
                {topicProgress.map(([topic, value, detail]) => (
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
                  <h2 className="text-2xl font-light text-white">Next assignment</h2>
                </div>
                <div className="mt-5 grid gap-3">
                  {nextAssignments.map((assignment) => (
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
                  <h2 className="text-2xl font-light text-white">Supervised theory</h2>
                </div>
                <p className="mt-4 text-sm font-light leading-7 text-white/54">
                  Theory is not left as passive reading. Each weak skill gets a rule lesson, worked examples,
                  monitored practice, mistake explanation, and a retest before the topic is marked improved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 border border-white/10 bg-white/[0.035] p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/38">30-day curriculum plan</p>
            <h2 className="mt-3 text-3xl font-light text-white md:text-4xl">Every day has hours, theory, practice, and review.</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-white/48">
            This is a sample plan. The real version is generated from the student's diagnostic score, missed
            question types, and target test date.
          </p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <div className="min-w-[1120px]">
            <div className="grid grid-cols-[90px_90px_190px_1.25fr_1.15fr_1fr] border border-white/10 bg-black/30 text-[10px] font-black uppercase tracking-[0.22em] text-white/42">
              {["Day", "Hours", "Focus", "Supervised theory", "Question practice", "Review"].map((heading) => (
                <div className="border-r border-white/10 p-3 last:border-r-0" key={heading}>{heading}</div>
              ))}
            </div>
            {dailyCurriculum.map(([day, hours, focus, theory, practice, review]) => (
              <div className="grid grid-cols-[90px_90px_190px_1.25fr_1.15fr_1fr] border-x border-b border-white/10 text-sm leading-6 text-white/58" key={day}>
                <div className="border-r border-white/10 p-3 font-semibold text-white/82">{day}</div>
                <div className="border-r border-white/10 p-3 text-white/70">{hours}</div>
                <div className="border-r border-white/10 p-3 text-white/76">{focus}</div>
                <div className="border-r border-white/10 p-3">{theory}</div>
                <div className="border-r border-white/10 p-3">{practice}</div>
                <div className="p-3">{review}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
