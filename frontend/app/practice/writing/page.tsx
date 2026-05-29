"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, PenLine, X } from "lucide-react";
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

const topics: Topic[] = [
  { domain: "Expression of Ideas", title: "Transitions: advanced", slug: "transitions", focus: "choose the connector that matches the exact logical relationship" },
  { domain: "Expression of Ideas", title: "Rhetorical synthesis: advanced", slug: "rhetorical-synthesis", focus: "use notes only for the stated goal" },
  { domain: "Expression of Ideas", title: "Logical sequence: advanced", slug: "logical-sequence", focus: "place sentences where they strengthen flow" },
  { domain: "Standard English Conventions", title: "Boundaries: advanced", slug: "boundaries", focus: "separate or join clauses with correct punctuation" },
  { domain: "Standard English Conventions", title: "Form, structure, and sense: advanced", slug: "form-structure-sense", focus: "choose the grammatically complete and meaningful form" },
  { domain: "Standard English Conventions", title: "Verb tense and agreement: advanced", slug: "verb-agreement", focus: "match verbs to subjects, time, and surrounding context" }
];

const q = (prompt: string, choices: string[], answerIndex: number): Question => ({ prompt, choices, answerIndex });

function buildQuestions(topic: Topic): Question[] {
  if (topic.slug === "transitions") {
    return [
      q("The first map was accurate for coastal areas. _____, it left the interior almost blank because surveyors had not yet traveled there.", ["However", "For example", "Similarly", "Therefore"], 0),
      q("The device is small enough to fit in a pocket. _____, it can record high-quality audio for six hours.", ["Moreover", "Instead", "Nevertheless", "In contrast"], 0),
      q("The study used a small sample. _____, its findings should be treated as preliminary.", ["Therefore", "Meanwhile", "For instance", "Likewise"], 0),
      q("Some critics praised the novel's structure. _____, others argued that the shifting timeline made the plot hard to follow.", ["By contrast", "Consequently", "In addition", "For this reason"], 0),
      q("The team first tested the material in dry conditions. _____, they repeated the test in high humidity.", ["Next", "Although", "For example", "Nevertheless"], 0)
    ];
  }

  if (topic.slug === "rhetorical-synthesis") {
    return [
      q("Notes: The mural was painted in 1984. It covers a library wall. It shows local workers. Goal: emphasize the mural's connection to community history. Which sentence best uses the notes?", ["Painted in 1984 on a library wall, the mural connects to community history by portraying local workers.", "The mural is on a wall and was painted in 1984.", "Libraries often display murals and other public art.", "The mural is large and colorful."], 0),
      q("Notes: The app tracks bus arrivals. It uses live GPS data. Riders can set alerts. Goal: explain one practical benefit for riders. Which choice works best?", ["Because the app uses live GPS data, riders can set alerts for approaching buses.", "The app has GPS data and was designed for buses.", "Many cities use buses as public transportation.", "The app was released after testing."], 0),
      q("Notes: Dr. Chen studies soil microbes. Her team sampled farms for five years. They found microbes that improve drought resistance. Goal: describe the research finding. Which choice works best?", ["After five years of farm sampling, Dr. Chen's team identified soil microbes linked to better drought resistance.", "Dr. Chen studies soil microbes on farms.", "Farms often experience dry seasons.", "The research team worked for five years."], 0),
      q("Notes: A student club collected coats. The drive lasted three weeks. It served families in winter. Goal: highlight the purpose of the drive. Which sentence works best?", ["The three-week coat drive was organized to help families during winter.", "The club collected coats for three weeks.", "Coats can be made from many materials.", "The student club met after school."], 0),
      q("Notes: The telescope is portable. It weighs 4 pounds. It magnifies distant objects. Goal: emphasize convenience. Which choice works best?", ["At only 4 pounds, the portable telescope is easy to carry while observing distant objects.", "The telescope magnifies distant objects.", "Some telescopes are used by scientists.", "The telescope has several parts."], 0)
    ];
  }

  if (topic.slug === "logical-sequence") {
    return [
      q("Which sentence should come first in a paragraph about a new recycling process?", ["Engineers recently developed a process that separates mixed plastics more efficiently.", "This improvement reduced sorting time by 30 percent.", "As a result, the facility accepted more materials.", "The city later expanded the program."], 0),
      q("A paragraph explains how a seed becomes a plant. Which sentence best follows 'The seed absorbs water from the soil'?", ["The outer coat softens, allowing the first root to emerge.", "Many gardens contain several kinds of flowers.", "Some seeds are sold in paper packets.", "The plant may later produce fruit."], 0),
      q("Which sentence best concludes a paragraph about a failed bridge design?", ["The collapse showed that small calculation errors can have major consequences.", "The bridge was painted gray.", "Many bridges cross rivers.", "Engineers use computers."], 0),
      q("A paragraph compares two methods, then gives their shared limitation. Which sentence should come last?", ["Both methods, however, require expensive equipment.", "The first method is faster.", "The second method is more precise.", "Researchers tested both methods."], 0),
      q("Which sentence best introduces a contrast?", ["Unlike the earlier model, the new model performs well in low light.", "The model has a metal case.", "The earlier model was released in May.", "Many users tested the model."], 0)
    ];
  }

  if (topic.slug === "boundaries") {
    return [
      q("Which choice completes the sentence correctly? The experiment was difficult _____ the results were reliable.", ["; however,", ", however", "however", ", however,"], 0),
      q("Which choice completes the sentence correctly? The artist sketched the design, _____ later she carved it into wood.", ["and", "and,", "; and", ", and,"], 0),
      q("Which choice completes the sentence correctly? The river flooded the lower fields _____ the upper fields remained dry.", ["; the", ", the", "the", ": the"], 0),
      q("Which choice completes the sentence correctly? The book contains three maps _____ each one shows a different trade route.", ["; each", ", each", "each", "and each,"], 0),
      q("Which sentence is punctuated correctly?", ["The sensor failed, so the team repeated the trial.", "The sensor failed so, the team repeated the trial.", "The sensor failed, the team repeated the trial.", "The sensor failed the team repeated the trial."], 0)
    ];
  }

  if (topic.slug === "form-structure-sense") {
    return [
      q("Which choice completes the sentence correctly? The committee _____ the proposal before voting.", ["reviewed", "reviewing", "to review", "reviews it was"], 0),
      q("Which choice completes the sentence correctly? Built in 1910, the station _____ a major landmark.", ["remains", "remaining", "to remain", "remain"], 0),
      q("Which choice completes the sentence correctly? The samples, which were collected in July, _____ in a secure cabinet.", ["were stored", "storing", "to store", "stores"], 0),
      q("Which choice completes the sentence correctly? The students designed a robot _____ can sort recyclable materials.", ["that", "and it", "it", "which it"], 0),
      q("Which choice completes the sentence correctly? Before publishing the report, the analyst _____ every calculation.", ["checked", "checking", "to check", "was check"], 0)
    ];
  }

  return [
    q("Which choice completes the sentence correctly? Neither the coach nor the players _____ satisfied with the final score.", ["were", "was", "is", "has been"], 0),
    q("Which choice completes the sentence correctly? The collection of essays _____ several topics in environmental history.", ["covers", "cover", "have covered", "were covering"], 0),
    q("Which choice completes the sentence correctly? By the time the lecture began, the students _____ the assigned article.", ["had read", "readed", "have read tomorrow", "reading"], 0),
    q("Which choice completes the sentence correctly? The data from the two trials _____ consistent.", ["are", "is", "was", "has been"], 0),
    q("Which choice completes the sentence correctly? Each of the paintings _____ a different technique.", ["uses", "use", "were using", "have used"], 0)
  ];
}

export default function WritingPracticePage() {
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [confirmedAnswers, setConfirmedAnswers] = useState<(number | null)[]>([]);

  const questions = useMemo(() => (activeTopic ? buildQuestions(activeTopic) : []), [activeTopic]);
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

        {!activeTopic ? (
          <>
            <div className="mt-8 border-b border-white/10 pb-10">
              <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">SAT Writing practice</p>
              <h1 className="mt-5 max-w-5xl text-5xl font-light leading-none md:text-7xl">Advanced Writing by question type.</h1>
              <p className="mt-6 max-w-3xl text-lg font-light leading-8 text-white/50">
                Only advanced drills. Each topic has 5 original SAT-style questions and only correct or wrong feedback.
              </p>
            </div>

            <div className="mt-8 grid gap-6">
              {Object.entries(groupedTopics).map(([domain, domainTopics]) => (
                <section className="border border-white/10 bg-white/[0.025] p-5" key={domain}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center border border-white/10 bg-black/25 text-white/70">
                      <PenLine size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/38">Domain</p>
                      <h2 className="text-2xl font-light">{domain}</h2>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {domainTopics.map((topic) => (
                      <button className="group min-h-[170px] border border-white/10 bg-black/20 p-4 text-left transition-colors hover:border-white/35 hover:bg-white hover:text-black" key={topic.slug} onClick={() => startTopic(topic)} type="button">
                        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/35 group-hover:text-black/40">Advanced · 5 questions</p>
                        <h3 className="mt-4 text-xl font-light leading-tight">{topic.title}</h3>
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
              <h1 className="mt-4 text-3xl font-light leading-tight">{activeTopic.title}</h1>
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
            </aside>

            <div className="border border-white/10 bg-white/[0.035] p-5 md:p-8">
              {isFinished ? (
                <div className="flex min-h-[430px] flex-col justify-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/45">Set complete</p>
                  <h2 className="mt-5 text-5xl font-light">Score: {score}/5</h2>
                  <p className="mt-5 max-w-2xl text-lg font-light leading-8 text-white/50">This advanced Writing set is finished.</p>
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
