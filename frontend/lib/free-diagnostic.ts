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
  estimatedMathMin: number;
  estimatedMathMax: number;
  estimatedRw: number;
  estimatedRwMin: number;
  estimatedRwMax: number;
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

const sectionRangeMargin = 60;

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
    section: "rw",
    topic: "Rhetorical Synthesis",
    difficulty: "hard",
    prompt:
      "While researching urban heat, a student took these notes: Light-colored roofs reflect more sunlight than dark roofs. A 2021 study of 38 apartment buildings found that buildings with light-colored roofs used less electricity for cooling in July. The effect was strongest on the top floors. Some cities offer rebates to owners who install reflective roofing. The student wants to emphasize a research finding about reflective roofs. Which choice best uses relevant information from the notes?",
    choices: [
      "A 2021 study of 38 apartment buildings found that light-colored roofs reduced July cooling-electricity use, especially on top floors.",
      "Some cities offer rebates to building owners who install roofs that are light-colored and reflective.",
      "Dark roofs and light-colored roofs differ in how much sunlight they reflect during hot weather.",
      "Apartment buildings can have several floors, and the top floors may experience more heat than lower floors."
    ],
    correctAnswer: "A 2021 study of 38 apartment buildings found that light-colored roofs reduced July cooling-electricity use, especially on top floors.",
    trapType: "rhetorical synthesis goal mismatch",
    explanation: "The goal is to emphasize a research finding, so the correct choice includes the study, the sample of 38 buildings, and the result about reduced cooling-electricity use. The other choices use related notes but do not center the research finding."
  },
  {
    id: "fd-q020",
    section: "rw",
    topic: "Cross-Text Connections",
    difficulty: "hard",
    prompt:
      "Text 1: Some literary scholars argue that the short stories of writer Amara N'Diaye should be read primarily as political works. These scholars note that N'Diaye often wrote about labor strikes, migration laws, and public protests.\n\nText 2: Critic Jonas Bell agrees that N'Diaye's stories include political settings, but he argues that their main achievement is psychological. In Bell's view, the stories are most powerful when they show how private doubts and memories shape characters' decisions.\n\nBased on the texts, how would Bell most likely respond to the scholars described in Text 1?",
    choices: [
      "He would say that they overemphasize the political contexts and underemphasize the stories' focus on inner experience.",
      "He would agree that N'Diaye's stories should be read only as records of public protests.",
      "He would argue that N'Diaye avoided political topics entirely in order to focus on family life.",
      "He would claim that the stories are less effective when they describe private doubts and memories."
    ],
    correctAnswer: "He would say that they overemphasize the political contexts and underemphasize the stories' focus on inner experience.",
    trapType: "dual-text disagreement distortion",
    explanation: "Text 2 says Bell acknowledges political settings but sees the main achievement as psychological. Therefore, he would likely object that Text 1's scholars put too much weight on politics and too little on inner experience."
  },
  {
    id: "fd-q021",
    section: "math",
    topic: "Advanced Math",
    difficulty: "hard",
    prompt: "The line y = x + 3 intersects the parabola y = x^2 - 3x - 2 at two points. What is the positive x-coordinate of an intersection point?",
    choices: ["1", "2", "4", "5"],
    correctAnswer: "5",
    trapType: "linear-quadratic system setup error",
    explanation: "Set the expressions for y equal: x + 3 = x^2 - 3x - 2. Subtract x + 3 from both sides to get x^2 - 4x - 5 = 0. Factor: (x - 5)(x + 1) = 0, so x = 5 or x = -1. The positive x-coordinate is 5."
  },
  {
    id: "fd-q022",
    section: "math",
    topic: "Advanced Math",
    difficulty: "hard",
    prompt: "Functions f and g are defined by f(x) = 2x^2 - 3 and g(x) = x - 4. If f(g(a)) = 47 and a > 4, what is the value of a?",
    choices: ["6", "8", "9", "11"],
    correctAnswer: "9",
    trapType: "composite function constraint error",
    explanation: "Since g(a) = a - 4, f(g(a)) = 2(a - 4)^2 - 3. Set 2(a - 4)^2 - 3 = 47, so 2(a - 4)^2 = 50 and (a - 4)^2 = 25. Thus a - 4 = 5 or -5. The constraint a > 4 gives a = 9."
  },
  {
    id: "fd-q023",
    section: "math",
    topic: "Geometry and Trigonometry",
    difficulty: "hard",
    prompt: "A circle in the xy-plane has equation (x - 2)^2 + (y + 3)^2 = 25. Point P lies on the circle and has x-coordinate 5. If P is above the center of the circle, what is the y-coordinate of P?",
    choices: ["-7", "-1", "1", "5"],
    correctAnswer: "1",
    trapType: "circle standard form sign error",
    explanation: "The center is (2, -3) and the radius is 5. Substitute x = 5: (5 - 2)^2 + (y + 3)^2 = 25, so 9 + (y + 3)^2 = 25 and (y + 3)^2 = 16. Thus y = 1 or y = -7. Above the center means y > -3, so y = 1."
  },
  {
    id: "fd-q024",
    section: "rw",
    topic: "Command of Evidence",
    difficulty: "hard",
    prompt:
      "A researcher compared the average water use of four greenhouse crops before and after installing a drip-irrigation system.\n\nCrop | Before installation | After installation\nTomatoes | 18 liters/day | 12 liters/day\nCucumbers | 16 liters/day | 13 liters/day\nPeppers | 15 liters/day | 10 liters/day\nLettuce | 10 liters/day | 8 liters/day\n\nThe researcher claims that the system reduced water use for every crop studied, but that the size of the reduction varied by crop. Which choice best supports the claim?",
    choices: [
      "All four crops used fewer liters per day after installation, and the reductions ranged from 2 liters per day for lettuce to 6 liters per day for tomatoes.",
      "Tomatoes used 18 liters per day before installation, which was more than any other crop used before installation.",
      "After installation, cucumbers used 13 liters per day, which was more than peppers and lettuce used after installation.",
      "Lettuce used less water than tomatoes both before and after the drip-irrigation system was installed."
    ],
    correctAnswer: "All four crops used fewer liters per day after installation, and the reductions ranged from 2 liters per day for lettuce to 6 liters per day for tomatoes.",
    trapType: "data table evidence mismatch",
    explanation: "The claim has two parts: every crop used less water, and the reductions varied. The correct choice checks all four before-after pairs and gives different reduction sizes, directly supporting both parts."
  },
  {
    id: "fd-q025",
    section: "math",
    topic: "Advanced Math",
    difficulty: "hard",
    prompt: "The function h is defined by h(t) = 800(1.15)^t, where t is the number of years after an initial measurement. Which statement best describes the meaning of 1.15 in this function?",
    choices: [
      "The value of h increases by 15% each year.",
      "The value of h increases by 115% each year.",
      "The initial value of h is 1.15.",
      "The value of h increases by 15 units each year."
    ],
    correctAnswer: "The value of h increases by 15% each year.",
    trapType: "exponential percent interpretation error",
    explanation: "In an exponential model of the form initial value times (1 + r)^t, the base 1.15 means the quantity is multiplied by 1.15 each year. That is a 15% increase each year, not a 115% increase or a constant increase of 15 units."
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

function sectionScoreRange(score: number) {
  return {
    min: Math.max(200, Math.round((score - sectionRangeMargin) / 10) * 10),
    max: Math.min(800, Math.round((score + sectionRangeMargin) / 10) * 10)
  };
}

export function calculateDiagnosticResult(answers: DiagnosticAnswers): DiagnosticResult {
  const correct = freeDiagnosticQuestions.filter((question) => answers[question.id] === question.correctAnswer).length;
  const mathQuestions = freeDiagnosticQuestions.filter((question) => question.section === "math");
  const rwQuestions = freeDiagnosticQuestions.filter((question) => question.section === "rw");
  const estimatedMath = sectionScore(mathQuestions, answers);
  const estimatedRw = sectionScore(rwQuestions, answers);
  const estimatedTotal = estimatedMath + estimatedRw;
  const estimatedMathRange = sectionScoreRange(estimatedMath);
  const estimatedRwRange = sectionScoreRange(estimatedRw);

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
    estimatedMathMin: estimatedMathRange.min,
    estimatedMathMax: estimatedMathRange.max,
    estimatedRw,
    estimatedRwMin: estimatedRwRange.min,
    estimatedRwMax: estimatedRwRange.max,
    topicAccuracy,
    weakAreas: weakAreas.length ? weakAreas : topicAccuracy.slice(0, 2).map((item) => item.topic),
    trapTypes,
    missedQuestions
  };
}
