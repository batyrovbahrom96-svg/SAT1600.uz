// ✅ FINAL BACKEND CONNECTION (NO CONVEX, NO OLD API)

import { Question } from "@/lib/api";

const API_BASE = "https://gleaming-perfection.up.railway.app";

// ---------------------------
// LOAD MODULE
// ---------------------------
useEffect(() => {
  async function load() {
    try {
      const res = await fetch(`${API_BASE}/api/attempts/${attemptId}/module`);

      if (!res.ok) throw new Error("Failed to load module");

      const data = await res.json();
      loadModulePayload(data);

    } catch (err) {
      console.log("Backend error", err);
    }
  }

  if (attemptId) load();
}, [attemptId]);

// ---------------------------
// SAVE ANSWER
// ---------------------------
async function save(questionId: string, value: string) {
  setAnswers((current) => ({ ...current, [questionId]: value }));

  try {
    await fetch(`${API_BASE}/api/attempts/${attemptId}/answers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question_id: questionId,
        selected_answer: value
      })
    });
  } catch (err) {
    console.log("Save error", err);
  }
}

// ---------------------------
// ADVANCE MODULE
// ---------------------------
async function advance() {
  try {
    if (moduleData?.attempt.current_module === 1) {

      await fetch(`${API_BASE}/api/attempts/${attemptId}/finish-module-1`, {
        method: "POST"
      });

      const res = await fetch(`${API_BASE}/api/attempts/${attemptId}/start-module-2`, {
        method: "POST"
      });

      if (!res.ok) throw new Error("Failed to start module 2");

      const data = await res.json();
      loadModulePayload(data);
      return;
    }

    const res = await fetch(`${API_BASE}/api/attempts/${attemptId}/advance`, {
      method: "POST"
    });

    const result = await res.json();

    if (result.status === "completed") {
      router.push(`/results/${attemptId}`);
      return;
    }

    const moduleRes = await fetch(`${API_BASE}/api/attempts/${attemptId}/module`);
    const data = await moduleRes.json();

    loadModulePayload(data);

  } catch (err) {
    console.log("Advance error", err);
  }
}

// ---------------------------
// RESUME FROM BREAK
// ---------------------------
async function resumeFromBreak() {
  try {
    const res = await fetch(`${API_BASE}/api/attempts/${attemptId}/module`);

    if (!res.ok) throw new Error("Failed to resume");

    const data = await res.json();
    loadModulePayload(data);

    setIsBreakActive(false);

  } catch (err) {
    console.log("Resume error", err);
  }
}
