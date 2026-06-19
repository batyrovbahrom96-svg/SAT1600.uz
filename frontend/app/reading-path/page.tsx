"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Lock, RotateCcw, Sparkles, Trophy, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type NodeStatus = "locked" | "current" | "completed";
type Stage = "concept" | "example" | "practice" | "complete";
type OptionKey = "A" | "B" | "C" | "D";
type ReadingTopic = "diagnostic" | "main-idea" | "words-context" | "inference" | "evidence" | "tone-purpose" | "transitions" | "synthesis" | "checkpoint" | "milestone" | "mock";

type ReadingNode = {
  id: string;
  title: string;
  subtitle: string;
  topic: ReadingTopic;
  icon: string;
  type: "lesson" | "checkpoint" | "milestone" | "mock";
};

type PracticeQuestion = {
  question_text: string;
  options: Record<OptionKey, string>;
  correct_answer: OptionKey;
  explanation: string;
  wrong_note: string;
  question_type: string;
  difficulty: "Easy" | "Medium" | "Hard";
};

type PathProgress = {
  completed: string[];
  xp: number;
  bestScores: Record<string, number>;
  attempts: Record<string, number>;
};

const lionLogo = "/assets/brand/sattest-lion-crest.png";
const storageKey = "sattest_reading_path_progress_v1";

const readingNodes: ReadingNode[] = [
  { id: "reading-diagnostic", title: "Reading Diagnostic", subtitle: "5 savol bilan darajani aniqlang", topic: "diagnostic", icon: "🎯", type: "lesson" },
  { id: "main-idea-basics", title: "Main Idea", subtitle: "Asoslar", topic: "main-idea", icon: "📖", type: "lesson" },
  { id: "main-idea-practice", title: "Main Idea", subtitle: "Amaliyot", topic: "main-idea", icon: "📖", type: "lesson" },
  { id: "checkpoint-1", title: "Checkpoint 1", subtitle: "Birinchi tekshiruv", topic: "checkpoint", icon: "⭐", type: "checkpoint" },
  { id: "words-context-basics", title: "Words in Context", subtitle: "Asoslar", topic: "words-context", icon: "🔤", type: "lesson" },
  { id: "words-context-practice", title: "Words in Context", subtitle: "Amaliyot", topic: "words-context", icon: "🔤", type: "lesson" },
  { id: "milestone-mini-mock", title: "Milestone", subtitle: "Mini Mock", topic: "milestone", icon: "🦁", type: "milestone" },
  { id: "inference-basics", title: "Inference", subtitle: "Asoslar", topic: "inference", icon: "🔍", type: "lesson" },
  { id: "inference-practice", title: "Inference", subtitle: "Amaliyot", topic: "inference", icon: "🔍", type: "lesson" },
  { id: "checkpoint-2", title: "Checkpoint 2", subtitle: "Dalil bilan tekshiruv", topic: "checkpoint", icon: "⭐", type: "checkpoint" },
  { id: "evidence-basics", title: "Evidence", subtitle: "Matndan dalil topish", topic: "evidence", icon: "📍", type: "lesson" },
  { id: "tone-purpose-basics", title: "Tone / Purpose", subtitle: "Muallif niyati", topic: "tone-purpose", icon: "🎭", type: "lesson" },
  { id: "transitions-basics", title: "Transitions", subtitle: "Mantiqiy bog'lanish", topic: "transitions", icon: "✍️", type: "lesson" },
  { id: "synthesis-basics", title: "Rhetorical Synthesis", subtitle: "Eslatmalarni birlashtirish", topic: "synthesis", icon: "🧩", type: "lesson" },
  { id: "reading-mini-mock", title: "Reading Mini Mock", subtitle: "Bosqich yakuni", topic: "mock", icon: "🏆", type: "mock" }
];

const conceptByTopic: Record<ReadingTopic, string[]> = {
  diagnostic: [
    "Bu qisqa diagnostika Reading bo'limidagi boshlang'ich nuqtangizni aniqlaydi.",
    "Savollar aralash bo'ladi: asosiy g'oya, kontekstdagi so'z, inference va transition.",
    "Maqsad tezlik emas, dalil bilan fikrlash odatini boshlash."
  ],
  "main-idea": [
    "MAIN IDEA savollarida butun matn nima haqida ekanini topasiz.",
    "Javob juda tor bo'lmasin: faqat bitta detalni emas, butun parchaning markaziy fikrini qamrashi kerak.",
    "Birinchi va oxirgi jumla ko'pincha yo'nalishni beradi, lekin javobni butun matn bilan tekshiring."
  ],
  "words-context": [
    "WORDS IN CONTEXT savollarida so'zning oddiy ma'nosini emas, matndagi vazifasini qidirasiz.",
    "Bo'sh joydan oldin va keyin kelgan fikrni o'qing.",
    "Har bir variantni gap ichiga qo'yib ko'ring va eng aniq, dalilli ma'noni tanlang."
  ],
  inference: [
    "INFERENCE savollari yashirin, lekin dalil bilan tasdiqlanadigan xulosani so'raydi.",
    "Javob matndan tashqariga chiqmasligi kerak.",
    "Agar variant uchun aniq dalil topilmasa, u SAT uchun xavfli variant."
  ],
  evidence: [
    "EVIDENCE savollarida variant shunchaki aloqador emas, claimni bevosita isbotlashi kerak.",
    "Eng yaxshi javob odatda claimdagi asosiy so'zlarni matndagi dalil bilan bog'laydi.",
    "Juda umumiy yoki juda tor dalillarni ehtiyot qiling."
  ],
  "tone-purpose": [
    "TONE va PURPOSE savollarida muallif nima qilayotganini topasiz: tushuntiryaptimi, tanqid qilyaptimi, taqqoslayaptimi?",
    "His-tuyg'u so'zlari, ehtiyotkor modal so'zlar va kontrast belgilariga qarang.",
    "Javob matn uslubiga mos bo'lishi kerak, sizning shaxsiy fikringizga emas."
  ],
  transitions: [
    "TRANSITIONS savollarida ikki fikr orasidagi mantiqiy munosabatni topasiz.",
    "Yo'nalish bir xil bo'lsa additionally/furthermore, qarama-qarshi bo'lsa however/nevertheless kerak bo'ladi.",
    "Avval munosabatni aniqlang, keyin variantni tanlang."
  ],
  synthesis: [
    "RHETORICAL SYNTHESIS savollarida berilgan eslatmalardan maqsadga eng mos jumla tuzasiz.",
    "Javob barcha kerakli eslatmalarni qamrashi va ortiqcha ma'lumot qo'shmasligi kerak.",
    "Savolda 'student wants to...' qismi eng muhim buyruqdir."
  ],
  checkpoint: [
    "Checkpoint oldingi darslardagi ko'nikmalarni aralashtirib tekshiradi.",
    "Har savolda avval turini aniqlang, keyin shu tur strategiyasini ishlating."
  ],
  milestone: [
    "Milestone kichik mock kabi ishlaydi.",
    "Bu joyda tezlik, dalil va aniqlik birga tekshiriladi."
  ],
  mock: [
    "Mini Mock Reading bosqichining yakuniy tekshiruvi.",
    "Savollar aralash, shuning uchun har biriga tur bo'yicha yondashing."
  ]
};

const workedExamples: Record<ReadingTopic, PracticeQuestion> = {
  diagnostic: example("A short study found that students who explained their wrong answers improved faster than students who only checked the correct option. Which choice best states the main idea?", { A: "Students should never review correct answers.", B: "Explaining mistakes can speed up learning.", C: "All students learn at the same pace.", D: "Correct options are impossible to understand." }, "B", "STEP 1: This is a Main Idea question. STEP 2: The whole sentence contrasts two review methods. STEP 3: The supported central point is that explaining mistakes improves learning speed.", "A is too extreme and not stated.", "Main Idea", "Easy"),
  "main-idea": example("Researchers compared two study methods: rereading notes and solving short practice sets. Students who practiced retrieval remembered more a week later. Which choice best states the central idea?", { A: "Rereading is always harmful.", B: "Practice sets can improve long-term memory.", C: "Students dislike taking practice tests.", D: "Researchers cannot measure memory." }, "B", "STEP 1: Identify the full claim. STEP 2: The evidence compares methods and shows better later memory. STEP 3: B covers the whole idea without exaggeration.", "A says always, which is too extreme.", "Main Idea", "Easy"),
  "words-context": example("The engineer exploited the metal's tendency to shift under stress, using that shift to measure hidden damage. Which word most nearly means exploited as used here?", { A: "ignored", B: "used strategically", C: "criticized", D: "defined again" }, "B", "STEP 1: This is Words in Context. STEP 2: The engineer used the tendency as a tool. STEP 3: 'Used strategically' is the precise contextual meaning.", "A is opposite because the engineer did not ignore the tendency.", "Words in Context", "Medium"),
  inference: example("The museum moved the painting away from direct sunlight after conservators noticed tiny cracks forming in the paint. What can reasonably be inferred?", { A: "Sunlight may damage the painting.", B: "The painting was recently created.", C: "The museum dislikes visitors.", D: "Conservators caused the cracks." }, "A", "STEP 1: The question asks for a supported inference. STEP 2: The museum acted after cracks appeared in sunlight. STEP 3: A is the careful conclusion supported by that action.", "B is not stated anywhere.", "Inference", "Medium"),
  evidence: example("A student claims that sleep helps memory. Which finding best supports the claim?", { A: "Students slept different numbers of hours.", B: "Students who slept eight hours recalled more words than those who slept four.", C: "Some students studied in the library.", D: "Memory tests can be difficult." }, "B", "STEP 1: Find direct proof. STEP 2: B connects sleep amount to memory performance. STEP 3: It directly supports the claim, not merely the topic.", "A mentions sleep but gives no memory result.", "Command of Evidence", "Medium"),
  "tone-purpose": example("The author calls the proposal 'promising but incomplete.' What best describes the author's attitude?", { A: "Carefully optimistic", B: "Openly furious", C: "Completely indifferent", D: "Unquestionably certain" }, "A", "STEP 1: Look for attitude words. STEP 2: 'Promising' is positive, 'incomplete' is cautious. STEP 3: Together they show careful optimism.", "B is too strong and negative.", "Tone/Attitude", "Medium"),
  transitions: example("The first experiment showed strong results. ______, the second experiment failed to reproduce them. Which transition best fits?", { A: "Similarly", B: "However", C: "For example", D: "Therefore" }, "B", "STEP 1: Identify the relationship. STEP 2: Strong results contrast with failed reproduction. STEP 3: 'However' signals contrast.", "A signals similarity, which is the wrong direction.", "Transition Words", "Easy"),
  synthesis: example("Notes: The novel was published in 1928. It uses multiple narrators. The student wants to emphasize narrative structure. Which sentence best uses the notes?", { A: "Published in 1928, the novel is notable for using multiple narrators.", B: "The novel was published a long time ago.", C: "Many novels have narrators.", D: "The author wrote several books." }, "A", "STEP 1: Read the student's goal: narrative structure. STEP 2: Select notes that support that goal. STEP 3: A combines date and multiple narrators without adding outside facts.", "B ignores narrative structure.", "Rhetorical Synthesis", "Hard"),
  checkpoint: example("Although the initial data were limited, the pattern appeared in three later studies. Which transition best introduces this sentence?", { A: "Nevertheless", B: "For instance", C: "Similarly", D: "In other words" }, "A", "STEP 1: Limited data contrasts with repeated later support. STEP 2: The relationship is concession/contrast. STEP 3: Nevertheless fits.", "B introduces an example, not a concession.", "Transition Words", "Medium"),
  milestone: example("The passage describes a scientist testing a tool, revising it, and then applying it successfully. What best describes the structure?", { A: "Problem, adjustment, successful application", B: "Chronological list of unrelated events", C: "Opinion followed by criticism only", D: "Definition of a single term" }, "A", "STEP 1: Structure asks how the passage is organized. STEP 2: The sequence moves from testing to revision to use. STEP 3: A captures the whole structure.", "B says unrelated, but the events are connected.", "Text Structure", "Medium"),
  mock: example("The author mentions a failed early trial primarily to:", { A: "show why the final method required revision", B: "prove the project was useless", C: "introduce an unrelated historical fact", D: "criticize all experiments" }, "A", "STEP 1: Purpose asks why this detail is included. STEP 2: A failed trial explains the need for revision. STEP 3: A states the function, not just the content.", "B is too extreme and unsupported.", "Purpose/Function", "Medium")
};

const practiceBank: Record<ReadingTopic, PracticeQuestion[]> = {
  diagnostic: [
    workedExamples["main-idea"],
    workedExamples["words-context"],
    workedExamples.inference,
    workedExamples.transitions,
    workedExamples.evidence
  ],
  "main-idea": [
    workedExamples["main-idea"],
    example("A passage explains how urban trees lower street temperatures, absorb stormwater, and improve air quality. Which choice best states the main idea?", { A: "Urban trees provide several practical benefits.", B: "Stormwater is impossible to manage.", C: "Cities should remove streets.", D: "Air quality matters only in rural areas." }, "A", "The whole passage lists multiple city benefits. A covers all of them without adding outside claims.", "B is too extreme and only touches one detail.", "Main Idea", "Easy"),
    example("A text describes a historian finding old letters, comparing them with public records, and revising a timeline. What is the central idea?", { A: "Public records are always false.", B: "New evidence can change historical understanding.", C: "Letters are never useful.", D: "Historians avoid timelines." }, "B", "The passage is about evidence changing a timeline. B expresses the complete central point.", "A is too extreme and unsupported.", "Main Idea", "Medium"),
    example("The author discusses a reef that recovered after fishing limits protected key species. What is the main idea?", { A: "Fishing limits can help ecosystems recover.", B: "All reefs recover quickly.", C: "Key species are unimportant.", D: "Fishing has no effect on reefs." }, "A", "The recovery happens after limits protected species, so A captures the central relationship.", "B overgeneralizes beyond the passage.", "Main Idea", "Medium"),
    example("A passage explains that small daily reviews are more effective than one long study session before a test. Which choice summarizes it best?", { A: "Short regular review improves retention.", B: "Tests should be cancelled.", C: "Long study sessions always fail.", D: "Daily routines are unrelated to learning." }, "A", "The passage compares review schedules and favors frequent review. A is precise and complete.", "C is too extreme.", "Main Idea", "Easy")
  ],
  "words-context": [
    workedExamples["words-context"],
    example("The committee tempered its recommendation after reviewing new safety data. As used here, tempered most nearly means:", { A: "heated", B: "moderated", C: "ignored", D: "copied" }, "B", "The new data caused the committee to make the recommendation less strong. 'Moderated' is the contextual meaning.", "A is the common physical meaning but does not fit the decision context.", "Words in Context", "Medium"),
    example("The data bolstered the scientist's claim. Bolstered most nearly means:", { A: "supported", B: "weakened", C: "questioned", D: "replaced" }, "A", "Data that bolsters a claim gives it support. The surrounding sentence shows evidence strengthening the claim.", "B is the opposite of the intended meaning.", "Words in Context", "Easy"),
    example("The artist's early sketches foreshadowed the style she later became known for. Foreshadowed most nearly means:", { A: "predicted or hinted at", B: "erased", C: "criticized", D: "sold" }, "A", "Early sketches pointed toward a later style. That is a hint of what comes later.", "B has no support in the sentence.", "Words in Context", "Medium"),
    example("The team's results contradicted the earlier theory. Contradicted most nearly means:", { A: "agreed with", B: "opposed", C: "explained again", D: "measured" }, "B", "Results that contradict a theory go against it. The word signals opposition.", "A is opposite.", "Words in Context", "Easy")
  ],
  inference: [
    workedExamples.inference,
    example("After the new bus route opened, library visits increased most among students without cars. What can be inferred?", { A: "Transportation access affected library use.", B: "Students stopped reading books.", C: "Cars became illegal.", D: "The library changed its hours." }, "A", "The group most helped by transit visited more, so access likely mattered.", "D is not mentioned.", "Inference", "Medium"),
    example("The plant grew faster in partial shade than in full sunlight. What is a reasonable inference?", { A: "This plant may not prefer constant direct sun.", B: "All plants hate sunlight.", C: "Shade contains fertilizer.", D: "The experiment failed." }, "A", "The result supports a cautious inference about this plant only.", "B overgeneralizes to all plants.", "Inference", "Easy"),
    example("A poet revised the same line twelve times before publication. What can be inferred?", { A: "The poet cared about precise wording.", B: "The poet never published work.", C: "The line was written by someone else.", D: "Revision is illegal." }, "A", "Repeated revision suggests attention to wording. That conclusion stays within the evidence.", "B contradicts publication.", "Inference", "Easy"),
    example("The device worked indoors but failed during heavy rain. What can be inferred?", { A: "Rain may interfere with the device.", B: "The device always works outside.", C: "Indoor tests are useless.", D: "The device measures rainfall." }, "A", "The change in conditions points to rain as a possible factor.", "B is contradicted by the failure.", "Inference", "Medium")
  ],
  evidence: [
    workedExamples.evidence,
    example("Which finding best supports the claim that practice with feedback improves accuracy?", { A: "Students practiced for different lengths of time.", B: "Students receiving feedback made fewer repeated errors.", C: "Some students preferred quiet rooms.", D: "Accuracy was measured on Friday." }, "B", "B directly connects feedback with fewer errors, proving the claim.", "A lacks an outcome connected to accuracy.", "Command of Evidence", "Medium"),
    example("Which quote best supports the idea that the material is durable?", { A: "It broke after one touch.", B: "It remained intact after repeated stress tests.", C: "It was blue and thin.", D: "It was invented in 2019." }, "B", "Remaining intact after repeated stress is direct evidence of durability.", "C describes appearance, not durability.", "Command of Evidence", "Easy"),
    example("Which finding would weaken the claim that the app improves vocabulary?", { A: "Users learned fewer new words than the control group.", B: "Users opened the app daily.", C: "The app has a simple design.", D: "The study included teenagers." }, "A", "A directly shows worse vocabulary results, weakening the claim.", "B is usage data, not learning outcome.", "Command of Evidence", "Hard"),
    example("Which result supports the claim that the treatment saves water?", { A: "Treated fields used 20% less irrigation with the same yield.", B: "Farmers liked the color of the treatment.", C: "Rainfall was measured in centimeters.", D: "The treatment was stored in boxes." }, "A", "A ties less water use to unchanged yield, directly supporting the claim.", "C is measurement context only.", "Command of Evidence", "Medium")
  ],
  "tone-purpose": [
    workedExamples["tone-purpose"],
    example("A passage says a policy is 'well-intended yet insufficient.' The tone is best described as:", { A: "Balanced and critical", B: "Joyfully celebratory", C: "Hostile without reason", D: "Completely neutral" }, "A", "Well-intended is positive, insufficient is critical, so the tone is balanced and critical.", "B misses the criticism.", "Tone/Attitude", "Medium"),
    example("The author includes a counterexample in order to:", { A: "qualify the original claim", B: "end the discussion immediately", C: "define an unrelated term", D: "hide the evidence" }, "A", "A counterexample limits or qualifies a claim. That is its function.", "B is unsupported.", "Purpose/Function", "Medium"),
    example("A text first describes a problem and then presents a tested solution. The purpose is mainly to:", { A: "explain how a solution addresses a problem", B: "list random facts", C: "reject all research", D: "entertain with fiction" }, "A", "The structure problem -> tested solution shows explanatory purpose.", "B ignores the organization.", "Purpose/Function", "Easy"),
    example("The author's attitude toward the discovery is best described as:", { A: "cautious interest", B: "complete rejection", C: "personal anger", D: "bored indifference" }, "A", "If the passage notes promise but calls for more study, cautious interest is the precise attitude.", "B is too negative.", "Tone/Attitude", "Medium")
  ],
  transitions: [
    workedExamples.transitions,
    example("The device is inexpensive to produce. ______, it can be repaired with common tools. Which transition fits?", { A: "Additionally", B: "However", C: "Instead", D: "Nevertheless" }, "A", "Both ideas are benefits in the same direction. Additionally fits.", "B signals contrast, which is wrong.", "Transition Words", "Easy"),
    example("The first survey suggested strong support. ______, a later survey found opinions were divided. Which transition fits?", { A: "For example", B: "However", C: "Therefore", D: "Similarly" }, "B", "The second sentence contrasts with the first. However is the correct direction.", "C suggests result, not contrast.", "Transition Words", "Medium"),
    example("The sample was too small to prove the claim. ______, the researchers described the findings as preliminary. Which transition fits?", { A: "Consequently", B: "Meanwhile", C: "For instance", D: "Likewise" }, "A", "Because the sample was small, the researchers treated results as preliminary. Consequently shows cause/effect.", "B suggests simultaneity, not logic.", "Transition Words", "Medium"),
    example("Many birds migrate at night. ______, some species use stars to navigate. Which transition fits?", { A: "For example", B: "Nevertheless", C: "Instead", D: "Therefore" }, "A", "The second sentence gives a specific example related to night migration.", "B suggests contrast that is not present.", "Transition Words", "Easy")
  ],
  synthesis: [
    workedExamples.synthesis,
    example("Notes: A researcher studies city noise. She measured bird songs before and after traffic restrictions. The student wants to emphasize the research method. Which sentence fits?", { A: "To study city noise, the researcher compared bird songs before and after traffic restrictions.", B: "Birds live in many cities.", C: "Traffic restrictions can be unpopular.", D: "The researcher enjoys music." }, "A", "A combines the topic and method. It fits the student's goal exactly.", "B ignores the method.", "Rhetorical Synthesis", "Hard"),
    example("Notes: The poem uses repetition. Repetition emphasizes the speaker's uncertainty. The student wants to explain technique and effect. Which choice fits?", { A: "The poem's repetition emphasizes the speaker's uncertainty.", B: "The poem is uncertain.", C: "Many poems use techniques.", D: "The speaker repeats a word." }, "A", "A includes both technique and effect, exactly matching the task.", "D includes technique but not effect.", "Rhetorical Synthesis", "Medium"),
    example("Notes: The device is lightweight. It costs little to manufacture. The student wants to highlight two advantages. Which choice fits?", { A: "The device is lightweight and inexpensive to manufacture.", B: "Manufacturing is a complex process.", C: "Lightweight devices vary in cost.", D: "The device was tested indoors." }, "A", "A synthesizes both advantages without adding outside information.", "D ignores both listed advantages.", "Rhetorical Synthesis", "Easy"),
    example("Notes: A mural was painted in 1934. It shows workers building a bridge. The student wants to describe subject and date. Which choice fits?", { A: "Painted in 1934, the mural shows workers building a bridge.", B: "The bridge was built by workers.", C: "Murals can be large.", D: "The artist used paint." }, "A", "A combines the date and subject in one accurate sentence.", "C is generic and ignores the notes.", "Rhetorical Synthesis", "Easy")
  ],
  checkpoint: [],
  milestone: [],
  mock: []
};

practiceBank.checkpoint = [...practiceBank["main-idea"], ...practiceBank["words-context"], ...practiceBank.transitions, ...practiceBank.inference];
practiceBank.milestone = [...practiceBank.evidence, ...practiceBank["tone-purpose"], ...practiceBank["words-context"], ...practiceBank.synthesis];
practiceBank.mock = [...practiceBank["main-idea"], ...practiceBank["words-context"], ...practiceBank.inference, ...practiceBank.evidence, ...practiceBank.transitions, ...practiceBank.synthesis];

export default function ReadingPathPage() {
  const { language } = useLanguage();
  const [progress, setProgress] = useState<PathProgress>({ completed: [], xp: 0, bestScores: {}, attempts: {} });
  const [activeNode, setActiveNode] = useState<ReadingNode | null>(null);
  const [stage, setStage] = useState<Stage>("concept");
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [selected, setSelected] = useState<OptionKey | null>(null);
  const [answers, setAnswers] = useState<OptionKey[]>([]);
  const [tooltip, setTooltip] = useState("");
  const [runSeed, setRunSeed] = useState(0);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) setProgress(JSON.parse(stored) as PathProgress);
    } catch {
      setProgress({ completed: [], xp: 0, bestScores: {}, attempts: {} });
    }
  }, []);

  function saveProgress(next: PathProgress) {
    setProgress(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  const currentNodeId = useMemo(() => readingNodes.find((node) => !progress.completed.includes(node.id))?.id || readingNodes[readingNodes.length - 1].id, [progress.completed]);
  const completedCount = progress.completed.length;
  const totalCount = readingNodes.length;
  const percent = Math.round((completedCount / totalCount) * 100);

  function nodeStatus(node: ReadingNode): NodeStatus {
    if (progress.completed.includes(node.id)) return "completed";
    if (node.id === currentNodeId) return "current";
    return "locked";
  }

  function openNode(node: ReadingNode) {
    const status = nodeStatus(node);
    if (status === "locked") {
      setTooltip("Avval oldingi darslarni tugating");
      window.setTimeout(() => setTooltip(""), 1800);
      return;
    }
    setActiveNode(node);
    setStage(status === "completed" ? "example" : "concept");
    setPracticeIndex(0);
    setSelected(null);
    setAnswers([]);
    setRunSeed((current) => current + 1);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-30 border-b border-[#0a0a0a] bg-[#FFD700] px-4 py-4 text-black">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link className="flex items-center gap-2 text-lg font-black tracking-[0.12em]" href={`/roadmap?lang=${language}`}>
            <ArrowLeft size={22} />
            READING BO'LIMI
          </Link>
          <div className="hidden text-sm font-black uppercase tracking-[0.16em] sm:block">Bosqich 1: Asoslar</div>
        </div>
      </header>

      <div className="sticky top-[57px] z-20 border-b border-white/10 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="h-2 rounded-full bg-white/10">
          <div className="h-2 rounded-full bg-[#FFD700]" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_280px]">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111] p-4 sm:p-8">
          {tooltip ? <div className="fixed left-1/2 top-24 z-50 -translate-x-1/2 rounded-full bg-[#FFD700] px-5 py-3 text-sm font-black text-black shadow-[0_0_28px_rgba(255,215,0,0.35)]">{tooltip}</div> : null}
          <div className="pointer-events-none absolute left-1/2 top-12 h-[calc(100%-96px)] w-px -translate-x-1/2 border-l-2 border-dashed border-white/12" />

          <div className="relative mx-auto grid max-w-3xl gap-9 py-4">
            {readingNodes.map((node, index) => (
              <PathNode key={node.id} node={node} index={index} status={nodeStatus(node)} onClick={() => openNode(node)} />
            ))}
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <div className="rounded-2xl border border-[#FFD700]/30 bg-[#151515] p-5">
            <div className="flex items-center gap-3">
              <Image className="h-14 w-14 rounded-full object-cover" src={lionLogo} alt="SATTEST lion crest" width={96} height={96} />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FFD700]">SATTEST Path</p>
                <h2 className="text-2xl font-black">Reading</h2>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-sm font-bold text-white/55">Yo'lda</span>
              <span className="text-xl font-black text-[#FFD700]">{completedCount}/{totalCount}</span>
            </div>
            <div className="mt-3 h-3 rounded-full bg-white/10">
              <div className="h-3 rounded-full bg-[#FFD700]" style={{ width: `${percent}%` }} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">XP</p>
            <p className="mt-2 text-4xl font-black text-[#FFD700]">{progress.xp}</p>
            <p className="mt-2 text-sm font-bold text-white/55">Har dars +10 XP, mukammal natija +5 bonus.</p>
          </div>

          <div className="rounded-2xl border border-[#FFD700]/30 bg-gradient-to-br from-[#FFD700] to-[#9f7f00] p-5 text-black">
            <p className="text-xs font-black uppercase tracking-[0.18em]">🦁 SATTEST PRO</p>
            <h3 className="mt-3 text-2xl font-black">Cheksiz yo'l + full mock tests</h3>
            <Link className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-black px-4 text-sm font-black text-[#FFD700]" href={`/pricing?lang=${language}`}>
              Try Pro →
            </Link>
          </div>
        </aside>
      </section>

      {activeNode ? (
        <LessonOverlay
          answers={answers}
          node={activeNode}
          practiceIndex={practiceIndex}
          progress={progress}
          questions={questionsForNode(activeNode, runSeed)}
          selected={selected}
          stage={stage}
          onAnswer={(answer) => {
            if (!selected) {
              setSelected(answer);
              setAnswers((current) => [...current, answer]);
            }
          }}
          onClose={() => setActiveNode(null)}
          onComplete={(passed, score, perfect) => {
            const attempts = (progress.attempts[activeNode.id] || 0) + 1;
            const nextProgress: PathProgress = {
              completed: passed && !progress.completed.includes(activeNode.id) ? [...progress.completed, activeNode.id] : progress.completed,
              xp: passed && !progress.completed.includes(activeNode.id) ? progress.xp + 10 + (perfect ? 5 : 0) : progress.xp,
              bestScores: { ...progress.bestScores, [activeNode.id]: Math.max(progress.bestScores[activeNode.id] || 0, score) },
              attempts: { ...progress.attempts, [activeNode.id]: attempts }
            };
            saveProgress(nextProgress);
          }}
          onNext={() => {
            const questions = questionsForNode(activeNode, runSeed);
            if (stage === "concept") setStage("example");
            else if (stage === "example") setStage("practice");
            else if (stage === "practice") {
              if (practiceIndex + 1 >= questions.length) setStage("complete");
              else {
                setPracticeIndex((current) => current + 1);
                setSelected(null);
              }
            }
          }}
          onRetry={() => {
            setStage("concept");
            setPracticeIndex(0);
            setSelected(null);
            setAnswers([]);
            setRunSeed((current) => current + 1);
          }}
        />
      ) : null}
    </main>
  );
}

function PathNode({ node, index, status, onClick }: { node: ReadingNode; index: number; status: NodeStatus; onClick: () => void }) {
  const left = index % 2 === 0;
  const isSpecial = node.type === "checkpoint" || node.type === "milestone" || node.type === "mock";
  return (
    <div className={`relative flex ${left ? "justify-start" : "justify-end"} sm:px-16`}>
      <button className={`group flex w-[calc(50%+28px)] min-w-0 items-center gap-4 ${left ? "flex-row" : "flex-row-reverse"} sm:w-[50%]`} onClick={onClick} type="button">
        <span
          className={[
            "relative z-10 grid h-16 w-16 shrink-0 place-items-center rounded-full border text-2xl font-black transition sm:h-20 sm:w-20",
            isSpecial ? "h-20 w-20 sm:h-24 sm:w-24" : "",
            status === "locked" ? "border-white/10 bg-[#2a2a2a] text-white/35 opacity-75" : "",
            status === "current" ? "animate-[readingPulse_2s_ease-in-out_infinite] border-[#FFD700] bg-[#FFD700] text-black shadow-[0_0_28px_rgba(255,215,0,0.5)]" : "",
            status === "completed" ? "border-[#FFD700] bg-[#FFD700] text-black" : ""
          ].join(" ")}
        >
          {status === "locked" ? <Lock size={24} /> : status === "completed" ? <Check size={28} /> : isSpecial ? <Image className="h-10 w-10 rounded-full object-cover" src={lionLogo} alt="lion milestone" width={72} height={72} /> : node.icon}
          {status === "current" ? <span className="absolute -top-8 rounded-full bg-[#FFD700] px-3 py-1 text-[10px] font-black tracking-[0.18em] text-black">BOSHLASH</span> : null}
        </span>
        <span className={`rounded-2xl border bg-[#151515] p-4 text-left transition group-hover:border-[#FFD700]/60 ${status === "current" ? "border-[#FFD700]/50" : "border-white/10"} ${status === "locked" ? "opacity-55" : ""}`}>
          <span className="block text-base font-black text-white">{node.title}</span>
          <span className="mt-1 block text-sm font-bold text-white/48">{node.subtitle}</span>
        </span>
      </button>
    </div>
  );
}

function LessonOverlay(props: {
  answers: OptionKey[];
  node: ReadingNode;
  practiceIndex: number;
  progress: PathProgress;
  questions: PracticeQuestion[];
  selected: OptionKey | null;
  stage: Stage;
  onAnswer: (answer: OptionKey) => void;
  onClose: () => void;
  onComplete: (passed: boolean, score: number, perfect: boolean) => void;
  onNext: () => void;
  onRetry: () => void;
}) {
  const { answers, node, practiceIndex, questions, selected, stage } = props;
  const currentQuestion = questions[practiceIndex];
  const correctCount = answers.filter((answer, index) => answer === questions[index]?.correct_answer).length;
  const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const passed = score >= 60;
  const perfect = score === 100;

  useEffect(() => {
    if (stage === "complete") props.onComplete(passed, score, perfect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/88 p-4 backdrop-blur">
      <div className={`mx-auto my-6 max-w-3xl rounded-2xl border border-[#FFD700]/30 bg-[#111] p-5 text-white shadow-[0_0_50px_rgba(255,215,0,0.12)] sm:p-8 ${selected === currentQuestion?.correct_answer ? "ring-2 ring-[#4ADE80]/40" : selected ? "ring-2 ring-[#F87171]/40" : ""}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFD700]">{node.title}</p>
            <h2 className="mt-2 text-3xl font-black">{stageTitle(stage)}</h2>
          </div>
          <button className="grid h-11 w-11 place-items-center rounded-full border border-white/10 text-white/60 hover:border-[#FFD700] hover:text-[#FFD700]" onClick={props.onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {stage === "concept" ? (
          <div className="mt-8">
            <div className="rounded-2xl border border-white/10 bg-[#151515] p-5">
              {conceptByTopic[node.topic].map((line) => (
                <p className="mb-4 text-lg font-bold leading-relaxed text-white/82 last:mb-0" key={line}>{line}</p>
              ))}
            </div>
            <GoldButton onClick={props.onNext}>Tushunarli, davom etamiz →</GoldButton>
          </div>
        ) : null}

        {stage === "example" ? (
          <QuestionView
            question={workedExamples[node.topic]}
            title="Worked Example"
            selected={workedExamples[node.topic].correct_answer}
            onAnswer={() => undefined}
            locked
          >
            <div className="mt-6 rounded-2xl border-l-4 border-[#FFD700] bg-[#2b260d] p-5">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#FFD700]">3-step thinking</p>
              <p className="mt-3 whitespace-pre-line text-base font-bold leading-relaxed text-white/85">{workedExamples[node.topic].explanation}</p>
            </div>
            <GoldButton onClick={props.onNext}>Keyingisiga o'tish →</GoldButton>
          </QuestionView>
        ) : null}

        {stage === "practice" ? (
          <QuestionView question={currentQuestion} title={`Savol ${practiceIndex + 1} / ${questions.length}`} selected={selected} onAnswer={props.onAnswer}>
            {selected ? (
              <div className={`mt-6 rounded-2xl border p-5 ${selected === currentQuestion.correct_answer ? "border-[#4ADE80]/45 bg-[#4ADE80]/10" : "border-[#F87171]/45 bg-[#F87171]/10"}`}>
                <p className="text-xl font-black">{selected === currentQuestion.correct_answer ? "✅ To'g'ri!" : "❌ Bunday emas"}</p>
                <p className="mt-2 text-base font-bold text-white/82">
                  {selected === currentQuestion.correct_answer ? currentQuestion.explanation : `${currentQuestion.wrong_note} To'g'ri javob: ${currentQuestion.correct_answer}. ${currentQuestion.explanation}`}
                </p>
                <GoldButton onClick={props.onNext}>Davom et →</GoldButton>
              </div>
            ) : null}
          </QuestionView>
        ) : null}

        {stage === "complete" ? (
          <div className="mt-8 text-center">
            {passed ? (
              <>
                <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#FFD700] text-black shadow-[0_0_35px_rgba(255,215,0,0.45)]"><Trophy size={42} /></div>
                <h3 className="mt-6 text-4xl font-black">✅ Daraja tugadi!</h3>
                <p className="mt-4 text-2xl font-black text-[#FFD700]">{correctCount}/{questions.length} to'g'ri — {score}%</p>
                <p className="mt-3 text-xl font-black">+10 XP {perfect ? "+5 bonus — Mukammal!" : ""}</p>
                <GoldButton onClick={props.onClose}>Davom etish →</GoldButton>
              </>
            ) : (
              <>
                <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-[#FFD700]/40 bg-[#151515] text-[#FFD700]"><RotateCcw size={42} /></div>
                <h3 className="mt-6 text-4xl font-black">Yana urinib ko'ramiz!</h3>
                <p className="mx-auto mt-4 max-w-lg text-lg font-bold text-white/68">Bu mavzuni mustahkamlash yordam beradi 💪 60% kerak, hozir {score}%.</p>
                <GoldButton onClick={props.onRetry}>Qayta Urinish →</GoldButton>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function QuestionView({ children, locked = false, onAnswer, question, selected, title }: { children: ReactNode; locked?: boolean; onAnswer: (answer: OptionKey) => void; question: PracticeQuestion; selected: OptionKey | null; title: string }) {
  return (
    <div className="mt-8">
      <div className="mb-5 h-2 rounded-full bg-white/10">
        <div className="h-2 w-2/3 rounded-full bg-[#FFD700]" />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFD700]">{title} • {question.question_type} • {question.difficulty}</p>
      <h3 className="mt-4 text-2xl font-black leading-tight">{question.question_text}</h3>
      <div className="mt-6 grid gap-3">
        {(Object.entries(question.options) as [OptionKey, string][]).map(([key, value]) => {
          const isCorrect = key === question.correct_answer;
          const isSelected = selected === key;
          return (
            <button
              className={[
                "min-h-14 rounded-xl border px-5 text-left text-lg font-black transition",
                selected || locked ? "cursor-default" : "hover:border-[#FFD700] hover:bg-[#FFD700]/5",
                isSelected && isCorrect ? "border-[#4ADE80] bg-[#4ADE80]/12 text-[#d8ffe5]" : "",
                isSelected && !isCorrect ? "border-[#F87171] bg-[#F87171]/12 text-[#ffe2e2]" : "",
                locked && isCorrect ? "border-[#4ADE80] bg-[#4ADE80]/12 text-[#d8ffe5]" : "",
                !isSelected && !(locked && isCorrect) ? "border-white/10 bg-[#151515] text-white" : ""
              ].join(" ")}
              disabled={Boolean(selected) || locked}
              key={key}
              onClick={() => onAnswer(key)}
              type="button"
            >
              {key}. {value} {((locked && isCorrect) || (isSelected && isCorrect)) ? "✅" : ""}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}

function GoldButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#FFD700] px-5 text-base font-black text-black transition hover:bg-white" onClick={onClick} type="button">
      {children}
      <ChevronRight size={20} />
    </button>
  );
}

function stageTitle(stage: Stage) {
  if (stage === "concept") return "Concept";
  if (stage === "example") return "Worked Example";
  if (stage === "practice") return "Practice";
  return "Level Complete";
}

function questionsForNode(node: ReadingNode, seed: number) {
  const source = practiceBank[node.topic].length ? practiceBank[node.topic] : practiceBank.diagnostic;
  const limit = node.topic === "diagnostic" ? 5 : node.type === "mock" ? 8 : 5;
  const offset = seed % source.length;
  const rotated = [...source.slice(offset), ...source.slice(0, offset)];
  return rotated.slice(0, limit);
}

function example(question_text: string, options: Record<OptionKey, string>, correct_answer: OptionKey, explanation: string, wrong_note: string, question_type: string, difficulty: PracticeQuestion["difficulty"]): PracticeQuestion {
  return { question_text, options, correct_answer, explanation, wrong_note, question_type, difficulty };
}
