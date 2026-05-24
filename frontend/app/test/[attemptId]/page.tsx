"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = "https://gleaming-perfection.up.railway.app";

export default function TestPage({ params }: { params: { attemptId: string } }) {
  const attemptId = params.attemptId;
  const router = useRouter();

  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // =========================
  // LOAD MODULE
  // =========================
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/attempts/${attemptId}/module`);

        if (!res.ok) throw new Error("Failed to load module");

        const data = await res.json();
        setQuestions(data.questions);

      } catch (err) {
        console.log("Load error:", err);
      }
    }

    if (attemptId) load();
  }, [attemptId]);

  // =========================
  // SAVE ANSWER
  // =========================
  async function save(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

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
      console.log("Save error:", err);
    }
  }

  // =========================
  // ADVANCE MODULE
  // =========================
  async function advance() {
    try {
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

      setQuestions(data.questions);

    } catch (err) {
      console.log("Advance error:", err);
    }
  }

  // =========================
  // UI
  // =========================
  if (!questions.length) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Test</h1>

      {questions.map((q, index) => (
        <div key={q.id} style={{ marginBottom: 20 }}>
          <p><strong>{index + 1}. {q.prompt}</strong></p>

          {q.choices?.map((c: any) => (
            <button
              key={c.label}
              onClick={() => save(q.id, c.label)}
              style={{
                display: "block",
                marginBottom: 8,
                background: answers[q.id] === c.label ? "#3b82f6" : "#eee",
                color: answers[q.id] === c.label ? "white" : "black",
                padding: 10
              }}
            >
              {c.label}. {c.text}
            </button>
          ))}
        </div>
      ))}

      <button onClick={advance} style={{ padding: 12, marginTop: 20 }}>
        Next Module
      </button>
    </div>
  );
}

