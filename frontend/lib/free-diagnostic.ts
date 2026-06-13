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
    prompt: "If 3x + 7 = 22, what is the value of x?",
    choices: ["3", "5", "7", "15"],
    correctAnswer: "5",
    trapType: "linear equation setup error",
    explanation: "Subtract 7 from both sides to get 3x = 15, then divide by 3. The value of x is 5."
  },
  {
    id: "fd-q002",
    section: "rw",
    topic: "Boundaries",
    difficulty: "easy",
    prompt: "Which choice completes the sentence correctly? The experiment was repeated ___ the first result was unusual.",
    choices: [", because", "; because", "because,", ", and because,"],
    correctAnswer: ", because",
    trapType: "comma boundary error",
    explanation: "The because-clause gives a reason and is dependent, so a comma before because is acceptable here. A semicolon would incorrectly separate a dependent clause as if it were independent."
  },
  {
    id: "fd-q003",
    section: "math",
    topic: "Problem Solving and Data Analysis",
    difficulty: "medium",
    prompt: "A jacket costs 160,000 UZS after a 20% discount. What was the original price?",
    choices: ["180,000", "192,000", "200,000", "220,000"],
    correctAnswer: "200,000",
    trapType: "percent base error",
    explanation: "After a 20% discount, the sale price is 80% of the original. Solve 0.8x = 160,000, so x = 200,000."
  },
  {
    id: "fd-q004",
    section: "rw",
    topic: "Transitions",
    difficulty: "easy",
    prompt: "The student knew the formula. ___, she lost points because she copied the sign incorrectly.",
    choices: ["Therefore", "However", "For example", "Similarly"],
    correctAnswer: "However",
    trapType: "transition logic mismatch",
    explanation: "The second sentence contrasts knowing the formula with losing points, so However is the logical transition."
  },
  {
    id: "fd-q005",
    section: "math",
    topic: "Algebra",
    difficulty: "medium",
    prompt: "If 2(y - 4) = 18, what is y?",
    choices: ["5", "9", "13", "22"],
    correctAnswer: "13",
    trapType: "distribution error",
    explanation: "Divide both sides by 2 to get y - 4 = 9. Add 4, so y = 13."
  },
  {
    id: "fd-q006",
    section: "rw",
    topic: "Command of Evidence",
    difficulty: "medium",
    prompt: "A study found that students who reviewed missed questions improved more than students who only watched new lessons. Which choice best states the finding?",
    choices: [
      "New lessons are useless for SAT preparation.",
      "Reviewing mistakes can be more effective than only adding new content.",
      "Students should stop taking practice tests.",
      "SAT scores improve only when students study daily."
    ],
    correctAnswer: "Reviewing mistakes can be more effective than only adding new content.",
    trapType: "overstatement trap",
    explanation: "The finding compares mistake review with only watching new lessons. The correct answer keeps that relationship without exaggerating it."
  },
  {
    id: "fd-q007",
    section: "math",
    topic: "Advanced Math",
    difficulty: "hard",
    prompt: "If f(x) = |x - 4x|, what positive value of a makes f(5) - f(a) = -15?",
    choices: ["5", "10", "15", "30"],
    correctAnswer: "10",
    trapType: "absolute value sign error",
    explanation: "Simplify f(x) to |-3x|. Then f(5) = 15. Since 15 - f(a) = -15, f(a) = 30. Therefore |-3a| = 30, so the positive value is 10."
  },
  {
    id: "fd-q008",
    section: "rw",
    topic: "Information and Ideas",
    difficulty: "medium",
    prompt: "A passage says a plant grew faster in shade than in direct sunlight. Which conclusion is best supported?",
    choices: [
      "All plants grow best in shade.",
      "This plant may be better adapted to lower-light conditions.",
      "Sunlight prevents every plant from growing.",
      "The plant does not need water."
    ],
    correctAnswer: "This plant may be better adapted to lower-light conditions.",
    trapType: "too broad conclusion",
    explanation: "The evidence is about one plant and one condition. The correct choice stays cautious and does not generalize to all plants."
  },
  {
    id: "fd-q009",
    section: "math",
    topic: "Geometry and Trigonometry",
    difficulty: "easy",
    prompt: "A right triangle has legs of length 6 and 8. What is the hypotenuse?",
    choices: ["10", "12", "14", "48"],
    correctAnswer: "10",
    trapType: "formula selection error",
    explanation: "Use the Pythagorean theorem: 6 squared plus 8 squared equals 100, and the square root of 100 is 10."
  },
  {
    id: "fd-q010",
    section: "rw",
    topic: "Words in Context",
    difficulty: "medium",
    prompt: "In the sentence 'The results were consistent across all three trials,' what does consistent most nearly mean?",
    choices: ["Expensive", "Similar", "Surprising", "Temporary"],
    correctAnswer: "Similar",
    trapType: "context mismatch",
    explanation: "Across trials, consistent means the results were similar or stable, not expensive or temporary."
  },
  {
    id: "fd-q011",
    section: "math",
    topic: "Functions",
    difficulty: "medium",
    prompt: "If g(x) = 2x + 3, what is g(7)?",
    choices: ["10", "14", "17", "20"],
    correctAnswer: "17",
    trapType: "function substitution error",
    explanation: "Substitute 7 for x: g(7) = 2(7) + 3 = 17."
  },
  {
    id: "fd-q012",
    section: "rw",
    topic: "Rhetorical Synthesis",
    difficulty: "medium",
    prompt: "A student wants to emphasize that an invention became popular quickly. Which sentence best does this?",
    choices: [
      "The invention was designed in a small workshop.",
      "Within two months, thousands of people were using the invention.",
      "The inventor had studied engineering.",
      "The invention was made from common materials."
    ],
    correctAnswer: "Within two months, thousands of people were using the invention.",
    trapType: "goal mismatch",
    explanation: "The goal is to show quick popularity. The correct answer gives both a short time period and many users."
  },
  {
    id: "fd-q013",
    section: "math",
    topic: "Algebra",
    difficulty: "medium",
    prompt: "A line has slope 4 and passes through (2, 11). Which equation represents the line?",
    choices: ["y = 4x + 3", "y = 4x - 3", "y = 2x + 11", "y = 11x + 4"],
    correctAnswer: "y = 4x + 3",
    trapType: "slope intercept setup error",
    explanation: "Use y = mx + b. Substitute (2, 11): 11 = 4(2) + b, so b = 3. The equation is y = 4x + 3."
  },
  {
    id: "fd-q014",
    section: "rw",
    topic: "Inference",
    difficulty: "hard",
    prompt: "A passage states that a city added buses but traffic did not improve because many drivers did not change their habits. What can reasonably be inferred?",
    choices: [
      "Adding buses alone may not reduce traffic if drivers continue using cars.",
      "Public transportation never reduces traffic.",
      "The city removed all roads.",
      "Drivers prefer buses to cars."
    ],
    correctAnswer: "Adding buses alone may not reduce traffic if drivers continue using cars.",
    trapType: "causal gap trap",
    explanation: "The passage links unchanged driver behavior to unchanged traffic. The correct inference is cautious and explains why buses alone were not enough."
  },
  {
    id: "fd-q015",
    section: "math",
    topic: "Problem Solving and Data Analysis",
    difficulty: "hard",
    prompt: "A class average increased from 70 to 77. By what percent did the average increase?",
    choices: ["7%", "10%", "11%", "77%"],
    correctAnswer: "10%",
    trapType: "percent base error",
    explanation: "The increase is 7. Percent increase uses the original value: 7 divided by 70 equals 0.10, or 10%."
  },
  {
    id: "fd-q016",
    section: "rw",
    topic: "Boundaries",
    difficulty: "medium",
    prompt: "Which choice completes the sentence correctly? The data were incomplete ___ the team delayed its conclusion.",
    choices: [", the", "; therefore, the", "therefore the", ", therefore, the"],
    correctAnswer: "; therefore, the",
    trapType: "comma splice",
    explanation: "Both parts are complete sentences. A semicolon plus therefore correctly joins the ideas."
  },
  {
    id: "fd-q017",
    section: "math",
    topic: "Advanced Math",
    difficulty: "medium",
    prompt: "If x squared = 49 and x is negative, what is x?",
    choices: ["-49", "-7", "7", "49"],
    correctAnswer: "-7",
    trapType: "square root sign error",
    explanation: "The solutions to x squared = 49 are 7 and -7. The condition says x is negative, so x = -7."
  },
  {
    id: "fd-q018",
    section: "rw",
    topic: "Text Structure and Purpose",
    difficulty: "medium",
    prompt: "A paragraph first presents a common belief and then gives evidence against it. What is the main purpose of the paragraph?",
    choices: [
      "To define a technical term",
      "To challenge an assumption",
      "To list unrelated facts",
      "To describe a personal memory"
    ],
    correctAnswer: "To challenge an assumption",
    trapType: "structure purpose mismatch",
    explanation: "The paragraph introduces a belief and then argues against it, so its purpose is to challenge an assumption."
  },
  {
    id: "fd-q019",
    section: "math",
    topic: "Geometry and Trigonometry",
    difficulty: "medium",
    prompt: "The area of a rectangle is 54. Its length is 9. What is its width?",
    choices: ["6", "9", "45", "63"],
    correctAnswer: "6",
    trapType: "area formula error",
    explanation: "Area equals length times width. Solve 54 = 9w, so w = 6."
  },
  {
    id: "fd-q020",
    section: "rw",
    topic: "Transitions",
    difficulty: "hard",
    prompt: "The first method was inexpensive but slow. The second method required more equipment; ___, it produced results in half the time.",
    choices: ["however", "for instance", "similarly", "in other words"],
    correctAnswer: "however",
    trapType: "transition logic mismatch",
    explanation: "The sentence contrasts extra equipment with faster results, so however is the correct transition."
  },
  {
    id: "fd-q021",
    section: "math",
    topic: "Functions",
    difficulty: "hard",
    prompt: "If h(x) = x squared - 5 and h(a) = 20, what positive value can a have?",
    choices: ["3", "5", "15", "25"],
    correctAnswer: "5",
    trapType: "inverse operation error",
    explanation: "Set a squared - 5 = 20. Then a squared = 25. The positive value of a is 5."
  },
  {
    id: "fd-q022",
    section: "rw",
    topic: "Command of Evidence",
    difficulty: "medium",
    prompt: "Which finding would best support the claim that daily short practice is more effective than one long weekly session?",
    choices: [
      "Students who practiced 20 minutes daily improved more than students who practiced two hours once a week.",
      "Some students dislike long practice sessions.",
      "Weekly practice sessions can include many topics.",
      "Daily practice requires a schedule."
    ],
    correctAnswer: "Students who practiced 20 minutes daily improved more than students who practiced two hours once a week.",
    trapType: "weak evidence trap",
    explanation: "The correct answer directly compares daily short practice with one long weekly session and measures improvement."
  },
  {
    id: "fd-q023",
    section: "math",
    topic: "Problem Solving and Data Analysis",
    difficulty: "easy",
    prompt: "A student answered 18 out of 24 questions correctly. What fraction of the questions did the student answer correctly?",
    choices: ["1/4", "1/2", "3/4", "4/3"],
    correctAnswer: "3/4",
    trapType: "fraction simplification error",
    explanation: "18 out of 24 is 18/24. Divide numerator and denominator by 6 to get 3/4."
  },
  {
    id: "fd-q024",
    section: "rw",
    topic: "Words in Context",
    difficulty: "easy",
    prompt: "In the sentence 'The teacher revised the plan after seeing the results,' what does revised most nearly mean?",
    choices: ["Changed", "Forgot", "Copied", "Rejected forever"],
    correctAnswer: "Changed",
    trapType: "context mismatch",
    explanation: "To revise a plan is to change or adjust it, usually to improve it."
  },
  {
    id: "fd-q025",
    section: "math",
    topic: "Algebra",
    difficulty: "medium",
    prompt: "If 5x - 10 = 2x + 8, what is x?",
    choices: ["3", "4", "6", "18"],
    correctAnswer: "6",
    trapType: "linear equation setup error",
    explanation: "Subtract 2x from both sides to get 3x - 10 = 8. Add 10 to get 3x = 18. Divide by 3, so x = 6."
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
