"use client";

import { ArrowRight, BookOpenCheck, CalendarDays, GraduationCap, Lock, Target, Timer, X } from "lucide-react";

export function CurriculumPrompt({
  onClose,
  onOpen,
  score,
  weaknesses,
  isUnlocked = false
}: {
  onClose: () => void;
  onOpen: () => void;
  score: number;
  weaknesses: string[];
  isUnlocked?: boolean;
}) {
  const firstWeaknesses = weaknesses.slice(0, 3);
  const lockedTasks = buildLockedTasks(firstWeaknesses);
  const nextMockDate = nextMockLabel();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/78 px-5 py-8 text-white backdrop-blur-md">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl place-items-center">
        <section className="relative w-full border border-white/12 bg-[#151617]/95 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.65)] md:p-10">
          <button
            aria-label="Close curriculum panel"
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center border border-white/10 bg-black/20 text-white/45 transition-colors hover:border-white/35 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>

          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <div className="flex h-16 w-16 items-center justify-center border border-yellow-200/20 bg-yellow-200/10 text-yellow-100">
                <GraduationCap size={30} />
              </div>
              <p className="mt-7 text-[10px] font-black uppercase tracking-[0.42em] text-white/38">
                {isUnlocked ? "1400+ exercise route unlocked" : "1400+ exercise route ready"}
              </p>
              <h2 className="mt-5 max-w-3xl text-5xl font-light leading-none text-white md:text-7xl">
                {isUnlocked
                  ? "Your weak topics are clear. Open your exercise route now."
                  : "You now know why the score is stuck. The exact exercises are waiting."}
              </h2>
              <p className="mt-6 max-w-2xl text-base font-light leading-8 text-white/55">
                {isUnlocked
                  ? "Your subscription is active. Continue into the personal 1400+ route, supervised theory, daily exercises, and section work needed to repair those exact mistakes."
                  : "The diagnostic exposed the leaks. Pro opens the locked drills, supervised theory, timed retake, and mistake notebook built from these exact missed patterns."}
              </p>
            </div>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 border border-white/10 bg-white/[0.035]">
                <div className="border-r border-white/10 p-5">
                  <div className="text-[10px] font-black uppercase tracking-[0.26em] text-white/38">Current score</div>
                  <div className="mt-4 text-4xl font-light text-white">{score}</div>
                </div>
                <div className="p-5">
                  <div className="text-[10px] font-black uppercase tracking-[0.26em] text-white/38">Target</div>
                  <div className="mt-4 text-4xl font-light text-white">1400+</div>
                </div>
              </div>

              <div className="border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-3 text-white/72">
                  <Target size={19} />
                  <h3 className="text-lg font-light text-white">First priority weaknesses</h3>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(firstWeaknesses.length ? firstWeaknesses : ["Reading and Writing", "Math"]).map((weakness) => (
                    <span className="border border-red-200/15 bg-red-400/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-100" key={weakness}>
                      {weakness}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                {lockedTasks.map((task) => {
                  const Icon = task.icon;
                  return (
                    <div
                      className={`relative overflow-hidden border border-white/10 bg-black/25 p-4 ${
                        isUnlocked ? "" : "shadow-[inset_0_0_70px_rgba(255,255,255,0.025)]"
                      }`}
                      key={task.title}
                    >
                      {!isUnlocked ? (
                        <span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center border border-white/10 bg-black/35 text-white/45">
                          <Lock size={15} />
                        </span>
                      ) : null}
                      <div className={isUnlocked ? "" : "blur-[1.2px]"}>
                        <div className="flex items-center gap-3 text-white/55">
                          <Icon size={18} />
                          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/36">
                            {task.label}
                          </span>
                        </div>
                        <div className="mt-3 text-xl font-light text-white">{task.title}</div>
                        <div className="mt-2 text-sm font-light leading-6 text-white/48">{task.detail}</div>
                      </div>
                    </div>
                  );
                })}
                <div className="border border-yellow-200/15 bg-yellow-200/[0.055] p-4">
                  <div className="flex items-center gap-3 text-yellow-100/70">
                    <CalendarDays size={18} />
                    <span className="text-[10px] font-black uppercase tracking-[0.24em]">Next proof point</span>
                  </div>
                  <div className="mt-3 text-xl font-light text-white">Next mini mock scheduled</div>
                  <div className="mt-2 text-sm font-light leading-6 text-white/52">
                    {nextMockDate}. Unlock Pro to start the repair cycle and retake the weak section.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-end">
            <button
              className="h-12 border border-white/15 bg-black/20 px-5 text-xs font-black uppercase tracking-[0.2em] text-white/58 transition-colors hover:border-white/35 hover:text-white"
              onClick={onClose}
              type="button"
            >
              Stay on report
            </button>
            <button
              className="flex h-12 items-center justify-center gap-3 border border-white bg-white px-6 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-white"
              onClick={onOpen}
              type="button"
            >
              {isUnlocked ? "Open exercise route" : "Unlock exercise route"} <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function buildLockedTasks(weaknesses: string[]) {
  const [first = "Advanced Math", second = "Transitions", third = "Evidence traps"] = weaknesses;

  return [
    {
      icon: BookOpenCheck,
      label: "Locked drill",
      title: `18 ${first} questions ready`,
      detail: "Generated from the diagnostic misses, with explanations after each answer."
    },
    {
      icon: Target,
      label: "Locked repair set",
      title: `12 ${second} drills ready`,
      detail: "Short focused set to stop the repeated trap that cost points."
    },
    {
      icon: Timer,
      label: "Locked timed work",
      title: `7 ${third} timed questions ready`,
      detail: "Practice under pressure before the next section retake."
    }
  ];
}

function nextMockLabel() {
  const next = new Date();
  next.setDate(next.getDate() + 7);
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(next);
}
