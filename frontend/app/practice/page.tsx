"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Calculator,
  Crown,
  LockKeyhole,
  PenLine,
  Star,
  UserPlus,
  Zap
} from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { getToken } from "@/lib/api";

const practiceSections = [
  {
    title: "SAT Reading",
    description: "Practice command of evidence, inference, main idea, text structure, and words in context.",
    icon: BookOpenText,
    href: "/practice/reading"
  },
  {
    title: "SAT Writing",
    description: "Practice transitions, grammar, punctuation, rhetorical synthesis, and sentence boundaries.",
    icon: PenLine,
    href: "/practice/writing"
  },
  {
    title: "SAT Math",
    description: "Practice algebra, advanced math, problem solving, data analysis, geometry, and precision.",
    icon: Calculator,
    href: "/practice/math"
  }
];

type MasteryStatus = "mastered" | "proficient" | "familiar" | "attempted" | "not-started" | "quiz" | "unit-test";

type ProgressUnit = {
  title: string;
  note?: string;
  statuses: MasteryStatus[];
};

const masteryLegend: { label: string; status: MasteryStatus }[] = [
  { label: "Mastered", status: "mastered" },
  { label: "Proficient", status: "proficient" },
  { label: "Familiar", status: "familiar" },
  { label: "Attempted", status: "attempted" },
  { label: "Not started", status: "not-started" },
  { label: "Quiz", status: "quiz" },
  { label: "Unit test", status: "unit-test" }
];

const progressTables = [
  {
    subject: "SAT Reading and Writing",
    mastery: 87,
    challenge: 77,
    units: [
      { title: "Unit 1", note: "Diagnostic orientation", statuses: ["not-started"] },
      { title: "Unit 2", note: "Foundations: Information and Ideas", statuses: ["mastered", "mastered", "proficient", "unit-test"] },
      { title: "Unit 3", note: "Foundations: Craft and Structure", statuses: ["mastered", "proficient", "mastered", "unit-test"] },
      { title: "Unit 4", note: "Foundations: Expression and Conventions", statuses: ["familiar", "mastered", "mastered", "unit-test"] },
      { title: "Unit 5", note: "Medium: Information and Ideas", statuses: ["attempted", "familiar", "mastered", "mastered", "unit-test"] },
      { title: "Unit 6", note: "Medium: Craft and Structure", statuses: ["proficient", "mastered", "mastered", "unit-test"] },
      { title: "Unit 7", note: "Medium: Expression and Conventions", statuses: ["proficient", "mastered", "mastered", "familiar", "unit-test"] },
      { title: "Unit 8", note: "Advanced: Information and Ideas", statuses: ["attempted", "mastered", "mastered", "mastered", "unit-test"] },
      { title: "Unit 9", note: "Advanced: Craft and Structure", statuses: ["proficient", "proficient", "mastered", "unit-test"] },
      { title: "Unit 10", note: "Advanced: Expression and Conventions", statuses: ["mastered", "proficient", "mastered", "proficient", "unit-test"] },
      {
        title: "Unit 11",
        note: "Full Reading and Writing section test",
        statuses: ["mastered", "mastered", "quiz", "mastered", "proficient", "quiz", "mastered", "unit-test"]
      }
    ]
  },
  {
    subject: "SAT Math",
    mastery: 64,
    challenge: 68,
    units: [
      { title: "Unit 1", note: "Diagnostic orientation", statuses: ["not-started"] },
      { title: "Unit 2", note: "Foundations: Algebra", statuses: ["familiar", "proficient", "quiz", "mastered", "unit-test"] },
      { title: "Unit 3", note: "Foundations: Problem Solving and Data Analysis", statuses: ["attempted", "familiar", "quiz", "proficient", "unit-test"] },
      { title: "Unit 4", note: "Foundations: Advanced Math", statuses: ["attempted", "not-started", "quiz", "familiar", "unit-test"] },
      { title: "Unit 5", note: "Foundations: Geometry and Trigonometry", statuses: ["not-started", "attempted", "quiz", "familiar", "unit-test"] },
      { title: "Unit 6", note: "Medium: Algebra", statuses: ["proficient", "familiar", "quiz", "mastered", "unit-test"] },
      { title: "Unit 7", note: "Medium: Problem Solving and Data Analysis", statuses: ["familiar", "proficient", "quiz", "proficient", "unit-test"] },
      { title: "Unit 8", note: "Medium: Advanced Math", statuses: ["attempted", "familiar", "quiz", "proficient", "unit-test"] },
      { title: "Unit 9", note: "Medium: Geometry and Trigonometry", statuses: ["not-started", "attempted", "quiz", "familiar", "unit-test"] },
      { title: "Unit 10", note: "Advanced: Algebra", statuses: ["proficient", "quiz", "familiar", "mastered", "unit-test"] },
      { title: "Unit 11", note: "Advanced: Problem Solving and Data Analysis", statuses: ["attempted", "quiz", "familiar", "proficient", "unit-test"] },
      { title: "Unit 12", note: "Advanced: Advanced Math", statuses: ["not-started", "quiz", "attempted", "familiar", "unit-test"] },
      { title: "Unit 13", note: "Advanced: Geometry and Trigonometry", statuses: ["not-started", "quiz", "attempted", "unit-test"] },
      { title: "Unit 14", note: "Full Math section test", statuses: ["quiz", "familiar", "proficient", "quiz", "unit-test"] }
    ]
  }
] satisfies {
  subject: string;
  mastery: number;
  challenge: number;
  units: ProgressUnit[];
}[];

const statusClass: Record<MasteryStatus, string> = {
  mastered: "border-[#6d4bb4] bg-[#6d4bb4] text-white",
  proficient: "border-[#9089bf] bg-[#9089bf] text-white",
  familiar: "border-[#df8507] bg-[#df8507] text-white",
  attempted: "border-[#c76324] bg-transparent text-[#f6b08c]",
  "not-started": "border-white/35 bg-transparent text-transparent",
  quiz: "border-white/10 bg-white/10 text-white/70",
  "unit-test": "border-white/10 bg-white/10 text-white/70"
};

function MasteryMark({ status }: { status: MasteryStatus }) {
  return (
    <span
      aria-label={status.replace("-", " ")}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border ${statusClass[status]}`}
      title={status.replace("-", " ")}
    >
      {status === "mastered" ? <Crown size={16} fill="currentColor" /> : null}
      {status === "quiz" ? <Zap size={16} fill="currentColor" /> : null}
      {status === "unit-test" ? <Star size={16} fill="currentColor" /> : null}
    </span>
  );
}

function ProgressTable({ table }: { table: (typeof progressTables)[number] }) {
  return (
    <article className="border border-white/10 bg-white/[0.035] p-5">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/38">Course mastery</p>
          <h2 className="mt-3 text-3xl font-light text-white">{table.subject}</h2>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-4xl font-light text-white">{table.mastery}%</p>
          <p className="mt-1 text-xs font-light text-white/42">in process</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">
        {masteryLegend.map((item) => (
          <div className="flex items-center gap-2 text-sm text-white/62" key={`${table.subject}-${item.status}`}>
            <MasteryMark status={item.status} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-7 grid gap-x-8 lg:grid-cols-2">
        {table.units.map((unit) => (
          <div className="grid grid-cols-[72px_1fr] items-center gap-3 border-t border-white/10 py-4" key={`${table.subject}-${unit.title}`}>
            <p className="text-sm font-black text-white">{unit.title}</p>
            <div>
              <div className="flex flex-wrap gap-2">
                {unit.statuses.map((status, index) => (
                  <MasteryMark key={`${unit.title}-${status}-${index}`} status={status} />
                ))}
              </div>
              {unit.note ? <p className="mt-2 text-xs font-light leading-5 text-white/42">{unit.note}</p> : null}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/38">Course challenge</p>
            <p className="mt-2 text-lg font-light text-white">Current challenge score: {table.challenge}%</p>
          </div>
          <p className="max-w-sm text-sm font-light leading-6 text-white/48">
            Finish weak units, then retake the section challenge to move more skills into mastered status.
          </p>
        </div>
      </div>
    </article>
  );
}

export default function PracticeAccessPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [selectedSection, setSelectedSection] = useState("SAT Reading");

  useEffect(() => {
    setIsLoggedIn(Boolean(getToken()));
    setHasCheckedAuth(true);
  }, []);

  if (!hasCheckedAuth) {
    return (
      <main className="min-h-screen bg-[#101112] text-white">
        <LuxuryNavbar />
        <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-4xl flex-col items-center justify-center px-5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/38">Practice</p>
          <h1 className="mt-5 text-4xl font-light text-white md:text-5xl">Checking your account</h1>
        </section>
      </main>
    );
  }

  if (isLoggedIn) {
    return (
      <main className="min-h-screen bg-[#101112] text-white">
        <LuxuryNavbar />

        <section className="mx-auto min-h-[calc(100vh-81px)] max-w-7xl px-5 py-14 md:px-8">
          <div className="border-b border-white/10 pb-10">
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Practice unlocked</p>
            <h1 className="mt-6 max-w-5xl text-5xl font-light leading-none text-white md:text-7xl">
              Choose what you want to practice.
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-light leading-8 text-white/50">
              Select a SAT practice area. The next step will connect this choice to targeted drills and section practice.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {practiceSections.map((section) => {
              const Icon = section.icon;
              const isSelected = selectedSection === section.title;
              const cardClass = `block min-h-[260px] border p-6 text-left transition-colors ${
                isSelected
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/[0.035] text-white hover:border-white/35 hover:bg-white/[0.06]"
              }`;
              const content = (
                <>
                  <div className={`flex h-14 w-14 items-center justify-center border ${
                    isSelected ? "border-black/15 bg-black text-white" : "border-white/10 bg-black/25 text-white/70"
                  }`}>
                    <Icon size={24} />
                  </div>
                  <p className={`mt-8 text-[10px] font-black uppercase tracking-[0.32em] ${
                    isSelected ? "text-black/45" : "text-white/38"
                  }`}>
                    Practice section
                  </p>
                  <h2 className="mt-3 text-3xl font-light">{section.title}</h2>
                  <p className={`mt-4 text-sm font-light leading-6 ${
                    isSelected ? "text-black/58" : "text-white/48"
                  }`}>
                    {section.description}
                  </p>
                  <div className={`mt-8 flex h-12 items-center justify-between border px-4 text-xs font-black uppercase tracking-[0.18em] ${
                    isSelected ? "border-black bg-black text-white" : "border-white/15 text-white/70"
                  }`}>
                    {section.href ? "Start practice" : isSelected ? "Selected" : "Choose"} <ArrowRight size={17} />
                  </div>
                </>
              );

              if (section.href) {
                return (
                  <Link className={cardClass} href={section.href} key={section.title}>
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  className={cardClass}
                  key={section.title}
                  onClick={() => setSelectedSection(section.title)}
                  type="button"
                >
                  {content}
                </button>
              );
            })}
          </div>

          <section className="mt-14 border-t border-white/10 pt-10">
            <div className="max-w-4xl">
              <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Progress in process</p>
              <h2 className="mt-5 text-4xl font-light leading-tight text-white md:text-5xl">
                Track mastery for both SAT subjects.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-light leading-7 text-white/48">
                Every quiz, topic drill, and section test moves a unit from not started to mastered, so students can see exactly where improvement is happening.
              </p>
            </div>

            <div className="mt-7 grid gap-6 xl:grid-cols-2">
              {progressTables.map((table) => (
                <ProgressTable key={table.subject} table={table} />
              ))}
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />

      <section className="mx-auto min-h-[calc(100vh-81px)] max-w-7xl px-5 py-14 md:px-8">
        <div className="grid gap-10 border-b border-white/10 pb-10 lg:grid-cols-[1fr_440px] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Practice engine preview</p>
            <h1 className="mt-6 max-w-5xl text-5xl font-light leading-none text-white md:text-7xl">
              Feel the targeted SAT practice before creating an account.
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-light leading-8 text-white/50">
              See how Reading, Writing, and Math practice turns diagnostic mistakes into topic drills, unit tests, and visible mastery progress.
            </p>
          </div>

          <div className="border border-white/10 bg-white/[0.035] p-5">
            <div className="flex h-12 w-12 items-center justify-center border border-white/10 bg-black/20 text-white/70">
              <LockKeyhole size={22} />
            </div>
            <h2 className="mt-5 text-2xl font-light text-white">Save your real progress</h2>
            <p className="mt-3 text-sm font-light leading-6 text-white/48">
              This preview is public. Create an account when you are ready for saved drills, score history, and a personal weakness route.
            </p>
            <div className="mt-5 grid gap-3">
              <Link className="flex h-13 items-center justify-between border border-white bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white" href="/mock-test">
                Start free diagnostic <UserPlus size={18} />
              </Link>
              <Link className="flex h-13 items-center justify-between border border-white/15 bg-black/20 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-white/35 hover:text-white" href="/login">
                Sign in to practice <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {practiceSections.map((section) => {
            const Icon = section.icon;
            return (
              <article className="min-h-[250px] border border-white/10 bg-white/[0.035] p-6 text-white" key={section.title}>
                <div className="flex h-14 w-14 items-center justify-center border border-white/10 bg-black/25 text-white/70">
                  <Icon size={24} />
                </div>
                <p className="mt-8 text-[10px] font-black uppercase tracking-[0.32em] text-white/38">Practice section</p>
                <h2 className="mt-3 text-3xl font-light">{section.title}</h2>
                <p className="mt-4 text-sm font-light leading-6 text-white/48">{section.description}</p>
              </article>
            );
          })}
        </div>

        <section className="mt-14 border-t border-white/10 pt-10">
          <div className="max-w-4xl">
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Sample mastery map</p>
            <h2 className="mt-5 text-4xl font-light leading-tight text-white md:text-5xl">
              A student can see which units are mastered, familiar, attempted, or untouched.
            </h2>
            <p className="mt-5 max-w-2xl text-base font-light leading-7 text-white/48">
              The real account version updates this map after every drill, quiz, and section test.
            </p>
          </div>

          <div className="mt-7 grid gap-6 xl:grid-cols-2">
            {progressTables.map((table) => (
              <ProgressTable key={table.subject} table={table} />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
