"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenText, Check, X } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";

type Question = {
  prompt: string;
  choices: string[];
  answerIndex: number;
};

type Topic = {
  domain: string;
  title: string;
  slug: string;
  focus: string;
};

type Difficulty = "foundations" | "medium" | "advanced";

const difficulties: { key: Difficulty; title: string; description: string }[] = [
  { key: "foundations", title: "Foundations", description: "Core reading skills: main idea, evidence, and literal support." },
  { key: "medium", title: "Medium", description: "SAT-level passages with tighter wording and stronger distractors." },
  { key: "advanced", title: "Advanced", description: "Harder inference, evidence, and cross-text traps for high-score practice." }
];

const difficultyLabel: Record<Difficulty, string> = {
  foundations: "Foundations",
  medium: "Medium",
  advanced: "Advanced"
};

const topics: Topic[] = [
  { domain: "Information and Ideas", title: "Central ideas and details: advanced", slug: "central-ideas", focus: "find the main claim without being pulled into a narrow detail" },
  { domain: "Information and Ideas", title: "Command of evidence: advanced", slug: "command-evidence", focus: "choose the evidence that most directly proves the claim" },
  { domain: "Information and Ideas", title: "Inference: advanced", slug: "inference", focus: "make only the conclusion the text fully supports" },
  { domain: "Craft and Structure", title: "Words in context: advanced", slug: "words-context", focus: "use surrounding logic to choose the precise meaning" },
  { domain: "Craft and Structure", title: "Text structure and purpose: advanced", slug: "text-structure", focus: "identify why a sentence or paragraph is included" },
  { domain: "Craft and Structure", title: "Cross-text connections: advanced", slug: "cross-text", focus: "compare how two authors agree, disagree, or qualify each other" }
];

const q = (prompt: string, choices: string[], answerIndex: number): Question => ({ prompt, choices, answerIndex });

function topicTitle(topic: Topic, difficulty: Difficulty) {
  return topic.title.replace(/: advanced$/, `: ${difficulty}`);
}

function buildQuestions(topic: Topic, difficulty: Difficulty): Question[] {
  if (topic.slug === "central-ideas") {
    return [
      q("A passage describes a city program that replaced several parking spaces with small public gardens. It notes that local businesses first opposed the plan, but sales later increased because more pedestrians visited the street. Which choice best states the main idea?", ["The program failed because business owners opposed it.", "Public gardens can change street use in ways that may benefit nearby businesses.", "Parking spaces are always less useful than gardens.", "Pedestrian traffic matters only in large cities."], 1),
      q("A text explains that a scientist repeated an old experiment with better instruments and found a smaller effect than earlier researchers had reported. What is the central point?", ["New tools can refine earlier scientific conclusions.", "Older experiments should be ignored.", "The scientist proved the effect never existed.", "Better instruments always create larger effects."], 0),
      q("A historian argues that trade routes spread not only goods but also measuring systems, legal customs, and building methods. Which statement best captures the main idea?", ["Trade routes influenced cultural and technical practices.", "Legal customs prevented long-distance trade.", "Building methods were the only thing carried by merchants.", "Goods became less important than laws."], 0),
      q("A passage says that some desert plants open pores at night rather than during the day, reducing water loss while still collecting carbon dioxide. What is the main idea?", ["Certain plants use timing to survive dry conditions.", "All plants collect carbon dioxide only at night.", "Desert plants avoid photosynthesis.", "Water loss is useful for desert plants."], 0),
      q("A text describes a museum changing labels to include the voices of community members connected to the objects. What is the central idea?", ["Museums can broaden interpretation by including community perspectives.", "Object labels should be removed from museums.", "Community members usually disagree with experts.", "Museums no longer need historical research."], 0)
    ];
  }

  if (topic.slug === "command-evidence") {
    return [
      q("Claim: The new library schedule made access more equal for working students. Which detail best supports the claim?", ["The library added evening hours twice a week.", "The library repainted the study rooms.", "The library bought new chairs.", "The library moved its fiction section."], 0),
      q("Claim: The researcher was cautious about the results. Which detail best supports the claim?", ["She described the findings as preliminary and called for a larger sample.", "She presented the findings at a conference.", "She used a spreadsheet to record data.", "She thanked her assistants."], 0),
      q("Claim: The festival helped small vendors reach new customers. Which evidence is strongest?", ["Most vendors reported that over half their buyers were first-time customers.", "The festival used a blue logo.", "The festival lasted two days.", "Vendors set up tables in rows."], 0),
      q("Claim: The species adapts quickly to changing temperatures. Which evidence best supports the claim?", ["Within three generations, the population showed higher survival in warmer water.", "The species lives in shallow water.", "Scientists observed the species in summer.", "The species has a short name."], 0),
      q("Claim: The author values precision over speed. Which detail best supports the claim?", ["The author revises each measurement twice before publishing it.", "The author works in a large office.", "The author began the project in June.", "The author uses a laptop."], 0)
    ];
  }

  if (topic.slug === "inference") {
    return [
      q("A researcher found that students who slept longer before a test tended to score higher, but she noted that study habits were not measured. What can reasonably be inferred?", ["Sleep may be related to scores, but the study cannot prove sleep caused the scores.", "Sleep definitely caused every score increase.", "Studying has no effect on test scores.", "Students who sleep less always fail."], 0),
      q("A text says a composer rarely performed publicly but regularly revised pieces after hearing musicians rehearse them. What is most supported?", ["The composer valued feedback from performers even without public performance.", "The composer disliked all musicians.", "The composer never changed written music.", "Public concerts were illegal."], 0),
      q("A city installed shaded bus stops, and ridership rose most sharply in summer. What inference is best supported?", ["Comfort in hot weather may have made buses more appealing.", "The city reduced bus service.", "Riders used buses only at night.", "Shade caused ticket prices to rise."], 0),
      q("A passage notes that an artist used inexpensive materials but spent months arranging them. What can be inferred?", ["The work's value depended partly on design and labor, not only material cost.", "The artist had no plan.", "Expensive materials are required for art.", "The work was made in one day."], 0),
      q("A study found birds nested earlier in warmer springs, but nesting success varied by food supply. Which inference is best?", ["Temperature affects timing, while food supply may affect outcomes.", "Food supply has no role.", "Birds always nest on the same day.", "Warmer springs prevent nesting."], 0)
    ];
  }

  if (topic.slug === "words-context") {
    return [
      q("In the sentence 'The committee tabled the proposal until more data arrived,' what does 'tabled' most nearly mean?", ["Postponed", "Displayed", "Measured", "Approved"], 0),
      q("In the sentence 'The new evidence tempered the team's confidence,' what does 'tempered' most nearly mean?", ["Reduced or moderated", "Destroyed completely", "Heated strongly", "Copied exactly"], 0),
      q("In the sentence 'The author's account is spare but vivid,' what does 'spare' most nearly mean?", ["Simple and not excessive", "Extra", "Weak", "Unrelated"], 0),
      q("In the sentence 'The policy was designed to curb waste,' what does 'curb' most nearly mean?", ["Limit", "Decorate", "Predict", "Trade"], 0),
      q("In the sentence 'The data bolstered the hypothesis,' what does 'bolstered' most nearly mean?", ["Strengthened", "Questioned", "Ignored", "Delayed"], 0)
    ];
  }

  if (topic.slug === "text-structure") {
    return [
      q("A paragraph first describes a common belief, then presents evidence that challenges it. What is the main purpose of the paragraph?", ["To revise an assumption", "To list unrelated facts", "To define a term by origin", "To advertise a product"], 0),
      q("A sentence gives a specific example after a broad claim. What is its likely function?", ["To illustrate the claim", "To contradict every previous sentence", "To introduce a new unrelated topic", "To summarize the whole passage"], 0),
      q("A passage opens with a problem and then describes two attempted solutions. What structure is being used?", ["Problem and response", "Chronology only", "Question and quotation", "Cause without effect"], 0),
      q("A final sentence points out a limitation of the study after reporting positive results. What is its purpose?", ["To qualify the conclusion", "To reject all data", "To change the subject", "To give a personal anecdote"], 0),
      q("A paragraph compares two translation methods and explains when each works best. What is its function?", ["To distinguish the uses of two approaches", "To prove translation is impossible", "To narrate a person's childhood", "To define a single word"], 0)
    ];
  }

  return [
    q("Text 1 argues that urban trees mainly reduce heat. Text 2 agrees but adds that trees also reduce stormwater runoff. How would Text 2 most likely respond to Text 1?", ["By accepting its claim while broadening the benefits discussed", "By denying that trees affect temperature", "By saying urban trees are harmful", "By replacing evidence with a personal story"], 0),
    q("Text 1 says a poem's repetition creates urgency. Text 2 says the same repetition creates uncertainty. What is the relationship?", ["They interpret the same feature differently.", "They discuss unrelated poems.", "They agree on every effect.", "Text 2 proves Text 1 used the wrong poem."], 0),
    q("Text 1 claims a fossil suggests migration. Text 2 says the fossil could also reflect local evolution. What does Text 2 do?", ["Offers an alternative explanation", "Confirms the migration claim without change", "Rejects fossil evidence entirely", "Discusses modern weather only"], 0),
    q("Text 1 praises a policy for efficiency. Text 2 notes that the policy may reduce community input. How are the texts related?", ["Text 2 raises a potential drawback to Text 1's positive view.", "Text 2 repeats Text 1 exactly.", "Both texts reject the policy.", "Neither text evaluates the policy."], 0),
    q("Text 1 emphasizes an invention's technical novelty. Text 2 emphasizes the social conditions that made it useful. How would Text 2 respond?", ["It would shift attention from the device alone to the context around it.", "It would say the invention never existed.", "It would deny that society matters.", "It would focus only on cost."], 0)
  ];
}

export default function ReadingPracticePage() {
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty | null>(null);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [confirmedAnswers, setConfirmedAnswers] = useState<(number | null)[]>([]);

  const questions = useMemo(() => (activeTopic && activeDifficulty ? buildQuestions(activeTopic, activeDifficulty) : []), [activeTopic, activeDifficulty]);
  const currentQuestion = questions[questionIndex];
  const confirmedAnswer = confirmedAnswers[questionIndex];
  const score = confirmedAnswers.reduce<number>((total, answer, index) => total + (answer === questions[index]?.answerIndex ? 1 : 0), 0);
  const isFinished = Boolean(activeTopic && confirmedAnswers.length === questions.length);

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
              <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">SAT Reading practice</p>
              <h1 className="mt-5 max-w-5xl text-5xl font-light leading-none md:text-7xl">Choose your Reading difficulty first.</h1>
              <p className="mt-6 max-w-3xl text-lg font-light leading-8 text-white/50">
                Pick Foundations, Medium, or Advanced, then train the exact Reading question type.
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
              <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">SAT Reading practice</p>
              <h1 className="mt-5 max-w-5xl text-5xl font-light leading-none md:text-7xl">{difficultyLabel[activeDifficulty]} Reading by question type.</h1>
              <p className="mt-6 max-w-3xl text-lg font-light leading-8 text-white/50">
                Each topic has 5 original SAT-style questions and only correct or wrong feedback.
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
                      <BookOpenText size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/38">Domain</p>
                      <h2 className="text-2xl font-light">{domain}</h2>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {domainTopics.map((topic) => (
                      <button className="group min-h-[170px] border border-white/10 bg-black/20 p-4 text-left transition-colors hover:border-white/35 hover:bg-white hover:text-black" key={topic.slug} onClick={() => startTopic(topic)} type="button">
                        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/35 group-hover:text-black/40">{difficultyLabel[activeDifficulty]} · 5 questions</p>
                        <h3 className="mt-4 text-xl font-light leading-tight">{topicTitle(topic, activeDifficulty)}</h3>
                        <p className="mt-3 text-sm leading-6 text-white/42 group-hover:text-black/55">{topic.focus}</p>
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
          <section className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
            <aside className="border border-white/10 bg-white/[0.025] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/38">{activeTopic.domain}</p>
              <h1 className="mt-4 text-3xl font-light leading-tight">{topicTitle(activeTopic, activeDifficulty)}</h1>
              <div className="mt-6 grid grid-cols-5 gap-2">
                {questions.map((item, index) => {
                  const answer = confirmedAnswers[index];
                  const isCorrect = answer === item.answerIndex;
                  return (
                    <button className={`h-11 border text-sm font-black ${index === questionIndex ? "border-white bg-white text-black" : answer === undefined ? "border-white/15 text-white/45" : isCorrect ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200" : "border-red-300/40 bg-red-300/10 text-red-200"}`} key={item.prompt} onClick={() => { setQuestionIndex(index); setSelectedAnswer(null); }} type="button">
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              <button className="mt-6 w-full border border-white/15 px-4 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70 hover:border-white/35 hover:text-white" onClick={() => setActiveTopic(null)} type="button">
                Change topic
              </button>
              <button className="mt-3 w-full border border-white/15 px-4 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70 hover:border-white/35 hover:text-white" onClick={() => { setActiveDifficulty(null); setActiveTopic(null); }} type="button">
                Change difficulty
              </button>
            </aside>

            <div className="border border-white/10 bg-white/[0.035] p-5 md:p-8">
              {isFinished ? (
                <div className="flex min-h-[430px] flex-col justify-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/45">Set complete</p>
                  <h2 className="mt-5 text-5xl font-light">Score: {score}/5</h2>
                  <p className="mt-5 max-w-2xl text-lg font-light leading-8 text-white/50">This {activeDifficulty} Reading set is finished.</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button className="border border-white bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-black" onClick={() => startTopic(activeTopic)} type="button">Repeat topic</button>
                    <button className="border border-white/15 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/70" onClick={() => setActiveTopic(null)} type="button">All topics</button>
                  </div>
                </div>
              ) : currentQuestion ? (
                <>
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/45">Question {questionIndex + 1} of 5</p>
                    {confirmedAnswer !== undefined && (
                      <div className={`flex items-center gap-2 border px-3 py-2 text-xs font-black uppercase tracking-[0.18em] ${confirmedAnswer === currentQuestion.answerIndex ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-200" : "border-red-300/35 bg-red-300/10 text-red-200"}`}>
                        {confirmedAnswer === currentQuestion.answerIndex ? <Check size={16} /> : <X size={16} />}
                        {confirmedAnswer === currentQuestion.answerIndex ? "Correct" : "Wrong"}
                      </div>
                    )}
                  </div>
                  <p className="mt-8 max-w-4xl text-2xl font-light leading-snug md:text-3xl">{currentQuestion.prompt}</p>
                  <div className="mt-8 grid gap-3">
                    {currentQuestion.choices.map((choice, index) => {
                      const isSelected = selectedAnswer === index;
                      const isConfirmed = confirmedAnswer !== undefined;
                      const isCorrect = currentQuestion.answerIndex === index;
                      return (
                        <button className={`flex min-h-16 items-center gap-4 border px-5 py-4 text-left text-lg transition-colors ${isConfirmed && isCorrect ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-100" : isConfirmed && isSelected ? "border-red-300/45 bg-red-300/10 text-red-100" : isSelected ? "border-white bg-white text-black" : "border-white/10 bg-black/20 text-white hover:border-white/35"}`} disabled={isConfirmed} key={choice} onClick={() => setSelectedAnswer(index)} type="button">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current text-sm font-black">{String.fromCharCode(65 + index)}</span>
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-8 flex justify-end">
                    {confirmedAnswer === undefined ? (
                      <button className="border border-white bg-white px-7 py-4 text-xs font-black uppercase tracking-[0.22em] text-black disabled:cursor-not-allowed disabled:opacity-40" disabled={selectedAnswer === null} onClick={confirmAnswer} type="button">Confirm answer</button>
                    ) : (
                      <button className="border border-white bg-white px-7 py-4 text-xs font-black uppercase tracking-[0.22em] text-black" onClick={nextQuestion} type="button">{questionIndex === questions.length - 1 ? "Finish set" : "Next question"}</button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
