"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, Question, api } from "@/lib/api";

type ModulePayload = {
  questions: Question[];
};

export default function TestPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // =========================
  // LOAD MODULE
  // =========================
  useEffect(() => {
    async function load() {
      setLoading(true);
      setMessage("");

      try {
        const data = await api<ModulePayload>(`/api/attempts/${attemptId}/module`);
        setQuestions(data.questions);
        if (!data.questions.length) {
          setMessage("No questions are available for this module yet.");
        }
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.push("/login");
          return;
        }

        console.log("Load error:", err);
        setMessage(err instanceof Error ? err.message : "Unable to load this test module.");
      } finally {
        setLoading(false);
      }
    }

    if (attemptId) load();
  }, [attemptId, router]);

  // =========================
  // SAVE ANSWER
  // =========================
  async function save(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

    try {
      await api(`/api/attempts/${attemptId}/answers`, {
        method: "POST",
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
      setMessage("");

      const result = await api<{ status?: string }>(`/api/attempts/${attemptId}/advance`, {
        method: "POST"
      });

      if (result.status === "completed") {
        router.push(`/results/${attemptId}`);
        return;
      }

      const data = await api<ModulePayload>(`/api/attempts/${attemptId}/module`);
      setQuestions(data.questions);
      if (!data.questions.length) {
        setMessage("No questions are available for this module yet.");
      }

    } catch (err) {
      console.log("Advance error:", err);
      setMessage(err instanceof Error ? err.message : "Unable to advance to the next module.");
    }
  }

  // =========================
  // UI
  // =========================
  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  if (message && !questions.length) {
    return <div style={{ padding: 40 }}>{message}</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Test</h1>
      {message ? <p style={{ color: "#b45309" }}>{message}</p> : null}

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
