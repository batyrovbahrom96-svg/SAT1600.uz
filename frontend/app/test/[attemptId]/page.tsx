"use client";

import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Script from "next/script";
import { Ban, Bookmark, BookOpen, Calculator as CalculatorIcon, ChevronLeft, ChevronRight, Flag, X, Undo2 } from "lucide-react";
import { API_URL, ApiError, Question, api } from "@/lib/api";

type ModulePayload = {
  attempt: { id: string; current_section: string; current_module: number; status: string; route: Record<string, unknown> };
  duration_seconds: number;
  questions: Question[];
  answers: Record<string, { selected_answer: string | null; marked_for_review: boolean; time_spent_seconds: number }>;
};

type GraphSeries = {
  name: string;
  values: [number, number][];
};

type GraphPayload = {
  x_label: string;
  y_label: string;
  series: GraphSeries[];
};

type HighlightType = "yellow" | "blue" | "pink" | "underline";

type PassageHighlight = {
  id: string;
  startOffset: number;
  endOffset: number;
  textContent: string;
  type: HighlightType;
};

type HighlightToolbar = {
  visible: boolean;
  x: number;
  y: number;
};

type AnswerAction = {
  type: "select" | "eliminate";
  value: string;
};

type StoredAnswerState = {
  selectedAnswer: string | null;
  eliminatedAnswers: string[];
};

type TestModal = "shortcuts" | "help" | null;
type CalculatorMode = "graphing" | "scientific";
type DesmosCalculatorInstance = {
  destroy: () => void;
};

declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: (element: HTMLElement, options?: Record<string, unknown>) => DesmosCalculatorInstance;
      ScientificCalculator: (element: HTMLElement, options?: Record<string, unknown>) => DesmosCalculatorInstance;
    };
  }
}

const highlightStyles: Record<HighlightType, string> = {
  yellow: "background-color: #fde68a;",
  blue: "background-color: #bfdbfe;",
  pink: "background-color: #fbcfe8;",
  underline: "text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 2px;"
};

const passageLayoutContract = {
  maxWidthPx: 580,
  minReadableWidthPx: 500,
  lineHeight: 1.65,
  blockGapPx: 16
};
const BREAK_DURATION_SECONDS = 10 * 60;

if (
  passageLayoutContract.maxWidthPx < passageLayoutContract.minReadableWidthPx
  || passageLayoutContract.lineHeight < 1.5
  || passageLayoutContract.blockGapPx < 16
) {
  throw new Error("Invalid passage layout contract for Bluebook-style reading.");
}

function isGraphPayload(payload: Question["data_payload"]): payload is GraphPayload {
  return Boolean(
    payload
    && typeof payload.x_label === "string"
    && typeof payload.y_label === "string"
    && Array.isArray(payload.series)
    && payload.series.length > 0
    && payload.series.every((series) => (
      typeof series?.name === "string"
      && Array.isArray(series.values)
      && series.values.length > 1
      && series.values.every((point) => (
        Array.isArray(point)
        && point.length === 2
        && typeof point[0] === "number"
        && typeof point[1] === "number"
      ))
    ))
  );
}

function DataGraph({ payload }: { payload: GraphPayload }) {
  const width = 560;
  const height = 320;
  const padding = { top: 24, right: 32, bottom: 54, left: 58 };
  const colors = ["#2563eb", "#16a34a", "#dc2626", "#7c3aed"];
  const points = payload.series.flatMap((series) => series.values);
  const xValues = points.map(([x]) => x);
  const yValues = points.map(([, y]) => y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(0, ...yValues);
  const maxY = Math.max(...yValues);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const scaleX = (value: number) => padding.left + ((value - minX) / Math.max(1, maxX - minX)) * plotWidth;
  const scaleY = (value: number) => padding.top + (1 - ((value - minY) / Math.max(1, maxY - minY))) * plotHeight;
  const xTicks = Array.from(new Set(xValues)).sort((a, b) => a - b);
  const yTicks = [minY, Math.round((minY + maxY) / 2), maxY];

  return (
    <figure className="mt-8 w-full max-w-[580px]" aria-label="Graph data">
      <svg className="h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img">
        <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke="#6b7280" />
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="#6b7280" />
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line x1={padding.left - 5} x2={width - padding.right} y1={scaleY(tick)} y2={scaleY(tick)} stroke="#e5e7eb" />
            <text x={padding.left - 10} y={scaleY(tick) + 4} textAnchor="end" className="fill-slate-600 text-[12px]">
              {tick}
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <g key={`x-${tick}`}>
            <line x1={scaleX(tick)} x2={scaleX(tick)} y1={height - padding.bottom} y2={height - padding.bottom + 5} stroke="#6b7280" />
            <text x={scaleX(tick)} y={height - padding.bottom + 22} textAnchor="middle" className="fill-slate-600 text-[12px]">
              {tick}
            </text>
          </g>
        ))}
        {payload.series.map((series, seriesIndex) => {
          const color = colors[seriesIndex % colors.length];
          const linePoints = series.values.map(([x, y]) => `${scaleX(x)},${scaleY(y)}`).join(" ");
          return (
            <g key={series.name}>
              <polyline fill="none" points={linePoints} stroke={color} strokeWidth={3} />
              {series.values.map(([x, y]) => (
                <circle cx={scaleX(x)} cy={scaleY(y)} fill="white" key={`${series.name}-${x}-${y}`} r={4} stroke={color} strokeWidth={2} />
              ))}
            </g>
          );
        })}
        <text x={padding.left + plotWidth / 2} y={height - 12} textAnchor="middle" className="fill-slate-700 text-[13px] font-semibold">
          {payload.x_label}
        </text>
        <text transform={`translate(16 ${padding.top + plotHeight / 2}) rotate(-90)`} textAnchor="middle" className="fill-slate-700 text-[13px] font-semibold">
          {payload.y_label}
        </text>
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">
        {payload.series.map((series, index) => (
          <span className="inline-flex items-center gap-2" key={series.name}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
            {series.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

function CalculatorModal({
  open,
  onClose,
  scriptReady,
  scriptFailed
}: {
  open: boolean;
  onClose: () => void;
  scriptReady: boolean;
  scriptFailed: boolean;
}) {
  const [mode, setMode] = useState<CalculatorMode>("graphing");
  const [initError, setInitError] = useState<string | null>(null);
  const calculatorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !scriptReady || !window.Desmos || !calculatorRef.current) return;

    let disposed = false;
    let calculator: DesmosCalculatorInstance | null = null;
    calculatorRef.current.innerHTML = "";
    setInitError(null);

    const frame = window.requestAnimationFrame(() => {
      if (disposed || !window.Desmos || !calculatorRef.current) return;
      try {
        calculator = mode === "graphing"
          ? window.Desmos.GraphingCalculator(calculatorRef.current, {
            expressions: true,
            settingsMenu: false,
            zoomButtons: true,
            keypad: true
          })
          : window.Desmos.ScientificCalculator(calculatorRef.current);
      } catch (error) {
        setInitError(error instanceof Error ? error.message : "Calculator could not be initialized.");
      }
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      calculator?.destroy();
      if (calculatorRef.current) calculatorRef.current.innerHTML = "";
    };
  }, [mode, open, scriptReady]);

  useEffect(() => {
    if (!open || scriptReady || scriptFailed) return;
    const timeout = window.setTimeout(() => {
      setInitError("Calculator is still loading. Please close and reopen it after the page finishes loading.");
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [open, scriptFailed, scriptReady]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-slate-950/15 p-5" role="dialog" aria-modal="true" aria-label="Calculator">
      <div className="flex h-[620px] w-full max-w-[560px] flex-col overflow-hidden rounded-md border border-[#d1d5db] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-slate-50 px-4 py-3">
          <div className="inline-flex rounded-md border border-[#d1d5db] bg-white p-1 text-sm font-semibold text-slate-700">
            <button
              className={`rounded px-3 py-1.5 ${mode === "graphing" ? "bg-blue-700 text-white" : "hover:bg-slate-100"}`}
              onClick={() => setMode("graphing")}
              type="button"
            >
              Graphing
            </button>
            <button
              className={`rounded px-3 py-1.5 ${mode === "scientific" ? "bg-blue-700 text-white" : "hover:bg-slate-100"}`}
              onClick={() => setMode("scientific")}
              type="button"
            >
              Scientific
            </button>
          </div>
          <button
            aria-label="Close calculator"
            className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          {scriptFailed ? (
            <div className="absolute inset-0 grid place-items-center px-8 text-center text-sm font-semibold leading-6 text-red-700">
              Desmos could not load. Check the network connection and reload the page.
            </div>
          ) : !scriptReady ? (
            <div className="absolute inset-0 grid place-items-center text-sm font-semibold text-slate-600">
              Loading calculator...
            </div>
          ) : initError ? (
            <div className="absolute inset-0 grid place-items-center px-8 text-center text-sm font-semibold leading-6 text-red-700">
              {initError}
            </div>
          ) : null}
          <div id="calculator" ref={calculatorRef} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}

type ReferenceDiagramType = "circle" | "rectangle" | "triangle" | "cylinder" | "sphere" | "cone" | "pyramid" | "pythagorean" | "45" | "30" | "angle";

function MiniDiagram({ type }: { type: ReferenceDiagramType }) {
  const labelClass = "fill-slate-700 text-[11px] font-bold";

  return (
    <svg className="h-20 w-24 shrink-0 text-slate-700" viewBox="0 0 96 80" aria-hidden="true">
      {type === "circle" ? (
        <>
          <circle cx="48" cy="40" r="24" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <line x1="48" x2="72" y1="40" y2="40" stroke="currentColor" strokeWidth="2" />
          <circle cx="48" cy="40" r="2" fill="currentColor" />
          <text x="58" y="34" className={labelClass}>r</text>
        </>
      ) : type === "rectangle" ? (
        <>
          <rect x="18" y="20" width="56" height="36" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <text x="44" y="72" className={labelClass}>l</text>
          <text x="80" y="42" className={labelClass}>w</text>
        </>
      ) : type === "triangle" || type === "pythagorean" || type === "45" || type === "30" || type === "angle" ? (
        <>
          <path d="M18 60 L76 60 L76 18 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M64 60 L64 48 L76 48" fill="none" stroke="currentColor" strokeWidth="2" />
          {type === "pythagorean" ? (
            <>
              <text x="44" y="75" className={labelClass}>a</text>
              <text x="82" y="42" className={labelClass}>b</text>
              <text x="41" y="35" className={labelClass}>c</text>
            </>
          ) : type === "45" ? (
            <>
              <text x="21" y="55" className={labelClass}>45°</text>
              <text x="62" y="46" className={labelClass}>45°</text>
              <text x="43" y="75" className={labelClass}>x</text>
              <text x="82" y="42" className={labelClass}>x</text>
            </>
          ) : type === "30" ? (
            <>
              <text x="21" y="55" className={labelClass}>30°</text>
              <text x="62" y="46" className={labelClass}>60°</text>
              <text x="82" y="42" className={labelClass}>x</text>
              <text x="37" y="34" className={labelClass}>2x</text>
            </>
          ) : type === "angle" ? (
            <>
              <path d="M27 58 Q40 42 59 53" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <text x="37" y="48" className={labelClass}>180°</text>
            </>
          ) : (
            <>
              <line x1="76" x2="76" y1="18" y2="60" stroke="currentColor" strokeDasharray="4 3" strokeWidth="1.8" />
              <text x="45" y="75" className={labelClass}>b</text>
              <text x="82" y="42" className={labelClass}>h</text>
            </>
          )}
        </>
      ) : type === "sphere" ? (
        <>
          <circle cx="48" cy="40" r="24" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <ellipse cx="48" cy="40" rx="24" ry="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <line x1="48" x2="70" y1="40" y2="31" stroke="currentColor" strokeWidth="1.8" />
          <text x="62" y="28" className={labelClass}>r</text>
        </>
      ) : type === "cone" ? (
        <>
          <path d="M48 10 L22 58" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M48 10 L74 58" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <ellipse cx="48" cy="58" rx="26" ry="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="48" x2="48" y1="10" y2="58" stroke="currentColor" strokeDasharray="4 3" strokeWidth="1.5" />
          <text x="53" y="38" className={labelClass}>h</text>
        </>
      ) : type === "pyramid" ? (
        <>
          <path d="M48 9 L20 57 L58 68 L76 45 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M48 9 L58 68 M48 9 L76 45 M20 57 L76 45" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <line x1="48" x2="48" y1="9" y2="57" stroke="currentColor" strokeDasharray="4 3" strokeWidth="1.4" />
        </>
      ) : (
        <>
          <ellipse cx="48" cy="18" rx="24" ry="8" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M24 18 V58 Q48 72 72 58 V18" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <ellipse cx="48" cy="58" rx="24" ry="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <line x1="48" x2="48" y1="18" y2="58" stroke="currentColor" strokeDasharray="4 3" strokeWidth="1.5" />
          <text x="53" y="42" className={labelClass}>h</text>
        </>
      )}
    </svg>
  );
}

function ReferenceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const formulas = [
    { title: "Circle", formula: "A = πr²   C = 2πr", type: "circle" as const },
    { title: "Rectangle", formula: "A = lw", type: "rectangle" as const },
    { title: "Triangle", formula: "A = 1/2 bh", type: "triangle" as const },
    { title: "Cylinder", formula: "V = πr²h", type: "cylinder" as const },
    { title: "Sphere", formula: "V = 4/3 πr³", type: "sphere" as const },
    { title: "Cone", formula: "V = 1/3 πr²h", type: "cone" as const },
    { title: "Pyramid", formula: "V = 1/3 lwh", type: "pyramid" as const },
    { title: "Pythagorean Theorem", formula: "a² + b² = c²", type: "pythagorean" as const },
    { title: "45-45-90 Triangle", formula: "x, x, x√2", type: "45" as const },
    { title: "30-60-90 Triangle", formula: "x, x√3, 2x", type: "30" as const },
    { title: "Angle Sum", formula: "triangle = 180°", type: "angle" as const }
  ];

  if (!open) return null;

  return (
    <div className="fixed right-5 top-20 z-50 w-[min(760px,calc(100vw-2.5rem))] rounded-md border border-[#d1d5db] bg-white shadow-2xl" role="dialog" aria-modal="false" aria-label="Math reference sheet">
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2 text-base font-bold text-slate-900">
          <BookOpen size={18} /> Reference
        </div>
        <button
          aria-label="Close reference"
          className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
          onClick={onClose}
          type="button"
        >
          <X size={20} />
        </button>
      </div>
      <div className="max-h-[min(680px,calc(100vh-8rem))] overflow-y-auto p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {formulas.map((item) => (
            <section className="flex min-h-24 items-center gap-4 rounded-md border border-[#e5e7eb] bg-white p-4" key={item.title}>
              <MiniDiagram type={item.type} />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-lg font-semibold tracking-normal text-slate-950">{item.formula}</p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function StudentResponseDirections() {
  const examples = [
    {
      answer: "3.5",
      acceptable: ["3.5", "3.50", "7/2"],
      unacceptable: ["31/2", "3 1/2"]
    },
    {
      answer: "2/3",
      acceptable: ["2/3", ".6666", ".6667", "0.666", "0.667"],
      unacceptable: ["0.66", ".66", "0.67", ".67"]
    },
    {
      answer: "-1/3",
      acceptable: ["-1/3", "-.3333", "-0.333"],
      unacceptable: ["-.33", "-0.33"]
    }
  ];

  return (
    <div className="mx-auto max-w-[620px] px-8 py-9 text-[#a1a1a1] transition-all duration-200 ease-in-out">
      <h2 className="mb-6 text-[22px] font-bold leading-tight">Student-produced response directions</h2>
      <ul className="mb-10 list-disc space-y-2 pl-7 text-[17px] leading-7">
        <li>If you find <strong>more than one correct answer</strong>, enter only one answer.</li>
        <li>You can enter up to 5 characters for a <strong>positive answer</strong> and up to 6 characters for a <strong>negative answer</strong>.</li>
        <li>If your answer is a <strong>fraction</strong> that does not fit, enter the decimal equivalent.</li>
        <li>If your answer is a <strong>decimal</strong> that does not fit, truncate or round at the fourth digit.</li>
        <li>If your answer is a <strong>mixed number</strong>, enter it as an improper fraction or decimal equivalent.</li>
        <li>Do not enter <strong>symbols</strong> such as a percent sign, comma, or dollar sign.</li>
      </ul>

      <h3 className="mb-2 text-center text-[18px] font-semibold">Examples</h3>
      <table className="w-full border-collapse text-center text-[15px]">
        <thead>
          <tr>
            <th className="border border-[#2a2a2a] px-3 py-4 font-semibold">Answer</th>
            <th className="border border-[#2a2a2a] px-3 py-4 font-semibold">Acceptable ways to enter answer</th>
            <th className="border border-[#2a2a2a] px-3 py-4 font-semibold">Unacceptable: will NOT receive credit</th>
          </tr>
        </thead>
        <tbody>
          {examples.map((example) => (
            <tr key={example.answer}>
              <td className="border border-[#2a2a2a] px-3 py-5 text-lg font-semibold">{example.answer}</td>
              <td className="border border-[#2a2a2a] px-3 py-5">
                <div className="flex flex-col items-center gap-2">
                  {example.acceptable.map((value) => (
                    <code className="bg-[#181818] px-1.5 py-0.5 text-[15px] text-[#a1a1a1]" key={value}>{value}</code>
                  ))}
                </div>
              </td>
              <td className="border border-[#2a2a2a] px-3 py-5">
                <div className="flex flex-col items-center gap-2">
                  {example.unacceptable.map((value) => (
                    <code className="bg-[#181818] px-1.5 py-0.5 text-[15px] text-[#a1a1a1]" key={value}>{value}</code>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentResponseEntry({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-8 transition-all duration-200 ease-in-out">
      <label className="block w-36">
        <span className="sr-only">Enter answer</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-16 w-36 border border-[#2a2a2a] bg-[#181818] px-4 text-center text-2xl font-semibold tracking-[0.2em] text-[#a1a1a1] outline-white transition-all duration-[250ms] ease-in-out hover:border-white focus:border-white"
          inputMode="decimal"
          maxLength={6}
        />
      </label>
      <div className="mt-12">
        <h2 className="mb-4 text-[22px] font-bold text-[#a1a1a1]">Answer Preview:</h2>
        <div className="min-h-12 text-[28px] font-semibold text-[#a1a1a1]">
          {value || ""}
        </div>
      </div>
    </div>
  );
}

function BreakScreen({
  secondsLeft,
  message,
  onResume
}: {
  secondsLeft: number;
  message?: string;
  onResume: () => void;
}) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <main className="min-h-screen bg-[#202020] text-white">
      <div className="mx-auto grid min-h-screen max-w-[1280px] grid-cols-1 gap-10 px-8 py-16 md:grid-cols-[420px_1fr] md:items-center">
        <section className="flex flex-col items-center gap-8 md:items-start">
          <div className="rounded-lg border border-white/80 px-12 py-6 text-center">
            <div className="mb-3 text-xl font-bold">Remaining Break Time:</div>
            <div className="text-7xl font-bold tabular-nums tracking-tight">{minutes}:{seconds}</div>
          </div>
          <button
            className="rounded-full bg-[#ffdf3f] px-8 py-4 text-base font-bold text-slate-950 hover:bg-[#f5d42f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            onClick={onResume}
            type="button"
          >
            Resume Testing
          </button>
          {message ? <p className="max-w-sm text-center text-sm font-semibold leading-6 text-red-200 md:text-left">{message}</p> : null}
        </section>

        <section className="max-w-xl text-white">
          <h1 className="mb-8 text-4xl font-bold leading-tight">Practice Test Break</h1>
          <p className="mb-10 text-xl leading-8 text-white/85">
            You can resume this practice test as soon as you are ready to move on. On test day, you will wait until the clock counts down.
          </p>
          <div className="mb-10 border-t border-white/70" />
          <h2 className="mb-8 text-4xl font-bold leading-tight">Take a Break: Do Not Close Your Device</h2>
          <p className="mb-8 text-xl leading-8 text-white/85">
            After the break, select <strong className="text-white">Resume Testing</strong> and you will start the next section.
          </p>
          <h3 className="mb-5 text-lg font-bold">Follow these rules during the break:</h3>
          <ol className="space-y-5 text-lg leading-8 text-white/85">
            <li>1. Do not disturb students who are still testing.</li>
            <li>2. Do not exit the app or close your laptop.</li>
            <li>3. Do not access phones, smartwatches, textbooks, notes, or the internet.</li>
            <li>4. Do not eat or drink near any testing device.</li>
            <li>5. Do not discuss the exam with anyone.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}

function ModuleOverScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8f8f8] px-8 text-center text-[#222]">
      <section className="flex max-w-[760px] flex-col items-center">
        <h1 className="mb-12 text-[44px] font-light leading-tight text-[#3154d4]">
          This Module Is Over
        </h1>
        <p className="mb-8 text-[28px] leading-tight">All your work has been saved.</p>
        <p className="mb-8 text-[28px] leading-tight">You&apos;ll move on automatically in just a moment.</p>
        <p className="mb-28 text-[28px] leading-tight">Do not refresh this page or quit the app.</p>
        <div className="h-28 w-28 animate-spin rounded-full border-[10px] border-transparent border-r-[#222] border-t-[#222]" aria-label="Loading next module" />
      </section>
    </main>
  );
}

function CheckYourWorkScreen({
  answers,
  marked,
  moduleData,
  onBack,
  onContinue,
  onGoToQuestion,
  sectionTitle
}: {
  answers: Record<string, string>;
  marked: Record<string, boolean>;
  moduleData: ModulePayload;
  onBack: () => void;
  onContinue: () => void;
  onGoToQuestion: (questionNumber: number) => void;
  sectionTitle: string;
}) {
  const unansweredCount = moduleData.questions.filter((item) => !answers[item.id]).length;
  const markedCount = moduleData.questions.filter((item) => marked[item.id]).length;

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-[#202124]">
      <div className="bg-[#10215c] py-2 text-center text-sm font-bold tracking-wide text-white">
        THIS IS A PRACTICE TEST
      </div>

      <section className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-[1120px] flex-col px-8 py-16">
        <div className="mx-auto mb-10 max-w-[760px] text-center">
          <h1 className="mb-10 text-[44px] font-normal leading-tight text-[#202124]">Check Your Work</h1>
          <p className="mb-5 text-left text-[22px] leading-8 text-[#202124]">
            On test day, you won&apos;t be able to move on to the next module until time expires.
          </p>
          <p className="text-left text-[22px] leading-8 text-[#202124]">
            For these practice questions, you can click <strong>Next</strong> when you&apos;re ready to move on.
          </p>
        </div>

        <div className="rounded-xl bg-white px-12 py-11 shadow-[0_14px_40px_rgba(15,23,42,0.12)]">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
            <h2 className="text-[26px] font-bold leading-tight text-[#202124]">
              {sectionTitle} Questions
            </h2>
            <div className="flex flex-wrap items-center gap-8 text-[20px] text-[#202124]">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 border-2 border-dashed border-[#202124]" aria-hidden="true" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-3">
                <Flag size={30} className="fill-[#c53046] text-[#c53046]" aria-hidden="true" />
                <span>For Review</span>
              </div>
            </div>
          </div>

          <div className="mb-10 border-t border-[#a7a7a7]" />

          <div className="grid grid-cols-5 gap-x-10 gap-y-9 sm:grid-cols-7 lg:grid-cols-10">
            {moduleData.questions.map((item, itemIndex) => {
              const questionNumber = itemIndex + 1;
              const answered = Boolean(answers[item.id]);
              const forReview = Boolean(marked[item.id]);
              return (
                <button
                  aria-label={`Question ${questionNumber}${answered ? ", answered" : ", unanswered"}${forReview ? ", marked for review" : ""}`}
                  className={`relative flex h-[58px] w-[58px] items-center justify-center text-[30px] font-bold text-[#2f55d4] transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 ${
                    answered ? "border-2 border-solid border-[#2f55d4] bg-white" : "border-2 border-dashed border-[#202124] bg-white"
                  }`}
                  key={item.id}
                  onClick={() => onGoToQuestion(questionNumber)}
                  type="button"
                >
                  {questionNumber}
                  {forReview ? (
                    <Flag size={18} className="absolute -right-2 -top-2 fill-[#c53046] text-[#c53046]" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap gap-6 text-sm font-semibold text-slate-600">
            <span>{moduleData.questions.length - unansweredCount} answered</span>
            <span>{unansweredCount} unanswered</span>
            <span>{markedCount} for review</span>
          </div>
        </div>
      </section>

      <footer className="sticky bottom-0 z-20 border-t border-[#d7dbe3] bg-white">
        <div className="mx-auto grid h-16 max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center px-8">
          <div>
            <button
              className="inline-flex items-center gap-2 rounded px-3 py-2 text-base font-semibold text-slate-700 hover:bg-slate-100"
              onClick={onBack}
              type="button"
            >
              <ChevronLeft size={20} /> Back
            </button>
          </div>
          <div className="text-base font-semibold text-slate-700">
            Review
          </div>
          <div className="flex justify-end">
            <button
              className="inline-flex items-center gap-2 rounded bg-blue-700 px-7 py-3 text-base font-semibold text-white hover:bg-blue-800"
              onClick={onContinue}
              type="button"
            >
              Next <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default function TestPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const [moduleData, setModuleData] = useState<ModulePayload | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isBreakActive, setIsBreakActive] = useState(false);
  const [breakSecondsLeft, setBreakSecondsLeft] = useState(BREAK_DURATION_SECONDS);
  const [breakMessage, setBreakMessage] = useState("");
  const [isCheckWorkActive, setIsCheckWorkActive] = useState(false);
  const [isModuleOverActive, setIsModuleOverActive] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [eliminatedAnswers, setEliminatedAnswers] = useState<Set<string>>(new Set());
  const [actionHistory, setActionHistory] = useState<AnswerAction[]>([]);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<TestModal>(null);
  const [lineReaderEnabled, setLineReaderEnabled] = useState(false);
  const [lineReaderY, setLineReaderY] = useState(120);
  const [largeFontMode, setLargeFontMode] = useState(false);
  const [isTimerHidden, setIsTimerHidden] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [desmosReady, setDesmosReady] = useState(false);
  const [desmosFailed, setDesmosFailed] = useState(false);
  const [highlightModeEnabled, setHighlightModeEnabled] = useState(true);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [focusedChoiceIndex, setFocusedChoiceIndex] = useState(0);
  const [leftPanelPercent, setLeftPanelPercent] = useState(60);
  const [highlightToolbar, setHighlightToolbar] = useState<HighlightToolbar>({ visible: false, x: 0, y: 0 });
  const testBodyRef = useRef<HTMLElement | null>(null);
  const passageRef = useRef<HTMLParagraphElement | null>(null);
  const passagePanelRef = useRef<HTMLElement | null>(null);
  const highlightToolbarRef = useRef<HTMLDivElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const navigatorRef = useRef<HTMLDivElement | null>(null);
  const selectedPassageRange = useRef<Range | null>(null);
  const selectedPassageOffsets = useRef<{ startOffset: number; endOffset: number; highlightId?: string } | null>(null);
  const toolbarAnchorRect = useRef<DOMRect | null>(null);
  const resizingDivider = useRef(false);
  const questionStartedAt = useRef(Date.now());
  const spentByQuestion = useRef<Record<string, number>>({});
  const firstInteractionByQuestion = useRef<Record<string, number>>({});
  const interactionCountByQuestion = useRef<Record<string, number>>({});
  const currentSection = moduleData?.attempt.current_section;
  const isMathSection = currentSection === "math";

  function loadModulePayload(data: ModulePayload) {
    setModuleData(data);
    setSecondsLeft(data.duration_seconds);
    setIndex(0);
    setIsCheckWorkActive(false);
    setIsModuleOverActive(false);
    setAnswers(Object.fromEntries(Object.entries(data.answers).map(([id, answer]) => [id, answer.selected_answer || ""])));
    setMarked(Object.fromEntries(Object.entries(data.answers).map(([id, answer]) => [id, answer.marked_for_review])));
    spentByQuestion.current = Object.fromEntries(Object.entries(data.answers).map(([id, answer]) => [id, answer.time_spent_seconds || 0]));
    firstInteractionByQuestion.current = {};
    interactionCountByQuestion.current = {};
  }

  useEffect(() => {
    api<ModulePayload>(`/api/attempts/${attemptId}/module`).then((data) => {
      loadModulePayload(data);
    }).catch((error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        router.push("/login");
        return;
      }
      console.log("API unavailable, continue");
    });
  }, [attemptId, router]);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const blockBack = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", blockBack);
    return () => window.removeEventListener("popstate", blockBack);
  }, []);

  useEffect(() => {
    if (!moduleData || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [moduleData, secondsLeft]);

  useEffect(() => {
    if (moduleData && secondsLeft === 0 && !isBreakActive) void advance();
  }, [isBreakActive, secondsLeft]);

  useEffect(() => {
    if (!isBreakActive || breakSecondsLeft <= 0) return;
    const timer = window.setInterval(() => setBreakSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [breakSecondsLeft, isBreakActive]);

  useEffect(() => {
    if (!isMathSection) {
      setIsReferenceOpen(false);
      setIsCalculatorOpen(false);
    }
  }, [isMathSection]);

  const question = moduleData?.questions[index];
  const isCrossTextQuestion = question?.data_payload?.type === "cross_text"
    && typeof question.data_payload.text_1 === "string"
    && typeof question.data_payload.text_2 === "string";
  const isNotesQuestion = question?.data_payload?.type === "notes"
    && Array.isArray(question.data_payload.notes)
    && question.data_payload.notes.every((note) => typeof note === "string");
  const graphPayload = question?.data_type === "graph" && isGraphPayload(question.data_payload)
    ? question.data_payload
    : null;
  const hasTablePayload = Boolean(question?.data_type === "table" && question.data_payload?.columns?.length && question.data_payload?.rows?.length);
  const isStudentResponse = question?.format === "grid_in";
  const hasTextStimulus = Boolean(isNotesQuestion || isCrossTextQuestion || (!isMathSection && question?.passage?.trim()));
  const hasVisualStimulus = Boolean(hasTablePayload || graphPayload || question?.graph_path || isStudentResponse);
  const hasStimulus = hasTextStimulus || hasVisualStimulus;
  const orderedChoices = useMemo(() => {
    if (!question || question.format !== "multiple_choice") return [];
    const choices = [...question.choices].sort((a, b) => a.label.localeCompare(b.label));
    const renderedLabels = choices.map((choice) => choice.label);
    if (renderedLabels.join(",") !== "A,B,C,D") {
      throw new Error(`Invalid SAT answer label order: ${renderedLabels.join(",")}`);
    }
    return choices;
  }, [question]);

  useEffect(() => {
    setCurrentQuestion(index + 1);
  }, [index]);

  useEffect(() => {
    if (!moduleData) return;
    setMarkedForReview(new Set(moduleData.questions.flatMap((item, itemIndex) => (
      marked[item.id] ? [itemIndex + 1] : []
    ))));
  }, [moduleData, marked]);

  useEffect(() => {
    restorePassageHighlights();
    selectedPassageRange.current = null;
    selectedPassageOffsets.current = null;
    setHighlightToolbar({ visible: false, x: 0, y: 0 });
  }, [question?.id, question?.passage]);

  useEffect(() => {
    questionStartedAt.current = Date.now();
    if (!question) return;
    loadStoredAnswerState(question);
    const selectedIndex = orderedChoices.findIndex((choice) => choice.label === (selectedAnswer || answers[question.id]));
    setFocusedChoiceIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [question?.id, orderedChoices]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeModal || isMoreOpen) return;
      if (!question || question.format !== "multiple_choice" || !orderedChoices.length) return;
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable) return;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = (focusedChoiceIndex + direction + orderedChoices.length) % orderedChoices.length;
        setFocusedChoiceIndex(nextIndex);
        window.requestAnimationFrame(() => {
          document.querySelector<HTMLElement>(`[data-choice-index="${nextIndex}"]`)?.focus();
        });
      }

      if (event.shiftKey && /^[a-d]$/i.test(event.key)) {
        event.preventDefault();
        const label = event.key.toUpperCase();
        if (orderedChoices.some((choice) => choice.label === label)) {
          toggleEliminate(label);
        }
      }

      if (!event.shiftKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        setHighlightModeEnabled((enabled) => !enabled);
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const choice = orderedChoices[focusedChoiceIndex];
        if (choice) selectAnswer(choice.label);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [question, orderedChoices, focusedChoiceIndex, answers, marked, selectedAnswer, eliminatedAnswers, actionHistory, activeModal, isMoreOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsMoreOpen(false);
      setActiveModal(null);
      setIsNavigatorOpen(false);
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && moreMenuRef.current?.contains(target)) return;
      setIsMoreOpen(false);
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isNavigatorOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && navigatorRef.current?.contains(target)) return;
      setIsNavigatorOpen(false);
    };
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !navigatorRef.current) return;
      const focusable = Array.from(navigatorRef.current.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      )).filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", trapFocus);
    window.requestAnimationFrame(() => navigatorRef.current?.querySelector<HTMLElement>("button")?.focus());
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", trapFocus);
    };
  }, [isNavigatorOpen]);

  useEffect(() => {
    document.body.style.fontSize = largeFontMode ? "18px" : "";
    return () => {
      document.body.style.fontSize = "";
    };
  }, [largeFontMode]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizingDivider.current || !testBodyRef.current) return;
      const rect = testBodyRef.current.getBoundingClientRect();
      const nextPercent = ((event.clientX - rect.left) / rect.width) * 100;
      setLeftPanelPercent(Math.min(68, Math.max(48, nextPercent)));
    };
    const stopResizing = () => {
      resizingDivider.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && highlightToolbarRef.current?.contains(target)) return;
      if (target && passageRef.current?.contains(target)) return;
      setHighlightToolbar((current) => ({ ...current, visible: false }));
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const refreshToolbarPosition = () => {
      if (!highlightToolbar.visible || !toolbarAnchorRect.current) return;
      const rect = selectedPassageRange.current?.getBoundingClientRect();
      if (rect && (rect.width > 0 || rect.height > 0)) {
        toolbarAnchorRect.current = rect;
      }
      positionHighlightToolbar(toolbarAnchorRect.current);
    };

    window.addEventListener("scroll", refreshToolbarPosition, true);
    window.addEventListener("resize", refreshToolbarPosition);
    return () => {
      window.removeEventListener("scroll", refreshToolbarPosition, true);
      window.removeEventListener("resize", refreshToolbarPosition);
    };
  }, [highlightToolbar.visible]);

  function highlightStorageKey(questionId = question?.id) {
    return `sat1600_highlights:${attemptId}:${questionId}`;
  }

  function loadPassageHighlights(questionId = question?.id): PassageHighlight[] {
    if (!questionId || typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(highlightStorageKey(questionId));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function savePassageHighlights(highlights: PassageHighlight[], questionId = question?.id) {
    if (!questionId || typeof window === "undefined") return;
    window.localStorage.setItem(highlightStorageKey(questionId), JSON.stringify(highlights));
  }

  function escapeHtml(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderPassageSegment(segment: string, targetSentence?: string) {
    if (!targetSentence || !segment.includes(targetSentence)) return escapeHtml(segment);
    const parts = segment.split(targetSentence);
    return parts.map((part, partIndex) => {
      const escapedPart = escapeHtml(part);
      if (partIndex === parts.length - 1) return escapedPart;
      return `${escapedPart}<span class="underline decoration-2 underline-offset-4">${escapeHtml(targetSentence)}</span>`;
    }).join("");
  }

  function renderPassageHtml(text: string, highlights: PassageHighlight[]) {
    const targetSentence = typeof question?.data_payload?.target_sentence === "string"
      ? question.data_payload.target_sentence
      : undefined;
    const ordered = [...highlights]
      .map((highlight) => reconcileHighlight(text, highlight))
      .filter((highlight): highlight is PassageHighlight => Boolean(highlight))
      .sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset);
    let cursor = 0;
    let html = "";

    for (const highlight of ordered) {
      if (highlight.startOffset < cursor) continue;
      html += renderPassageSegment(text.slice(cursor, highlight.startOffset), targetSentence);
      html += `<span class="passage-highlight" data-passage-highlight="${highlight.id}" style="${highlightStyles[highlight.type]} border-radius: 2px; cursor: pointer;">${escapeHtml(text.slice(highlight.startOffset, highlight.endOffset))}</span>`;
      cursor = highlight.endOffset;
    }

    return html + renderPassageSegment(text.slice(cursor), targetSentence);
  }

  function restorePassageHighlights(highlights = loadPassageHighlights()) {
    if (!passageRef.current || !question?.passage) return;
    unwrapHighlightSpans();
    passageRef.current.innerHTML = renderPassageHtml(question.passage, highlights);
    passageRef.current.normalize();
  }

  function reconcileHighlight(text: string, highlight: PassageHighlight) {
    const directSnippet = text.slice(highlight.startOffset, highlight.endOffset);
    if (!highlight.textContent || directSnippet === highlight.textContent) return highlight;

    const nearbyStart = Math.max(0, highlight.startOffset - 40);
    const nearbyEnd = Math.min(text.length, highlight.endOffset + 40);
    const nearbyIndex = text.slice(nearbyStart, nearbyEnd).indexOf(highlight.textContent);
    if (nearbyIndex >= 0) {
      const startOffset = nearbyStart + nearbyIndex;
      return {
        ...highlight,
        startOffset,
        endOffset: startOffset + highlight.textContent.length
      };
    }

    const fallbackIndex = text.indexOf(highlight.textContent);
    if (fallbackIndex >= 0) {
      return {
        ...highlight,
        startOffset: fallbackIndex,
        endOffset: fallbackIndex + highlight.textContent.length
      };
    }

    if (highlight.endOffset <= text.length) return highlight;
    return null;
  }

  function unwrapHighlightSpans() {
    if (!passageRef.current) return;
    passageRef.current.querySelectorAll("[data-passage-highlight]").forEach((span) => {
      span.replaceWith(document.createTextNode(span.textContent || ""));
    });
    passageRef.current.normalize();
  }

  function selectionOffsets(range: Range) {
    if (!passageRef.current) return null;
    const startRange = document.createRange();
    startRange.selectNodeContents(passageRef.current);
    startRange.setEnd(range.startContainer, range.startOffset);

    const endRange = document.createRange();
    endRange.selectNodeContents(passageRef.current);
    endRange.setEnd(range.endContainer, range.endOffset);

    return {
      startOffset: startRange.toString().length,
      endOffset: endRange.toString().length
    };
  }

  function handlePassageMouseUp() {
    if (!passageRef.current || !highlightModeEnabled) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setHighlightToolbar((current) => ({ ...current, visible: false }));
      return;
    }

    const range = selection.getRangeAt(0);
    const commonNode = range.commonAncestorContainer.nodeType === Node.TEXT_NODE ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer;
    if (!commonNode || !passageRef.current.contains(commonNode)) return;

    const offsets = selectionOffsets(range);
    if (!offsets || offsets.endOffset <= offsets.startOffset) return;

    const rect = range.getBoundingClientRect();
    selectedPassageRange.current = range.cloneRange();
    selectedPassageOffsets.current = offsets;
    toolbarAnchorRect.current = rect;
    positionHighlightToolbar(rect);
  }

  function handlePassageClick(event: ReactMouseEvent<HTMLParagraphElement>) {
    const target = event.target as HTMLElement | null;
    const highlightElement = target?.closest<HTMLElement>("[data-passage-highlight]");
    if (!highlightElement || !passageRef.current || !question) return;

    const highlightId = highlightElement.dataset.passageHighlight;
    const highlight = loadPassageHighlights(question.id).find((item) => item.id === highlightId);
    if (!highlight) return;

    const range = document.createRange();
    range.selectNodeContents(highlightElement);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    selectedPassageRange.current = range.cloneRange();
    selectedPassageOffsets.current = {
      startOffset: highlight.startOffset,
      endOffset: highlight.endOffset,
      highlightId: highlight.id
    };
    toolbarAnchorRect.current = highlightElement.getBoundingClientRect();
    positionHighlightToolbar(toolbarAnchorRect.current);
  }

  function positionHighlightToolbar(rect: DOMRect) {
    setHighlightToolbar({
      visible: true,
      x: Math.min(window.innerWidth - 244, Math.max(12, rect.right - 214)),
      y: Math.max(72, rect.top - 48)
    });
  }

  function replaceOverlappingHighlights(highlights: PassageHighlight[], startOffset: number, endOffset: number) {
    return highlights.filter((highlight) => (
      highlight.endOffset <= startOffset || highlight.startOffset >= endOffset
    ));
  }

  function restoreSelectionFromOffsets(startOffset: number, endOffset: number) {
    if (!passageRef.current) return;
    const range = rangeFromOffsets(passageRef.current, startOffset, endOffset);
    if (!range) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    selectedPassageRange.current = range.cloneRange();
    toolbarAnchorRect.current = range.getBoundingClientRect();
    positionHighlightToolbar(toolbarAnchorRect.current);
  }

  function rangeFromOffsets(root: HTMLElement, startOffset: number, endOffset: number) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let startNode: Text | null = null;
    let endNode: Text | null = null;
    let startNodeOffset = 0;
    let endNodeOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const nextOffset = currentOffset + node.data.length;
      if (!startNode && startOffset >= currentOffset && startOffset <= nextOffset) {
        startNode = node;
        startNodeOffset = startOffset - currentOffset;
      }
      if (!endNode && endOffset >= currentOffset && endOffset <= nextOffset) {
        endNode = node;
        endNodeOffset = endOffset - currentOffset;
        break;
      }
      currentOffset = nextOffset;
    }

    if (!startNode || !endNode) return null;
    const range = document.createRange();
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    return range;
  }

  function applyPassageHighlight(type: HighlightType) {
    const offsets = selectedPassageOffsets.current;
    if (!question || !question.passage || !offsets) return;
    const textContent = question.passage.slice(offsets.startOffset, offsets.endOffset);
    if (!textContent.trim()) return;

    const highlight: PassageHighlight = {
      id: offsets.highlightId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      startOffset: offsets.startOffset,
      endOffset: offsets.endOffset,
      textContent,
      type
    };
    const nextHighlights = [...replaceOverlappingHighlights(loadPassageHighlights(question.id), offsets.startOffset, offsets.endOffset), highlight];
    savePassageHighlights(nextHighlights, question.id);
    restorePassageHighlights(nextHighlights);
    window.requestAnimationFrame(() => restoreSelectionFromOffsets(offsets.startOffset, offsets.endOffset));
  }

  function deleteSelectedPassageHighlights() {
    if (!question || !selectedPassageOffsets.current) return;
    const { startOffset, endOffset } = selectedPassageOffsets.current;
    const nextHighlights = loadPassageHighlights(question.id).filter((highlight) => (
      highlight.endOffset <= startOffset || highlight.startOffset >= endOffset
    ));
    savePassageHighlights(nextHighlights, question.id);
    restorePassageHighlights(nextHighlights);
    setHighlightToolbar((current) => ({ ...current, visible: false }));
  }

  function openTestModal(modal: Exclude<TestModal, null>) {
    setActiveModal(modal);
    setIsMoreOpen(false);
  }

  function toggleLineReader() {
    setLineReaderEnabled((enabled) => !enabled);
    setIsMoreOpen(false);
  }

  function toggleLargeFontMode() {
    setLargeFontMode((enabled) => !enabled);
    setIsMoreOpen(false);
  }

  function saveAndExit() {
    setIsMoreOpen(false);
    if (window.confirm("Are you sure you want to exit?")) {
      router.push("/dashboard");
    }
  }

  function goToQuestion(questionNumber: number) {
    setCurrentQuestion(questionNumber);
    setIndex(questionNumber - 1);
    setIsNavigatorOpen(false);
    setIsCheckWorkActive(false);
  }

  function isNavigatorQuestionAnswered(item: Question) {
    if (question && item.id === question.id) return Boolean(selectedAnswer);
    return Boolean(answers[item.id]);
  }

  function navigatorButtonClass(item: Question, questionNumber: number) {
    if (questionNumber === currentQuestion) return "border-2 border-black bg-white text-slate-950";
    if (isNavigatorQuestionAnswered(item)) return "border-2 border-blue-600 bg-white text-blue-600";
    return "border-2 border-dashed border-gray-400 bg-white text-gray-500";
  }

  function answerStorageKey(questionId = question?.id) {
    return `sat1600_answer_state:${attemptId}:${questionId}`;
  }

  function loadStoredAnswerState(currentQuestion: Question) {
    let stored: StoredAnswerState | null = null;
    try {
      const raw = window.localStorage.getItem(answerStorageKey(currentQuestion.id));
      stored = raw ? JSON.parse(raw) : null;
    } catch {
      stored = null;
    }

    const eliminated = new Set(stored?.eliminatedAnswers || []);
    const storedSelected = stored?.selectedAnswer || answers[currentQuestion.id] || null;
    const nextSelected = storedSelected && !eliminated.has(storedSelected) ? storedSelected : null;
    setSelectedAnswer(nextSelected);
    setEliminatedAnswers(eliminated);
    setActionHistory([]);
  }

  function persistAnswerState(nextSelected: string | null, nextEliminated: Set<string>, questionId = question?.id) {
    if (!questionId || typeof window === "undefined") return;
    const payload: StoredAnswerState = {
      selectedAnswer: nextSelected,
      eliminatedAnswers: [...nextEliminated]
    };
    window.localStorage.setItem(answerStorageKey(questionId), JSON.stringify(payload));
  }

  function selectAnswer(value: string, trackAction = true) {
    if (!question || eliminatedAnswers.has(value)) return;
    setSelectedAnswer(value);
    persistAnswerState(value, eliminatedAnswers, question.id);
    if (trackAction) setActionHistory((history) => [...history, { type: "select", value }]);
    void save(question.id, value);
  }

  function toggleEliminate(value: string, trackAction = true) {
    if (!question) return;
    const nextEliminated = new Set(eliminatedAnswers);
    if (nextEliminated.has(value)) {
      nextEliminated.delete(value);
    } else {
      nextEliminated.add(value);
    }
    const nextSelected = nextEliminated.has(selectedAnswer || "") ? null : selectedAnswer;
    setEliminatedAnswers(nextEliminated);
    setSelectedAnswer(nextSelected);
    persistAnswerState(nextSelected, nextEliminated, question.id);
    if (trackAction) setActionHistory((history) => [...history, { type: "eliminate", value }]);
    if (selectedAnswer && nextSelected !== selectedAnswer) void save(question.id, "");
  }

  function undoLastAnswerAction() {
    if (!question || actionHistory.length === 0) return;
    const lastAction = actionHistory[actionHistory.length - 1];
    const remainingHistory = actionHistory.slice(0, -1);

    if (lastAction.type === "eliminate") {
      const nextEliminated = new Set(eliminatedAnswers);
      if (nextEliminated.has(lastAction.value)) {
        nextEliminated.delete(lastAction.value);
      } else {
        nextEliminated.add(lastAction.value);
      }
      const previousSelection = [...remainingHistory].reverse().find((action) => (
        action.type === "select" && !nextEliminated.has(action.value)
      ));
      const nextSelected = selectedAnswer || previousSelection?.value || null;
      setActionHistory(remainingHistory);
      setEliminatedAnswers(nextEliminated);
      setSelectedAnswer(nextSelected);
      persistAnswerState(nextSelected, nextEliminated, question.id);
      if (nextSelected && nextSelected !== selectedAnswer) void save(question.id, nextSelected);
      return;
    }

    const previousSelection = [...remainingHistory].reverse().find((action) => (
      action.type === "select" && !eliminatedAnswers.has(action.value)
    ));
    const nextSelected = previousSelection?.value || null;
    setActionHistory(remainingHistory);
    setSelectedAnswer(nextSelected);
    persistAnswerState(nextSelected, eliminatedAnswers, question.id);
    void save(question.id, nextSelected || "");
  }

  async function save(questionId: string, value: string, review = marked[questionId] || false) {
    const previousAnswer = answers[questionId] || "";
    const firstInteraction = firstInteractionByQuestion.current[questionId] || Date.now();
    if (!firstInteractionByQuestion.current[questionId]) {
      firstInteractionByQuestion.current[questionId] = firstInteraction;
    }
    interactionCountByQuestion.current[questionId] = (interactionCountByQuestion.current[questionId] || 0) + 1;
    const hesitationSeconds = Math.max(0, Math.round((firstInteraction - questionStartedAt.current) / 1000));
    const elapsed = Math.max(1, Math.round((Date.now() - questionStartedAt.current) / 1000));
    const totalSpent = (spentByQuestion.current[questionId] || 0) + elapsed;
    spentByQuestion.current[questionId] = totalSpent;
    questionStartedAt.current = Date.now();
    setAnswers((current) => ({ ...current, [questionId]: value }));
    try {
      await api(`/api/attempts/${attemptId}/answers`, {
        method: "POST",
        body: JSON.stringify({
          question_id: questionId,
          selected_answer: value,
          previous_answer: previousAnswer || null,
          answer_changed: Boolean(previousAnswer && previousAnswer !== value),
          marked_for_review: review,
          hesitation_seconds: hesitationSeconds,
          time_spent_seconds: totalSpent,
          interaction_count: interactionCountByQuestion.current[questionId]
        })
      });
    } catch {
      setIsModuleOverActive(false);
      console.log("API unavailable, continue");
    }
  }

  async function toggleMark(questionId: string) {
    const next = !marked[questionId];
    setMarked((current) => ({ ...current, [questionId]: next }));
    setMarkedForReview((current) => {
      const nextSet = new Set(current);
      if (next) {
        nextSet.add(index + 1);
      } else {
        nextSet.delete(index + 1);
      }
      return nextSet;
    });
    await save(questionId, answers[questionId] || "", next);
  }

  async function advance() {
    try {
      if (moduleData?.attempt.current_module === 1) {
        await api(`/api/attempts/${attemptId}/finish-module-1`, { method: "POST" });
        const nextModule = await api<ModulePayload>(`/api/attempts/${attemptId}/start-module-2`, { method: "POST" });
        loadModulePayload(nextModule);
        return;
      }
      const previousSection = moduleData?.attempt.current_section;
      const result = await api<{ status: string; current_section: string; current_module: number }>(`/api/attempts/${attemptId}/advance`, { method: "POST" });
      if (result.status === "completed") {
        router.push(`/results/${attemptId}`);
        return;
      }
      if (previousSection === "reading_writing" && result.current_section === "math") {
        setBreakSecondsLeft(BREAK_DURATION_SECONDS);
        setBreakMessage("");
        setSecondsLeft(0);
        setIsModuleOverActive(false);
        setIsBreakActive(true);
        setIsMoreOpen(false);
        setActiveModal(null);
        setIsNavigatorOpen(false);
        return;
      }
      const data = await api<ModulePayload>(`/api/attempts/${attemptId}/module`);
      loadModulePayload(data);
    } catch {
      console.log("API unavailable, continue");
    }
  }

  function openCheckWork() {
    setIsCheckWorkActive(true);
    setIsMoreOpen(false);
    setActiveModal(null);
    setIsNavigatorOpen(false);
    setHighlightToolbar((current) => ({ ...current, visible: false }));
  }

  function returnFromCheckWork() {
    setIsCheckWorkActive(false);
    setIndex(moduleData ? moduleData.questions.length - 1 : index);
  }

  async function continueFromCheckWork() {
    setIsCheckWorkActive(false);
    setIsModuleOverActive(true);
    await new Promise((resolve) => window.setTimeout(resolve, 1600));
    await advance();
  }

  async function resumeFromBreak() {
    try {
      setBreakMessage("");
      const data = await api<ModulePayload>(`/api/attempts/${attemptId}/module`);
      loadModulePayload(data);
      setIsBreakActive(false);
    } catch (error) {
      console.log("Resume error:", error);
      setBreakMessage(error instanceof Error ? error.message : "Unable to resume testing. Please try again.");
    }
  }

  if (!moduleData || !question) {
    return <main className="grid min-h-screen place-items-center bg-white font-bold text-slate-900">Loading test...</main>;
  }

  const sectionTitle = moduleData.attempt.current_section === "reading_writing" ? "Reading and Writing" : "Math";
  const sectionNumber = moduleData.attempt.current_section === "reading_writing" ? 1 : 2;
  const fullSectionTitle = `Section ${sectionNumber}, Module ${moduleData.attempt.current_module}: ${sectionTitle}`;

  if (isBreakActive) {
    return <BreakScreen secondsLeft={breakSecondsLeft} message={breakMessage} onResume={resumeFromBreak} />;
  }

  if (isModuleOverActive) {
    return <ModuleOverScreen />;
  }

  if (isCheckWorkActive) {
    return (
      <CheckYourWorkScreen
        answers={answers}
        marked={marked}
        moduleData={moduleData}
        onBack={returnFromCheckWork}
        onContinue={continueFromCheckWork}
        onGoToQuestion={goToQuestion}
        sectionTitle={fullSectionTitle}
      />
    );
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  const panelStyle = {
    "--left-panel": `${leftPanelPercent}%`,
    "--right-panel": `${100 - leftPanelPercent}%`
  } as CSSProperties;

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-[#a1a1a1]">
      {isMathSection ? (
        <Script
          src="/desmos/calculator.js"
          strategy="afterInteractive"
          onLoad={() => {
            setDesmosFailed(false);
            setDesmosReady(true);
          }}
          onReady={() => {
            setDesmosFailed(false);
            setDesmosReady(true);
          }}
          onError={() => {
            setDesmosReady(false);
            setDesmosFailed(true);
          }}
        />
      ) : null}
      <header className="sticky top-0 z-20 bg-[#0f0f0f] text-[#a1a1a1]">
        <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b border-[#2a2a2a] px-5 transition-all duration-200 ease-in-out">
          <div className="flex min-w-0 items-center gap-6">
            <div className="truncate text-sm font-semibold text-[#a1a1a1]">{fullSectionTitle}</div>
            <details className="relative">
              <summary className="cursor-pointer list-none text-sm font-semibold text-[#a1a1a1] transition-all duration-200 ease-in-out hover:text-white">
                Directions
              </summary>
              <div className="absolute left-0 top-7 z-30 w-80 border border-[#2a2a2a] bg-[#181818] p-4 text-sm leading-6 text-[#a1a1a1]">
                Answer each question in this module. You may move among questions in this module until time expires.
              </div>
            </details>
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="px-3 py-2 text-center text-base font-bold tabular-nums text-[#a1a1a1]" aria-label="Time remaining">
              {isTimerHidden ? "--:--" : `${minutes}:${seconds}`}
            </div>
            <button
              aria-pressed={isTimerHidden}
              className="px-2 py-1 text-xs font-semibold text-[#a1a1a1] transition-all duration-200 ease-in-out hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white"
              onClick={() => setIsTimerHidden((hidden) => !hidden)}
              type="button"
            >
              {isTimerHidden ? "Show" : "Hide"}
            </button>
          </div>
          <div className="flex justify-end gap-6 text-sm font-semibold text-[#a1a1a1]">
            {isMathSection ? (
              <button
                className="inline-flex items-center gap-2 transition-all duration-200 ease-in-out hover:text-white"
                onClick={() => setIsReferenceOpen(true)}
                type="button"
              >
                <BookOpen size={17} /> Reference
              </button>
            ) : null}
            {isMathSection ? (
              <button
                className="inline-flex items-center gap-2 transition-all duration-200 ease-in-out hover:text-white"
                onClick={() => setIsCalculatorOpen(true)}
                type="button"
              >
                <CalculatorIcon size={17} /> Calculator
              </button>
            ) : null}
            <button className="transition-all duration-200 ease-in-out hover:text-white" type="button">Highlights & Notes</button>
            <div className="relative" ref={moreMenuRef}>
              <button
                aria-expanded={isMoreOpen}
                aria-haspopup="menu"
                className="transition-all duration-200 ease-in-out hover:text-white"
                onClick={() => setIsMoreOpen((open) => !open)}
                type="button"
              >
                More
              </button>
              {isMoreOpen ? (
                <div
                  className="absolute right-0 top-7 z-40 w-56 border border-[#2a2a2a] bg-[#181818] py-2 text-sm font-semibold text-[#a1a1a1] shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
                  role="menu"
                >
                  <button className="block w-full px-4 py-2 text-left transition-all duration-200 ease-in-out hover:bg-[#0f0f0f] hover:text-white" onClick={() => openTestModal("shortcuts")} role="menuitem" type="button">
                    Shortcuts
                  </button>
                  <button className="block w-full px-4 py-2 text-left transition-all duration-200 ease-in-out hover:bg-[#0f0f0f] hover:text-white" onClick={toggleLineReader} role="menuitem" type="button">
                    {lineReaderEnabled ? "Hide Line Reader" : "Line Reader"}
                  </button>
                  <button className="block w-full px-4 py-2 text-left transition-all duration-200 ease-in-out hover:bg-[#0f0f0f] hover:text-white" onClick={saveAndExit} role="menuitem" type="button">
                    Save and Exit
                  </button>
                  <button className="block w-full px-4 py-2 text-left transition-all duration-200 ease-in-out hover:bg-[#0f0f0f] hover:text-white" onClick={() => openTestModal("help")} role="menuitem" type="button">
                    Help
                  </button>
                  <button className="block w-full px-4 py-2 text-left transition-all duration-200 ease-in-out hover:bg-[#0f0f0f] hover:text-white" onClick={toggleLargeFontMode} role="menuitem" type="button">
                    {largeFontMode ? "Standard Text" : "Assistive Technology"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="bg-[#181818] px-5 py-2 text-center text-xs font-bold tracking-wide text-[#a1a1a1]">
          THIS IS A PRACTICE TEST
        </div>
      </header>

      <section
        ref={testBodyRef}
        style={hasStimulus ? panelStyle : undefined}
        className="mx-auto grid min-h-[calc(100vh-8.5rem)] max-w-[1280px] bg-[#0f0f0f] transition-all duration-200 ease-in-out lg:grid-cols-[60%_40%]"
      >
        <article
          className="relative flex flex-col items-center bg-[#0f0f0f] px-10 py-12 text-[#a1a1a1] transition-all duration-200 ease-in-out lg:px-14"
          onMouseMove={(event) => {
            if (!lineReaderEnabled || !passagePanelRef.current) return;
            const rect = passagePanelRef.current.getBoundingClientRect();
            setLineReaderY(Math.min(rect.height - 40, Math.max(0, event.clientY - rect.top - 20)));
          }}
          ref={passagePanelRef}
        >
          <div className={isStudentResponse ? "w-full max-w-[620px] text-[#a1a1a1]" : "flex w-full max-w-[620px] flex-col gap-5 text-[#a1a1a1]"}>
            {isStudentResponse ? (
              <StudentResponseDirections />
            ) : isNotesQuestion ? (
              <div className="mb-6 flex w-full max-w-[620px] flex-col gap-4 select-text text-[17px] leading-8 tracking-normal text-[#a1a1a1] [text-wrap:pretty]">
                <p>A student is reviewing notes for a writing task.</p>
                <section aria-labelledby="notes-label" className="pb-3">
                  <div id="notes-label" className="mb-2 text-[14px] font-semibold text-[#a1a1a1]">
                    Notes
                  </div>
                  <ul className="m-0 flex list-disc flex-col gap-2 pl-6">
                    {question.data_payload?.notes?.map((note, noteIndex) => (
                      <li key={`${question.id}-note-${noteIndex}`} className="pl-1">
                        {note}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : isCrossTextQuestion ? (
              <div className="mb-6 flex w-full max-w-[620px] flex-col gap-4 select-text text-[17px] leading-8 tracking-normal text-[#a1a1a1] [text-wrap:pretty]">
                <section aria-labelledby="text-1-label" className="mb-5 pb-3">
                  <div id="text-1-label" className="mb-2 text-[14px] font-semibold text-[#a1a1a1]">
                    Text 1
                  </div>
                  <p>{question.data_payload?.text_1}</p>
                </section>
                <section aria-labelledby="text-2-label">
                  <div id="text-2-label" className="mb-2 text-[14px] font-semibold text-[#a1a1a1]">
                    Text 2
                  </div>
                  <p>{question.data_payload?.text_2}</p>
                </section>
              </div>
            ) : question.passage ? (
              <p
                ref={passageRef}
                aria-label="Passage text"
                className="mb-6 w-full max-w-[620px] select-text text-[17px] leading-8 tracking-normal text-[#a1a1a1] [text-wrap:pretty]"
                onClick={handlePassageClick}
                onMouseUp={handlePassageMouseUp}
              />
            ) : null}
            {!isStudentResponse && hasTablePayload ? (
              <div className="mt-8 overflow-x-auto">
                {question.data_payload?.title ? (
                  <div className="mb-2 text-center text-sm font-semibold text-[#a1a1a1]">
                    {question.data_payload.title}
                  </div>
                ) : null}
                <table className="w-full border-collapse text-sm text-[#a1a1a1]">
                  <thead>
                    <tr>
                      {question.data_payload?.columns?.map((column) => (
                        <th
                          className="border border-[#2a2a2a] bg-[#181818] px-3 py-2 text-left font-semibold"
                          key={column}
                          scope="col"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {question.data_payload?.rows?.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {question.data_payload?.columns?.map((column) => (
                          <td className="border border-[#2a2a2a] px-3 py-2" key={column}>
                            {String(row[column] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {!isStudentResponse && graphPayload ? (
              <DataGraph payload={graphPayload} />
            ) : null}
            {!isStudentResponse && question.graph_path ? (
              <Image
                alt="SAT graph"
                className="mt-8 h-auto max-h-[420px] w-full object-contain opacity-90 transition-all duration-200 ease-in-out"
                height={480}
                src={`${API_URL}${question.graph_path}`}
                width={640}
              />
            ) : null}
          </div>
          <h1 className="mt-8 max-w-[620px] text-center text-[20px] font-semibold leading-8 text-[#a1a1a1] transition-all duration-200 ease-in-out">
            {question.prompt}
          </h1>
          {lineReaderEnabled ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 right-0 z-10 h-10 bg-white/5"
              style={{ top: lineReaderY }}
            />
          ) : null}
        </article>

        <aside className="page-container border-l border-[#2a2a2a] bg-[#181818] px-10 py-12 text-[#a1a1a1] transition-all duration-200 ease-in-out">
          <div className="question-center">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 min-w-9 items-center justify-center border border-[#2a2a2a] bg-[#0f0f0f] text-base font-bold text-[#a1a1a1] transition-all duration-200 ease-in-out">
                  {index + 1}
                </div>
                <button
                  onClick={() => toggleMark(question.id)}
                  className={`inline-flex items-center gap-2 text-sm font-semibold transition-all duration-200 ease-in-out hover:text-white ${marked[question.id] ? "text-white" : "text-[#a1a1a1]"}`}
                  title="Mark for review"
                >
                  <Bookmark size={17} fill={marked[question.id] ? "currentColor" : "none"} /> Mark for Review
                </button>
              </div>
              <button
                className="inline-flex items-center gap-2 px-2 py-1 text-sm font-semibold text-[#a1a1a1] transition-all duration-200 ease-in-out hover:text-white disabled:opacity-40"
                disabled={actionHistory.length === 0}
                onClick={undoLastAnswerAction}
                type="button"
              >
                <Undo2 size={16} /> Undo
              </button>
            </div>
            <div className="mb-6 border-t border-[#2a2a2a]" />

            <div className="answers">
              {question.format === "multiple_choice" ? orderedChoices.map((choice, choiceIndex) => (
                <div
                  key={choice.label}
                  className={`answer-option flex items-stretch border p-0 text-left text-[16px] leading-7 transition-all duration-[250ms] ease-in-out hover:border-white ${
                    selectedAnswer === choice.label
                      ? "border-white bg-white text-black"
                      : "border-[#2a2a2a] bg-[#181818] text-[#a1a1a1]"
                  }`}
                  role="radio"
                  aria-checked={selectedAnswer === choice.label}
                  aria-disabled={eliminatedAnswers.has(choice.label)}
                >
                  <button
                    className={`flex min-w-0 flex-1 items-start gap-4 p-4 text-left transition-all duration-[250ms] ease-in-out focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-white ${
                      eliminatedAnswers.has(choice.label)
                        ? "cursor-not-allowed text-[#666666] opacity-60"
                        : selectedAnswer === choice.label
                          ? "text-black"
                          : "text-[#a1a1a1]"
                    }`}
                    data-choice-index={choiceIndex}
                    disabled={eliminatedAnswers.has(choice.label)}
                    onClick={() => {
                      setFocusedChoiceIndex(choiceIndex);
                      selectAnswer(choice.label);
                    }}
                    onFocus={() => setFocusedChoiceIndex(choiceIndex)}
                    tabIndex={choiceIndex === focusedChoiceIndex ? 0 : -1}
                    type="button"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center border text-sm font-bold transition-all duration-[250ms] ease-in-out ${
                        selectedAnswer === choice.label
                          ? "border-black bg-black text-white"
                          : eliminatedAnswers.has(choice.label)
                            ? "border-[#555555] bg-transparent text-[#666666]"
                            : "border-[#2a2a2a] bg-transparent text-[#a1a1a1]"
                      }`}
                    >
                      {choice.label}
                    </span>
                    <span className={eliminatedAnswers.has(choice.label) ? "text-[#666666] line-through decoration-[#666666] decoration-2" : selectedAnswer === choice.label ? "text-black" : "text-[#a1a1a1]"}>
                      {choice.text}
                    </span>
                  </button>
                  <button
                    aria-pressed={eliminatedAnswers.has(choice.label)}
                    className={`m-3 ml-0 flex h-9 w-9 shrink-0 items-center justify-center border bg-transparent transition-all duration-[250ms] ease-in-out hover:border-white hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-white ${
                      eliminatedAnswers.has(choice.label) ? "border-white text-white" : selectedAnswer === choice.label ? "border-black text-black" : "border-[#2a2a2a] text-[#a1a1a1]"
                    }`}
                    onClick={() => toggleEliminate(choice.label)}
                    title={eliminatedAnswers.has(choice.label) ? `Undo elimination for ${choice.label}` : `Eliminate ${choice.label}`}
                    type="button"
                  >
                    <Ban size={17} />
                  </button>
                </div>
              )) : (
                <StudentResponseEntry
                  value={answers[question.id] || ""}
                  onChange={(value) => save(question.id, value)}
                />
              )}
            </div>
          </div>
        </aside>
      </section>

      {highlightToolbar.visible ? (
        <div
          ref={highlightToolbarRef}
          className="fixed z-40 flex items-center gap-1 rounded-md border border-[#d1d5db] bg-white px-2 py-1"
          onMouseDown={(event) => event.preventDefault()}
          style={{ left: highlightToolbar.x, top: highlightToolbar.y }}
        >
          <button
            aria-label="Yellow highlight"
            className="h-7 w-7 rounded border border-[#e5e7eb] bg-[#fde68a] hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
            onClick={() => applyPassageHighlight("yellow")}
            type="button"
          />
          <button
            aria-label="Blue highlight"
            className="h-7 w-7 rounded border border-[#e5e7eb] bg-[#bfdbfe] hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
            onClick={() => applyPassageHighlight("blue")}
            type="button"
          />
          <button
            aria-label="Pink highlight"
            className="h-7 w-7 rounded border border-[#e5e7eb] bg-[#fbcfe8] hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
            onClick={() => applyPassageHighlight("pink")}
            type="button"
          />
          <button
            className="h-7 rounded border border-[#e5e7eb] px-2 text-sm font-semibold underline underline-offset-2 hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
            onClick={() => applyPassageHighlight("underline")}
            type="button"
          >
            U
          </button>
          <button
            className="h-7 rounded border border-[#e5e7eb] px-2 text-sm font-semibold text-slate-700 hover:border-slate-500 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
            onClick={deleteSelectedPassageHighlights}
            type="button"
          >
            Delete
          </button>
        </div>
      ) : null}

      {activeModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-md border border-[#d1d5db] bg-white p-5 text-slate-950 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold">{activeModal === "shortcuts" ? "Keyboard Shortcuts" : "Help"}</h2>
              <button
                aria-label="Close"
                className="rounded p-1 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                onClick={() => setActiveModal(null)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>
            {activeModal === "shortcuts" ? (
              <dl className="grid gap-3 text-sm">
                <div className="grid grid-cols-[160px_1fr] gap-4">
                  <dt className="font-bold">ArrowUp / ArrowDown</dt>
                  <dd>navigate answers</dd>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-4">
                  <dt className="font-bold">Enter</dt>
                  <dd>select answer</dd>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-4">
                  <dt className="font-bold">Shift + A/B/C/D</dt>
                  <dd>eliminate answer</dd>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-4">
                  <dt className="font-bold">H</dt>
                  <dd>toggle highlight mode</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm leading-6">This is a practice SAT Bluebook simulation.</p>
            )}
          </div>
        </div>
      ) : null}

      {isNavigatorOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/20 px-4" role="dialog" aria-modal="true" aria-labelledby="question-navigator-title">
          <div
            className="relative w-full max-w-[520px] rounded-xl bg-white p-6 text-slate-950 shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
            ref={navigatorRef}
          >
            <div className="absolute -bottom-3 left-1/2 h-6 w-6 -translate-x-1/2 rotate-45 bg-white shadow-[4px_4px_10px_rgba(0,0,0,0.08)]" aria-hidden="true" />
            <div className="relative z-10">
              <div className="mb-5 flex items-start justify-between gap-4">
                <h2 className="text-lg font-bold leading-6" id="question-navigator-title">
                  {fullSectionTitle} Questions
                </h2>
                <button
                  aria-label="Close question navigator"
                  className="rounded p-1 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                  onClick={() => setIsNavigatorOpen(false)}
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 border-2 border-black bg-white" />
                  Current
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 border-2 border-dashed border-gray-400 bg-white" />
                  Unanswered
                </div>
                <div className="flex items-center gap-2">
                  <Flag size={16} className="fill-red-600 text-red-600" />
                  For Review
                </div>
              </div>

              <div className="grid grid-cols-10 gap-2">
                {moduleData.questions.map((item, itemIndex) => {
                  const questionNumber = itemIndex + 1;
                  return (
                    <button
                      className={`relative h-10 rounded text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${navigatorButtonClass(item, questionNumber)}`}
                      key={item.id}
                      onClick={() => goToQuestion(questionNumber)}
                      type="button"
                    >
                      {questionNumber}
                      {markedForReview.has(questionNumber) ? (
                        <Flag size={12} className="absolute -right-1 -top-1 fill-red-600 text-red-600" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <button
                className="mt-6 w-full rounded-md bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                onClick={() => console.log("review page")}
                type="button"
              >
                Go to Review Page
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CalculatorModal
        open={isMathSection && isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        scriptReady={desmosReady || Boolean(typeof window !== "undefined" && window.Desmos)}
        scriptFailed={desmosFailed}
      />

      <ReferenceModal
        open={isMathSection && isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
      />

      <footer className="sticky bottom-0 z-20 border-t border-[#2a2a2a] bg-[#0f0f0f] text-[#a1a1a1]">
        <div className="mx-auto grid h-14 max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5">
          <div>
            <button
              disabled={index === 0}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#a1a1a1] transition-all duration-200 ease-in-out hover:text-white disabled:opacity-40"
            >
              <ChevronLeft size={18} /> Back
            </button>
          </div>
          <div className="relative flex justify-center">
            <button
              className="px-4 py-2 text-sm font-semibold text-[#a1a1a1] transition-all duration-200 ease-in-out hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white"
              onClick={() => setIsNavigatorOpen(true)}
              type="button"
            >
              Question {currentQuestion} of {moduleData.questions.length}
            </button>
          </div>
          <div className="flex justify-end">
            {index === moduleData.questions.length - 1 ? (
              <button onClick={openCheckWork} className="border border-[#2a2a2a] bg-[#181818] px-5 py-2 text-sm font-semibold text-[#a1a1a1] transition-all duration-200 ease-in-out hover:border-white hover:text-white">
                Next
              </button>
            ) : (
              <button
                onClick={() => setIndex((value) => Math.min(moduleData.questions.length - 1, value + 1))}
                className="inline-flex items-center gap-2 border border-[#2a2a2a] bg-[#181818] px-5 py-2 text-sm font-semibold text-[#a1a1a1] transition-all duration-200 ease-in-out hover:border-white hover:text-white"
              >
                Next <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}
