import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  attempts: defineTable({
    user_id: v.optional(v.string()),
    status: v.union(v.literal("in_progress"), v.literal("completed")),
    module1_correct: v.number(),
    module1_total: v.number(),
    module2_mode: v.union(v.literal("hard"), v.literal("medium")),
    module2_started: v.boolean(),
    module2_correct: v.number(),
    module2_total: v.number(),
    final_score: v.optional(v.number()),
    created_at: v.number(),
    updated_at: v.number(),
  }).index("by_user", ["user_id"]),

  attempt_answers: defineTable({
    attempt_id: v.id("attempts"),
    question_id: v.string(),
    module: v.number(),
    selected_answer: v.string(),
    is_correct: v.boolean(),
    updated_at: v.number(),
  })
    .index("by_attempt", ["attempt_id"])
    .index("by_attempt_module", ["attempt_id", "module"])
    .index("by_attempt_question", ["attempt_id", "question_id"]),
});
