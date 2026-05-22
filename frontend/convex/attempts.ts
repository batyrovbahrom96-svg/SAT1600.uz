import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import { correctAnswerForQuestion, generateModule1, generateModule2Hard, generateModule2Medium, publicQuestions } from "./seed_demo";

const MODULE2_HARD_THRESHOLD = 0.75;

export const startAttempt = mutationGeneric({
  args: {
    user_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("attempts", {
      user_id: args.user_id,
      status: "in_progress",
      module1_correct: 0,
      module1_total: 0,
      module2_mode: "medium",
      module2_started: false,
      module2_correct: 0,
      module2_total: 0,
      created_at: now,
      updated_at: now,
    });
  },
});

export const loadModule1 = queryGeneric({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async (ctx, args) => {
    const attempt = await requireAttempt(ctx, args.attemptId);
    if (attempt.status !== "in_progress") {
      throw new Error("Attempt is not in progress.");
    }
    return {
      module: 1,
      questions: publicQuestions(generateModule1()),
    };
  },
});

export const finishModule1 = mutationGeneric({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async (ctx, args) => {
    await requireAttempt(ctx, args.attemptId);
    const answers = await ctx.db
      .query("attempt_answers")
      .filter((q) => q.and(q.eq(q.field("attempt_id"), args.attemptId), q.eq(q.field("module"), 1)))
      .collect();
    const module1_correct = answers.filter((answer) => answer.is_correct).length;
    const module1_total = generateModule1().length;
    const module1_score = module1_correct / module1_total;
    const module2_mode = module1_score >= MODULE2_HARD_THRESHOLD ? "hard" : "medium";

    await ctx.db.patch(args.attemptId, {
      module1_correct,
      module1_total,
      module2_mode,
      module2_started: false,
      updated_at: Date.now(),
    });

    return {
      module1_correct,
      module1_total,
      module2_started: false,
    };
  },
});

export const startModule2 = mutationGeneric({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async (ctx, args) => {
    const attempt = await requireAttempt(ctx, args.attemptId);
    if (attempt.module1_total <= 0) {
      throw new Error("Module 2 cannot start before Module 1 finishes.");
    }
    const questions = attempt.module2_mode === "hard" ? generateModule2Hard() : generateModule2Medium();

    await ctx.db.patch(args.attemptId, {
      module2_started: true,
      module2_total: questions.length,
      updated_at: Date.now(),
    });

    return {
      module: 2,
      questions: publicQuestions(questions),
    };
  },
});

export const submitAnswer = mutationGeneric({
  args: {
    attemptId: v.id("attempts"),
    questionId: v.string(),
    module: v.number(),
    selectedAnswer: v.string(),
  },
  handler: async (ctx, args) => {
    const attempt = await requireAttempt(ctx, args.attemptId);
    if (args.module === 2 && !attempt.module2_started) {
      throw new Error("Module 2 answers cannot be submitted before Module 2 starts.");
    }

    const correctAnswer = correctAnswerForQuestion(args.questionId, args.module, attempt.module2_mode);
    const isCorrect = args.selectedAnswer === correctAnswer;
    const existing = await ctx.db
      .query("attempt_answers")
      .filter((q) => q.and(q.eq(q.field("attempt_id"), args.attemptId), q.eq(q.field("question_id"), args.questionId)))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        selected_answer: args.selectedAnswer,
        is_correct: isCorrect,
        updated_at: Date.now(),
      });
    } else {
      await ctx.db.insert("attempt_answers", {
        attempt_id: args.attemptId,
        question_id: args.questionId,
        module: args.module,
        selected_answer: args.selectedAnswer,
        is_correct: isCorrect,
        updated_at: Date.now(),
      });
    }

    if (args.module === 2) {
      const module2Answers = await ctx.db
        .query("attempt_answers")
        .filter((q) => q.and(q.eq(q.field("attempt_id"), args.attemptId), q.eq(q.field("module"), 2)))
        .collect();
      await ctx.db.patch(args.attemptId, {
        module2_correct: module2Answers.filter((answer) => answer.is_correct).length,
        module2_total: attempt.module2_total || (attempt.module2_mode === "hard" ? generateModule2Hard().length : generateModule2Medium().length),
        updated_at: Date.now(),
      });
    }

    return { saved: true };
  },
});

export const finishTest = mutationGeneric({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async (ctx, args) => {
    const attempt = await requireAttempt(ctx, args.attemptId);
    if (!attempt.module1_total || !attempt.module2_total) {
      throw new Error("Cannot finish test before both modules have been scored.");
    }
    const module1_score = attempt.module1_correct / attempt.module1_total;
    const module2_score = attempt.module2_correct / attempt.module2_total;
    const final_score = Number((module1_score * 0.4 + module2_score * 0.6).toFixed(4));

    await ctx.db.patch(args.attemptId, {
      final_score,
      status: "completed",
      updated_at: Date.now(),
    });

    return final_score;
  },
});

async function requireAttempt(ctx: any, attemptId: any) {
  const attempt = await ctx.db.get(attemptId);
  if (!attempt) {
    throw new Error("Attempt not found.");
  }
  if (!attempt.module2_mode) {
    throw new Error("Attempt is missing module2_mode.");
  }
  return attempt;
}
