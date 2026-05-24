import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const API_BASE = "https://gleaming-perfection.up.railway.app";

// -----------------------------------
// START ATTEMPT (BACKEND)
// -----------------------------------
export const startAttempt = mutationGeneric({
  args: {
    user_id: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(`${API_BASE}/attempts/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: args.user_id,
      }),
    });

    const data = await response.json();

    return data;
  },
});

// -----------------------------------
// LOAD MODULE 1 (FROM BACKEND)
// -----------------------------------
export const loadModule1 = queryGeneric({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(`${API_BASE}/module`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attempt_id: args.attemptId,
        section: "math",
        module: 1,
      }),
    });

    const data = await response.json();

    return {
      module: 1,
      questions: data.questions,
    };
  },
});

// -----------------------------------
// FINISH MODULE 1
// -----------------------------------
export const finishModule1 = mutationGeneric({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(`${API_BASE}/finish-module-1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attempt_id: args.attemptId,
      }),
    });

    return await response.json();
  },
});

// -----------------------------------
// START MODULE 2
// -----------------------------------
export const startModule2 = mutationGeneric({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(`${API_BASE}/start-module-2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attempt_id: args.attemptId,
      }),
    });

    const data = await response.json();

    return {
      module: 2,
      questions: data.questions,
    };
  },
});

// -----------------------------------
// SUBMIT ANSWER
// -----------------------------------
export const submitAnswer = mutationGeneric({
  args: {
    attemptId: v.id("attempts"),
    questionId: v.string(),
    module: v.number(),
    selectedAnswer: v.string(),
  },
  handler: async (_ctx, args) => {
    await fetch(`${API_BASE}/submit-answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attempt_id: args.attemptId,
        question_id: args.questionId,
        module: args.module,
        answer: args.selectedAnswer,
      }),
    });

    return { saved: true };
  },
});

// -----------------------------------
// FINISH TEST
// -----------------------------------
export const finishTest = mutationGeneric({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(`${API_BASE}/finish-test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attempt_id: args.attemptId,
      }),
    });

    return await response.json();
  },
});
