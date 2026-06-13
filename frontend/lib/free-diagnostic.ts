export type DiagnosticSection = "math" | "rw";
export type DiagnosticDifficulty = "easy" | "medium" | "hard";

export type DiagnosticQuestion = {
  id: string;
  section: DiagnosticSection;
  topic: string;
  difficulty: DiagnosticDifficulty;
  prompt: string;
  choices: string[];
  correctAnswer: string;
  trapType?: string;
  explanation: string;
};

export type DiagnosticAnswers = Record<string, string>;

export type TopicAccuracy = {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
};

export type DiagnosticResult = {
  correct: number;
  total: number;
  estimatedTotal: number;
  estimatedMin: number;
  estimatedMax: number;
  estimatedMath: number;
  estimatedRw: number;
  topicAccuracy: TopicAccuracy[];
  weakAreas: string[];
  trapTypes: string[];
  missedQuestions: Array<{
    question: DiagnosticQuestion;
    selectedAnswer: string | null;
  }>;
};

const difficultyWeight: Record<DiagnosticDifficulty, number> = {
  easy: 0.85,
  medium: 1,
  hard: 1.25
};

export const freeDiagnosticQuestions: DiagnosticQuestion[] = [
  {
    id: "fd-q001",
    section: "math",
    topic: "Algebra",
    difficulty: "easy",
    prompt: "If 4x = 28, what is the value of x?",
    choices: ["6", "7", "24", "32"],
    correctAnswer: "7",
    trapType: "linear equation setup error",
    explanation: "Divide both sides of 4x = 28 by 4. This gives x = 7. The trap choices come from subtracting 4, adding 4, or treating 28 as the value of x."
  },
  {
    id: "fd-q002",
    section: "rw",
    topic: "Words in Context",
    difficulty: "medium",
    prompt:
      "In the 1800s, some cities began replacing oil lamps with gas lamps along major streets. The change did not simply make roads brighter; it also altered social life. Shops could remain open later, evening newspapers became easier to sell, and pedestrians felt safer traveling after sunset. In this context, what does \"altered\" most nearly mean?",
    choices: ["Changed", "Measured", "Protected", "Copied"],
    correctAnswer: "Changed",
    trapType: "context vocabulary mismatch",
    explanation: "The passage explains several ways street lighting affected city life. Altered means changed. Measured, protected, and copied do not fit the idea that social life became different."
  },
  {
    id: "fd-q003",
    section: "math",
    topic: "Algebra",
    difficulty: "medium",
    prompt: "The system of equations y = 2x + 1 and y = x + 6 has solution (x, y). What is the value of x?",
    choices: ["3", "5", "7", "11"],
    correctAnswer: "5",
    trapType: "system substitution error",
    explanation: "Set the two expressions for y equal: 2x + 1 = x + 6. Subtract x from both sides to get x + 1 = 6, so x = 5."
  },
  {
    id: "fd-q004",
    section: "rw",
    topic: "Words in Context",
    difficulty: "easy",
    prompt:
      "A marine biologist studied a reef after a severe storm. Many large corals had broken, but small fish returned within days, using the fallen branches as shelter. The reef looked damaged from above, yet close observation showed that some species were already adapting to the new structure. In this context, what does \"severe\" most nearly mean?",
    choices: ["Serious", "Brief", "Predictable", "Helpful"],
    correctAnswer: "Serious",
    trapType: "tone mismatch",
    explanation: "The storm broke large corals, so severe means serious or intense. Brief and predictable are not supported, and helpful reverses the negative force of the storm."
  },
  {
    id: "fd-q005",
    section: "math",
    topic: "Algebra",
    difficulty: "medium",
    prompt: "If 5(x - 3) = 2x + 9, what is the value of x?",
    choices: ["4", "6", "8", "12"],
    correctAnswer: "8",
    trapType: "distribution and combining terms error",
    explanation: "Distribute first: 5x - 15 = 2x + 9. Subtract 2x to get 3x - 15 = 9. Add 15 to get 3x = 24, so x = 8."
  },
  {
    id: "fd-q006",
    section: "rw",
    topic: "Text Completion",
    difficulty: "medium",
    prompt:
      "Researchers testing a new soil sensor expected it to fail in dry fields, where older sensors often gave unstable readings. Instead, the device remained accurate even when moisture levels were low and the ground surface looked cracked. The result was therefore ______ because it challenged the team's original assumption about how the sensor would perform.",
    choices: ["unexpected", "irrelevant", "temporary", "obvious"],
    correctAnswer: "unexpected",
    trapType: "logical word choice reversal",
    explanation: "The researchers expected failure, but the sensor stayed accurate. That makes the result unexpected. Obvious reverses the logic, while irrelevant and temporary are not supported."
  },
  {
    id: "fd-q007",
    section: "math",
    topic: "Problem Solving and Data Analysis",
    difficulty: "medium",
    prompt: "A museum sold 240 tickets on Saturday. Adult tickets made up 65% of the tickets sold. How many adult tickets were sold?",
    choices: ["84", "120", "156", "175"],
    correctAnswer: "156",
    trapType: "percent of quantity error",
    explanation: "Find 65% of 240: 0.65 x 240 = 156. The trap choices come from using 35%, half, or a rounded estimate instead of the exact percent."
  },
  {
    id: "fd-q008",
    section: "rw",
    topic: "Text Completion",
    difficulty: "hard",
    prompt:
      "A historian comparing two village records found that both described the same flood, but one record listed damaged crops while the other focused on damaged roads and bridges. Because the documents came from communities with different daily concerns, the historian did not treat the accounts as contradictory. Instead, she argued that they were ______: each emphasized a different effect of the same event.",
    choices: ["complementary", "identical", "unreliable", "unrelated"],
    correctAnswer: "complementary",
    trapType: "relationship mismatch",
    explanation: "The accounts describe the same event from different angles, so they complement each other. Identical is too strong, unreliable is unsupported, and unrelated ignores the shared flood."
  },
  {
    id: "fd-q009",
    section: "math",
    topic: "Problem Solving and Data Analysis",
    difficulty: "hard",
    prompt: "A research station used 18 liters of water per day for 12 days. After repairs, it used 15 liters per day. At the new rate, how many days would 216 liters of water last?",
    choices: ["12", "14.4", "15", "16"],
    correctAnswer: "14.4",
    trapType: "rate comparison error",
    explanation: "At the new rate, divide total water by daily use: 216 / 15 = 14.4 days. The trap is using the old 18-liter rate, which gives 12."
  },
  {
    id: "fd-q010",
    section: "rw",
    topic: "Main Purpose / Central Idea",
    difficulty: "medium",
    prompt:
      "For decades, researchers assumed that ancient coastal traders avoided long open-water journeys. Recent analysis of stone tools found on several islands has complicated that view. The tools were made from rock found only on the mainland, and some islands were too distant to reach by accident during ordinary fishing trips. The evidence suggests that at least some traders planned sea crossings more carefully than scholars once believed. What is the main idea of the passage?",
    choices: [
      "New evidence suggests some ancient traders made planned sea journeys.",
      "Ancient traders used only stone tools from nearby islands.",
      "Fishing trips were more important than trade in coastal societies.",
      "Researchers now know exactly how every ancient trader traveled."
    ],
    correctAnswer: "New evidence suggests some ancient traders made planned sea journeys.",
    trapType: "overgeneralized central idea",
    explanation: "The passage focuses on evidence that challenges an old assumption about coastal traders. The correct answer captures the new interpretation without claiming certainty about every trader."
  },
  {
    id: "fd-q011",
    section: "math",
    topic: "Advanced Math",
    difficulty: "medium",
    prompt: "For the function f(x) = x^2 - 6x + 8, what is f(5)?",
    choices: ["-7", "3", "8", "25"],
    correctAnswer: "3",
    trapType: "function substitution error",
    explanation: "Substitute 5 for x: f(5) = 5^2 - 6(5) + 8 = 25 - 30 + 8 = 3. A common trap is stopping after 25 - 30."
  },
  {
    id: "fd-q012",
    section: "rw",
    topic: "Main Purpose / Central Idea",
    difficulty: "easy",
    prompt:
      "In many dry regions, farmers have begun using sensors that measure soil moisture below the surface. These devices do not make crops grow by themselves, but they help farmers decide when irrigation is actually needed. As a result, some farms have reduced water use while maintaining similar harvests. The technology is especially useful where water supplies are limited and every unnecessary irrigation cycle matters. What is the central idea of the passage?",
    choices: [
      "Soil sensors can help farmers use water more efficiently.",
      "Dry regions cannot support modern farming.",
      "Sensors make irrigation unnecessary for most crops.",
      "Harvests always increase when farms use new technology."
    ],
    correctAnswer: "Soil sensors can help farmers use water more efficiently.",
    trapType: "too extreme central idea",
    explanation: "The passage says sensors help farmers decide when water is needed, reducing water use while maintaining harvests. The correct answer summarizes that idea without exaggerating."
  },
  {
    id: "fd-q013",
    section: "math",
    topic: "Advanced Math",
    difficulty: "hard",
    prompt: "The equation x^2 - 9x + 20 = 0 has two solutions. What is the greater solution?",
    choices: ["4", "5", "9", "20"],
    correctAnswer: "5",
    trapType: "quadratic factoring error",
    explanation: "Factor the quadratic: x^2 - 9x + 20 = (x - 4)(x - 5). The solutions are 4 and 5, so the greater solution is 5."
  },
  {
    id: "fd-q014",
    section: "rw",
    topic: "Command of Evidence",
    difficulty: "medium",
    prompt:
      "A team of ecologists studied a meadow where native flowers had declined after a nearby road was built. They suspected that fewer bees were reaching the meadow. To test this idea, they counted bee visits in the meadow and in a similar meadow farther from the road. Which finding would best support the team's explanation?",
    choices: [
      "The meadow near the road received far fewer bee visits than the meadow farther away.",
      "Both meadows contained several kinds of native flowers.",
      "The road was used by cars and buses throughout the day.",
      "The meadow farther from the road had slightly rockier soil."
    ],
    correctAnswer: "The meadow near the road received far fewer bee visits than the meadow farther away.",
    trapType: "weak evidence trap",
    explanation: "The explanation depends on reduced bee visits near the road. The correct finding directly compares bee visits in the two meadows and supports that cause."
  },
  {
    id: "fd-q015",
    section: "math",
    topic: "Advanced Math",
    difficulty: "medium",
    prompt: "If p(x) = 3x^2 and p(a) = 75, what positive value of a satisfies the equation?",
    choices: ["5", "15", "25", "72"],
    correctAnswer: "5",
    trapType: "inverse operation error",
    explanation: "Set 3a^2 = 75. Divide by 3 to get a^2 = 25. Since a is positive, a = 5."
  },
  {
    id: "fd-q016",
    section: "rw",
    topic: "Command of Evidence",
    difficulty: "medium",
    prompt:
      "A materials scientist claimed that a new coating helps metal tools last longer in salty environments. She placed coated and uncoated tools of the same size in the same saltwater tank and checked them after six weeks. The tank conditions were kept constant so that the coating would be the main difference. Which result would most directly support her claim?",
    choices: [
      "The coated tools showed less rust than the uncoated tools.",
      "The coated tools were heavier before the test began.",
      "Both sets of tools were stored in the same room before testing.",
      "The uncoated tools were easier to label."
    ],
    correctAnswer: "The coated tools showed less rust than the uncoated tools.",
    trapType: "irrelevant evidence trap",
    explanation: "The claim is about lasting longer in salty environments, so less rust on coated tools directly supports it. The other choices describe setup details or irrelevant differences."
  },
  {
    id: "fd-q017",
    section: "math",
    topic: "Geometry and Trigonometry",
    difficulty: "medium",
    prompt: "A circle has radius 6. Which expression gives its area?",
    choices: ["6pi", "12pi", "36pi", "72pi"],
    correctAnswer: "36pi",
    trapType: "area versus circumference confusion",
    explanation: "The area of a circle is pi r^2. With radius 6, the area is pi times 6^2 = 36pi. The choices 12pi and 6pi come from circumference-related mistakes."
  },
  {
    id: "fd-q018",
    section: "rw",
    topic: "Transitions",
    difficulty: "easy",
    prompt:
      "An engineer tested a small wind turbine on a rooftop over several afternoons. During calm weather, the turbine generated little electricity and could not power even one hallway light. During steady evening winds, ______, it produced enough power to run several lights in the building's hallway for more than an hour.",
    choices: ["however", "therefore", "for example", "similarly"],
    correctAnswer: "however",
    trapType: "transition logic mismatch",
    explanation: "The second sentence contrasts calm weather with steady evening winds, so however is the best transition. Therefore would suggest a result of the first idea, which is not the relationship."
  },
  {
    id: "fd-q019",
    section: "math",
    topic: "Geometry and Trigonometry",
    difficulty: "hard",
    prompt: "In a right triangle, one acute angle measures 30 degrees and the side opposite that angle has length 7. If the hypotenuse has length h, what is h?",
    choices: ["7", "7sqrt(3)", "14", "21"],
    correctAnswer: "14",
    trapType: "30-60-90 ratio error",
    explanation: "In a 30-60-90 triangle, the side opposite 30 degrees is half the hypotenuse. If that side is 7, then h = 14."
  },
  {
    id: "fd-q020",
    section: "rw",
    topic: "Transitions",
    difficulty: "hard",
    prompt:
      "A group of archaeologists used aerial photographs to identify possible settlement sites in farmland that had not been excavated. The images revealed rectangular patterns in several fields, which might have been traces of walls or paths. ______, when the team later visited the fields, they found pottery fragments near the same patterns, strengthening the case that the marks were human-made.",
    choices: ["Additionally", "Nevertheless", "Instead", "In contrast"],
    correctAnswer: "Additionally",
    trapType: "transition logic mismatch",
    explanation: "The field visit adds supporting evidence to the aerial images, so Additionally fits. Nevertheless and In contrast imply opposition, while Instead suggests replacement."
  },
  {
    id: "fd-q021",
    section: "math",
    topic: "Statistics and Probability",
    difficulty: "medium",
    prompt: "The numbers 4, 6, 8, 10, and 22 have a mean of 10. If 22 is removed, what is the mean of the remaining numbers?",
    choices: ["6", "7", "8", "10"],
    correctAnswer: "7",
    trapType: "mean recalculation error",
    explanation: "After removing 22, the remaining numbers are 4, 6, 8, and 10. Their sum is 28, and 28 / 4 = 7."
  },
  {
    id: "fd-q022",
    section: "rw",
    topic: "Rhetorical Synthesis",
    difficulty: "medium",
    prompt:
      "While researching urban trees, a student took these notes: Silver maples grow quickly. Their shallow roots can damage sidewalks. Ginkgo trees grow slowly. Ginkgo roots rarely disturb pavement. City planners often choose trees for narrow streets. The student wants to recommend a tree for narrow streets where sidewalk damage is a concern. Which choice best uses relevant information from the notes?",
    choices: [
      "Because ginkgo roots rarely disturb pavement, ginkgo trees may be a better choice for narrow streets where sidewalk damage is a concern.",
      "Silver maples grow quickly, so they are always the best tree for city planners to plant.",
      "Ginkgo trees grow slowly, and city planners often choose trees for narrow streets.",
      "Silver maples and ginkgo trees are both used in cities for several different reasons."
    ],
    correctAnswer: "Because ginkgo roots rarely disturb pavement, ginkgo trees may be a better choice for narrow streets where sidewalk damage is a concern.",
    trapType: "irrelevant note selection",
    explanation: "The goal is to recommend a tree when sidewalk damage matters. The correct answer selects the relevant note about ginkgo roots and connects it to the planning concern."
  },
  {
    id: "fd-q023",
    section: "math",
    topic: "Statistics and Probability",
    difficulty: "hard",
    prompt: "A bag contains 5 red tiles, 3 blue tiles, and 2 green tiles. If one tile is selected at random, what is the probability that the tile is not blue?",
    choices: ["3/10", "1/2", "7/10", "8/10"],
    correctAnswer: "7/10",
    trapType: "complement probability error",
    explanation: "There are 10 tiles total. Not blue means red or green, which is 5 + 2 = 7 tiles. The probability is 7/10."
  },
  {
    id: "fd-q024",
    section: "rw",
    topic: "Boundaries",
    difficulty: "medium",
    prompt:
      "A laboratory assistant recorded the temperature every ten minutes during the trial. The readings stayed within a narrow range, suggesting that the heating system was stable throughout the experiment. Which choice completes the text so that it conforms to Standard English conventions? The assistant checked the sensor twice ___ the trial continued without interruption.",
    choices: [", and", "; and", "and,", ", but,"],
    correctAnswer: ", and",
    trapType: "punctuation boundary error",
    explanation: "The sentence joins two independent clauses with the coordinating conjunction and, so a comma before and is correct. A semicolon before and is unnecessary, and the other choices create punctuation errors."
  },
  {
    id: "fd-q025",
    section: "math",
    topic: "Word Problem: Linear Model",
    difficulty: "medium",
    prompt: "A printer charges a fixed setup fee plus 900 UZS for each page. A 20-page document costs 23,000 UZS. What is the fixed setup fee?",
    choices: ["5,000 UZS", "9,000 UZS", "18,000 UZS", "23,900 UZS"],
    correctAnswer: "5,000 UZS",
    trapType: "linear model intercept error",
    explanation: "The page charge is 20 x 900 = 18,000 UZS. Subtract this from the total: 23,000 - 18,000 = 5,000 UZS. The fixed setup fee is the intercept of the linear model."
  }
];

function sectionScore(sectionQuestions: DiagnosticQuestion[], answers: DiagnosticAnswers) {
  const earned = sectionQuestions.reduce((total, question) => {
    return total + (answers[question.id] === question.correctAnswer ? difficultyWeight[question.difficulty] : 0);
  }, 0);
  const possible = sectionQuestions.reduce((total, question) => total + difficultyWeight[question.difficulty], 0);
  const ratio = possible ? earned / possible : 0;
  return Math.round((200 + ratio * 600) / 10) * 10;
}

export function calculateDiagnosticResult(answers: DiagnosticAnswers): DiagnosticResult {
  const correct = freeDiagnosticQuestions.filter((question) => answers[question.id] === question.correctAnswer).length;
  const mathQuestions = freeDiagnosticQuestions.filter((question) => question.section === "math");
  const rwQuestions = freeDiagnosticQuestions.filter((question) => question.section === "rw");
  const estimatedMath = sectionScore(mathQuestions, answers);
  const estimatedRw = sectionScore(rwQuestions, answers);
  const estimatedTotal = estimatedMath + estimatedRw;

  const byTopic = new Map<string, { correct: number; total: number }>();
  const trapCounts = new Map<string, number>();
  const missedQuestions: DiagnosticResult["missedQuestions"] = [];

  freeDiagnosticQuestions.forEach((question) => {
    const current = byTopic.get(question.topic) ?? { correct: 0, total: 0 };
    current.total += 1;
    if (answers[question.id] === question.correctAnswer) {
      current.correct += 1;
    } else {
      missedQuestions.push({ question, selectedAnswer: answers[question.id] ?? null });
      if (question.trapType) {
        trapCounts.set(question.trapType, (trapCounts.get(question.trapType) ?? 0) + 1);
      }
    }
    byTopic.set(question.topic, current);
  });

  const topicAccuracy = Array.from(byTopic.entries())
    .map(([topic, value]) => ({
      topic,
      correct: value.correct,
      total: value.total,
      accuracy: value.total ? Math.round((value.correct / value.total) * 100) : 0
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);

  const weakAreas = topicAccuracy
    .filter((item) => item.accuracy < 75)
    .slice(0, 3)
    .map((item) => item.topic);

  const trapTypes = Array.from(trapCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([trap]) => trap);

  return {
    correct,
    total: freeDiagnosticQuestions.length,
    estimatedTotal,
    estimatedMin: Math.max(400, estimatedTotal - 30),
    estimatedMax: Math.min(1600, estimatedTotal + 30),
    estimatedMath,
    estimatedRw,
    topicAccuracy,
    weakAreas: weakAreas.length ? weakAreas : topicAccuracy.slice(0, 2).map((item) => item.topic),
    trapTypes,
    missedQuestions
  };
}
