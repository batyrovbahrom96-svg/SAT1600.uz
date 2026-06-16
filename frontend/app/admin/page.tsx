"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, Flag, RefreshCw, Save } from "lucide-react";
import { Nav } from "@/components/Nav";
import { api } from "@/lib/api";

type QualityQuestion = {
  id: string;
  section: string;
  module: number;
  topic: string;
  subtopic: string | null;
  prompt: string;
  difficulty: number;
  effective_difficulty: number;
  discrimination_score: number;
  calibration_confidence: number;
  confusion_index: number;
  trap_efficiency: number;
  time_pressure_score: number;
  quality_score: number;
  auto_quality_flag: string;
  calibration_attempts: number;
  percent_correct: number | null;
  average_time: number | null;
  average_hesitation: number | null;
  answer_change_rate: number;
  drop_off_rate: number;
  is_active: boolean;
  validation_status: string;
  validation_notes: string | null;
  distractor_effectiveness: {
    label: string;
    text: string;
    trap_role: string;
    selected_count: number;
    selection_rate: number;
    error_basis: string | null;
  }[];
};

type AdminSubscription = {
  id: string;
  student_name: string;
  email: string;
  plan: string;
  status: string;
  provider: string | null;
  provider_customer_id: string | null;
  payer_full_name: string | null;
  payer_phone: string | null;
  price_amount: number;
  currency: string;
  current_period_start: string | null;
  current_period_end: string | null;
  renewal_reminders_sent: number;
  last_renewal_reminder_at: string | null;
  canceled_at: string | null;
  created_at: string;
};

type AdminPaymentOrder = {
  id: string;
  reference: string;
  student_name: string;
  email: string;
  subscription_type: string;
  amount: number;
  currency: string;
  status: string;
  estimated_score: number | null;
  weak_areas: string[];
  telegram_username: string | null;
  telegram_phone: string | null;
  activation_date: string | null;
  expiry_date: string | null;
  created_at: string;
};

type AdminPaymentOrderSummary = {
  pending: AdminPaymentOrder[];
  activated: AdminPaymentOrder[];
  rejected: AdminPaymentOrder[];
  total_revenue: number;
  currency: string;
  all: AdminPaymentOrder[];
};

export default function AdminPage() {
  const [questions, setQuestions] = useState<QualityQuestion[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [paymentOrders, setPaymentOrders] = useState<AdminPaymentOrderSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    api<QualityQuestion[]>("/api/admin/question-quality").then((data) => {
      setQuestions(data);
      setSelectedId((current) => current || data[0]?.id || null);
    }).catch((err) => setMessage(err.message));
    api<AdminSubscription[]>("/api/admin/subscriptions")
      .then(setSubscriptions)
      .catch((err) => setMessage(err.message));
    api<AdminPaymentOrderSummary>("/api/admin/payment-orders")
      .then(setPaymentOrders)
      .catch((err) => setMessage(err.message));
  }

  useEffect(() => {
    void load();
  }, []);

  const selected = useMemo(() => questions.find((question) => question.id === selectedId) || questions[0], [questions, selectedId]);

  async function updateQuestion(patch: Partial<Pick<QualityQuestion, "difficulty" | "is_active" | "validation_status" | "validation_notes">>) {
    if (!selected) return;
    try {
      const result = await api<Partial<QualityQuestion>>(`/api/admin/questions/${selected.id}/validation`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
      setQuestions((current) => current.map((question) => question.id === selected.id ? { ...question, ...result } : question));
      setMessage("Question updated.");
    } catch (error) {
      console.log("API unavailable, continue");
      setMessage(error instanceof Error ? error.message : "Unable to update question.");
    }
  }

  async function revokeSubscription(subscription: AdminSubscription) {
    const confirmed = window.confirm(
      `Revoke Pro for ${subscription.email}? Use this only after checking Paynet/payment records and confirming the payment did not arrive.`
    );
    if (!confirmed) return;

    try {
      const result = await api<Partial<AdminSubscription>>(`/api/admin/subscriptions/${subscription.id}/revoke`, {
        method: "POST"
      });
      setSubscriptions((current) =>
        current.map((item) => item.id === subscription.id ? { ...item, ...result } : item)
      );
      setMessage(`Pro access revoked for ${subscription.email}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to revoke subscription.");
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-ink">Question quality control</h1>
            <p className="mt-1 text-slate-600">Review telemetry, distractor effectiveness, manual difficulty, and weak item status before public launch.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => api("/api/admin/graphs/sat-set", { method: "POST" }).then(() => setMessage("SAT graph set generated.")).catch((error) => {
              console.log("API unavailable, continue");
              setMessage(error instanceof Error ? error.message : "Unable to generate graphs.");
            })} className="rounded-md border border-slate-300 bg-white px-4 py-3 font-bold text-ink">
              Generate graphs
            </button>
            <button onClick={load} className="flex items-center gap-2 rounded-md bg-brand px-4 py-3 font-bold text-white">
              <RefreshCw size={18} /> Refresh
            </button>
          </div>
        </div>

        {message ? <p className="mt-4 rounded-md bg-blue-50 p-3 font-semibold text-brand">{message}</p> : null}

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-ink">Telegram payment orders</h2>
              <p className="mt-1 text-sm text-slate-600">Pending screenshots, activated subscriptions, and revenue from the Uzbek QR flow.</p>
            </div>
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-right">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Total revenue</p>
              <p className="text-2xl font-black text-emerald-800">
                {(paymentOrders?.total_revenue ?? 0).toLocaleString()} {paymentOrders?.currency ?? "UZS"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatCard label="Pending" value={paymentOrders?.pending.length ?? 0} />
            <StatCard label="Activated" value={paymentOrders?.activated.length ?? 0} />
            <StatCard label="Rejected" value={paymentOrders?.rejected.length ?? 0} />
          </div>

          <div className="mt-4 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="p-3">Reference</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Telegram</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Weak areas</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {paymentOrders?.all.length ? paymentOrders.all.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100">
                    <td className="p-3 font-black text-ink">{order.reference}</td>
                    <td className="p-3">
                      <div className="font-bold text-ink">{order.student_name}</div>
                      <div className="text-xs text-slate-500">{order.email}</div>
                    </td>
                    <td className="p-3 font-bold">{order.subscription_type === "three_month" ? "3 months" : "1 month"}</td>
                    <td className="p-3">{order.amount.toLocaleString()} {order.currency}</td>
                    <td className="p-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-black ${order.status === "approved" ? "bg-emerald-50 text-emerald-700" : order.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {order.telegram_username ? `@${order.telegram_username}` : "n/a"}
                      {order.telegram_phone ? <div className="text-xs">{order.telegram_phone}</div> : null}
                    </td>
                    <td className="p-3 text-slate-600">{order.estimated_score ?? "n/a"}</td>
                    <td className="p-3 text-slate-600">{order.weak_areas?.join(", ") || "n/a"}</td>
                    <td className="p-3 text-slate-600">{new Date(order.created_at).toLocaleString()}</td>
                  </tr>
                )) : (
                  <tr>
                    <td className="p-4 text-slate-500" colSpan={9}>No payment orders yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-ink">Payment fraud control</h2>
              <p className="mt-1 text-sm text-slate-600">
                Review auto-activated Telegram receipts after checking Paynet/payment records. Revoke Pro if the payment did not arrive.
              </p>
            </div>
            <button onClick={load} className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 font-bold text-ink">
              <RefreshCw size={17} /> Refresh payments
            </button>
          </div>

          <div className="mt-4 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="p-3">Student</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Start</th>
                  <th className="p-3">End</th>
                  <th className="p-3">Reminders</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length ? subscriptions.map((subscription) => (
                  <tr key={subscription.id} className="border-b border-slate-100">
                    <td className="p-3">
                      <div className="font-bold text-ink">{subscription.student_name}</div>
                      {subscription.payer_full_name ? <div className="text-xs text-slate-500">Payer: {subscription.payer_full_name}</div> : null}
                    </td>
                    <td className="p-3 text-slate-600">{subscription.email}</td>
                    <td className="p-3 text-slate-600">{subscription.payer_phone || "n/a"}</td>
                    <td className="p-3 font-bold uppercase">{subscription.plan}</td>
                    <td className="p-3">{subscription.price_amount.toLocaleString()} {subscription.currency}</td>
                    <td className="p-3 text-slate-600">{subscription.provider || "n/a"}</td>
                    <td className="p-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-black ${subscription.status === "active" ? "bg-emerald-50 text-emerald-700" : subscription.status === "revoked" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                        {subscription.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{subscription.current_period_start ? new Date(subscription.current_period_start).toLocaleString() : "n/a"}</td>
                    <td className="p-3 text-slate-600">{subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleString() : "n/a"}</td>
                    <td className="p-3 text-slate-600">{subscription.renewal_reminders_sent}/3</td>
                    <td className="p-3">
                      <button
                        className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                        disabled={subscription.status !== "active"}
                        onClick={() => revokeSubscription(subscription)}
                        type="button"
                      >
                        <Ban size={16} /> Revoke Pro
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="p-4 text-slate-500" colSpan={11}>No payment receipts yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-[380px_1fr]">
          <aside className="max-h-[760px] overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            {questions.map((question) => (
              <button
                key={question.id}
                onClick={() => setSelectedId(question.id)}
                className={`block w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50 ${selected?.id === question.id ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-ink">{question.topic}</span>
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${question.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {question.is_active ? "active" : "disabled"}
                  </span>
                </div>
                <p className="mt-2 max-h-10 overflow-hidden text-sm text-slate-600">{question.prompt}</p>
                <div className="mt-3 flex gap-2 text-xs font-bold text-slate-500">
                  <span>L{question.difficulty}</span>
                  <span>{question.auto_quality_flag}</span>
                  <span>{question.validation_status}</span>
                  <span>{question.calibration_attempts} logs</span>
                </div>
              </button>
            ))}
          </aside>

          {selected ? (
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold uppercase tracking-wide text-brand">{selected.section} · module {selected.module}</div>
                  <h2 className="mt-2 text-2xl font-black text-ink">{selected.topic}</h2>
                  <p className="mt-3 max-w-3xl leading-7 text-slate-700">{selected.prompt}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => updateQuestion({ validation_status: "approved", is_active: true })} className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 font-bold text-white">
                    <CheckCircle2 size={17} /> Approve
                  </button>
                  <button onClick={() => updateQuestion({ validation_status: "flagged" })} className="flex items-center gap-2 rounded-md bg-yellow-500 px-3 py-2 font-bold text-white">
                    <Flag size={17} /> Flag
                  </button>
                  <button onClick={() => updateQuestion({ validation_status: "disabled", is_active: false })} className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 font-bold text-white">
                    <Ban size={17} /> Disable
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-4">
                <Metric label="Correct" value={selected.percent_correct === null ? "n/a" : `${Math.round(selected.percent_correct * 100)}%`} />
                <Metric label="Avg time" value={selected.average_time === null ? "n/a" : `${selected.average_time}s`} />
                <Metric label="Hesitation" value={selected.average_hesitation === null ? "n/a" : `${selected.average_hesitation}s`} />
                <Metric label="Changed" value={`${Math.round(selected.answer_change_rate * 100)}%`} />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-5">
                <Metric label="Effective L" value={selected.effective_difficulty.toFixed(1)} />
                <Metric label="Confusion" value={`${Math.round(selected.confusion_index * 100)}%`} />
                <Metric label="Trap balance" value={`${Math.round(selected.trap_efficiency * 100)}%`} />
                <Metric label="Time pressure" value={`${Math.round(selected.time_pressure_score * 100)}%`} />
                <Metric label="Confidence" value={`${Math.round(selected.calibration_confidence * 100)}%`} />
              </div>
              <div className={`mt-4 rounded-md px-3 py-2 text-sm font-black ${selected.auto_quality_flag === "good" ? "bg-emerald-50 text-emerald-700" : selected.auto_quality_flag === "bad" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"}`}>
                Auto quality: {selected.auto_quality_flag} · score {Math.round(selected.quality_score * 100)}%
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="rounded-lg border border-slate-200 p-4">
                  <label className="text-sm font-black">Manual difficulty</label>
                  <input
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
                    type="number"
                    min={1}
                    max={10}
                    defaultValue={selected.difficulty}
                    onBlur={(event) => updateQuestion({ difficulty: Number(event.target.value) })}
                  />
                  <div className="mt-4 text-sm text-slate-600">
                    Discrimination: <span className="font-black">{selected.discrimination_score.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Drop-off: <span className="font-black">{Math.round(selected.drop_off_rate * 100)}%</span>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <label className="text-sm font-black">Validation notes</label>
                  <textarea
                    className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2"
                    defaultValue={selected.validation_notes || ""}
                    onBlur={(event) => updateQuestion({ validation_notes: event.target.value })}
                    placeholder="Write what felt weird, confusing, too easy, or unfair."
                  />
                  <button onClick={() => updateQuestion({ validation_status: "reviewed" })} className="mt-3 flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 font-bold">
                    <Save size={17} /> Mark reviewed
                  </button>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 p-3 font-black">Distractor effectiveness</div>
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="p-3">Choice</th>
                      <th className="p-3">Trap role</th>
                      <th className="p-3">Selected</th>
                      <th className="p-3">Error basis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...selected.distractor_effectiveness].sort((a, b) => a.label.localeCompare(b.label)).map((choice) => (
                      <tr key={choice.label} className="border-b border-slate-100">
                        <td className="p-3 font-bold">{choice.label}. {choice.text}</td>
                        <td className="p-3">{choice.trap_role}</td>
                        <td className="p-3">{choice.selected_count} · {Math.round(choice.selection_rate * 100)}%</td>
                        <td className="p-3 text-slate-600">{choice.error_basis}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-ink">{value}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-ink">{value}</div>
    </div>
  );
}
