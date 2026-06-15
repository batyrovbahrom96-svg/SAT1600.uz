export const FULL_MOCK_PROGRESS_KEY = "sattest_full_mock_progress";
export const FULL_MOCK_RESULTS_KEY = "sattest_full_mock_results";

export type FullMockSection = "rw" | "math";
export type FullMockModuleNumber = 1 | 2 | 3 | 4;
export type FullMockChoice = { label: "A" | "B" | "C" | "D"; text: string };

export type FullMockQuestion = {
  id: string;
  section: FullMockSection;
  module: FullMockModuleNumber;
  variant: "core" | "easy" | "hard";
  topic: string;
  difficulty: "easy" | "medium" | "medium-hard" | "hard" | "very-hard";
  trapType: string;
  passage?: string;
  prompt: string;
  choices: FullMockChoice[];
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
};

export type FullMockProgress = {
  startedAt: number;
  currentModule: FullMockModuleNumber;
  currentQuestion: number;
  answers: Record<string, string>;
  moduleScores: Record<string, number>;
  email: string | null;
  moduleStartedAt?: number;
  moduleEndsAt?: number;
  moduleVariants?: Partial<Record<FullMockModuleNumber, "core" | "easy" | "hard">>;
  completedModules?: number[];
};

export type FullMockResult = {
  completedAt: number;
  totalScore: number;
  rwScore: number;
  mathScore: number;
  weakAreas: string[];
  trapTypes: string[];
  answers: Array<{
    questionId: string;
    selectedAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    topic: string;
    trapType: string;
    explanation: string;
    question: FullMockQuestion;
  }>;
  topicAccuracy: Array<{ topic: string; correct: number; total: number; percent: number }>;
  email: string | null;
  paid: boolean;
};

export const FULL_MOCK_MODULES: Record<FullMockModuleNumber, { title: string; section: FullMockSection; questionCount: number; seconds: number }> = {
  1: { title: "Reading & Writing Module 1", section: "rw", questionCount: 27, seconds: 32 * 60 },
  2: { title: "Reading & Writing Module 2", section: "rw", questionCount: 27, seconds: 32 * 60 },
  3: { title: "Math Module 1", section: "math", questionCount: 22, seconds: 35 * 60 },
  4: { title: "Math Module 2", section: "math", questionCount: 22, seconds: 35 * 60 },
};

const rwTopics = [
  "Words in Context",
  "Command of Evidence",
  "Main Idea",
  "Transitions",
  "Rhetorical Synthesis",
  "Grammar Precision",
  "Dual Text Reasoning",
  "Text Structure",
  "Quantitative Evidence",
];

const mathTopics = [
  "Linear Equations",
  "Systems of Equations",
  "Quadratics",
  "Functions",
  "Circle Equations",
  "Exponential Models",
  "Ratios and Percentages",
  "Advanced Algebra",
];

const rwPrompts = [
  {
    topic: "Words in Context",
    trapType: "similar-sounding word",
    prompt: 'As used in the text, what does "clear" most nearly mean?',
    passage: "The researcher made the relationship clear by comparing two groups under the same conditions.",
    choices: ["transparent", "simple", "obvious", "understandable"],
    correctAnswer: "D",
    explanation: "In this sentence, clear means easy to understand, not physically transparent.",
  },
  {
    topic: "Command of Evidence",
    trapType: "unsupported evidence",
    prompt: "Which choice best supports the claim that the program improved accuracy over time?",
    passage: "Students first averaged 58% on mixed practice. After two weeks of review and retakes, the same group averaged 74% on a comparable set.",
    choices: [
      "Students practiced every day.",
      "The average increased from 58% to 74% on comparable work.",
      "The program included review.",
      "Some students took retakes.",
    ],
    correctAnswer: "B",
    explanation: "The score increase on comparable work directly supports improvement.",
  },
  {
    topic: "Main Idea",
    trapType: "too narrow",
    prompt: "Which choice best states the main idea of the text?",
    passage: "Many cities plant trees for beauty, but the practical benefits are larger: shade reduces heat, roots slow runoff, and green streets can improve walking conditions.",
    choices: [
      "Trees are mainly decorative.",
      "Urban trees provide several practical benefits beyond appearance.",
      "Runoff is the biggest urban problem.",
      "Walking conditions depend only on shade.",
    ],
    correctAnswer: "B",
    explanation: "The passage lists multiple practical benefits, not one narrow effect.",
  },
  {
    topic: "Transitions",
    trapType: "wrong relationship",
    prompt: "Which transition best completes the text?",
    passage: "The first trial produced inconsistent results. _____, the second trial used a larger sample and tighter controls.",
    choices: ["Similarly", "For example", "Therefore", "In contrast"],
    correctAnswer: "D",
    explanation: "The second trial differs from the first, so contrast is required.",
  },
  {
    topic: "Rhetorical Synthesis",
    trapType: "wrong goal",
    prompt: "The student wants to emphasize a contrast between two findings. Which choice best uses the notes?",
    passage: "Notes: Study A found that short breaks improved focus. Study B found that breaks longer than 20 minutes reduced return-to-task speed.",
    choices: [
      "Both studies examined student focus and break length.",
      "Although short breaks improved focus, breaks longer than 20 minutes slowed students' return to work.",
      "Study A was about focus, and Study B was about speed.",
      "Researchers often study breaks in learning environments.",
    ],
    correctAnswer: "B",
    explanation: "Choice B directly contrasts the positive effect of short breaks with the negative effect of longer breaks.",
  },
  {
    topic: "Grammar Precision",
    trapType: "tense mismatch",
    prompt: "Which choice completes the text so that it conforms to Standard English?",
    passage: "Although the Dust Bowl was a period of severe drought during the 1930s, dust storms often _____ over 100 million acres of land.",
    choices: ["affected", "will have affected", "are affecting", "will affect"],
    correctAnswer: "A",
    explanation: "The sentence describes a past historical period, so simple past is correct.",
  },
  {
    topic: "Dual Text Reasoning",
    trapType: "confused disagreement",
    prompt: "Based on the texts, how would Author 2 most likely respond to Author 1?",
    passage: "Text 1: Online archives mainly help experts because documents require special training to interpret. Text 2: Online archives help the public too because guided labels can make complex documents usable.",
    choices: [
      "By agreeing that archives should remain limited to experts",
      "By arguing that guided labels can make archives useful to nonexperts",
      "By claiming that labels make archives less accurate",
      "By saying experts should stop using archives",
    ],
    correctAnswer: "B",
    explanation: "Author 2 disagrees by saying public access can work when labels guide readers.",
  },
  {
    topic: "Text Structure",
    trapType: "function error",
    prompt: "What is the main purpose of the second sentence?",
    passage: "Early battery designs stored little energy. By contrast, newer lithium-ion designs hold more charge while weighing less.",
    choices: [
      "To introduce an opposing claim",
      "To define a technical term",
      "To show an improvement over earlier designs",
      "To question the value of batteries",
    ],
    correctAnswer: "C",
    explanation: "The second sentence contrasts newer batteries with earlier weaker designs.",
  },
  {
    topic: "Quantitative Evidence",
    trapType: "misread data",
    prompt: "Which statement is supported by the data?",
    passage: "Table: Club members in 2024 - Debate 32, Robotics 48, Music 40.",
    choices: [
      "Robotics had the most members.",
      "Debate had more members than Music.",
      "Music and Debate had the same membership.",
      "Robotics had fewer than 40 members.",
    ],
    correctAnswer: "A",
    explanation: "Robotics has 48 members, the highest number in the table.",
  },
];

const mathPrompts = [
  {
    topic: "Linear Equations",
    trapType: "operation reversal",
    prompt: "If 3x + 7 = 28, what is the value of x?",
    choices: ["5", "7", "9", "11"],
    correctAnswer: "B",
    explanation: "Subtract 7 to get 3x = 21, so x = 7.",
  },
  {
    topic: "Systems of Equations",
    trapType: "substitution error",
    prompt: "If y = x + 3 and y = 2x - 5, what is x?",
    choices: ["4", "6", "8", "10"],
    correctAnswer: "C",
    explanation: "Set x + 3 = 2x - 5, so x = 8.",
  },
  {
    topic: "Quadratics",
    trapType: "factoring trap",
    prompt: "What are the solutions to x^2 - 5x + 6 = 0?",
    choices: ["1 and 6", "2 and 3", "-2 and -3", "-1 and -6"],
    correctAnswer: "B",
    explanation: "The quadratic factors as (x - 2)(x - 3), so x = 2 or 3.",
  },
  {
    topic: "Functions",
    trapType: "input-output swap",
    prompt: "If f(x) = 2x^2 - 1, what is f(3)?",
    choices: ["11", "15", "17", "18"],
    correctAnswer: "C",
    explanation: "f(3) = 2(9) - 1 = 17.",
  },
  {
    topic: "Circle Equations",
    trapType: "radius squared",
    prompt: "The circle (x - 2)^2 + (y + 1)^2 = 25 has radius",
    choices: ["5", "10", "25", "50"],
    correctAnswer: "A",
    explanation: "The right side is r^2, so r = 5.",
  },
  {
    topic: "Exponential Models",
    trapType: "percent direction",
    prompt: "A value increases by 12% each year. Which expression gives the value after t years if the initial value is 80?",
    choices: ["80(0.12)^t", "80(1.12)^t", "80 + 12t", "80(0.88)^t"],
    correctAnswer: "B",
    explanation: "A 12% increase multiplies by 1.12 each year.",
  },
  {
    topic: "Ratios and Percentages",
    trapType: "base percent error",
    prompt: "A price of 240 is reduced by 25%. What is the new price?",
    choices: ["60", "120", "180", "215"],
    correctAnswer: "C",
    explanation: "25% of 240 is 60, so the new price is 180.",
  },
  {
    topic: "Advanced Algebra",
    trapType: "distribution error",
    prompt: "If 2(a + 4) = 18, what is a?",
    choices: ["5", "7", "9", "11"],
    correctAnswer: "A",
    explanation: "Divide by 2 to get a + 4 = 9, so a = 5.",
  },
];

const hardItems: FullMockQuestion[] = [
  {
    id: "rw2-hard-19",
    section: "rw",
    module: 2,
    variant: "hard",
    topic: "Rhetorical Synthesis",
    difficulty: "medium-hard",
    trapType: "wrong synthesis goal",
    passage: "Notes: Dr. Kim studied urban gardens in Seoul. Gardens lowered nearby surface temperatures by 1.8 C. Gardens with tree cover had the strongest effect. The student wants to emphasize the condition that made the effect strongest.",
    prompt: "Which choice best accomplishes the student's goal?",
    choices: [
      { label: "A", text: "Dr. Kim studied urban gardens in Seoul and measured surface temperatures." },
      { label: "B", text: "Urban gardens lowered nearby surface temperatures, especially when they included tree cover." },
      { label: "C", text: "The study found that some gardens changed surface temperatures by 1.8 C." },
      { label: "D", text: "Urban gardens are often studied because cities can become hot in summer." },
    ],
    correctAnswer: "B",
    explanation: "Choice B includes both the result and the condition that strengthened it.",
  },
  {
    id: "rw2-hard-20",
    section: "rw",
    module: 2,
    variant: "hard",
    topic: "Dual Text Reasoning",
    difficulty: "medium-hard",
    trapType: "missed point of disagreement",
    passage: "Text 1: Museum audio guides reduce careful looking because visitors focus on narration instead of visual details. Text 2: Audio guides can deepen looking when they ask visitors to inspect specific visual evidence before giving interpretation.",
    prompt: "What is the main point of disagreement between the authors?",
    choices: [
      { label: "A", text: "Whether museums should display visual art" },
      { label: "B", text: "Whether audio guides necessarily reduce visitors' attention to visual details" },
      { label: "C", text: "Whether visitors prefer audio or written labels" },
      { label: "D", text: "Whether interpretation is possible without trained experts" },
    ],
    correctAnswer: "B",
    explanation: "Text 1 says guides reduce looking; Text 2 says guides can improve looking if designed well.",
  },
  {
    id: "math2-hard-19",
    section: "math",
    module: 4,
    variant: "hard",
    topic: "Systems of Equations",
    difficulty: "medium-hard",
    trapType: "linear-quadratic substitution",
    passage: "A line and a parabola intersect at two points.",
    prompt: "If y = x + 2 and y = x^2 - 4, what is the positive x-coordinate of an intersection point?",
    choices: [
      { label: "A", text: "2" },
      { label: "B", text: "3" },
      { label: "C", text: "4" },
      { label: "D", text: "6" },
    ],
    correctAnswer: "B",
    explanation: "Set x + 2 = x^2 - 4. Then x^2 - x - 6 = 0, so x = 3 or -2.",
  },
  {
    id: "math2-hard-20",
    section: "math",
    module: 4,
    variant: "hard",
    topic: "Functions",
    difficulty: "hard",
    trapType: "composite function constraint",
    prompt: "Let f(x) = 2x + 5 and g(x) = x^2 - 3. If f(g(k)) = 17 and k > 0, what is k?",
    choices: [
      { label: "A", text: "2" },
      { label: "B", text: "3" },
      { label: "C", text: "4" },
      { label: "D", text: "5" },
    ],
    correctAnswer: "B",
    explanation: "2(k^2 - 3) + 5 = 17, so 2k^2 - 1 = 17, k^2 = 9, and k = 3 because k is positive.",
  },
  {
    id: "math2-hard-21",
    section: "math",
    module: 4,
    variant: "hard",
    topic: "Circle Equations",
    difficulty: "hard",
    trapType: "standard form point test",
    prompt: "A circle has center (3, -2) and passes through (7, 1). Which equation represents the circle?",
    choices: [
      { label: "A", text: "(x - 3)^2 + (y + 2)^2 = 25" },
      { label: "B", text: "(x + 3)^2 + (y - 2)^2 = 25" },
      { label: "C", text: "(x - 3)^2 + (y + 2)^2 = 5" },
      { label: "D", text: "(x - 7)^2 + (y - 1)^2 = 25" },
    ],
    correctAnswer: "A",
    explanation: "The radius squared is (7 - 3)^2 + (1 + 2)^2 = 16 + 9 = 25.",
  },
  {
    id: "rw2-hard-24",
    section: "rw",
    module: 2,
    variant: "hard",
    topic: "Command of Evidence",
    difficulty: "hard",
    trapType: "table comparison error",
    passage: "Table: Average minutes of daily reading and vocabulary gains. Group A: 12 minutes, 4-point gain. Group B: 24 minutes, 9-point gain. Group C: 30 minutes, 10-point gain.",
    prompt: "Which statement is best supported by the table?",
    choices: [
      { label: "A", text: "Vocabulary gains rose as average daily reading time increased, though the increase from Group B to C was small." },
      { label: "B", text: "Group C read less than Group B but gained more vocabulary points." },
      { label: "C", text: "Reading time had no relationship to vocabulary gains." },
      { label: "D", text: "Group A gained more vocabulary points per minute than every other group." },
    ],
    correctAnswer: "A",
    explanation: "The table shows gains increasing from 4 to 9 to 10 as reading time increases.",
  },
  {
    id: "math2-hard-22",
    section: "math",
    module: 4,
    variant: "hard",
    topic: "Exponential Models",
    difficulty: "very-hard",
    trapType: "percentage interpretation",
    prompt: "The function h(t) = 500(0.84)^t models a quantity t years after measurement begins. Which statement best describes the quantity?",
    choices: [
      { label: "A", text: "It starts at 84 and increases by 500 each year." },
      { label: "B", text: "It starts at 500 and decreases by 16% each year." },
      { label: "C", text: "It starts at 500 and decreases by 84% each year." },
      { label: "D", text: "It starts at 500 and increases by 16% each year." },
    ],
    correctAnswer: "B",
    explanation: "A factor of 0.84 means 84% remains each year, so the decrease is 16%.",
  },
];

function makeChoices(values: string[], correctAnswer: string): FullMockChoice[] {
  return values.map((text, index) => ({ label: ["A", "B", "C", "D"][index] as FullMockChoice["label"], text }));
}

function buildQuestion(
  source: typeof rwPrompts[number] | typeof mathPrompts[number],
  index: number,
  section: FullMockSection,
  module: FullMockModuleNumber,
  variant: "core" | "easy" | "hard",
  difficulty: FullMockQuestion["difficulty"],
): FullMockQuestion {
  return {
    id: `${section}${module}-${variant}-${String(index).padStart(2, "0")}`,
    section,
    module,
    variant,
    topic: source.topic,
    difficulty,
    trapType: source.trapType,
    passage: "passage" in source ? source.passage : undefined,
    prompt: source.prompt,
    choices: makeChoices(source.choices, source.correctAnswer),
    correctAnswer: source.correctAnswer as FullMockQuestion["correctAnswer"],
    explanation: source.explanation,
  };
}

function fillModule(
  section: FullMockSection,
  module: FullMockModuleNumber,
  variant: "core" | "easy" | "hard",
  count: number,
  difficulty: FullMockQuestion["difficulty"],
): FullMockQuestion[] {
  const source = section === "rw" ? rwPrompts : mathPrompts;
  return Array.from({ length: count }, (_, i) => buildQuestion(source[i % source.length], i + 1, section, module, variant, difficulty));
}

const rw1 = fillModule("rw", 1, "core", 27, "medium");
const rw2Easy = fillModule("rw", 2, "easy", 27, "medium");
const rw2HardBase = fillModule("rw", 2, "hard", 27, "hard").map((question, index) => ({ ...question, id: `rw2-hard-${String(index + 1).padStart(2, "0")}` }));
const math1 = fillModule("math", 3, "core", 22, "medium");
const math2Easy = fillModule("math", 4, "easy", 22, "medium");
const math2HardBase = fillModule("math", 4, "hard", 22, "hard").map((question, index) => ({ ...question, id: `math2-hard-${String(index + 1).padStart(2, "0")}` }));

function replaceQuestion(bank: FullMockQuestion[], replacement: FullMockQuestion) {
  const number = Number(replacement.id.split("-").pop());
  if (!Number.isFinite(number) || number < 1 || number > bank.length) return bank;
  const next = [...bank];
  next[number - 1] = replacement;
  return next;
}

export const FULL_MOCK_BANK = {
  rw1,
  rw2Easy,
  rw2Hard: hardItems.filter((q) => q.section === "rw").reduce(replaceQuestion, rw2HardBase),
  math1,
  math2Easy,
  math2Hard: hardItems.filter((q) => q.section === "math").reduce(replaceQuestion, math2HardBase),
};

export function createInitialProgress(): FullMockProgress {
  const now = Date.now();
  return {
    startedAt: now,
    currentModule: 1,
    currentQuestion: 1,
    answers: {},
    moduleScores: {},
    email: null,
    moduleStartedAt: now,
    moduleEndsAt: now + FULL_MOCK_MODULES[1].seconds * 1000,
    moduleVariants: { 1: "core" },
    completedModules: [],
  };
}

export function getModuleQuestions(progress: FullMockProgress, moduleNumber = progress.currentModule): FullMockQuestion[] {
  if (moduleNumber === 1) return FULL_MOCK_BANK.rw1;
  if (moduleNumber === 3) return FULL_MOCK_BANK.math1;
  const variant = progress.moduleVariants?.[moduleNumber] ?? "easy";
  if (moduleNumber === 2) return variant === "hard" ? FULL_MOCK_BANK.rw2Hard : FULL_MOCK_BANK.rw2Easy;
  return variant === "hard" ? FULL_MOCK_BANK.math2Hard : FULL_MOCK_BANK.math2Easy;
}

export function allAnsweredQuestions(progress: FullMockProgress) {
  const selectedRw2 = progress.moduleVariants?.[2] === "hard" ? FULL_MOCK_BANK.rw2Hard : FULL_MOCK_BANK.rw2Easy;
  const selectedMath2 = progress.moduleVariants?.[4] === "hard" ? FULL_MOCK_BANK.math2Hard : FULL_MOCK_BANK.math2Easy;
  return [...FULL_MOCK_BANK.rw1, ...selectedRw2, ...FULL_MOCK_BANK.math1, ...selectedMath2];
}

export function countCorrect(questions: FullMockQuestion[], answers: Record<string, string>) {
  return questions.reduce((sum, question) => sum + (answers[question.id] === question.correctAnswer ? 1 : 0), 0);
}

export function chooseNextVariant(progress: FullMockProgress, completedModule: FullMockModuleNumber) {
  if (completedModule === 1) {
    return countCorrect(FULL_MOCK_BANK.rw1, progress.answers) >= 20 ? "hard" : "easy";
  }
  if (completedModule === 3) {
    return countCorrect(FULL_MOCK_BANK.math1, progress.answers) >= 16 ? "hard" : "easy";
  }
  return "core";
}

function scaleScore(correct: number, total: number) {
  const raw = 200 + (correct / total) * 600;
  return Math.max(200, Math.min(800, Math.round(raw / 10) * 10));
}

export function calculateFullMockResult(progress: FullMockProgress): FullMockResult {
  const questions = allAnsweredQuestions(progress);
  const answers = questions.map((question) => {
    const selectedAnswer = progress.answers[question.id] ?? null;
    return {
      questionId: question.id,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect: selectedAnswer === question.correctAnswer,
      topic: question.topic,
      trapType: question.trapType,
      explanation: question.explanation,
      question,
    };
  });
  const rwAnswers = answers.filter((answer) => answer.question.section === "rw");
  const mathAnswers = answers.filter((answer) => answer.question.section === "math");
  const rwScore = scaleScore(rwAnswers.filter((answer) => answer.isCorrect).length, rwAnswers.length);
  const mathScore = scaleScore(mathAnswers.filter((answer) => answer.isCorrect).length, mathAnswers.length);
  const topicMap = new Map<string, { correct: number; total: number }>();
  for (const answer of answers) {
    const entry = topicMap.get(answer.topic) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (answer.isCorrect) entry.correct += 1;
    topicMap.set(answer.topic, entry);
  }
  const topicAccuracy = Array.from(topicMap, ([topic, entry]) => ({
    topic,
    correct: entry.correct,
    total: entry.total,
    percent: Math.round((entry.correct / entry.total) * 100),
  })).sort((a, b) => a.percent - b.percent || b.total - a.total);
  const trapTypes = Array.from(new Set(answers.filter((answer) => !answer.isCorrect).map((answer) => answer.trapType))).slice(0, 6);
  return {
    completedAt: Date.now(),
    totalScore: rwScore + mathScore,
    rwScore,
    mathScore,
    weakAreas: topicAccuracy.slice(0, 3).map((item) => item.topic),
    trapTypes,
    answers,
    topicAccuracy,
    email: progress.email,
    paid: false,
  };
}

export function safeReadJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function safeWriteJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
