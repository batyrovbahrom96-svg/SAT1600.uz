export const FULL_MOCK_PROGRESS_KEY = "sattest_full_mock_progress";
export const FULL_MOCK_RESULTS_KEY = "sattest_full_mock_results";
export const FULL_MOCK_BANK_VERSION = "2026-06-hard-v4";

export type FullMockSection = "rw" | "math";
export type FullMockModuleNumber = 1 | 2 | 3 | 4;
export type FullMockChoice = { label: "A" | "B" | "C" | "D"; text: string };
export type FullMockChart =
  | {
      type: "line" | "bar";
      title: string;
      xLabel: string;
      yLabel: string;
      labels: string[];
      series: Array<{ name: string; values: number[]; color: string }>;
      min?: number;
      max?: number;
    }
  | {
      type: "scatter";
      title: string;
      xLabel: string;
      yLabel: string;
      points: Array<{ x: number; y: number }>;
      trend?: { from: { x: number; y: number }; to: { x: number; y: number }; color: string };
      minX?: number;
      maxX?: number;
      minY?: number;
      maxY?: number;
    };

export type FullMockQuestion = {
  id: string;
  section: FullMockSection;
  module: FullMockModuleNumber;
  variant: "core" | "easy" | "hard";
  topic: string;
  difficulty: "easy" | "medium" | "medium-hard" | "hard" | "very-hard";
  trapType: string;
  passage?: string;
  chart?: FullMockChart;
  prompt: string;
  choices: FullMockChoice[];
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
};

export type FullMockProgress = {
  bankVersion?: string;
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
  bankVersion?: string;
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

type PromptSeed = {
  topic: string;
  trapType: string;
  prompt: string;
  passage?: string;
  chart?: FullMockChart;
  choices: string[];
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
};

const rwCorePrompts: PromptSeed[] = [
  {
    topic: "Words in Context",
    trapType: "near-synonym overreach",
    passage: "The historian's claim is not that the treaty immediately transformed trade, but that its effects were gradual and contingent on later changes in port regulation.",
    prompt: 'As used in the text, what does "contingent" most nearly mean?',
    choices: ["dependent", "accidental", "temporary", "documented"],
    correctAnswer: "A",
    explanation: "The effects depended on later regulatory changes, so contingent means dependent.",
  },
  {
    topic: "Command of Evidence",
    trapType: "wrong comparison",
    passage: "A study of 120 students compared two review systems. Students using weekly error logs improved from 61% to 78% on matched grammar sets, while students who only reread notes improved from 63% to 68%.",
    prompt: "Which choice best supports the claim that error logs were associated with a larger improvement than rereading notes?",
    choices: [
      "Both groups began with similar scores.",
      "The error-log group gained 17 percentage points, while the rereading group gained 5.",
      "The study included 120 students.",
      "Rereading notes still produced some improvement.",
    ],
    correctAnswer: "B",
    explanation: "Choice B directly compares the size of the improvement in the two groups.",
  },
  {
    topic: "Main Idea",
    trapType: "too narrow summary",
    passage: "Some coastal cities build higher seawalls after repeated flooding. Others restore wetlands, which absorb storm surge and create wildlife habitat. Planners increasingly argue that the most resilient approach combines engineered barriers with natural buffers.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      "Wetlands are useful only because they create habitat.",
      "Coastal resilience may require both built structures and restored ecosystems.",
      "Seawalls are no longer used by coastal planners.",
      "Flooding affects every coastal city in the same way.",
    ],
    correctAnswer: "B",
    explanation: "The final sentence presents the central claim: combine engineered and natural protection.",
  },
  {
    topic: "Transitions",
    trapType: "wrong relationship",
    passage: "The first translation of the poem preserved its literal meaning. _____, it flattened the original rhythm, making the poem feel less musical.",
    prompt: "Which choice completes the text with the most logical transition?",
    choices: ["For instance", "However", "Similarly", "Therefore"],
    correctAnswer: "B",
    explanation: "The second sentence gives a limitation that contrasts with the first sentence's strength.",
  },
  {
    topic: "Rhetorical Synthesis",
    trapType: "missed student goal",
    passage: "Notes: Astronomer Vera Rubin studied galaxy rotation. Stars at galaxy edges moved faster than expected. Her observations supported the existence of dark matter. The student wants to introduce Rubin's contribution to astronomy.",
    prompt: "Which choice best uses the notes to accomplish the student's goal?",
    choices: [
      "Vera Rubin's observations of unexpectedly fast-moving outer stars helped support the existence of dark matter.",
      "Dark matter is one of several topics studied by astronomers who observe galaxies.",
      "Some stars at galaxy edges move at speeds that researchers did not expect.",
      "Rubin studied galaxy rotation, a subject also studied by other astronomers.",
    ],
    correctAnswer: "A",
    explanation: "Choice A names Rubin and explains the significance of her work.",
  },
  {
    topic: "Grammar Precision",
    trapType: "modifier placement",
    passage: "To measure tiny vibrations, the engineers installed sensors on the bridge that could detect movements smaller than a millimeter.",
    prompt: "Which choice completes the text so that it conforms to Standard English?",
    choices: [
      "NO CHANGE",
      "installed sensors that could detect movements smaller than a millimeter on the bridge",
      "installed, on the bridge, sensors that could detect movements smaller than a millimeter",
      "installed sensors on the bridge, detecting movements smaller than a millimeter",
    ],
    correctAnswer: "C",
    explanation: "Choice C clearly places the detecting ability with the sensors, not the bridge.",
  },
  {
    topic: "Dual Text Reasoning",
    trapType: "point of disagreement",
    passage: "Text 1: Because digital archives remove fragile documents from public handling, they mainly protect historical materials. Text 2: Digital archives do protect documents, but their larger value is widening access for people who cannot travel to special collections.",
    prompt: "Based on the texts, how would Author 2 most likely respond to Author 1?",
    choices: [
      "By arguing that preservation is not the only major benefit of digital archives",
      "By denying that fragile documents need protection",
      "By claiming that special collections should stop digitizing documents",
      "By suggesting that public access damages all archives",
    ],
    correctAnswer: "A",
    explanation: "Author 2 accepts preservation but says access is the larger value.",
  },
  {
    topic: "Text Structure",
    trapType: "function misread",
    passage: "Early maps of ocean currents were often based on sailors' reports. Later, researchers used floating instruments that transmitted location data, allowing currents to be measured continuously rather than inferred from scattered observations.",
    prompt: "What is the main purpose of the second sentence?",
    choices: [
      "To explain a methodological improvement over earlier mapping practices",
      "To argue that sailors' reports were intentionally false",
      "To define the term ocean current",
      "To list the names of researchers who used floating instruments",
    ],
    correctAnswer: "A",
    explanation: "The sentence shows how later measurement improved on earlier inferred reports.",
  },
  {
    topic: "Quantitative Evidence",
    trapType: "trend misread",
    passage: "Graph data: A line graph shows average monthly library visits after weekend hours were introduced in March. January: 1,200 visits. February: 1,260. March: 1,520. April: 1,810. May: 1,980.",
    chart: {
      type: "line",
      title: "Average Monthly Library Visits",
      xLabel: "Month",
      yLabel: "Visits",
      labels: ["Jan", "Feb", "Mar", "Apr", "May"],
      series: [{ name: "Visits", values: [1200, 1260, 1520, 1810, 1980], color: "#2563eb" }],
      min: 1100,
      max: 2050,
    },
    prompt: "Which statement best supports the claim that weekend hours were associated with increased library use?",
    choices: [
      "Visits increased only slightly before March but rose more sharply from March through May.",
      "The library had exactly the same number of visits in January and February.",
      "Weekend hours caused visits to decrease after March.",
      "The graph shows that visits were highest before weekend hours began.",
    ],
    correctAnswer: "A",
    explanation: "The graph shows a stronger upward trend after weekend hours were introduced in March.",
  },
];

const rwExpansionPrompts: PromptSeed[] = [
  {
    topic: "Words in Context",
    trapType: "connotation trap",
    passage: "The committee did not reject the proposal outright; instead, it tabled the measure until members could review the budget data.",
    prompt: 'As used in the text, what does "tabled" most nearly mean?',
    choices: ["displayed", "postponed", "calculated", "approved"],
    correctAnswer: "B",
    explanation: "In a committee context, tabled means postponed for later consideration.",
  },
  {
    topic: "Command of Evidence",
    trapType: "wrong trend comparison",
    passage: "Graph data: A line graph compares two solar-panel coatings across humidity levels. At 20% humidity, Coating X output is 104 units and Coating Y is 102. At 60% humidity, X is 100 and Y is 102. At 90% humidity, X is 96 and Y is 101.",
    chart: {
      type: "line",
      title: "Solar-Panel Output by Humidity",
      xLabel: "Humidity",
      yLabel: "Output units",
      labels: ["20%", "60%", "90%"],
      series: [
        { name: "Coating X", values: [104, 100, 96], color: "#2563eb" },
        { name: "Coating Y", values: [102, 102, 101], color: "#059669" },
      ],
      min: 94,
      max: 106,
    },
    prompt: "Which choice best supports the claim that Coating Y is more stable as humidity increases?",
    choices: [
      "Coating X has the highest output at 20% humidity.",
      "Coating Y changes only from 102 to 101 units, while Coating X drops from 104 to 96.",
      "Both coatings were tested at three humidity levels.",
      "Coating X and Coating Y are both used on solar panels.",
    ],
    correctAnswer: "B",
    explanation: "Choice B compares the trends and shows that Y remains nearly constant while X declines.",
  },
  {
    topic: "Main Idea",
    trapType: "opposite emphasis",
    passage: "For decades, researchers treated sleep as a passive state. Newer work shows that the sleeping brain consolidates memories, regulates emotion, and clears metabolic waste, suggesting that sleep is an active biological process.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      "Sleep is now understood as an active process with several important functions.",
      "Researchers no longer study sleep.",
      "Metabolic waste is the only reason people need sleep.",
      "Older sleep research was more accurate than newer work.",
    ],
    correctAnswer: "A",
    explanation: "The text contrasts an old view with newer evidence that sleep is active and functional.",
  },
  {
    topic: "Transitions",
    trapType: "cause-effect confusion",
    passage: "The clay tablets were buried for centuries. _____, many preserved details about ordinary trade that rarely appear in royal inscriptions.",
    prompt: "Which choice completes the text with the most logical transition?",
    choices: ["Nevertheless", "Consequently", "For example", "Similarly"],
    correctAnswer: "A",
    explanation: "Despite being buried for centuries, the tablets preserved useful details.",
  },
  {
    topic: "Rhetorical Synthesis",
    trapType: "irrelevant detail",
    passage: "Notes: The Arctic tern migrates from the Arctic to the Antarctic. Its round-trip journey can exceed 70,000 kilometers. No other bird is known to migrate farther. The student wants to emphasize the extremity of the tern's migration.",
    prompt: "Which choice best uses the notes to accomplish the student's goal?",
    choices: [
      "The Arctic tern travels from the Arctic to the Antarctic and may complete a round-trip migration of over 70,000 kilometers, farther than any other known bird.",
      "The Arctic tern is a bird that lives in cold regions during parts of the year.",
      "Many birds migrate, but scientists track the Arctic tern especially carefully.",
      "The Arctic and Antarctic are both important habitats for migratory animals.",
    ],
    correctAnswer: "A",
    explanation: "Choice A emphasizes distance and the comparison to all other known birds.",
  },
  {
    topic: "Grammar Precision",
    trapType: "subject-verb agreement",
    passage: "The collection of essays, along with the editor's notes and timeline, _____ a detailed view of the author's development.",
    prompt: "Which choice completes the text so that it conforms to Standard English?",
    choices: ["provide", "provides", "have provided", "were providing"],
    correctAnswer: "B",
    explanation: "The singular subject collection takes the singular verb provides.",
  },
  {
    topic: "Dual Text Reasoning",
    trapType: "overstated agreement",
    passage: "Text 1: Public bike-share programs reduce car trips only when stations are placed near transit stops. Text 2: Station placement matters, but pricing and bike-lane safety can be just as important in whether riders use bike-share.",
    prompt: "How would Author 2 most likely respond to Author 1?",
    choices: [
      "By saying station placement is one factor but not the only important factor",
      "By arguing that station placement has no effect",
      "By claiming that bike-share programs always reduce car trips",
      "By denying that transit stops exist in cities",
    ],
    correctAnswer: "A",
    explanation: "Text 2 broadens the explanation beyond station placement.",
  },
  {
    topic: "Text Structure",
    trapType: "role of evidence",
    passage: "The novelist's early reviews were mixed. One critic praised the vivid dialogue but found the plot too loose; another admired the structure but disliked the dialogue. These disagreements suggest that the novel resisted easy classification.",
    prompt: "What function do the critics' responses serve in the text?",
    choices: [
      "They illustrate the mixed reception mentioned in the first sentence.",
      "They prove that the novel was never published.",
      "They explain how the novelist revised the book.",
      "They show that all critics disliked the same feature.",
    ],
    correctAnswer: "A",
    explanation: "The two responses give concrete examples of mixed reviews.",
  },
  {
    topic: "Quantitative Evidence",
    trapType: "graph peak misread",
    passage: "Graph data: A bar graph shows enzyme activity at different temperatures. 10 C: 18 units. 20 C: 44 units. 30 C: 71 units. 40 C: 68 units. 50 C: 25 units.",
    chart: {
      type: "bar",
      title: "Enzyme Activity by Temperature",
      xLabel: "Temperature",
      yLabel: "Activity units",
      labels: ["10 C", "20 C", "30 C", "40 C", "50 C"],
      series: [{ name: "Activity", values: [18, 44, 71, 68, 25], color: "#0f766e" }],
      min: 0,
      max: 80,
    },
    prompt: "Which conclusion is best supported by the graph?",
    choices: [
      "Enzyme activity increases steadily at every temperature shown.",
      "Enzyme activity is highest at 30 C and then declines at higher temperatures.",
      "The enzyme is inactive at 20 C.",
      "The enzyme has the same activity at 10 C and 50 C.",
    ],
    correctAnswer: "B",
    explanation: "The highest value is 71 units at 30 C; activity is lower at 40 C and much lower at 50 C.",
  },
  {
    topic: "Rhetorical Synthesis",
    trapType: "wrong emphasis",
    passage: "Notes: Biologist Nalini Nadkarni studies forest canopies. She developed methods for climbing into treetops safely. Her work revealed that canopy ecosystems contain diverse plants, insects, and fungi. The student wants to emphasize the scientific impact of Nadkarni's methods.",
    prompt: "Which choice best accomplishes the student's goal?",
    choices: [
      "By developing safe ways to study treetops directly, Nadkarni helped reveal the diversity of canopy ecosystems.",
      "Nalini Nadkarni is a biologist who climbs trees as part of her work.",
      "Forests contain many species, including plants, insects, and fungi.",
      "Scientists sometimes need special equipment to work safely.",
    ],
    correctAnswer: "A",
    explanation: "Choice A connects the method to the discovery, which is the scientific impact.",
  },
  {
    topic: "Command of Evidence",
    trapType: "confusing absolute and relative change",
    passage: "In 2010, Library P had 8,000 visits and Library Q had 5,000. By 2020, Library P had 10,000 visits and Library Q had 8,000.",
    prompt: "Which statement is supported by the data?",
    choices: [
      "Library Q had a larger percentage increase in visits than Library P.",
      "Library P had fewer visits than Library Q in 2020.",
      "Both libraries increased by exactly 3,000 visits.",
      "Library P's visits doubled between 2010 and 2020.",
    ],
    correctAnswer: "A",
    explanation: "Q rose 3,000 from 5,000, a 60% increase; P rose 2,000 from 8,000, a 25% increase.",
  },
  {
    topic: "Grammar Precision",
    trapType: "punctuation boundary",
    passage: "The archive contains letters, maps, and field notebooks _____ all of which help researchers reconstruct the expedition.",
    prompt: "Which choice completes the text so that it conforms to Standard English?",
    choices: [",", ";", ":", "—"],
    correctAnswer: "D",
    explanation: "A dash can introduce the summarizing phrase all of which; a comma alone creates a boundary problem.",
  },
  {
    topic: "Words in Context",
    trapType: "discipline-specific meaning",
    passage: "The economist called the model elegant because it explained several patterns with only two assumptions.",
    prompt: 'As used in the text, what does "elegant" most nearly mean?',
    choices: ["fashionable", "simple and effective", "expensive", "decorative"],
    correctAnswer: "B",
    explanation: "In this academic context, elegant means efficient and explanatory, not stylish.",
  },
  {
    topic: "Text Structure",
    trapType: "misread contrast",
    passage: "The new microscope did not merely enlarge images. It also allowed researchers to observe living cells for longer periods without damaging them.",
    prompt: "What is the function of the second sentence?",
    choices: [
      "It adds an important capability beyond magnification.",
      "It rejects the claim that microscopes enlarge images.",
      "It defines living cells.",
      "It describes damage caused by every microscope.",
    ],
    correctAnswer: "A",
    explanation: "The phrase not merely signals that the second sentence adds another benefit.",
  },
  {
    topic: "Transitions",
    trapType: "example versus result",
    passage: "The artist mixed crushed minerals into the paint. _____, some areas of the mural still sparkle when light strikes them.",
    prompt: "Which choice completes the text with the most logical transition?",
    choices: ["As a result", "In contrast", "For example", "Nevertheless"],
    correctAnswer: "A",
    explanation: "The sparkle is a result of the mineral mixture.",
  },
  {
    topic: "Main Idea",
    trapType: "too broad claim",
    passage: "Artificial reefs can create habitat for fish, but poorly planned reefs may disrupt existing ecosystems. Marine planners therefore evaluate local currents, species, and seafloor conditions before construction.",
    prompt: "Which choice best states the main idea?",
    choices: [
      "Artificial reefs can be useful, but they require careful planning.",
      "Artificial reefs always damage ecosystems.",
      "Marine planners no longer build reefs.",
      "Currents are the only factor in reef construction.",
    ],
    correctAnswer: "A",
    explanation: "The text balances potential benefit with the need for careful evaluation.",
  },
  {
    topic: "Dual Text Reasoning",
    trapType: "confused stance",
    passage: "Text 1: Rewilding farmland should prioritize large mammals because they reshape entire landscapes. Text 2: Large mammals can matter, but insects and soil organisms often restore ecosystem functions before visible landscape changes occur.",
    prompt: "What would Author 2 most likely criticize about Author 1's claim?",
    choices: [
      "It overlooks less visible organisms that can be essential to restoration.",
      "It gives too much attention to insects and soil organisms.",
      "It denies that ecosystems can change over time.",
      "It claims that farmland never supports mammals.",
    ],
    correctAnswer: "A",
    explanation: "Text 2 argues that Author 1's focus is too narrow.",
  },
  {
    topic: "Quantitative Evidence",
    trapType: "scatterplot correlation trap",
    passage: "Graph data: A scatterplot compares weekly practice hours and score improvement for 40 students. Most students practicing 0-2 hours improved 0-20 points. Most students practicing 3-5 hours improved 30-70 points. Most students practicing 6-8 hours improved 70-120 points.",
    chart: {
      type: "scatter",
      title: "Practice Hours and Score Improvement",
      xLabel: "Weekly practice hours",
      yLabel: "Score improvement",
      points: [
        { x: 0.5, y: 8 },
        { x: 1.2, y: 16 },
        { x: 1.8, y: 12 },
        { x: 2.0, y: 20 },
        { x: 3.1, y: 38 },
        { x: 3.8, y: 46 },
        { x: 4.5, y: 61 },
        { x: 5.0, y: 70 },
        { x: 6.1, y: 78 },
        { x: 6.8, y: 96 },
        { x: 7.3, y: 110 },
        { x: 8.0, y: 118 },
      ],
      trend: { from: { x: 0.5, y: 10 }, to: { x: 8, y: 112 }, color: "#2563eb" },
      minX: 0,
      maxX: 8,
      minY: 0,
      maxY: 125,
    },
    prompt: "Which statement is best supported by the scatterplot?",
    choices: [
      "Students who practiced more hours generally showed larger score improvements.",
      "Every student who practiced 0-2 hours lost points.",
      "Practice hours had no visible relationship to score improvement.",
      "All students who practiced 6-8 hours improved by exactly 120 points.",
    ],
    correctAnswer: "A",
    explanation: "The clusters move upward as practice hours increase, showing a positive association.",
  },
];

const rwHardPrompts: PromptSeed[] = [
  ...rwCorePrompts.slice(0, 9),
  ...rwExpansionPrompts.slice(0, 9),
  {
    topic: "Rhetorical Synthesis",
    trapType: "wrong synthesis goal",
    passage: "Notes: Dr. Kim studied urban gardens in Seoul. Gardens lowered nearby surface temperatures by 1.8 C on average. Gardens with tree cover had the strongest cooling effect. The student wants to emphasize the condition that made the effect strongest.",
    prompt: "Which choice best accomplishes the student's goal?",
    choices: [
      "Dr. Kim studied urban gardens in Seoul and measured surface temperatures.",
      "Urban gardens lowered nearby surface temperatures, especially when they included tree cover.",
      "The study found that some gardens changed surface temperatures by 1.8 C.",
      "Urban gardens are often studied because cities can become hot in summer.",
    ],
    correctAnswer: "B",
    explanation: "Choice B includes both the result and the condition that strengthened it.",
  },
  {
    topic: "Dual Text Reasoning",
    trapType: "missed point of disagreement",
    passage: "Text 1: Museum audio guides reduce careful looking because visitors focus on narration instead of visual details. Text 2: Audio guides can deepen looking when they ask visitors to inspect specific visual evidence before giving interpretation.",
    prompt: "What is the main point of disagreement between the authors?",
    choices: [
      "Whether museums should display visual art",
      "Whether audio guides necessarily reduce visitors' attention to visual details",
      "Whether visitors prefer audio or written labels",
      "Whether interpretation is possible without trained experts",
    ],
    correctAnswer: "B",
    explanation: "Text 1 says guides reduce looking; Text 2 says guides can improve looking if designed well.",
  },
  {
    topic: "Command of Evidence",
    trapType: "two-line graph comparison",
    passage: "Graph data: A two-line graph shows renewable electricity generated by two sources from 2020 to 2024. Solar: 18, 25, 37, 52, 70 terawatt-hours. Wind: 42, 47, 51, 55, 59 terawatt-hours.",
    chart: {
      type: "line",
      title: "Renewable Electricity Generated",
      xLabel: "Year",
      yLabel: "Terawatt-hours",
      labels: ["2020", "2021", "2022", "2023", "2024"],
      series: [
        { name: "Solar", values: [18, 25, 37, 52, 70], color: "#f59e0b" },
        { name: "Wind", values: [42, 47, 51, 55, 59], color: "#2563eb" },
      ],
      min: 10,
      max: 75,
    },
    prompt: "Which statement best supports the claim that solar generation was catching up to wind generation?",
    choices: [
      "Solar generation rose by 52 terawatt-hours, while wind generation rose by 17.",
      "Wind generation was lower than solar generation in 2020.",
      "Solar and wind generation were equal in every year shown.",
      "Wind generation decreased from 2020 to 2024.",
    ],
    correctAnswer: "A",
    explanation: "Solar increased much faster than wind, narrowing and then passing the gap by 2024.",
  },
  {
    topic: "Rhetorical Synthesis",
    trapType: "audience mismatch",
    passage: "Notes: Engineer Fazlur Rahman Khan designed structural systems for tall buildings. His tube-frame design reduced the amount of steel needed. The John Hancock Center used this approach. The student wants to explain why Khan's design mattered to architects.",
    prompt: "Which choice best uses the notes to accomplish the student's goal?",
    choices: [
      "Khan's tube-frame design mattered because it let architects build very tall structures with less steel.",
      "The John Hancock Center is a tall building that used an engineering design.",
      "Fazlur Rahman Khan was an engineer whose work involved buildings.",
      "Architects and engineers often work together on large construction projects.",
    ],
    correctAnswer: "A",
    explanation: "Choice A explains the significance of the design for architecture.",
  },
  {
    topic: "Grammar Precision",
    trapType: "logical comparison",
    passage: "Unlike those of most desert plants, the leaves of the creosote bush are coated with a resin that helps reduce water loss.",
    prompt: "Which choice best maintains the sentence's logical comparison?",
    choices: [
      "NO CHANGE",
      "Unlike most desert plants, the leaves of the creosote bush",
      "Unlike the leaves of most desert plants, the creosote bush",
      "Unlike most desert plant leaves, the creosote bush's resin",
    ],
    correctAnswer: "A",
    explanation: "The sentence compares leaves with leaves, which is logical.",
  },
  {
    topic: "Transitions",
    trapType: "subtle concession",
    passage: "The survey included thousands of participants, giving it statistical power. _____, because all participants were volunteers, the findings may not represent the entire population.",
    prompt: "Which choice completes the text with the most logical transition?",
    choices: ["Moreover", "Nevertheless", "For instance", "Accordingly"],
    correctAnswer: "B",
    explanation: "The second sentence introduces a limitation despite the study's strength.",
  },
  {
    topic: "Words in Context",
    trapType: "academic nuance",
    passage: "The new evidence did not overturn the existing theory; rather, it refined the theory by identifying the conditions under which its predictions fail.",
    prompt: 'As used in the text, what does "refined" most nearly mean?',
    choices: ["made more precise", "made more polite", "rejected completely", "repeated exactly"],
    correctAnswer: "A",
    explanation: "The evidence makes the theory more precise by defining its limits.",
  },
  {
    topic: "Text Structure",
    trapType: "purpose of qualification",
    passage: "Researchers once assumed that all tool use in crows was learned by imitation. However, experiments with young crows raised without adult models show that some tool behaviors can emerge without direct teaching.",
    prompt: "What is the function of the second sentence?",
    choices: [
      "It qualifies an earlier assumption by presenting evidence against its universality.",
      "It proves that adult crows never use tools.",
      "It explains why imitation is impossible to study.",
      "It defines the term tool behavior.",
    ],
    correctAnswer: "A",
    explanation: "The experiments show that the original assumption is not always true.",
  },
  {
    topic: "Quantitative Evidence",
    trapType: "trend with exception",
    passage: "Graph data: A line graph shows average response time for an app after three updates. Before updates: 4.8 seconds. After Update 1: 3.9 seconds. After Update 2: 3.1 seconds. After Update 3: 3.3 seconds.",
    chart: {
      type: "line",
      title: "Average App Response Time",
      xLabel: "Update stage",
      yLabel: "Seconds",
      labels: ["Before", "Update 1", "Update 2", "Update 3"],
      series: [{ name: "Response time", values: [4.8, 3.9, 3.1, 3.3], color: "#7c3aed" }],
      min: 2.8,
      max: 5,
    },
    prompt: "Which claim is best supported by the graph?",
    choices: [
      "Response time generally decreased after the updates, though it rose slightly after Update 3.",
      "Each update made response time exactly one second faster.",
      "The app was slowest after Update 3.",
      "Update 2 increased response time compared with Update 1.",
    ],
    correctAnswer: "A",
    explanation: "The trend improves from 4.8 to 3.1 seconds, with a small increase to 3.3 after the final update.",
  },
];

const mathCorePrompts: PromptSeed[] = [
  {
    topic: "Linear Equations",
    trapType: "operation reversal",
    prompt: "If 5(2x - 3) - 4 = 3x + 23, what is the value of x?",
    choices: ["4", "5", "6", "7"],
    correctAnswer: "C",
    explanation: "10x - 19 = 3x + 23, so 7x = 42 and x = 6.",
  },
  {
    topic: "Systems of Equations",
    trapType: "substitution error",
    prompt: "The system 2x + 3y = 19 and x - y = 2 has solution (x, y). What is x?",
    choices: ["3", "4", "5", "7"],
    correctAnswer: "C",
    explanation: "From x = y + 2. Substitute: 2(y + 2) + 3y = 19, so y = 3 and x = 5.",
  },
  {
    topic: "Quadratics",
    trapType: "factoring trap",
    prompt: "If x^2 - 8x + 7 = 0, what is the greater solution?",
    choices: ["1", "3", "7", "8"],
    correctAnswer: "C",
    explanation: "The expression factors as (x - 1)(x - 7), so the greater solution is 7.",
  },
  {
    topic: "Functions",
    trapType: "input-output swap",
    prompt: "If f(x) = x^2 - 4x + 9, what is f(6) - f(2)?",
    choices: ["0", "8", "12", "16"],
    correctAnswer: "D",
    explanation: "f(6)=21 and f(2)=5, so the difference is 16.",
  },
  {
    topic: "Circle Equations",
    trapType: "radius squared",
    prompt: "A circle has equation (x + 4)^2 + (y - 3)^2 = 49. What is its radius?",
    choices: ["7", "14", "49", "98"],
    correctAnswer: "A",
    explanation: "The right side is r^2, so r = 7.",
  },
  {
    topic: "Exponential Models",
    trapType: "percent direction",
    prompt: "A bacteria culture has 1,200 cells and grows by 18% each hour. Which expression represents the number of cells after t hours?",
    choices: ["1200(0.18)^t", "1200(1.18)^t", "1200 + 18t", "1200(0.82)^t"],
    correctAnswer: "B",
    explanation: "An 18% increase multiplies by 1.18 each hour.",
  },
  {
    topic: "Ratios and Percentages",
    trapType: "base percent error",
    prompt: "A jacket's price is increased by 20% and then discounted by 20%. If the original price was 100, what is the final price?",
    choices: ["80", "96", "100", "104"],
    correctAnswer: "B",
    explanation: "After the increase the price is 120; 20% off 120 gives 96.",
  },
  {
    topic: "Advanced Algebra",
    trapType: "distribution error",
    prompt: "If 3(a - 2) + 2(a + 5) = 29, what is a?",
    choices: ["3", "4", "5", "6"],
    correctAnswer: "C",
    explanation: "3a - 6 + 2a + 10 = 29, so 5a + 4 = 29 and a = 5.",
  },
  {
    topic: "Linear Equations",
    trapType: "slope intercept trap",
    prompt: "A line passes through (2, 9) and has slope -3. What is the y-intercept?",
    choices: ["3", "9", "12", "15"],
    correctAnswer: "D",
    explanation: "Using y = mx + b: 9 = -3(2) + b, so b = 15.",
  },
  {
    topic: "Systems of Equations",
    trapType: "elimination sign error",
    prompt: "If 4x - y = 11 and 2x + y = 13, what is x + y?",
    choices: ["7", "8", "9", "10"],
    correctAnswer: "C",
    explanation: "Adding gives 6x = 24, so x = 4. Then y = 5, and x + y = 9.",
  },
  {
    topic: "Quadratics",
    trapType: "vertex confusion",
    prompt: "The function f(x) = (x - 5)^2 - 11 has a minimum value of",
    choices: ["-11", "-5", "5", "11"],
    correctAnswer: "A",
    explanation: "The squared term is minimized at 0, so the minimum value is -11.",
  },
  {
    topic: "Functions",
    trapType: "composition order",
    prompt: "If f(x) = 3x - 1 and g(x) = x + 4, what is f(g(2))?",
    choices: ["9", "13", "17", "21"],
    correctAnswer: "C",
    explanation: "g(2)=6, and f(6)=18-1=17.",
  },
  {
    topic: "Circle Equations",
    trapType: "center sign",
    prompt: "What is the center of the circle (x - 6)^2 + (y + 2)^2 = 36?",
    choices: ["(6, -2)", "(-6, 2)", "(6, 2)", "(-6, -2)"],
    correctAnswer: "A",
    explanation: "The standard form gives center (6, -2).",
  },
  {
    topic: "Exponential Models",
    trapType: "initial value error",
    prompt: "The function P(t)=750(1.04)^t models a population after t years. What is P(0)?",
    choices: ["0", "4", "750", "780"],
    correctAnswer: "C",
    explanation: "At t=0, the exponential factor is 1, so the initial value is 750.",
  },
  {
    topic: "Ratios and Percentages",
    trapType: "part-whole reversal",
    prompt: "In a class, the ratio of juniors to seniors is 5 to 7. If there are 36 students total, how many are seniors?",
    choices: ["15", "18", "21", "24"],
    correctAnswer: "C",
    explanation: "There are 12 ratio parts, so each part is 3 students. Seniors: 7*3=21.",
  },
  {
    topic: "Advanced Algebra",
    trapType: "fraction equation",
    prompt: "If (x + 3)/4 = (2x - 1)/7, what is x?",
    choices: ["-25", "-17", "17", "25"],
    correctAnswer: "D",
    explanation: "7x + 21 = 8x - 4, so x = 25.",
  },
  {
    topic: "Linear Equations",
    trapType: "unit rate trap",
    prompt: "A taxi charges 12,000 UZS plus 3,500 UZS per kilometer. If a ride costs 43,500 UZS, how many kilometers was the ride?",
    choices: ["7", "8", "9", "10"],
    correctAnswer: "C",
    explanation: "Subtract 12,000 to get 31,500; divide by 3,500 to get 9.",
  },
  {
    topic: "Systems of Equations",
    trapType: "parameter interpretation",
    prompt: "For what value of k does the system y = 2x + k and y = -x + 9 have solution x = 3?",
    choices: ["0", "2", "3", "6"],
    correctAnswer: "A",
    explanation: "At x=3, the second line gives y=6. Then 6=2(3)+k, so k=0.",
  },
  {
    topic: "Quadratics",
    trapType: "discriminant reasoning",
    prompt: "Which equation has exactly one real solution?",
    choices: ["x^2 - 6x + 9 = 0", "x^2 - 5x + 6 = 0", "x^2 + x - 6 = 0", "x^2 - 9 = 0"],
    correctAnswer: "A",
    explanation: "x^2 - 6x + 9 = (x - 3)^2, so it has one real solution.",
  },
  {
    topic: "Functions",
    trapType: "inverse relation trap",
    prompt: "If h(x)=4x+7, what value of x makes h(x)=31?",
    choices: ["4", "5", "6", "7"],
    correctAnswer: "C",
    explanation: "4x + 7 = 31, so x = 6.",
  },
  {
    topic: "Circle Equations",
    trapType: "distance formula",
    prompt: "A circle has center (-1, 4) and radius 5. Which point lies on the circle?",
    choices: ["(2, 8)", "(4, 4)", "(-1, 10)", "(-6, -2)"],
    correctAnswer: "A",
    explanation: "The distance from (-1,4) to (2,8) is sqrt(3^2+4^2)=5.",
  },
  {
    topic: "Exponential Models",
    trapType: "decay factor",
    prompt: "A quantity decreases by 9% each month. Which factor should multiply the quantity each month?",
    choices: ["0.09", "0.91", "1.09", "9"],
    correctAnswer: "B",
    explanation: "If 9% is lost, 91% remains, so the multiplier is 0.91.",
  },
  {
    topic: "Advanced Algebra",
    trapType: "equivalent expression",
    prompt: "Which expression is equivalent to (x^2 - 9)/(x - 3), for x not equal to 3?",
    choices: ["x - 3", "x + 3", "x^2 + 3", "3x"],
    correctAnswer: "B",
    explanation: "x^2 - 9 = (x - 3)(x + 3), so the expression simplifies to x + 3.",
  },
];

const mathHardPrompts: PromptSeed[] = [
  ...mathCorePrompts.slice(0, 18),
  {
    topic: "Systems of Equations",
    trapType: "linear-quadratic substitution",
    passage: "A line and a parabola intersect at two points.",
    prompt: "If y = x + 2 and y = x^2 - 4, what is the positive x-coordinate of an intersection point?",
    choices: ["2", "3", "4", "6"],
    correctAnswer: "B",
    explanation: "Set x + 2 = x^2 - 4. Then x^2 - x - 6 = 0, so x = 3 or -2.",
  },
  {
    topic: "Functions",
    trapType: "composite function constraint",
    prompt: "Let f(x) = 2x + 5 and g(x) = x^2 - 3. If f(g(k)) = 17 and k > 0, what is k?",
    choices: ["2", "3", "4", "5"],
    correctAnswer: "B",
    explanation: "2(k^2 - 3) + 5 = 17, so 2k^2 - 1 = 17, k^2 = 9, and k = 3 because k is positive.",
  },
  {
    topic: "Circle Equations",
    trapType: "standard form point test",
    prompt: "A circle has center (3, -2) and passes through (7, 1). Which equation represents the circle?",
    choices: ["(x - 3)^2 + (y + 2)^2 = 25", "(x + 3)^2 + (y - 2)^2 = 25", "(x - 3)^2 + (y + 2)^2 = 5", "(x - 7)^2 + (y - 1)^2 = 25"],
    correctAnswer: "A",
    explanation: "The radius squared is (7 - 3)^2 + (1 + 2)^2 = 16 + 9 = 25.",
  },
  {
    topic: "Exponential Models",
    trapType: "percentage interpretation",
    prompt: "The function h(t) = 500(0.84)^t models a quantity t years after measurement begins. Which statement best describes the quantity?",
    choices: ["It starts at 84 and increases by 500 each year.", "It starts at 500 and decreases by 16% each year.", "It starts at 500 and decreases by 84% each year.", "It starts at 500 and increases by 16% each year."],
    correctAnswer: "B",
    explanation: "A factor of 0.84 means 84% remains each year, so the decrease is 16%.",
  },
];

function makeChoices(values: string[]): FullMockChoice[] {
  return values.map((text, index) => ({ label: ["A", "B", "C", "D"][index] as FullMockChoice["label"], text }));
}

function buildQuestion(
  source: PromptSeed,
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
    chart: source.chart,
    prompt: source.prompt,
    choices: makeChoices(source.choices),
    correctAnswer: source.correctAnswer as FullMockQuestion["correctAnswer"],
    explanation: source.explanation,
  };
}

function fillModule(
  source: PromptSeed[],
  section: FullMockSection,
  module: FullMockModuleNumber,
  variant: "core" | "easy" | "hard",
  count: number,
  difficultyForIndex: (index: number) => FullMockQuestion["difficulty"],
): FullMockQuestion[] {
  return Array.from({ length: count }, (_, i) => buildQuestion(source[i % source.length], i + 1, section, module, variant, difficultyForIndex(i + 1)));
}

const rwMediumBank = [...rwCorePrompts, ...rwExpansionPrompts];
const rw1 = fillModule(rwMediumBank, "rw", 1, "core", 27, (index) => index >= 19 ? "medium-hard" : "medium");
const rw2Easy = fillModule([...rwExpansionPrompts, ...rwCorePrompts], "rw", 2, "easy", 27, (index) => index >= 19 ? "medium-hard" : "medium");
const rw2Hard = fillModule(rwHardPrompts, "rw", 2, "hard", 27, (index) => index >= 22 ? "very-hard" : index >= 19 ? "hard" : "medium-hard");
const math1 = fillModule(mathCorePrompts.slice(0, 22), "math", 3, "core", 22, (index) => index >= 17 ? "medium-hard" : "medium");
const math2Easy = fillModule([...mathCorePrompts.slice(8, 22), ...mathCorePrompts.slice(0, 8)], "math", 4, "easy", 22, (index) => index >= 17 ? "medium-hard" : "medium");
const math2Hard = fillModule(mathHardPrompts, "math", 4, "hard", 22, (index) => index >= 20 ? "very-hard" : index >= 17 ? "hard" : "medium-hard");

export const FULL_MOCK_BANK = {
  rw1,
  rw2Easy,
  rw2Hard,
  math1,
  math2Easy,
  math2Hard,
};

export function createInitialProgress(): FullMockProgress {
  const now = Date.now();
  return {
    bankVersion: FULL_MOCK_BANK_VERSION,
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

const difficultyWeights: Record<FullMockQuestion["difficulty"], number> = {
  easy: 0.86,
  medium: 1,
  "medium-hard": 1.12,
  hard: 1.25,
  "very-hard": 1.42,
};

function scaleWeightedScore(answers: Array<{ isCorrect: boolean; question: FullMockQuestion }>) {
  const total = answers.reduce((sum, answer) => sum + difficultyWeights[answer.question.difficulty], 0);
  const earned = answers.reduce((sum, answer) => sum + (answer.isCorrect ? difficultyWeights[answer.question.difficulty] : 0), 0);
  const raw = 200 + (earned / Math.max(total, 1)) * 600;
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
  const rwScore = scaleWeightedScore(rwAnswers);
  const mathScore = scaleWeightedScore(mathAnswers);
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
    bankVersion: FULL_MOCK_BANK_VERSION,
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
