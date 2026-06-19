from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Analytics, RoadmapNode, TestAttempt


TOPIC_LIBRARY: dict[str, list[tuple[str, str, str]]] = {
    "Advanced Math": [
        ("math", "advanced-functions", "math"),
        ("math", "quadratics-nonlinear", "math"),
        ("math", "advanced-math-mixed", "math"),
    ],
    "Algebra": [
        ("math", "linear-equations", "math"),
        ("math", "systems-equations", "math"),
        ("math", "equation-setup", "math"),
    ],
    "Geometry and Trigonometry": [
        ("math", "geometry-angles", "math"),
        ("math", "triangles-trigonometry", "math"),
    ],
    "Problem Solving and Data Analysis": [
        ("math", "rates-percent", "math"),
        ("math", "data-inference", "math"),
    ],
    "Words in Context": [
        ("reading", "words-context", "reading"),
        ("reading", "context-clues", "reading"),
        ("reading", "vocabulary-precision", "reading"),
    ],
    "Main Purpose / Central Idea": [
        ("reading", "main-idea", "reading"),
        ("reading", "text-structure", "reading"),
    ],
    "Transitions": [
        ("writing", "transition-logic", "writing"),
        ("writing", "contrast-cause-example", "writing"),
    ],
    "Boundaries": [
        ("writing", "punctuation-boundaries", "writing"),
        ("writing", "comma-semicolon-colon", "writing"),
    ],
    "Rhetorical Synthesis": [
        ("writing", "synthesis-notes", "writing"),
        ("writing", "source-goal-matching", "writing"),
    ],
}

DEFAULT_SEQUENCE: list[tuple[str, str, str]] = [
    ("math", "algebra-foundations", "math"),
    ("reading", "reading-evidence", "reading"),
    ("writing", "sentence-logic", "writing"),
    ("reading", "words-context", "reading"),
    ("math", "advanced-math-intro", "math"),
    ("writing", "transition-logic", "writing"),
    ("math", "data-analysis", "math"),
    ("reading", "main-idea", "reading"),
]


def generate_roadmap_for_attempt(db: Session, user_id: UUID, attempt: TestAttempt) -> list[RoadmapNode]:
    analytics = (
        db.execute(
            select(Analytics)
            .where(Analytics.attempt_id == attempt.id)
            .order_by(Analytics.created_at.desc())
            .limit(1)
        )
        .scalars()
        .one_or_none()
    )
    weaknesses = list(analytics.weaknesses if analytics else [])
    strengths = list(analytics.strengths if analytics else [])
    rows = build_roadmap_rows(user_id=user_id, weak_areas=weaknesses, strong_areas=strengths)

    db.execute(delete(RoadmapNode).where(RoadmapNode.user_id == user_id))
    for row in rows:
        db.add(row)
    db.commit()
    return rows


def build_roadmap_rows(*, user_id: UUID, weak_areas: list[str], strong_areas: list[str]) -> list[RoadmapNode]:
    sequence: list[tuple[str, str, str]] = [("diagnostic", "diagnostic-test", "diagnostic")]
    seen = {"diagnostic-test"}

    for area in weak_areas[:5]:
        for node_type, topic_key, icon_key in _nodes_for_area(area)[:3]:
            if topic_key not in seen:
                sequence.append((node_type, topic_key, icon_key))
                seen.add(topic_key)

    for node_type, topic_key, icon_key in DEFAULT_SEQUENCE:
        if topic_key not in seen:
            sequence.append((node_type, topic_key, icon_key))
            seen.add(topic_key)

    for area in strong_areas[:4]:
        review_key = f"review-{_slug(area)}"
        if review_key not in seen:
            sequence.append(("review", review_key, "review"))
            seen.add(review_key)

    sequence = _with_special_nodes(sequence)
    now = datetime.utcnow()
    rows: list[RoadmapNode] = []
    for index, (node_type, topic_key, icon_key) in enumerate(sequence):
        if index == 0:
            status = "completed"
            completed_at = now
        elif index == 1:
            status = "current"
            completed_at = None
        else:
            status = "locked"
            completed_at = None
        rows.append(
            RoadmapNode(
                user_id=user_id,
                node_type=node_type,
                topic_key=topic_key,
                order_index=index,
                status=status,
                icon_key=icon_key,
                completed_at=completed_at,
            )
        )
    return rows


def _nodes_for_area(area: str) -> list[tuple[str, str, str]]:
    normalized = area.lower()
    for key, nodes in TOPIC_LIBRARY.items():
        if key.lower() in normalized or normalized in key.lower():
            return nodes
    if "math" in normalized:
        return TOPIC_LIBRARY["Advanced Math"]
    if "transition" in normalized:
        return TOPIC_LIBRARY["Transitions"]
    if "word" in normalized or "vocab" in normalized:
        return TOPIC_LIBRARY["Words in Context"]
    if "grammar" in normalized or "punctuation" in normalized:
        return TOPIC_LIBRARY["Boundaries"]
    return [("reading", _slug(area), "reading")]


def _with_special_nodes(sequence: list[tuple[str, str, str]]) -> list[tuple[str, str, str]]:
    result: list[tuple[str, str, str]] = []
    content_count = 0
    milestone_count = 1
    checkpoint_count = 1
    mock_count = 1

    for node in sequence:
        result.append(node)
        if node[0] in {"diagnostic", "checkpoint", "milestone", "mock"}:
            continue
        content_count += 1
        if content_count % 5 == 0:
            result.append(("checkpoint", f"checkpoint-{checkpoint_count}", "checkpoint"))
            checkpoint_count += 1
        if content_count % 10 == 0:
            result.append(("milestone", f"lion-milestone-{milestone_count}", "lion"))
            milestone_count += 1
        if content_count in {4, 8, 12, 16}:
            result.append(("mock", f"mock-test-{mock_count}", "mock"))
            mock_count += 1

    if result[-1][0] != "milestone":
        result.append(("milestone", f"lion-milestone-{milestone_count}", "lion"))
    return result


def _slug(value: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in value.strip())
    return "-".join(part for part in cleaned.split("-") if part) or "mixed-review"
