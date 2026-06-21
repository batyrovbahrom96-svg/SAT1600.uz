"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calculator, Check, X } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { PracticeProChecking, PracticeProPaywall } from "@/components/PracticeProPaywall";
import { getSubscriptionStatus } from "@/lib/api";

type Question = {
  prompt: string;
  choices: string[];
  answerIndex: number;
};

type Topic = {
  domain: string;
  title: string;
  slug: string;
  kind: "linear" | "systems" | "data" | "advanced" | "geometry";
};

type Difficulty = "foundations" | "medium" | "advanced";

const difficulties: { key: Difficulty; title: string; description: string }[] = [
  { key: "foundations", title: "Foundations", description: "Core SAT Math skills with direct numbers and one main step." },
  { key: "medium", title: "Medium", description: "Mixed reasoning with stronger traps and multi-step setup." },
  { key: "advanced", title: "Advanced", description: "Harder SAT-style drills for precision, modeling, and speed." }
];

const difficultyLabel: Record<Difficulty, string> = {
  foundations: "Foundations",
  medium: "Medium",
  advanced: "Advanced"
};

const topics: Topic[] = [
  { domain: "Algebra", title: "Solving linear equations and inequalities: advanced", slug: "linear-equations-inequalities", kind: "linear" },
  { domain: "Algebra", title: "Linear equation word problems: advanced", slug: "linear-equation-word-problems", kind: "linear" },
  { domain: "Algebra", title: "Linear relationship word problems: advanced", slug: "linear-relationship-word-problems", kind: "linear" },
  { domain: "Algebra", title: "Graphs of linear equations and functions: advanced", slug: "linear-equation-graphs", kind: "linear" },
  { domain: "Algebra", title: "Solving systems of linear equations: advanced", slug: "linear-systems", kind: "systems" },
  { domain: "Algebra", title: "Systems of linear equations word problems: advanced", slug: "systems-word-problems", kind: "systems" },
  { domain: "Algebra", title: "Linear inequality word problems: advanced", slug: "linear-inequality-word-problems", kind: "systems" },
  { domain: "Algebra", title: "Graphs of linear systems and inequalities: advanced", slug: "systems-inequalities-graphs", kind: "systems" },
  { domain: "Problem Solving and Data Analysis", title: "Ratios, rates, and proportions: advanced", slug: "ratios-rates-proportions", kind: "data" },
  { domain: "Problem Solving and Data Analysis", title: "Unit conversion: advanced", slug: "unit-conversion", kind: "data" },
  { domain: "Problem Solving and Data Analysis", title: "Percentages: advanced", slug: "percentages", kind: "data" },
  { domain: "Problem Solving and Data Analysis", title: "Center, spread, and shape of distributions: advanced", slug: "distributions", kind: "data" },
  { domain: "Problem Solving and Data Analysis", title: "Data representations: advanced", slug: "data-representations", kind: "data" },
  { domain: "Problem Solving and Data Analysis", title: "Scatterplots: advanced", slug: "scatterplots", kind: "data" },
  { domain: "Problem Solving and Data Analysis", title: "Linear and exponential growth: advanced", slug: "growth", kind: "data" },
  { domain: "Problem Solving and Data Analysis", title: "Probability and relative frequency: advanced", slug: "probability", kind: "data" },
  { domain: "Problem Solving and Data Analysis", title: "Data inferences: advanced", slug: "data-inferences", kind: "data" },
  { domain: "Problem Solving and Data Analysis", title: "Evaluating statistical claims: advanced", slug: "statistical-claims", kind: "data" },
  { domain: "Advanced Math", title: "Factoring quadratic and polynomial expressions: advanced", slug: "factoring-polynomials", kind: "advanced" },
  { domain: "Advanced Math", title: "Radicals and rational exponents: advanced", slug: "radicals-rational-exponents", kind: "advanced" },
  { domain: "Advanced Math", title: "Operations with polynomials: advanced", slug: "polynomial-operations", kind: "advanced" },
  { domain: "Advanced Math", title: "Operations with rational expressions: advanced", slug: "rational-expressions", kind: "advanced" },
  { domain: "Advanced Math", title: "Nonlinear functions: advanced", slug: "nonlinear-functions", kind: "advanced" },
  { domain: "Advanced Math", title: "Isolating quantities: advanced", slug: "isolating-quantities", kind: "advanced" },
  { domain: "Advanced Math", title: "Solving quadratic equations: advanced", slug: "quadratic-equations", kind: "advanced" },
  { domain: "Advanced Math", title: "Linear and quadratic systems: advanced", slug: "linear-quadratic-systems", kind: "advanced" },
  { domain: "Advanced Math", title: "Radical, rational, and absolute value equations: advanced", slug: "radical-rational-absolute", kind: "advanced" },
  { domain: "Advanced Math", title: "Quadratic and exponential word problems: advanced", slug: "quadratic-exponential-word-problems", kind: "advanced" },
  { domain: "Advanced Math", title: "Quadratic graphs: advanced", slug: "quadratic-graphs", kind: "advanced" },
  { domain: "Advanced Math", title: "Exponential graphs: advanced", slug: "exponential-graphs", kind: "advanced" },
  { domain: "Advanced Math", title: "Polynomial and other nonlinear graphs: advanced", slug: "nonlinear-graphs", kind: "advanced" },
  { domain: "Geometry and Trigonometry", title: "Area and volume: advanced", slug: "area-volume", kind: "geometry" },
  { domain: "Geometry and Trigonometry", title: "Congruence, similarity, and angle relationships: advanced", slug: "similarity-angles", kind: "geometry" },
  { domain: "Geometry and Trigonometry", title: "Right triangle trigonometry: advanced", slug: "right-triangle-trig", kind: "geometry" },
  { domain: "Geometry and Trigonometry", title: "Circle theorems: advanced", slug: "circle-theorems", kind: "geometry" },
  { domain: "Geometry and Trigonometry", title: "Unit circle trigonometry: advanced", slug: "unit-circle", kind: "geometry" },
  { domain: "Geometry and Trigonometry", title: "Circle equations: advanced", slug: "circle-equations", kind: "geometry" }
];

const q = (prompt: string, choices: string[], answerIndex: number): Question => ({ prompt, choices, answerIndex });

function topicTitle(topic: Topic, difficulty: Difficulty) {
  return topic.title.replace(/: advanced$/, `: ${difficulty}`);
}

function buildQuestions(topic: Topic, difficulty: Difficulty): Question[] {
  const offset = difficulty === "foundations" ? 1 : difficulty === "medium" ? 2 : 4;
  const n = (topics.findIndex((item) => item.slug === topic.slug) % 5) + offset;

  if (topic.kind === "linear") {
    return [
      q(`If ${n}(x - 3) + 2x = ${6 * n + 8}, what is the value of x?`, ["4", "5", "6", "8"], 1),
      q(`A line has slope ${n + 1} and passes through (2, ${2 * n + 5}). Which equation represents the line?`, [`y = ${n + 1}x + 3`, `y = ${n + 1}x - 1`, `y = ${n}x + 5`, `y = ${n + 2}x - 3`], 0),
      q(`For the function f(x) = ${n}x + ${n + 4}, f(a) = ${5 * n + 4}. What is a?`, ["3", "4", "5", "6"], 1),
      q(`Which value of x satisfies ${3 * n} - 2x > ${n + 4}?`, ["2", "5", "8", "11"], 0),
      q(`The table shows a linear function: x: 1, 2, 3 and y: ${n + 4}, ${2 * n + 4}, ${3 * n + 4}. What is the y-intercept?`, [`${n}`, "4", `${n + 4}`, `${2 * n}`], 1)
    ];
  }

  if (topic.kind === "systems") {
    return [
      q(`If x + y = ${n + 8} and x - y = ${n + 2}, what is x?`, [`${n + 3}`, `${n + 5}`, `${n + 6}`, `${2 * n + 10}`], 1),
      q(`A ticket costs $${n + 4} for students and $${n + 8} for adults. A group buys 10 tickets for $${10 * n + 56}. How many adult tickets were bought?`, ["3", "4", "5", "6"], 1),
      q(`Which ordered pair satisfies y = 2x + ${n} and y = -x + ${4 * n + 3}?`, [`(${n}, ${3 * n})`, `(${n + 1}, ${3 * n + 2})`, `(${n + 2}, ${3 * n + 4})`, `(${n + 3}, ${3 * n + 6})`], 1),
      q(`The solution to a system is the point where two lines intersect. If the lines are y = x + ${n} and y = ${2 * n + 2}, what is x?`, [`${n}`, `${n + 1}`, `${n + 2}`, `${2 * n + 2}`], 2),
      q(`A region is described by y > x + ${n} and y < ${2 * n + 7}. Which point is in the region?`, [`(1, ${n + 2})`, `(2, ${n + 2})`, `(3, ${2 * n + 8})`, `(4, ${n + 3})`], 0)
    ];
  }

  if (topic.kind === "data") {
    return [
      q(`A mixture uses ${n} cups of concentrate for every ${n + 3} cups of water. How many cups of water are needed for ${3 * n} cups of concentrate?`, [`${3 * n + 3}`, `${3 * n + 6}`, `${3 * n + 9}`, `${3 * n + 12}`], 2),
      q(`A value increases from ${20 * n} to ${25 * n}. What is the percent increase?`, ["20%", "25%", "30%", "40%"], 1),
      q(`The data set is ${n}, ${n + 2}, ${n + 4}, ${n + 8}, ${n + 11}. What is the median?`, [`${n + 2}`, `${n + 4}`, `${n + 5}`, `${n + 8}`], 1),
      q(`In a survey of ${50 * n} students, ${15 * n} chose math as their favorite subject. What fraction chose math?`, ["1/5", "3/10", "2/5", "1/2"], 1),
      q(`A model predicts y = ${n}(${2})^t. What is y when t = 3?`, [`${4 * n}`, `${6 * n}`, `${8 * n}`, `${10 * n}`], 2)
    ];
  }

  if (topic.kind === "advanced") {
    return [
      q(`Which expression is equivalent to x^2 + ${2 * n}x + ${n * n}?`, [`(x + ${n})^2`, `(x - ${n})^2`, `x(x + ${2 * n})`, `(x + ${2 * n})^2`], 0),
      q(`If g(x) = x^2 - ${n * n}, what are the zeros of g?`, [`-${n} and ${n}`, `0 and ${n}`, `${n} only`, `-${2 * n} and ${2 * n}`], 0),
      q(`Which expression is equivalent to (x^${2})(${n}x^3)?`, [`${n}x^5`, `${n}x^6`, `${n + 2}x^5`, `x^${2 * n + 3}`], 0),
      q(`If a = 3b + ${n}, which expression gives b in terms of a?`, [`(a - ${n})/3`, `(a + ${n})/3`, `3a - ${n}`, `a/(3 + ${n})`], 0),
      q(`For h(x) = (x - ${n})^2 + 4, what is the minimum value of h(x)?`, [`${n}`, "0", "4", `${n + 4}`], 2)
    ];
  }

  return [
    q(`A rectangle has length ${n + 7} and width ${n + 3}. What is its area?`, [`${n * n + 10 * n + 21}`, `${n * n + 9 * n + 21}`, `${2 * n + 10}`, `${4 * n + 20}`], 0),
    q(`A right triangle has legs ${3 * n} and ${4 * n}. What is the length of the hypotenuse?`, [`${5 * n}`, `${6 * n}`, `${7 * n}`, `${12 * n}`], 0),
    q(`Two similar triangles have corresponding side lengths ${n + 2} and ${2 * n + 4}. What is the scale factor from the smaller triangle to the larger triangle?`, ["1.5", "2", "2.5", "4"], 1),
    q(`A circle has equation (x - ${n})^2 + (y + 3)^2 = ${25}. What is its radius?`, ["3", "5", "10", "25"], 1),
    q(`In a circle, an arc measures 90 degrees. What fraction of the circumference is the arc?`, ["1/2", "1/3", "1/4", "1/6"], 2)
  ];
}

export default function MathPracticePage() {
  const [hasPro, setHasPro] = useState<boolean | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty | null>(null);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [confirmedAnswers, setConfirmedAnswers] = useState<(number | null)[]>([]);

  useEffect(() => {
    getSubscriptionStatus()
      .then((status) => setHasPro(status.has_active_subscription))
      .catch(() => setHasPro(false));
  }, []);

  const questions = useMemo(() => (activeTopic && activeDifficulty ? buildQuestions(activeTopic, activeDifficulty) : []), [activeTopic, activeDifficulty]);
  const currentQuestion = questions[questionIndex];
  const confirmedAnswer = confirmedAnswers[questionIndex];
  const score = confirmedAnswers.reduce<number>((total, answer, index) => {
    return total + (answer === questions[index]?.answerIndex ? 1 : 0);
  }, 0);
  const isFinished = Boolean(activeTopic && confirmedAnswers.length === questions.length);

  if (hasPro === null) {
    return <PracticeProChecking />;
  }

  if (!hasPro) {
    return <PracticeProPaywall title="SAT Math Practice is Pro-only." />;
  }

  function startTopic(topic: Topic) {
    setActiveTopic(topic);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setConfirmedAnswers([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmAnswer() {
    if (selectedAnswer === null || confirmedAnswer !== undefined) return;
    setConfirmedAnswers((answers) => {
      const next = [...answers];
      next[questionIndex] = selectedAnswer;
      return next;
    });
  }

  function nextQuestion() {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((index) => index + 1);
      setSelectedAnswer(null);
      return;
    }
    setQuestionIndex(questions.length - 1);
  }

  const groupedTopics = topics.reduce<Record<string, Topic[]>>((groups, topic) => {
    groups[topic.domain] = [...(groups[topic.domain] || []), topic];
    return groups;
  }, {});

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <Link className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-white/45 hover:text-white" href="/practice">
          <ArrowLeft size={16} /> Practice areas
        </Link>

        {!activeDifficulty ? (
          <>
            <div className="mt-8 border-b border-white/10 pb-10">
              <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">SAT Math practice</p>
              <h1 className="mt-5 max-w-5xl text-5xl font-light leading-none md:text-7xl">
                Choose your Math difficulty first.
              </h1>
              <p className="mt-6 max-w-3xl text-lg font-light leading-8 text-white/50">
                Start with Foundations, Medium, or Advanced. After that, choose the exact SAT Math question type.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {difficulties.map((difficulty) => (
                <button
                  className="group min-h-[260px] border border-white/10 bg-white/[0.025] p-6 text-left transition-colors hover:border-white/35 hover:bg-white hover:text-black"
                  key={difficulty.key}
                  onClick={() => setActiveDifficulty(difficulty.key)}
                  type="button"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/35 group-hover:text-black/40">Difficulty</p>
                  <h2 className="mt-6 text-4xl font-light">{difficulty.title}</h2>
                  <p className="mt-5 text-base leading-7 text-white/48 group-hover:text-black/58">{difficulty.description}</p>
                  <div className="mt-8 flex items-center justify-between border border-white/10 px-4 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-white/60 group-hover:border-black/15 group-hover:text-black">
                    Choose {difficulty.title} <ArrowRight size={17} />
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : !activeTopic ? (
          <>
            <div className="mt-8 border-b border-white/10 pb-10">
              <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">SAT Math practice</p>
              <h1 className="mt-5 max-w-5xl text-5xl font-light leading-none md:text-7xl">
                {difficultyLabel[activeDifficulty]} Math by question type.
              </h1>
              <p className="mt-6 max-w-3xl text-lg font-light leading-8 text-white/50">
                Choose one skill. Each set has 5 original SAT-style questions and gives only correct or wrong feedback.
              </p>
              <button
                className="mt-6 border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-white/60 hover:border-white/35 hover:text-white"
                onClick={() => {
                  setActiveDifficulty(null);
                  setActiveTopic(null);
                }}
                type="button"
              >
                Change difficulty
              </button>
            </div>

            <div className="mt-8 grid gap-6">
              {Object.entries(groupedTopics).map(([domain, domainTopics]) => (
                <section className="border border-white/10 bg-white/[0.025] p-5" key={domain}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center border border-white/10 bg-black/25 text-white/70">
                      <Calculator size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/38">Domain</p>
                      <h2 className="text-2xl font-light">{domain}</h2>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {domainTopics.map((topic) => (
                      <button
                        className="group min-h-[150px] border border-white/10 bg-black/20 p-4 text-left transition-colors hover:border-white/35 hover:bg-white hover:text-black"
                        key={topic.slug}
                        onClick={() => startTopic(topic)}
                        type="button"
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/35 group-hover:text-black/40">{difficultyLabel[activeDifficulty]} · 5 questions</p>
                        <h3 className="mt-4 text-xl font-light leading-tight">{topicTitle(topic, activeDifficulty)}</h3>
                        <div className="mt-5 flex items-center justify-between border border-white/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 group-hover:border-black/15 group-hover:text-black">
                          Start <ArrowRight size={16} />
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : (
          <section className="mt-8">
            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <aside className="border border-white/10 bg-white/[0.025] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/38">{activeTopic.domain}</p>
                <h1 className="mt-4 text-3xl font-light leading-tight">{topicTitle(activeTopic, activeDifficulty)}</h1>
                <div className="mt-6 grid grid-cols-5 gap-2">
                  {questions.map((item, index) => {
                    const answer = confirmedAnswers[index];
                    const isCorrect = answer === item.answerIndex;
                    return (
                      <button
                        className={`h-11 border text-sm font-black ${
                          index === questionIndex
                            ? "border-white bg-white text-black"
                            : answer === undefined
                              ? "border-white/15 text-white/45"
                              : isCorrect
                                ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
                                : "border-red-300/40 bg-red-300/10 text-red-200"
                        }`}
                        key={item.prompt}
                        onClick={() => {
                          setQuestionIndex(index);
                          setSelectedAnswer(null);
                        }}
                        type="button"
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="mt-6 w-full border border-white/15 px-4 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70 hover:border-white/35 hover:text-white"
                  onClick={() => setActiveTopic(null)}
                  type="button"
                >
                  Change topic
                </button>
                <button
                  className="mt-3 w-full border border-white/15 px-4 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70 hover:border-white/35 hover:text-white"
                  onClick={() => {
                    setActiveDifficulty(null);
                    setActiveTopic(null);
                  }}
                  type="button"
                >
                  Change difficulty
                </button>
              </aside>

              <div className="border border-white/10 bg-white/[0.035] p-5 md:p-8">
                {isFinished ? (
                  <div className="flex min-h-[430px] flex-col justify-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/45">Set complete</p>
                    <h2 className="mt-5 text-5xl font-light">Score: {score}/5</h2>
                    <p className="mt-5 max-w-2xl text-lg font-light leading-8 text-white/50">
                      This set is finished. Choose another topic or repeat this one for a cleaner score.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <button className="border border-white bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-black" onClick={() => startTopic(activeTopic)} type="button">
                        Repeat topic
                      </button>
                      <button className="border border-white/15 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70" onClick={() => setActiveTopic(null)} type="button">
                        All topics
                      </button>
                    </div>
                  </div>
                ) : currentQuestion ? (
                  <>
                    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/45">Question {questionIndex + 1} of 5</p>
                      {confirmedAnswer !== undefined && (
                        <div className={`flex items-center gap-2 border px-3 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                          confirmedAnswer === currentQuestion.answerIndex
                            ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-200"
                            : "border-red-300/35 bg-red-300/10 text-red-200"
                        }`}>
                          {confirmedAnswer === currentQuestion.answerIndex ? <Check size={16} /> : <X size={16} />}
                          {confirmedAnswer === currentQuestion.answerIndex ? "Correct" : "Wrong"}
                        </div>
                      )}
                    </div>

                    <p className="mt-8 max-w-4xl text-3xl font-light leading-snug">{currentQuestion.prompt}</p>

                    <div className="mt-8 grid gap-3">
                      {currentQuestion.choices.map((choice, index) => {
                        const isSelected = selectedAnswer === index;
                        const isConfirmed = confirmedAnswer !== undefined;
                        const isCorrect = currentQuestion.answerIndex === index;
                        return (
                          <button
                            className={`flex min-h-16 items-center gap-4 border px-5 py-4 text-left text-lg transition-colors ${
                              isConfirmed && isCorrect
                                ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-100"
                                : isConfirmed && isSelected
                                  ? "border-red-300/45 bg-red-300/10 text-red-100"
                                  : isSelected
                                    ? "border-white bg-white text-black"
                                    : "border-white/10 bg-black/20 text-white hover:border-white/35"
                            }`}
                            disabled={isConfirmed}
                            key={choice}
                            onClick={() => setSelectedAnswer(index)}
                            type="button"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current text-sm font-black">
                              {String.fromCharCode(65 + index)}
                            </span>
                            {choice}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                      {confirmedAnswer === undefined ? (
                        <button
                          className="border border-white bg-white px-7 py-4 text-xs font-black uppercase tracking-[0.22em] text-black disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={selectedAnswer === null}
                          onClick={confirmAnswer}
                          type="button"
                        >
                          Confirm answer
                        </button>
                      ) : (
                        <button
                          className="border border-white bg-white px-7 py-4 text-xs font-black uppercase tracking-[0.22em] text-black"
                          onClick={nextQuestion}
                          type="button"
                        >
                          {questionIndex === questions.length - 1 ? "Finish set" : "Next question"}
                        </button>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
