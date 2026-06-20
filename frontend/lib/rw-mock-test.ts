import {
  FULL_MOCK_BANK,
  FULL_MOCK_BANK_VERSION,
  FULL_MOCK_MODULES,
  countCorrect,
  scaleWeightedScore,
  type FullMockProgress,
  type FullMockQuestion,
  type FullMockResult,
} from "@/lib/full-mock-test";

export const RW_MOCK_PROGRESS_KEY = "sattest_rw_mock_progress";
export const RW_MOCK_RESULTS_KEY = "sattest_rw_mock_results";
export const RW_MOCK_TOTAL_QUESTIONS = 54;

export function createReadingWritingMockProgress(): FullMockProgress {
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

export function chooseReadingWritingNextVariant(progress: FullMockProgress) {
  return countCorrect(FULL_MOCK_BANK.rw1, progress.answers) >= 20 ? "hard" : "easy";
}

export function getReadingWritingMockQuestions(progress: FullMockProgress, moduleNumber = progress.currentModule): FullMockQuestion[] {
  if (moduleNumber === 1) return FULL_MOCK_BANK.rw1;
  const variant = progress.moduleVariants?.[2] ?? "easy";
  return variant === "hard" ? FULL_MOCK_BANK.rw2Hard : FULL_MOCK_BANK.rw2Easy;
}

export function allReadingWritingMockQuestions(progress: FullMockProgress) {
  const selectedRw2 = progress.moduleVariants?.[2] === "hard" ? FULL_MOCK_BANK.rw2Hard : FULL_MOCK_BANK.rw2Easy;
  return [...FULL_MOCK_BANK.rw1, ...selectedRw2];
}

export function calculateReadingWritingMockResult(progress: FullMockProgress): FullMockResult {
  const questions = allReadingWritingMockQuestions(progress);
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
  const rwScore = scaleWeightedScore(answers);
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
  return {
    bankVersion: FULL_MOCK_BANK_VERSION,
    completedAt: Date.now(),
    totalScore: rwScore,
    rwScore,
    mathScore: 0,
    weakAreas: topicAccuracy.slice(0, 3).map((item) => item.topic),
    trapTypes: Array.from(new Set(answers.filter((answer) => !answer.isCorrect).map((answer) => answer.trapType))).slice(0, 6),
    answers,
    topicAccuracy,
    email: progress.email,
    paid: false,
  };
}
