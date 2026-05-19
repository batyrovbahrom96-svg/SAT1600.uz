"use client";

import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Ban, Bookmark, ChevronLeft, ChevronRight, Undo2 } from "lucide-react";
import { API_URL, ApiError, Question, api } from "@/lib/api";

type ModulePayload = {
  attempt: { id: string; current_section: string; current_module: number; status: string; route: Record<string, unknown> };
  duration_seconds: number;
  questions: Question[];
  answers: Record<string, { selected_answer: string | null; marked_for_review: boolean; time_spent_seconds: number }>;
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

const highlightStyles: Record<HighlightType, string> = {
  yellow: "background-color: #fde68a;",
  blue: "background-color: #bfdbfe;",
  pink: "background-color: #fbcfe8;",
  underline: "text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 2px;"
};

export default function TestPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const [moduleData, setModuleData] = useState<ModulePayload | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [eliminatedAnswers, setEliminatedAnswers] = useState<Set<string>>(new Set());
  const [actionHistory, setActionHistory] = useState<AnswerAction[]>([]);
  const [focusedChoiceIndex, setFocusedChoiceIndex] = useState(0);
  const [leftPanelPercent, setLeftPanelPercent] = useState(60);
  const [highlightToolbar, setHighlightToolbar] = useState<HighlightToolbar>({ visible: false, x: 0, y: 0 });
  const testBodyRef = useRef<HTMLElement | null>(null);
  const passageRef = useRef<HTMLParagraphElement | null>(null);
  const highlightToolbarRef = useRef<HTMLDivElement | null>(null);
  const selectedPassageRange = useRef<Range | null>(null);
  const selectedPassageOffsets = useRef<{ startOffset: number; endOffset: number; highlightId?: string } | null>(null);
  const toolbarAnchorRect = useRef<DOMRect | null>(null);
  const resizingDivider = useRef(false);
  const questionStartedAt = useRef(Date.now());
  const spentByQuestion = useRef<Record<string, number>>({});
  const firstInteractionByQuestion = useRef<Record<string, number>>({});
  const interactionCountByQuestion = useRef<Record<string, number>>({});

  useEffect(() => {
    api<ModulePayload>(`/api/attempts/${attemptId}/module`).then((data) => {
      setModuleData(data);
      setSecondsLeft(data.duration_seconds);
      setAnswers(Object.fromEntries(Object.entries(data.answers).map(([id, answer]) => [id, answer.selected_answer || ""])));
      setMarked(Object.fromEntries(Object.entries(data.answers).map(([id, answer]) => [id, answer.marked_for_review])));
      spentByQuestion.current = Object.fromEntries(Object.entries(data.answers).map(([id, answer]) => [id, answer.time_spent_seconds || 0]));
      firstInteractionByQuestion.current = {};
      interactionCountByQuestion.current = {};
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
    if (moduleData && secondsLeft === 0) void advance();
  }, [secondsLeft]);

  const question = moduleData?.questions[index];

  useEffect(() => {
    restorePassageHighlights();
    selectedPassageRange.current = null;
    selectedPassageOffsets.current = null;
    setHighlightToolbar({ visible: false, x: 0, y: 0 });
  }, [question?.id, question?.passage]);

  useEffect(() => {
    questionStartedAt.current = Date.now();
    if (question) loadStoredAnswerState(question);
    const selectedIndex = question?.choices.findIndex((choice) => choice.label === (selectedAnswer || answers[question.id])) ?? -1;
    setFocusedChoiceIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [question?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!question || question.format !== "multiple_choice" || !question.choices.length) return;
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable) return;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = (focusedChoiceIndex + direction + question.choices.length) % question.choices.length;
        setFocusedChoiceIndex(nextIndex);
        window.requestAnimationFrame(() => {
          document.querySelector<HTMLElement>(`[data-choice-index="${nextIndex}"]`)?.focus();
        });
      }

      if (event.shiftKey && /^[a-d]$/i.test(event.key)) {
        event.preventDefault();
        const label = event.key.toUpperCase();
        if (question.choices.some((choice) => choice.label === label)) {
          toggleEliminate(label);
        }
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const choice = question.choices[focusedChoiceIndex];
        if (choice) selectAnswer(choice.label);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [question, focusedChoiceIndex, answers, marked, selectedAnswer, eliminatedAnswers, actionHistory]);

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

  function renderPassageHtml(text: string, highlights: PassageHighlight[]) {
    const ordered = [...highlights]
      .map((highlight) => reconcileHighlight(text, highlight))
      .filter((highlight): highlight is PassageHighlight => Boolean(highlight))
      .sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset);
    let cursor = 0;
    let html = "";

    for (const highlight of ordered) {
      if (highlight.startOffset < cursor) continue;
      html += escapeHtml(text.slice(cursor, highlight.startOffset));
      html += `<span class="passage-highlight" data-passage-highlight="${highlight.id}" style="${highlightStyles[highlight.type]} border-radius: 2px; cursor: pointer;">${escapeHtml(text.slice(highlight.startOffset, highlight.endOffset))}</span>`;
      cursor = highlight.endOffset;
    }

    return html + escapeHtml(text.slice(cursor));
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
    if (!passageRef.current) return;
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
      console.log("API unavailable, continue");
    }
  }

  async function toggleMark(questionId: string) {
    const next = !marked[questionId];
    setMarked((current) => ({ ...current, [questionId]: next }));
    await save(questionId, answers[questionId] || "", next);
  }

  async function advance() {
    try {
      const result = await api<{ status: string; current_section: string; current_module: number }>(`/api/attempts/${attemptId}/advance`, { method: "POST" });
      if (result.status === "completed") {
        router.push(`/results/${attemptId}`);
        return;
      }
      const data = await api<ModulePayload>(`/api/attempts/${attemptId}/module`);
      setModuleData(data);
      setSecondsLeft(data.duration_seconds);
      setIndex(0);
      setAnswers(Object.fromEntries(Object.entries(data.answers).map(([id, answer]) => [id, answer.selected_answer || ""])));
      setMarked(Object.fromEntries(Object.entries(data.answers).map(([id, answer]) => [id, answer.marked_for_review])));
      spentByQuestion.current = Object.fromEntries(Object.entries(data.answers).map(([id, answer]) => [id, answer.time_spent_seconds || 0]));
      firstInteractionByQuestion.current = {};
      interactionCountByQuestion.current = {};
    } catch {
      console.log("API unavailable, continue");
    }
  }

  if (!moduleData || !question) {
    return <main className="grid min-h-screen place-items-center bg-white font-bold text-slate-900">Loading test...</main>;
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  const sectionTitle = moduleData.attempt.current_section === "reading_writing" ? "Reading and Writing" : "Math";
  const sectionNumber = moduleData.attempt.current_section === "reading_writing" ? 1 : 2;
  const fullSectionTitle = `Section ${sectionNumber}, Module ${moduleData.attempt.current_module}: ${sectionTitle}`;
  const panelStyle = {
    "--left-panel": `${leftPanelPercent}%`,
    "--right-panel": `${100 - leftPanelPercent}%`
  } as CSSProperties;

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-20 bg-white">
        <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b border-[#e5e7eb] px-5">
          <div className="flex min-w-0 items-center gap-6">
            <div className="truncate text-sm font-semibold text-slate-900">{fullSectionTitle}</div>
            <details className="relative">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700 hover:text-slate-950">
                Directions
              </summary>
              <div className="absolute left-0 top-7 z-30 w-80 border border-[#d1d5db] bg-white p-4 text-sm leading-6 text-slate-800">
                Answer each question in this module. You may move among questions in this module until time expires.
              </div>
            </details>
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="px-3 py-2 text-center text-base font-bold tabular-nums text-slate-950" aria-label="Time remaining">
              {minutes}:{seconds}
            </div>
            <button className="rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-950" type="button">
              Hide
            </button>
          </div>
          <div className="flex justify-end gap-6 text-sm font-semibold text-slate-700">
            <button className="hover:text-slate-950" type="button">Highlights & Notes</button>
            <button className="hover:text-slate-950" type="button">More</button>
          </div>
        </div>
        <div className="bg-[#10294f] px-5 py-2 text-center text-xs font-bold tracking-wide text-white">
          THIS IS A PRACTICE TEST
        </div>
      </header>

      <section
        ref={testBodyRef}
        style={panelStyle}
        className="mx-auto grid min-h-[calc(100vh-8.5rem)] max-w-[1280px] bg-white lg:grid-cols-[minmax(0,var(--left-panel))_1px_minmax(0,var(--right-panel))]"
      >
        <article className="bg-white px-10 py-9">
          <div className="mx-auto max-w-[560px]">
            {question.passage ? (
              <p
                ref={passageRef}
                aria-label="Passage text"
                className="max-w-[58ch] select-text text-[16px] leading-[1.62] text-slate-950 [text-wrap:pretty]"
                onClick={handlePassageClick}
                onMouseUp={handlePassageMouseUp}
              />
            ) : null}
            {question.graph_path ? (
              <Image
                alt="SAT graph"
                className="mt-8 h-auto max-h-[420px] w-full object-contain"
                height={480}
                src={`${API_URL}${question.graph_path}`}
                width={640}
              />
            ) : null}
          </div>
        </article>

        <div
          className="relative hidden w-px cursor-col-resize bg-[#e5e7eb] lg:block"
          onMouseDown={() => {
            resizingDivider.current = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
          role="separator"
          aria-orientation="vertical"
          aria-valuemin={48}
          aria-valuemax={68}
          aria-valuenow={Math.round(leftPanelPercent)}
        >
          <div className="absolute left-1/2 top-1/2 h-12 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#e5e7eb] bg-white hover:border-slate-400" />
        </div>

        <aside className="bg-white px-10 py-9">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 min-w-9 items-center justify-center bg-slate-950 text-base font-bold text-white">
                {index + 1}
              </div>
              <button
                onClick={() => toggleMark(question.id)}
                className={`inline-flex items-center gap-2 text-sm font-semibold hover:text-blue-800 ${marked[question.id] ? "text-blue-700" : "text-slate-700"}`}
                title="Mark for review"
              >
                <Bookmark size={17} fill={marked[question.id] ? "currentColor" : "none"} /> Mark for Review
              </button>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40"
              disabled={actionHistory.length === 0}
              onClick={undoLastAnswerAction}
              type="button"
            >
              <Undo2 size={16} /> Undo
            </button>
          </div>
          <div className="mb-6 border-t border-dashed border-[#e5e7eb]" />
          <h1 className="mb-6 text-[20px] font-semibold leading-[1.45] text-slate-950">{question.prompt}</h1>

          <div className="grid gap-4">
            {question.format === "multiple_choice" ? question.choices.map((choice, choiceIndex) => (
              <div
                key={choice.label}
                className={`flex w-full items-stretch rounded-md border text-left text-[16px] leading-6 transition-colors hover:bg-slate-50 ${
                  selectedAnswer === choice.label
                    ? "border-blue-700 bg-blue-50"
                    : "border-[#e5e7eb]"
                }`}
                role="radio"
                aria-checked={selectedAnswer === choice.label}
                aria-disabled={eliminatedAnswers.has(choice.label)}
              >
                <button
                  className={`flex min-w-0 flex-1 items-start gap-4 px-4 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                    eliminatedAnswers.has(choice.label) ? "cursor-not-allowed text-slate-400 opacity-60" : "text-slate-950"
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
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                      selectedAnswer === choice.label
                        ? "border-blue-700 bg-blue-700 text-white"
                        : eliminatedAnswers.has(choice.label)
                          ? "border-slate-400 bg-white text-slate-400"
                          : "border-slate-500 bg-white text-slate-950"
                    }`}
                  >
                    {choice.label}
                  </span>
                  <span className={eliminatedAnswers.has(choice.label) ? "text-slate-500 line-through decoration-slate-500 decoration-2" : "text-slate-950"}>
                    {choice.text}
                  </span>
                </button>
                <button
                  aria-pressed={eliminatedAnswers.has(choice.label)}
                  className={`m-3 ml-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-white hover:border-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                    eliminatedAnswers.has(choice.label) ? "border-slate-700 text-slate-800" : "border-[#e5e7eb] text-slate-500"
                  }`}
                  onClick={() => toggleEliminate(choice.label)}
                  title={eliminatedAnswers.has(choice.label) ? `Undo elimination for ${choice.label}` : `Eliminate ${choice.label}`}
                  type="button"
                >
                  <Ban size={17} />
                </button>
              </div>
            )) : (
              <input
                value={answers[question.id] || ""}
                onChange={(event) => save(question.id, event.target.value)}
                className="w-full rounded-[10px] border border-[#e5e7eb] px-5 py-4 text-[16px] text-slate-950 outline-blue-700"
                placeholder="Enter answer"
              />
            )}
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

      <footer className="sticky bottom-0 z-20 border-t border-[#e5e7eb] bg-white">
        <div className="mx-auto grid h-14 max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5">
          <div>
            <button
              disabled={index === 0}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft size={18} /> Back
            </button>
          </div>
          <div className="text-sm font-semibold text-slate-700">Question {index + 1} of {moduleData.questions.length}</div>
          <div className="flex justify-end">
            {index === moduleData.questions.length - 1 ? (
              <button onClick={advance} className="rounded bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                Submit
              </button>
            ) : (
              <button
                onClick={() => setIndex((value) => Math.min(moduleData.questions.length - 1, value + 1))}
                className="inline-flex items-center gap-2 rounded bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800"
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
