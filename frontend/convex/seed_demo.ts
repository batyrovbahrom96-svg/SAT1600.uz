export type Module2Mode = "hard" | "medium";

export type ConvexSatQuestion = {
  id: string;
  module: 1 | 2;
  question_number: number;
  type: string;
  difficulty: number;
  passage: string;
  prompt: string;
  choices: Array<{ label: "A" | "B" | "C" | "D"; text: string }>;
  correct_answer: "A" | "B" | "C" | "D";
};

const answerCycle = ["A", "B", "C", "D"] as const;

function buildQuestion(module: 1 | 2, questionNumber: number, difficulty: number, type: string, correctIndexOffset = 0): ConvexSatQuestion {
  const correct = answerCycle[(questionNumber + correctIndexOffset) % answerCycle.length];
  return {
    id: `rw-m${module}-${type}-${questionNumber}`,
    module,
    question_number: questionNumber,
    type,
    difficulty,
    passage:
      module === 1
        ? "Although the study's first result seemed direct, a later observation introduced a qualification that changed how the evidence should be read."
        : "Although the initial claim appears persuasive, a competing result limits its scope and suggests a more careful interpretation.",
    prompt: "Which choice best completes the text with the most precise logical relationship?",
    choices: answerCycle.map((label) => ({
      label,
      text: label === correct ? "It refines the claim by accounting for the limiting evidence." : distractorText(label),
    })),
    correct_answer: correct,
  };
}

function distractorText(label: string): string {
  const distractors: Record<string, string> = {
    A: "It repeats the claim without addressing the new condition.",
    B: "It treats a limited observation as if it applied generally.",
    C: "It reverses the relationship between the evidence and the claim.",
    D: "It adds a related detail without resolving the logical tension.",
  };
  return distractors[label] ?? distractors.A;
}

export function generateModule1(): ConvexSatQuestion[] {
  const types = ["vocab", "inference", "function", "cross_text", "command_text", "command_graph", "grammar", "transition", "rhetorical"];
  return Array.from({ length: 27 }, (_, index) => {
    const questionNumber = index + 1;
    const difficulty = questionNumber <= 5 ? 3 : questionNumber <= 12 ? 5 : questionNumber <= 18 ? 7 : 8;
    return buildQuestion(1, questionNumber, difficulty, types[index % types.length], 0);
  });
}

export function generateModule2Hard(): ConvexSatQuestion[] {
  const types = [
    "inference",
    "inference",
    "inference",
    "function",
    "function",
    "function",
    "cross_text",
    "cross_text",
    "cross_text",
    "command_text",
    "command_text",
    "command_text",
    "command_graph",
    "command_graph",
    "transition",
    "transition",
    "central_idea",
    "central_idea",
    "central_idea",
    "rhetorical",
    "rhetorical",
    "rhetorical",
    "grammar",
    "grammar",
    "grammar",
    "grammar",
    "grammar",
  ];
  return types.map((type, index) => buildQuestion(2, index + 1, 8 + (index % 3), type, 1));
}

export function generateModule2Medium(): ConvexSatQuestion[] {
  const types = ["inference", "function", "cross_text", "command_text", "command_graph", "transition", "central_idea", "rhetorical", "grammar"];
  return Array.from({ length: 27 }, (_, index) => buildQuestion(2, index + 1, 6 + (index % 3), types[index % types.length], 2));
}

export function correctAnswerForQuestion(questionId: string, module: number, module2Mode: Module2Mode): string {
  const questions = module === 1 ? generateModule1() : module2Mode === "hard" ? generateModule2Hard() : generateModule2Medium();
  const question = questions.find((item) => item.id === questionId);
  if (!question) {
    throw new Error(`Unknown question id: ${questionId}`);
  }
  return question.correct_answer;
}

export function publicQuestions(questions: ConvexSatQuestion[]) {
  return questions.map(({ correct_answer: _correctAnswer, ...question }) => question);
}
