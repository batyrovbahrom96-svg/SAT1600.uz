"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, BarChart3, BookOpenCheck, CalendarDays, CheckCircle2, ClipboardList, GraduationCap, Lock, Route, ShieldCheck, Target, Timer, Trophy } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumText } from "@/components/PremiumText";
import { ApiError, api, getSubscriptionStatus } from "@/lib/api";

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
  diagnosticSignal: string;
  masteryTarget: string;
  drills: string[];
  reviewProtocol: string;
  checkpoint: string;
};

type CurriculumPhase = {
  week: string;
  title: string;
  target: string;
  hours: string;
  work: string;
};

type MasteryGate = {
  label: string;
  target: string;
  evidence: string;
};

type PracticeChoice = {
  label: string;
  text: string;
};

type PracticeQuestion = {
  prompt: string;
  choices: PracticeChoice[];
  answer: string;
  explanation: string;
  skill: string;
};

type PracticeLesson = {
  title: string;
  definition: string;
  tips: string[];
  questions: PracticeQuestion[];
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
  const [activeBlock, setActiveBlock] = useState<CurriculumBlock | null>(null);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);

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

  useEffect(() => {
    getSubscriptionStatus()
      .then((status) => setHasActiveSubscription(status.has_active_subscription))
      .catch(() => setHasActiveSubscription(false))
      .finally(() => setSubscriptionChecked(true));
  }, []);

  const plan = useMemo(() => results ? buildCurriculum(results) : null, [results]);
  const lesson = useMemo(() => activeBlock ? buildPracticeLesson(activeBlock) : null, [activeBlock]);
  const routeUnlocked = !subscriptionChecked || hasActiveSubscription;
  const shouldShowLocked = subscriptionChecked && !hasActiveSubscription;

  function openPractice(block: CurriculumBlock) {
    setActiveBlock(block);
    setActiveQuestion(0);
    setSelectedAnswer("");
    setIsConfirmed(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function openBlockOrPricing(block: CurriculumBlock) {
    if (routeUnlocked) {
      openPractice(block);
      return;
    }
    router.push("/pricing?plan=pro");
  }

  function closePractice() {
    setActiveBlock(null);
    setSelectedAnswer("");
    setIsConfirmed(false);
  }

  function nextPracticeQuestion() {
    if (!lesson) return;
    setActiveQuestion((value) => Math.min(lesson.questions.length - 1, value + 1));
    setSelectedAnswer("");
    setIsConfirmed(false);
  }

  if (!results || !plan) {
    return (
      <main className="sat-lux-page min-h-screen text-white">
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
    <main className="sat-lux-page min-h-screen text-white">
      <LuxuryNavbar />
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <div className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Personal curriculum</p>
            <PremiumText as="h1" className="mt-5 text-5xl font-light leading-none text-white md:text-7xl" variant="route">
              1400+ SAT command center
            </PremiumText>
            <p className="mt-6 max-w-3xl text-lg font-light leading-8 text-white/50">
              This is not a checklist. It is a score-growth operating system built from your diagnostic misses, weak topics, section scores, trap patterns, and retake pressure.
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
          <SummaryCard icon={<Trophy size={22} />} label="Score gap" value={`${plan.scoreGap} pts`} detail={plan.strategy} />
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border border-white/10 bg-white/[0.035] p-6">
            <div className="flex items-center gap-3">
              <Route className="text-[#c8bd88]" size={22} />
              <h2 className="text-3xl font-light text-white">Adaptive score strategy</h2>
            </div>
            <p className="mt-4 text-sm font-light leading-7 text-white/58">
              SATTEST chooses the next work by score gap, missed question type, repeated topic, and whether the mistake was conceptual, timing-based, or a careless trap.
            </p>
            <div className="mt-5 grid gap-3">
              {plan.operatingRules.map((rule, index) => (
                <div className="grid grid-cols-[38px_1fr] gap-3 border border-white/10 bg-black/25 p-3" key={rule}>
                  <span className="flex h-9 w-9 items-center justify-center border border-white/15 text-sm font-black text-white/62">
                    {index + 1}
                  </span>
                  <p className="text-sm font-light leading-6 text-white/64">{rule}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/10 bg-white/[0.035] p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-100/75" size={22} />
              <h2 className="text-3xl font-light text-white">Mastery gates before moving on</h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {plan.masteryGates.map((gate) => (
                <div className="border border-white/10 bg-black/25 p-4" key={gate.label}>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">{gate.label}</p>
                  <strong className="mt-3 block text-2xl font-light text-white">{gate.target}</strong>
                  <p className="mt-3 text-xs font-light leading-5 text-white/48">{gate.evidence}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 border border-emerald-300/25 bg-emerald-300/[0.06] p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.36em] text-emerald-100/58">
                {routeUnlocked ? "Pro access active" : "Exercises require Pro"}
              </p>
              <h2 className="mt-4 text-3xl font-light leading-tight text-white md:text-4xl">
                {routeUnlocked
                  ? "Your route is unlocked. Start the practice engine."
                  : "Your route is ready. The exact exercises are locked below."}
              </h2>
              <p className="mt-3 max-w-3xl text-sm font-light leading-7 text-white/58">
                {routeUnlocked
                  ? "Your approved payment is active on this account. Open a weak-topic exercise below, review the supervised theory, and retake the section when the set is complete."
                  : "The free diagnostic identified the score leaks. Pro opens the actual question sets, supervised theory, mistake notebook, and the next mini mock needed to repair them."}
              </p>
              {shouldShowLocked ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {buildLockedRoutePreview(plan.blocks).map((item) => (
                    <div className="border border-white/10 bg-black/25 p-3" key={item}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-light text-white/68 blur-[1px]">{item}</p>
                        <Lock className="shrink-0 text-white/35" size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <PremiumButton
              className="min-w-[250px]"
              icon={<ArrowRight size={18} />}
              onClick={() => {
                if (routeUnlocked) {
                  if (plan.blocks[0]) openPractice(plan.blocks[0]);
                  return;
                }
                router.push("/pricing?plan=pro");
              }}
              type="button"
            >
              {routeUnlocked ? "Start Pro route" : "Unlock Pro"}
            </PremiumButton>
          </div>
        </section>

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
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">Diagnostic signal</p>
                  <p className="mt-3 text-sm font-light leading-6 text-white/64">{block.diagnosticSignal}</p>
                </div>
                <div className="border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">Mastery target</p>
                  <p className="mt-3 text-sm font-light leading-6 text-white/64">{block.masteryTarget}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-2">
                {block.focus.map((topic) => (
                  <button
                    className={`flex items-center justify-between border border-white/10 bg-black/20 px-4 py-3 text-left transition-colors hover:border-white/35 hover:bg-white/[0.06] ${
                      routeUnlocked ? "" : "relative overflow-hidden"
                    }`}
                    key={topic}
                    onClick={() => openBlockOrPricing(block)}
                    type="button"
                  >
                    <span className={`text-sm font-light text-white/70 ${routeUnlocked ? "" : "blur-[1px]"}`}>
                      {topic}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/55">
                      {routeUnlocked ? "Open exercise" : "Locked exercise"}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-5 grid gap-3">
                {block.drills.map((drill) => (
                  <div className="flex gap-3 border border-white/10 bg-black/20 p-3" key={drill}>
                    <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-100/70" size={16} />
                    <p className="text-sm font-light leading-6 text-white/60">{drill}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-3">
                  <ClipboardList className="text-white/45" size={18} />
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">Review protocol</div>
                </div>
                <p className="mt-3 text-sm font-light leading-6 text-white/55">{block.reviewProtocol}</p>
                <button
                  className="mt-4 w-full border border-white/10 bg-white/[0.035] p-3 text-left transition-colors hover:border-white/35 hover:bg-white/[0.07]"
                  onClick={() => openBlockOrPricing(block)}
                  type="button"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">Bound test</div>
                  <div className="mt-2 flex items-center justify-between gap-4 text-xl font-light text-white">
                    <span>{block.testLabel}</span>
                    <ArrowRight className="shrink-0 text-white/55" size={18} />
                  </div>
                  <p className="mt-2 text-sm font-light leading-6 text-white/48">
                    Study {block.hours}. Checkpoint: {block.checkpoint}
                  </p>
                </button>
              </div>
              <PremiumButton
                className="mt-5 w-full"
                icon={<ArrowRight size={18} />}
                onClick={() => openBlockOrPricing(block)}
                type="button"
              >
                {routeUnlocked ? "Start exercises" : "Unlock exercises"}
              </PremiumButton>
            </article>
          ))}
        </section>

        <section className="mt-6 border border-white/10 bg-white/[0.035] p-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-[#c8bd88]" />
            <h2 className="text-2xl font-light text-white">Four-week 1400+ progression</h2>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            {plan.phases.map((phase) => (
              <div className="border border-white/10 bg-black/20 p-4" key={phase.week}>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">{phase.week}</p>
                <h3 className="mt-3 text-xl font-light text-white">{phase.title}</h3>
                <div className="mt-4 grid gap-2 text-sm">
                  <p className="text-[#d7cc95]">{phase.target}</p>
                  <p className="text-white/46">{phase.hours}</p>
                  <p className="leading-6 text-white/58">{phase.work}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 border border-white/10 bg-white/[0.035] p-6">
          <div className="flex items-center gap-3">
            <Target className="text-yellow-100/70" />
            <h2 className="text-2xl font-light text-white">First 7 days: exact operating plan</h2>
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
      {activeBlock && lesson ? (
        <PracticeOverlay
          lesson={lesson}
          activeQuestion={activeQuestion}
          selectedAnswer={selectedAnswer}
          isConfirmed={isConfirmed}
          onClose={closePractice}
          onSelect={setSelectedAnswer}
          onConfirm={() => setIsConfirmed(true)}
          onNext={nextPracticeQuestion}
        />
      ) : null}
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
  const strategy = scoreGap >= 300
    ? "Concept repair before speed"
    : scoreGap >= 150
      ? "Accuracy under time"
      : "Hard-question polish";
  const blocks: CurriculumBlock[] = [
    {
      section: "Reading and Writing",
      title: "Evidence, structure, and grammar recovery",
      focus: readingWeaknesses.slice(0, 4),
      hours: "45-70 minutes daily",
      testLabel: "Full Reading and Writing Section Test",
      diagnosticSignal: signalFromTopics(readingWeaknesses, "Reading/Writing misses show the biggest risk in proof, logic, and sentence control."),
      masteryTarget: "85%+ on two timed RW sets with written evidence for every correction.",
      drills: [
        `Proof ladder: redo ${readingWeaknesses[0] || "the weakest RW topic"} misses, then solve 10 near-transfer questions.`,
        `Timing split: 12 medium questions untimed, then 12 harder questions in 18 minutes.`,
        "Mistake notebook: label each miss as evidence, transition, grammar, or wording trap."
      ],
      reviewProtocol: "For every wrong answer, write the exact sentence or data point that proves the correct choice and one reason the selected choice failed.",
      checkpoint: "Retake one RW module after two clean drill sets."
    },
    {
      section: "Math",
      title: "Algebra, advanced math, and precision recovery",
      focus: mathWeaknesses.slice(0, 4),
      hours: "45-70 minutes daily",
      testLabel: "Full Math Section Test",
      diagnosticSignal: signalFromTopics(mathWeaknesses, "Math misses show the biggest risk in equation setup, function meaning, and precision."),
      masteryTarget: "90%+ untimed accuracy, then 80%+ timed accuracy on the same skill family.",
      drills: [
        `Concept rebuild: solve 8 guided ${mathWeaknesses[0] || "Advanced Math"} examples before the timed set.`,
        `Transfer set: 18 questions mixing ${mathWeaknesses.slice(0, 2).join(" and ") || "algebra and functions"}.`,
        "Precision audit: identify whether each miss came from setup, algebra step, calculator use, or answering the wrong value."
      ],
      reviewProtocol: "Redo each missed problem from a blank page, then write the fastest method and the trap answer you nearly chose.",
      checkpoint: "Retake one Math module after the transfer set reaches the target accuracy."
    }
  ];

  const primary = weaknesses[0] || "mixed weak topics";
  const secondary = weaknesses[1] || "timing and accuracy";
  const phases: CurriculumPhase[] = [
    {
      week: "Week 1",
      title: "Stop the score leaks",
      target: `${results.score_total} to ${Math.min(1400, results.score_total + 45)}`,
      hours: dailyHours,
      work: `Repair ${primary}, rebuild missing rules, and redo every diagnostic miss without time pressure.`
    },
    {
      week: "Week 2",
      title: "Convert accuracy into speed",
      target: `${Math.min(1400, results.score_total + 45)} to ${Math.min(1400, results.score_total + 90)}`,
      hours: dailyHours,
      work: `Timed sets for ${primary} and ${secondary}; wrong-answer notebook reviewed before each session.`
    },
    {
      week: "Week 3",
      title: "Mixed module pressure",
      target: `${Math.min(1400, results.score_total + 90)} to ${Math.min(1400, results.score_total + 140)}`,
      hours: dailyHours,
      work: "Mixed RW and Math modules, hard-question triage, and retake planning from repeated traps."
    },
    {
      week: "Week 4",
      title: "1400+ retake cycle",
      target: `${Math.min(1400, results.score_total + 140)} to 1400+`,
      hours: dailyHours,
      work: "Full mock, section retake, final weak-topic sprint, and parent-ready progress snapshot."
    }
  ];
  const masteryGates: MasteryGate[] = [
    {
      label: "Accuracy gate",
      target: scoreGap >= 200 ? "80%+" : "88%+",
      evidence: "Two focused sets in a row before topic is marked improved."
    },
    {
      label: "Timing gate",
      target: "1:15 avg",
      evidence: "Medium questions under target time without losing accuracy."
    },
    {
      label: "Retake gate",
      target: "+40 pts",
      evidence: "Section retake confirms the weakness is no longer repeating."
    }
  ];
  const operatingRules = [
    `Start each day with the weakest active topic: ${primary}.`,
    "Theory appears only when the diagnostic shows the rule is missing, not for every topic.",
    "Timed work starts after concept accuracy improves, so speed does not hide weak understanding.",
    "A topic is not closed until a retake proves the same trap disappeared."
  ];

  return {
    dailyHours,
    strategy,
    scoreGap,
    blocks,
    phases,
    masteryGates,
    operatingRules,
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

function signalFromTopics(topics: string[], fallback: string) {
  if (!topics.length) return fallback;
  return `Priority signal: ${topics.slice(0, 3).join(", ")} appeared in missed or low-accuracy work.`;
}

function buildLockedRoutePreview(blocks: CurriculumBlock[]) {
  const mathBlock = blocks.find((block) => block.section === "Math");
  const readingBlock = blocks.find((block) => block.section === "Reading and Writing");
  const mathTopic = mathBlock?.focus[0] || "Advanced Math";
  const readingTopic = readingBlock?.focus[0] || "Transitions";

  return [
    `18 ${mathTopic} questions ready`,
    `12 ${readingTopic} drills ready`,
    "Next mini mock scheduled"
  ];
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

function PracticeOverlay({
  lesson,
  activeQuestion,
  selectedAnswer,
  isConfirmed,
  onClose,
  onSelect,
  onConfirm,
  onNext
}: {
  lesson: PracticeLesson;
  activeQuestion: number;
  selectedAnswer: string;
  isConfirmed: boolean;
  onClose: () => void;
  onSelect: (answer: string) => void;
  onConfirm: () => void;
  onNext: () => void;
}) {
  const question = lesson.questions[activeQuestion];
  const isLastQuestion = activeQuestion === lesson.questions.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black text-white">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/42">Targeted SAT practice</p>
            <h2 className="mt-3 text-4xl font-light text-white md:text-6xl">{lesson.title}</h2>
          </div>
          <button
            className="h-12 border border-white/25 px-5 text-xs font-black uppercase tracking-[0.2em] text-white/70 hover:border-white hover:text-white"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="space-y-5">
            <div className="border border-white/10 bg-white/[0.035] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">What this task means</p>
              <p className="mt-4 text-lg font-light leading-8 text-white/70">{lesson.definition}</p>
            </div>
            <div className="border border-white/10 bg-white/[0.035] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">How to approach it</p>
              <div className="mt-4 grid gap-3">
                {lesson.tips.map((tip, index) => (
                  <div className="grid grid-cols-[36px_1fr] gap-3 border border-white/10 bg-black/25 p-3" key={tip}>
                    <span className="flex h-9 w-9 items-center justify-center border border-white/15 text-sm font-black text-white/65">{index + 1}</span>
                    <p className="text-sm font-light leading-6 text-white/65">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">
                Question {activeQuestion + 1} of {lesson.questions.length}
              </p>
              <span className="border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/40" data-sattest-no-translate="true">
                {question.skill}
              </span>
            </div>
            <p className="mt-6 whitespace-pre-line text-xl font-light leading-9 text-white" data-sattest-no-translate="true">
              {question.prompt}
            </p>
            <div className="mt-6 grid gap-3" data-sattest-no-translate="true">
              {question.choices.map((choice) => {
                const isSelected = selectedAnswer === choice.label;
                const isCorrect = isConfirmed && choice.label === question.answer;
                const isWrong = isConfirmed && isSelected && choice.label !== question.answer;
                return (
                  <button
                    className={`flex min-h-16 items-start gap-4 border px-4 py-4 text-left transition-colors ${
                      isCorrect
                        ? "border-emerald-300/45 bg-emerald-400/12"
                        : isWrong
                          ? "border-red-300/45 bg-red-400/12"
                          : isSelected
                            ? "border-white bg-white text-black"
                            : "border-white/10 bg-black/25 text-white hover:border-white/35"
                    }`}
                    disabled={isConfirmed}
                    key={choice.label}
                    onClick={() => onSelect(choice.label)}
                    type="button"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
                      isSelected ? "border-current" : "border-white/20"
                    }`}>
                      {choice.label}
                    </span>
                    <span className="text-base font-light leading-7">{choice.text}</span>
                  </button>
                );
              })}
            </div>

            {isConfirmed ? (
              <div className="mt-6 border border-white/10 bg-black/30 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/40">
                  {selectedAnswer === question.answer ? "Correct" : `Correct answer: ${question.answer}`}
                </p>
                <p className="mt-3 text-base font-light leading-7 text-white/70" data-sattest-no-translate="true">
                  {question.explanation}
                </p>
              </div>
            ) : null}

            <button
              className="mt-6 flex h-13 w-full items-center justify-center border border-white bg-white px-5 text-xs font-black uppercase tracking-[0.22em] text-black disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-white/10 disabled:text-white/30"
              disabled={!selectedAnswer}
              onClick={isConfirmed ? (isLastQuestion ? onClose : onNext) : onConfirm}
              type="button"
            >
              {isConfirmed ? (isLastQuestion ? "Finish practice" : "Next question") : "Confirm answer"}
            </button>
          </section>
        </section>
      </div>
    </div>
  );
}

function buildPracticeLesson(block: CurriculumBlock): PracticeLesson {
  const focus = block.focus.length ? block.focus : [block.section === "Math" ? "Algebra" : "Inference"];
  if (block.section === "Math") {
    return {
      title: `${focus[0]} recovery practice`,
      definition: `This lesson targets the Math skills where your diagnostic showed weakness: ${focus.join(", ")}. Your job is to translate the wording into an equation, choose the correct operation, and check the exact value the question asks for.`,
      tips: [
        "Underline what the question is asking for before calculating. SAT Math often hides whether it wants x, f(x), a rate, a constant, or an expression.",
        "Write one clean equation from the words. Do not start with answer choices unless the problem is clearly faster by substitution.",
        "For algebra, keep equal steps on both sides. For functions, substitute carefully before simplifying.",
        "After solving, plug the answer back into the original question. Many wrong answers are intermediate values."
      ],
      questions: mathPracticeQuestions(focus)
    };
  }

  return {
    title: `${focus[0]} recovery practice`,
    definition: `This lesson targets the Reading and Writing skills where your diagnostic showed weakness: ${focus.join(", ")}. Your job is to prove the answer from the text, match the exact writing goal, and avoid choices that are true but do not complete the task.`,
    tips: [
      "Read the question stem first and name the task: infer, summarize, use notes, improve structure, or fix grammar.",
      "For evidence questions, choose the answer that is directly supported. Do not choose a claim that only sounds related.",
      "For notes questions, find the goal before reading choices. Relevant information must serve that goal, not just repeat a note.",
      "For grammar, test the sentence boundary first: complete sentence, fragment, comma splice, or correct punctuation."
    ],
    questions: readingWritingPracticeQuestions(focus)
  };
}

function readingWritingPracticeQuestions(focus: string[]): PracticeQuestion[] {
  const primary = focus[0] || "Reading and Writing";
  return [
    {
      skill: primary,
      prompt: "A study found that students who reviewed missed questions within 24 hours improved more than students who waited a week. Which inference is best supported?",
      choices: [
        { label: "A", text: "Immediate review can help students learn from mistakes more effectively." },
        { label: "B", text: "Students should never study new material after a test." },
        { label: "C", text: "Waiting a week causes students to forget all test content." },
        { label: "D", text: "Reviewing missed questions is the only way to improve SAT scores." }
      ],
      answer: "A",
      explanation: "The text supports a cautious inference: immediate review helped more than delayed review. The other choices are too absolute or add claims not proven by the study."
    },
    {
      skill: "Text Structure and Purpose",
      prompt: "The passage first describes a common belief about sleep, then presents research that challenges that belief. What is the main purpose of this structure?",
      choices: [
        { label: "A", text: "To introduce an idea and then complicate it with new evidence." },
        { label: "B", text: "To list several unrelated facts about sleep." },
        { label: "C", text: "To argue that research about sleep is impossible." },
        { label: "D", text: "To compare two researchers' personal routines." }
      ],
      answer: "A",
      explanation: "The structure moves from an accepted belief to evidence that challenges it. That means the purpose is to complicate or revise the original idea."
    },
    {
      skill: "Rhetorical Synthesis",
      prompt: "Notes:\n- Dr. Lina Park studies urban gardens.\n- Her 2022 study examined 40 community gardens.\n- The study found that gardens increased neighborhood food access.\n- The student wants to emphasize the result of Park's research. Which choice best accomplishes the goal?",
      choices: [
        { label: "A", text: "Dr. Lina Park studies urban gardens and published research in 2022." },
        { label: "B", text: "In a 2022 study of 40 community gardens, Dr. Lina Park found that the gardens increased neighborhood food access." },
        { label: "C", text: "Community gardens can be found in many cities." },
        { label: "D", text: "Dr. Lina Park's research included 40 gardens." }
      ],
      answer: "B",
      explanation: "The goal is to emphasize the result, so the correct answer includes the finding about increased food access. The other choices omit or weaken the result."
    },
    {
      skill: "Command of Evidence",
      prompt: "A graph shows that library visits rose from 1,200 in January to 2,000 in March after weekend hours were added. Which statement is best supported?",
      choices: [
        { label: "A", text: "Library visits increased after weekend hours were added." },
        { label: "B", text: "Weekend hours were unpopular with visitors." },
        { label: "C", text: "The library had exactly 2,000 visitors every month." },
        { label: "D", text: "January was the busiest month." }
      ],
      answer: "A",
      explanation: "The data support an increase from January to March after the change. The other choices contradict the numbers or overstate the pattern."
    },
    {
      skill: "Standard English Conventions",
      prompt: "Which choice completes the sentence correctly?\nThe researcher collected the samples, ___ she stored them in a climate-controlled container.",
      choices: [
        { label: "A", text: "and" },
        { label: "B", text: "because" },
        { label: "C", text: "although" },
        { label: "D", text: "therefore" }
      ],
      answer: "A",
      explanation: "The sentence joins two related actions in sequence. 'And' correctly coordinates them without creating an unsupported cause or contrast."
    },
    {
      skill: "Main Idea",
      prompt: "A passage explains that electric buses cost more at first but are cheaper to maintain and produce less pollution over time. Which choice best states the main idea?",
      choices: [
        { label: "A", text: "Electric buses have both financial and environmental advantages over time." },
        { label: "B", text: "Electric buses are always cheaper to buy than diesel buses." },
        { label: "C", text: "Maintenance is unrelated to transportation planning." },
        { label: "D", text: "Cities should immediately remove every diesel bus." }
      ],
      answer: "A",
      explanation: "The main idea must cover both parts: higher initial cost but long-term maintenance and pollution benefits. The wrong answers exaggerate or ignore key details."
    },
    {
      skill: "Inference",
      prompt: "Researchers noticed that a plant grew faster in shaded soil than in direct sun, even though it still needed some light. What can reasonably be inferred?",
      choices: [
        { label: "A", text: "The plant may grow best with moderate light rather than constant direct sun." },
        { label: "B", text: "The plant cannot survive with any light." },
        { label: "C", text: "All plants grow faster in shade." },
        { label: "D", text: "Soil has no effect on plant growth." }
      ],
      answer: "A",
      explanation: "The inference must stay within the evidence. The plant grew faster in shade but still needed light, so moderate light is the best supported conclusion."
    },
    {
      skill: "Words in Context",
      prompt: "In the sentence 'The committee adopted a measured response,' measured most nearly means",
      choices: [
        { label: "A", text: "careful" },
        { label: "B", text: "counted" },
        { label: "C", text: "loud" },
        { label: "D", text: "temporary" }
      ],
      answer: "A",
      explanation: "In this context, 'measured' describes a controlled, careful response. It does not mean physically counted."
    },
    {
      skill: "Transitions",
      prompt: "Which transition best completes the sentence?\nThe first trial showed little improvement. ___, the second trial produced a clear increase in accuracy.",
      choices: [
        { label: "A", text: "However" },
        { label: "B", text: "For example" },
        { label: "C", text: "Similarly" },
        { label: "D", text: "Therefore" }
      ],
      answer: "A",
      explanation: "The two sentences contrast: little improvement versus clear increase. 'However' signals that contrast."
    },
    {
      skill: "Rhetorical Synthesis",
      prompt: "Notes:\n- The museum opened in 1998.\n- It displays local textile art.\n- Its newest exhibit features work by young artists.\nThe student wants to introduce the museum's current exhibit. Which choice best accomplishes the goal?",
      choices: [
        { label: "A", text: "Opened in 1998, the museum now has a new exhibit featuring textile art by young artists." },
        { label: "B", text: "The museum opened in 1998." },
        { label: "C", text: "Local textile art can be displayed in museums." },
        { label: "D", text: "Young artists often make art." }
      ],
      answer: "A",
      explanation: "The goal is to introduce the current exhibit, so the answer must mention the new exhibit and its young artists. The date alone is not enough."
    }
  ];
}

function mathPracticeQuestions(focus: string[]): PracticeQuestion[] {
  const primary = focus[0] || "Math";
  return [
    {
      skill: primary,
      prompt: "If 3x + 7 = 28, what is the value of x?",
      choices: [
        { label: "A", text: "5" },
        { label: "B", text: "7" },
        { label: "C", text: "9" },
        { label: "D", text: "11" }
      ],
      answer: "B",
      explanation: "Subtract 7 from both sides to get 3x = 21. Divide by 3, so x = 7."
    },
    {
      skill: "Functions",
      prompt: "The function f is defined by f(x) = 2x + 5. What is f(6)?",
      choices: [
        { label: "A", text: "11" },
        { label: "B", text: "12" },
        { label: "C", text: "17" },
        { label: "D", text: "22" }
      ],
      answer: "C",
      explanation: "Substitute 6 for x: f(6) = 2(6) + 5 = 12 + 5 = 17."
    },
    {
      skill: "Advanced Math",
      prompt: "Which expression is equivalent to (x + 4)(x - 4)?",
      choices: [
        { label: "A", text: "x^2 - 16" },
        { label: "B", text: "x^2 + 16" },
        { label: "C", text: "x^2 - 8x + 16" },
        { label: "D", text: "2x - 16" }
      ],
      answer: "A",
      explanation: "This is a difference of squares: (x + 4)(x - 4) = x^2 - 4^2 = x^2 - 16."
    },
    {
      skill: "Problem Solving and Data Analysis",
      prompt: "A class has 12 boys and 18 girls. What percent of the class is girls?",
      choices: [
        { label: "A", text: "40%" },
        { label: "B", text: "50%" },
        { label: "C", text: "60%" },
        { label: "D", text: "66%" }
      ],
      answer: "C",
      explanation: "There are 30 students total. Girls are 18/30 = 0.6 = 60%."
    },
    {
      skill: "Geometry and Trigonometry",
      prompt: "A rectangle has length 9 and width 4. What is its area?",
      choices: [
        { label: "A", text: "13" },
        { label: "B", text: "18" },
        { label: "C", text: "26" },
        { label: "D", text: "36" }
      ],
      answer: "D",
      explanation: "Area of a rectangle is length times width: 9 x 4 = 36."
    },
    {
      skill: "Algebra",
      prompt: "If y = 4x - 3 and x = 5, what is the value of y?",
      choices: [
        { label: "A", text: "14" },
        { label: "B", text: "17" },
        { label: "C", text: "20" },
        { label: "D", text: "23" }
      ],
      answer: "B",
      explanation: "Substitute x = 5: y = 4(5) - 3 = 20 - 3 = 17."
    },
    {
      skill: "Linear Equations",
      prompt: "A line has equation y = 3x + 2. What is the y-intercept?",
      choices: [
        { label: "A", text: "2" },
        { label: "B", text: "3" },
        { label: "C", text: "5" },
        { label: "D", text: "6" }
      ],
      answer: "A",
      explanation: "In y = mx + b, b is the y-intercept. Here b = 2."
    },
    {
      skill: "Ratios",
      prompt: "The ratio of red tiles to blue tiles is 2 to 5. If there are 14 red tiles, how many blue tiles are there?",
      choices: [
        { label: "A", text: "20" },
        { label: "B", text: "28" },
        { label: "C", text: "35" },
        { label: "D", text: "70" }
      ],
      answer: "C",
      explanation: "The scale factor from 2 red tiles to 14 red tiles is 7. Multiply blue tiles by 7: 5 x 7 = 35."
    },
    {
      skill: "Quadratics",
      prompt: "Which value of x satisfies x^2 = 49 and x > 0?",
      choices: [
        { label: "A", text: "-7" },
        { label: "B", text: "0" },
        { label: "C", text: "7" },
        { label: "D", text: "49" }
      ],
      answer: "C",
      explanation: "Both -7 and 7 square to 49, but the condition x > 0 leaves only 7."
    },
    {
      skill: "Precision",
      prompt: "A value increases from 80 to 100. What is the percent increase?",
      choices: [
        { label: "A", text: "20%" },
        { label: "B", text: "25%" },
        { label: "C", text: "80%" },
        { label: "D", text: "125%" }
      ],
      answer: "B",
      explanation: "The increase is 20. Percent increase is 20/80 = 0.25 = 25%. The original value is the denominator."
    }
  ];
}
