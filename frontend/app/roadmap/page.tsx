"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Check, Lock, Trophy } from "lucide-react";
import { api, getToken } from "@/lib/api";
import { calculateDiagnosticResult } from "@/lib/free-diagnostic";
import { getFreeDiagnosticResult } from "@/lib/free-diagnostic-storage";
import { useLanguage } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

type RoadmapStatus = "locked" | "current" | "completed";
type RoadmapKind = "diagnostic" | "math" | "reading" | "writing" | "checkpoint" | "milestone" | "mock" | "review";

type RoadmapNode = {
  id: string;
  type: RoadmapKind;
  topicKey: string;
  title: string;
  subtitle: string;
  icon: string;
  status: RoadmapStatus;
};

type ApiRoadmapNode = {
  id: string;
  node_type: RoadmapKind;
  topic_key: string;
  status: RoadmapStatus;
  icon_key: string;
};

const lionLogo = "/assets/brand/sattest-lion-crest.png";
const progressKey = "sattest_roadmap_progress_v1";

const topicTitles: Record<string, { title: string; subtitle: string; icon: string; type: RoadmapKind }> = {
  "diagnostic-test": { title: "Diagnostic Test", subtitle: "Start here: find your weak and strong topics.", icon: "🎯", type: "diagnostic" },
  "advanced-functions": { title: "Advanced Math: Functions", subtitle: "Inputs, outputs, transformations, and graph meaning.", icon: "📐", type: "math" },
  "quadratics-nonlinear": { title: "Quadratics & Nonlinear", subtitle: "Factor, vertex, roots, and structure.", icon: "📐", type: "math" },
  "advanced-math-mixed": { title: "Advanced Math Review", subtitle: "Mixed advanced problems from your misses.", icon: "📐", type: "math" },
  "linear-equations": { title: "Algebra: Linear Equations", subtitle: "Build equations without losing the asked value.", icon: "📐", type: "math" },
  "systems-equations": { title: "Algebra: Systems", subtitle: "Substitution, elimination, and interpretation.", icon: "📐", type: "math" },
  "equation-setup": { title: "Equation Setup", subtitle: "Translate words into math cleanly.", icon: "📐", type: "math" },
  "geometry-angles": { title: "Geometry: Angles", subtitle: "Angle rules, lines, circles, and diagrams.", icon: "📐", type: "math" },
  "triangles-trigonometry": { title: "Geometry & Trigonometry", subtitle: "Triangles, ratios, and exact relationships.", icon: "📐", type: "math" },
  "rates-percent": { title: "Rates & Percents", subtitle: "Units, totals, percentages, and change.", icon: "📐", type: "math" },
  "data-inference": { title: "Data Analysis", subtitle: "Tables, claims, and exact evidence.", icon: "📐", type: "math" },
  "algebra-foundations": { title: "Algebra Foundations", subtitle: "Repair the most common setup errors.", icon: "📐", type: "math" },
  "advanced-math-intro": { title: "Advanced Math Intro", subtitle: "Functions and nonlinear structure.", icon: "📐", type: "math" },
  "data-analysis": { title: "Data Analysis", subtitle: "Read data before choosing an answer.", icon: "📐", type: "math" },
  "words-context": { title: "Words in Context", subtitle: "Use evidence, not dictionary memory.", icon: "📖", type: "reading" },
  "context-clues": { title: "Context Clues", subtitle: "Read before and after the target word.", icon: "📖", type: "reading" },
  "vocabulary-precision": { title: "Vocabulary Precision", subtitle: "Pick the exact meaning the sentence needs.", icon: "📖", type: "reading" },
  "main-idea": { title: "Main Idea", subtitle: "Find the answer that covers the whole text.", icon: "📖", type: "reading" },
  "text-structure": { title: "Text Structure", subtitle: "Claim, evidence, contrast, and purpose.", icon: "📖", type: "reading" },
  "reading-evidence": { title: "Reading Evidence", subtitle: "Every answer must be proven by text.", icon: "📖", type: "reading" },
  "transition-logic": { title: "Transitions", subtitle: "Same direction, contrast, cause, or example.", icon: "✍️", type: "writing" },
  "contrast-cause-example": { title: "Transition Families", subtitle: "Match the relationship between ideas.", icon: "✍️", type: "writing" },
  "punctuation-boundaries": { title: "Boundaries", subtitle: "Independent and dependent clause control.", icon: "✍️", type: "writing" },
  "comma-semicolon-colon": { title: "Punctuation Tools", subtitle: "Comma, semicolon, colon, dash.", icon: "✍️", type: "writing" },
  "synthesis-notes": { title: "Rhetorical Synthesis", subtitle: "Use all notes without adding outside facts.", icon: "✍️", type: "writing" },
  "source-goal-matching": { title: "Source Goal Matching", subtitle: "Choose the sentence that matches the task.", icon: "✍️", type: "writing" },
  "sentence-logic": { title: "Writing Logic", subtitle: "Complete the sentence with precise meaning.", icon: "✍️", type: "writing" }
};

const weakAreaMap: Record<string, string[]> = {
  "Advanced Math": ["advanced-functions", "quadratics-nonlinear", "advanced-math-mixed"],
  Algebra: ["linear-equations", "systems-equations", "equation-setup"],
  "Geometry and Trigonometry": ["geometry-angles", "triangles-trigonometry"],
  "Problem Solving and Data Analysis": ["rates-percent", "data-inference"],
  "Words in Context": ["words-context", "context-clues", "vocabulary-precision"],
  "Main Purpose / Central Idea": ["main-idea", "text-structure"],
  Transitions: ["transition-logic", "contrast-cause-example"],
  Boundaries: ["punctuation-boundaries", "comma-semicolon-colon"],
  "Rhetorical Synthesis": ["synthesis-notes", "source-goal-matching"]
};

const defaultTopics = [
  "algebra-foundations",
  "reading-evidence",
  "sentence-logic",
  "words-context",
  "advanced-math-intro",
  "transition-logic",
  "data-analysis",
  "main-idea"
];

export default function RoadmapPage() {
  const { language } = useLanguage();
  const [routeLanguage, setRouteLanguage] = useState<Language>(language);
  const [hasDiagnostic, setHasDiagnostic] = useState(false);
  const [nodes, setNodes] = useState<RoadmapNode[]>([]);
  const [tooltip, setTooltip] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
    if (requestedLanguage === "en" || requestedLanguage === "ru" || requestedLanguage === "uz") {
      setRouteLanguage(requestedLanguage);
    } else {
      setRouteLanguage(language);
    }

    const diagnostic = getFreeDiagnosticResult();
    if (diagnostic) {
      const result = calculateDiagnosticResult(diagnostic.answers);
      const localNodes = buildLocalRoadmap(result.weakAreas, result.topicAccuracy.filter((topic) => topic.accuracy >= 0.75).map((topic) => topic.topic));
      if (active) {
        setHasDiagnostic(true);
        setNodes(localNodes);
      }
    }

    if (getToken()) {
      api<{ nodes: ApiRoadmapNode[] }>("/api/roadmap/me")
        .then((payload) => {
          if (!active || !payload.nodes.length) return;
          setHasDiagnostic(true);
          setNodes(applySavedProgress(payload.nodes.map(mapApiNode)));
        })
        .catch(() => {
          // Local diagnostic roadmap remains available when API rows do not exist yet.
        });
    }

    return () => {
      active = false;
    };
  }, [language]);

  const completed = nodes.filter((node) => node.status === "completed").length;
  const total = nodes.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  const progressStyle = useMemo(() => ({
    background: `conic-gradient(#FFD700 ${percent * 3.6}deg, #2a2a2a 0deg)`
  }), [percent]);

  function handleNodeClick(node: RoadmapNode) {
    if (node.status === "locked") {
      setTooltip(node.id);
      window.setTimeout(() => setTooltip(null), 1800);
      return;
    }

    const mode = node.status === "completed" ? "review" : "lesson";
    const target = node.type === "diagnostic"
      ? `/mock-test/diagnostic?lang=${routeLanguage}`
      : `/practice?topic=${encodeURIComponent(node.topicKey)}&mode=${mode}&lang=${routeLanguage}`;
    window.location.href = target;
  }

  if (!hasDiagnostic) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white">
        <RoadmapHeader />
        <section className="flex min-h-[calc(100vh-120px)] items-center justify-center px-5 py-16">
          <div className="max-w-xl rounded-xl border border-[#FFD700]/30 bg-[#151515] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FFD700] text-4xl text-black">🎯</div>
            <h1 className="mt-6 text-3xl font-black">Yo'l xaritangiz hali tayyor emas</h1>
            <p className="mt-4 text-lg leading-8 text-white/62">
              Diagnostikani topshiring va shaxsiy SAT yo'lingizni oling!
            </p>
            <Link className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#FFD700] px-6 py-3 font-black text-black transition hover:bg-white" href={`/mock-test/diagnostic?lang=${routeLanguage}`}>
              Diagnostikani Boshlash →
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <RoadmapHeader />
      <div className="fixed right-5 top-28 z-30 hidden items-center gap-3 rounded-xl border border-[#FFD700]/25 bg-[#151515]/95 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.42)] backdrop-blur md:flex">
        <div className="flex h-12 w-12 items-center justify-center rounded-full p-1" style={progressStyle}>
          <div className="flex h-full w-full items-center justify-center rounded-full bg-[#111] text-xs font-black text-[#FFD700]">{percent}%</div>
        </div>
        <p className="text-sm font-black">Yo'lda: {completed}/{total} tugallandi</p>
      </div>
      <div className="fixed left-0 right-0 top-0 z-40 h-1 bg-[#333] md:hidden">
        <div className="h-full bg-[#FFD700]" style={{ width: `${percent}%` }} />
      </div>

      <section className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="absolute left-1/2 top-14 hidden h-[calc(100%-120px)] -translate-x-1/2 border-l-2 border-dashed border-[#444] md:block" />
        <div className="absolute left-1/2 top-14 hidden h-[calc((100%-120px)*var(--completed-ratio))] -translate-x-1/2 border-l-2 border-dashed border-[#FFD700] md:block" style={{ "--completed-ratio": total ? completed / total : 0 } as CSSProperties} />

        <div className="grid gap-8">
          {nodes.map((node, index) => (
            <div className={["relative flex", index % 2 === 0 ? "md:justify-start" : "md:justify-end"].join(" ")} key={node.id}>
              <button
                className={[
                  "group relative flex min-h-[92px] w-full items-center gap-4 rounded-xl border bg-[#151515] p-4 text-left transition md:w-[44%]",
                  node.status === "current" ? "border-[#FFD700] shadow-[0_0_24px_rgba(255,215,0,0.24)]" : "border-white/10",
                  node.status === "completed" ? "border-[#FFD700]/45" : "",
                  node.status === "locked" ? "opacity-65 hover:border-white/20" : "hover:border-[#FFD700]"
                ].join(" ")}
                onClick={() => handleNodeClick(node)}
                type="button"
              >
                {node.status === "current" ? <span className="absolute -top-5 left-5 rounded-full bg-[#FFD700] px-3 py-1 text-xs font-black text-black">BOSHLASH</span> : null}
                {tooltip === node.id ? <span className="absolute -top-10 left-5 rounded-xl border border-[#FFD700]/30 bg-black px-3 py-2 text-xs font-bold text-[#FFD700]">Avval oldingi darslarni tugating</span> : null}
                <NodeCircle node={node} />
                <span>
                  <span className="block text-lg font-black text-white">{node.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-white/55">{node.subtitle}</span>
                  <span className="mt-2 block text-xs font-black text-[#FFD700]">{node.type.toUpperCase()}</span>
                </span>
              </button>
            </div>
          ))}
        </div>
      </section>

      <style jsx global>{`
        @keyframes roadmap-node-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.45), 0 0 20px rgba(255, 215, 0, 0.5); }
          50% { box-shadow: 0 0 0 12px rgba(255, 215, 0, 0), 0 0 30px rgba(255, 215, 0, 0.72); }
        }
        .roadmap-current-node {
          animation: roadmap-node-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}

function RoadmapHeader() {
  return (
    <header className="bg-[#FFD700] px-5 py-6 text-[#0a0a0a]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <p className="text-3xl font-black">SAT YO'L XARITASI</p>
          <p className="mt-1 text-base font-bold opacity-75">Diagnostikadan 1400+ gacha</p>
        </div>
        <Image className="h-14 w-14 rounded-xl border border-black/20 object-cover" src={lionLogo} alt="SATTEST lion crest" width={96} height={96} />
      </div>
    </header>
  );
}

function NodeCircle({ node }: { node: RoadmapNode }) {
  const isSpecial = node.type === "checkpoint" || node.type === "milestone";
  const base = [
    "flex h-16 w-16 shrink-0 items-center justify-center rounded-full border text-2xl font-black transition md:h-[72px] md:w-[72px]",
    isSpecial ? "h-20 w-20 md:h-24 md:w-24" : "",
    node.status === "locked" ? "border-[#444] bg-[#2a2a2a] text-white/45" : "",
    node.status === "current" ? "roadmap-current-node border-[#FFD700] bg-[#FFD700] text-black" : "",
    node.status === "completed" ? "border-[#FFD700] bg-[#FFD700] text-black" : "",
    isSpecial && node.status !== "locked" ? "ring-4 ring-[#FFD700]/35" : ""
  ].join(" ");

  if (node.type === "milestone" || node.type === "checkpoint") {
    return (
      <span className={base}>
        {node.status === "locked" ? <Lock size={24} /> : <Image className="h-10 w-10 rounded-full object-cover md:h-12 md:w-12" src={lionLogo} alt="" width={80} height={80} />}
      </span>
    );
  }

  if (node.type === "mock") {
    return <span className={base}>{node.status === "locked" ? <Lock size={24} /> : node.status === "completed" ? <Check size={30} /> : <Trophy size={30} />}</span>;
  }

  return <span className={base}>{node.status === "locked" ? <Lock size={24} /> : node.status === "completed" ? <Check size={30} /> : node.icon}</span>;
}

function buildLocalRoadmap(weakAreas: string[], strongAreas: string[]) {
  const topicKeys = ["diagnostic-test"];
  const seen = new Set(topicKeys);

  weakAreas.slice(0, 5).forEach((area) => {
    const keys = keysForArea(area).slice(0, 3);
    keys.forEach((key) => {
      if (!seen.has(key)) {
        topicKeys.push(key);
        seen.add(key);
      }
    });
  });

  defaultTopics.forEach((key) => {
    if (!seen.has(key)) {
      topicKeys.push(key);
      seen.add(key);
    }
  });

  strongAreas.slice(0, 4).forEach((area) => {
    const key = `review-${slug(area)}`;
    if (!seen.has(key)) {
      topicKeys.push(key);
      seen.add(key);
    }
  });

  const withSpecials = insertSpecialNodes(topicKeys);
  return applySavedProgress(withSpecials.map((topicKey, index) => {
    const meta = topicTitles[topicKey] || {
      title: prettifyTopic(topicKey),
      subtitle: "Light review from your stronger area.",
      icon: "📖",
      type: topicKey.startsWith("review-") ? "review" as RoadmapKind : "reading" as RoadmapKind
    };
    return {
      id: `${topicKey}-${index}`,
      topicKey,
      type: meta.type,
      title: meta.title,
      subtitle: meta.subtitle,
      icon: meta.icon,
      status: index === 0 ? "completed" : index === 1 ? "current" : "locked"
    };
  }));
}

function mapApiNode(node: ApiRoadmapNode): RoadmapNode {
  const meta = topicTitles[node.topic_key] || {
    title: prettifyTopic(node.topic_key),
    subtitle: node.node_type === "review" ? "Light review from your stronger area." : "Personalized topic from your roadmap.",
    icon: iconForType(node.node_type),
    type: node.node_type
  };
  return {
    id: node.id,
    topicKey: node.topic_key,
    type: node.node_type,
    title: meta.title,
    subtitle: meta.subtitle,
    icon: meta.icon,
    status: node.status
  };
}

function applySavedProgress(nodes: RoadmapNode[]) {
  let completedIds: string[] = [];
  try {
    completedIds = JSON.parse(window.localStorage.getItem(progressKey) || "[]");
  } catch {
    completedIds = [];
  }

  const completedTopics = new Set(completedIds);
  const updated = nodes.map((node, index) => ({
    ...node,
    status: index === 0 || completedTopics.has(node.topicKey) ? "completed" as RoadmapStatus : "locked" as RoadmapStatus
  }));
  const firstLocked = updated.findIndex((node) => node.status !== "completed");
  if (firstLocked >= 0) updated[firstLocked] = { ...updated[firstLocked], status: "current" };
  return updated;
}

function keysForArea(area: string) {
  const exact = weakAreaMap[area];
  if (exact) return exact;
  const lower = area.toLowerCase();
  const match = Object.keys(weakAreaMap).find((key) => lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower));
  if (match) return weakAreaMap[match];
  if (lower.includes("math")) return weakAreaMap["Advanced Math"];
  if (lower.includes("word") || lower.includes("vocab")) return weakAreaMap["Words in Context"];
  if (lower.includes("transition")) return weakAreaMap.Transitions;
  if (lower.includes("grammar") || lower.includes("punctuation")) return weakAreaMap.Boundaries;
  return ["reading-evidence", "main-idea"];
}

function insertSpecialNodes(topicKeys: string[]) {
  const result: string[] = [];
  let contentCount = 0;
  let checkpoint = 1;
  let milestone = 1;
  let mock = 1;

  topicKeys.forEach((key) => {
    result.push(key);
    if (key === "diagnostic-test") return;
    contentCount += 1;
    if ([4, 8, 12, 16].includes(contentCount)) {
      result.push(`mock-${mock}`);
      topicTitles[`mock-${mock}`] = { title: `Mock Test Module ${mock}`, subtitle: "Timed checkpoint for score growth.", icon: "🏆", type: "mock" };
      mock += 1;
    }
    if (contentCount % 5 === 0) {
      result.push(`checkpoint-${checkpoint}`);
      topicTitles[`checkpoint-${checkpoint}`] = { title: `Checkpoint Quiz ${checkpoint}`, subtitle: "Short quiz before the next block.", icon: "⭐", type: "checkpoint" };
      checkpoint += 1;
    }
    if (contentCount % 10 === 0) {
      result.push(`milestone-${milestone}`);
      topicTitles[`milestone-${milestone}`] = { title: `Lion Milestone ${milestone}`, subtitle: "A premium marker in your SATTEST route.", icon: "🦁", type: "milestone" };
      milestone += 1;
    }
  });

  result.push(`milestone-${milestone}`);
  topicTitles[`milestone-${milestone}`] = { title: "1400+ Readiness Milestone", subtitle: "Final review before full mock retake.", icon: "🦁", type: "milestone" };
  return result;
}

function iconForType(type: RoadmapKind) {
  if (type === "math") return "📐";
  if (type === "reading") return "📖";
  if (type === "writing") return "✍️";
  if (type === "mock") return "🏆";
  if (type === "diagnostic") return "🎯";
  return "⭐";
}

function prettifyTopic(topicKey: string) {
  return topicKey.replace(/^review-/, "Review: ").replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mixed";
}
