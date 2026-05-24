// 🔴 REMOVE THIS IMPORT
// import { API_URL, ApiError, Question, api } from "@/lib/api";

import { Question } from "@/lib/api";

const API_BASE = "https://gleaming-perfection.up.railway.app";

// ---------------------------
// LOAD MODULE (FULLY WORKING)
// ---------------------------
useEffect(() => {
  async function load() {
    try {
      const res = await fetch(`${API_BASE}/module`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          attempt_id: attemptId
        })
      });

      const data = await res.json();
      loadModulePayload(data);

    } catch (err) {
      console.log("Backend error", err);
    }
  }

  load();
}, [attemptId]);

// ---------------------------
// SAVE ANSWER
// ---------------------------
async function save(questionId: string, value: string) {
  setAnswers((current) => ({ ...current, [questionId]: value }));

  await fetch(`${API_BASE}/answers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      attempt_id: attemptId,
      question_id: questionId,
      selected_answer: value
    })
  });
}

// ---------------------------
// ADVANCE MODULE
// ---------------------------
async function advance() {
  try {
    if (moduleData?.attempt.current_module === 1) {
      await fetch(`${API_BASE}/finish-module-1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          attempt_id: attemptId
        })
      });

      const res = await fetch(`${API_BASE}/start-module-2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          attempt_id: attemptId
        })
      });

      const data = await res.json();
      loadModulePayload(data);
      return;
    }

    const res = await fetch(`${API_BASE}/advance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        attempt_id: attemptId
      })
    });

    const result = await res.json();

    if (result.status === "completed") {
      router.push(`/results/${attemptId}`);
      return;
    }

    const moduleRes = await fetch(`${API_BASE}/module`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        attempt_id: attemptId
      })
    });

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
    const res = await fetch(`${API_BASE}/module`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        attempt_id: attemptId
      })
    });

    const data = await res.json();
    loadModulePayload(data);
    setIsBreakActive(false);

  } catch {
    console.log("Backend error");
  }
}
