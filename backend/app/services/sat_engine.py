from collections import Counter, defaultdict
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Analytics, AttemptStatus, Question, QuestionResult, QuestionSource, SATSection, Test, TestAttempt, User
from app.services.difficulty_calibration import update_question_calibration
from app.services.telemetry import build_test_telemetry_summary, log_question_telemetry
from app.services.trap_intelligence import is_deliverable_question, trap_sequence_priority

MODULE_RULES = {
    (SATSection.reading_writing, 1): {"count": 27, "seconds": 32 * 60},
    (SATSection.reading_writing, 2): {"count": 27, "seconds": 32 * 60},
    (SATSection.math, 1): {"count": 22, "seconds": 35 * 60},
    (SATSection.math, 2): {"count": 22, "seconds": 35 * 60},
}


def start_attempt(db: Session, user: User, test_id: UUID) -> TestAttempt:
    test = db.get(Test, test_id)
    if not test or not test.is_active:
        raise HTTPException(status_code=404, detail="Test not found")
    started = datetime.utcnow()
    attempt = TestAttempt(
        user_id=user.id,
        test_id=test.id,
        route={"reading_writing": {}, "math": {}},
        module_started_at=started,
        module_deadline_at=started + timedelta(seconds=module_duration(SATSection.reading_writing, 1)),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def module_duration(section: SATSection, module: int) -> int:
    return MODULE_RULES[(section, module)]["seconds"]


def module_seconds_remaining(attempt: TestAttempt) -> int:
    if not attempt.module_deadline_at:
        return module_duration(attempt.current_section, attempt.current_module)
    return max(0, int((attempt.module_deadline_at - datetime.utcnow()).total_seconds()))


def choose_adaptive_level(db: Session, attempt: TestAttempt, section: SATSection) -> str:
    return adaptive_decision(db, attempt, section)["path"]


def adaptive_decision(db: Session, attempt: TestAttempt, section: SATSection) -> dict:
    module_one_results = (
        db.execute(
            select(QuestionResult)
            .join(Question)
            .options(selectinload(QuestionResult.question))
            .where(
                QuestionResult.attempt_id == attempt.id,
                Question.section == section,
                QuestionResult.module_snapshot == 1,
            )
        )
        .scalars()
        .all()
    )
    if not module_one_results:
        return {"path": "medium", "total_correct": 0, "weighted_score": 0, "response_time_ratio": 1, "topic_misses": {}}

    total = len(module_one_results)
    correct = sum(1 for result in module_one_results if result.is_correct)
    weighted_possible = sum(max(1, result.question.difficulty) for result in module_one_results)
    weighted_correct = sum(result.question.difficulty for result in module_one_results if result.is_correct)
    weighted_score = weighted_correct / weighted_possible if weighted_possible else 0
    accuracy = correct / total
    avg_time_ratio = sum(
        min(1.8, result.time_spent_seconds / max(1, result.question.estimated_time)) for result in module_one_results
    ) / total
    topic_misses = defaultdict(int)
    for result in module_one_results:
        if not result.is_correct:
            topic_misses[result.question.topic] += 1
    weak_topic_penalty = min(0.18, 0.04 * len([misses for misses in topic_misses.values() if misses >= 2]))
    speed_adjustment = 0.06 if avg_time_ratio <= 0.85 else -0.06 if avg_time_ratio >= 1.25 else 0
    routing_score = (accuracy * 0.45) + (weighted_score * 0.45) + speed_adjustment - weak_topic_penalty

    if routing_score >= 0.72:
        path = "hard"
    elif routing_score >= 0.48:
        path = "medium"
    else:
        path = "easy"
    return {
        "path": path,
        "total_correct": correct,
        "total_questions": total,
        "accuracy": round(accuracy, 3),
        "weighted_score": round(weighted_score, 3),
        "response_time_ratio": round(avg_time_ratio, 3),
        "topic_misses": dict(topic_misses),
        "routing_score": round(routing_score, 3),
    }


def get_module_questions(db: Session, attempt: TestAttempt) -> list[Question]:
    enforce_deadline(db, attempt)
    section = attempt.current_section
    module = attempt.current_module
    query = (
        select(Question)
        .where(
            Question.test_id == attempt.test_id,
            Question.section == section,
            Question.module == module,
            Question.is_active.is_(True),
        )
        .options(selectinload(Question.choices))
        .order_by(Question.order_index)
    )
    if module == 2:
        adaptive_level = choose_adaptive_level(db, attempt, section)
        module_two_results = _current_module_results(db, attempt)
        selected = _select_hybrid_questions(
            _filter_deliverable(list(db.execute(query.where(Question.adaptive_level.in_([adaptive_level, "standard"]))).scalars().unique())),
            MODULE_RULES[(section, module)]["count"],
            adaptive_level,
            module_two_results,
        )
        if len(selected) < MODULE_RULES[(section, module)]["count"]:
            fallback = _filter_deliverable(list(db.execute(query).scalars().unique()))
            seen = {question.id for question in selected}
            selected.extend(question for question in fallback if question.id not in seen)
        return _avoid_adjacent_repetition(_sort_module_progression(selected, adaptive_level, module_two_results))[: MODULE_RULES[(section, module)]["count"]]
    questions = _select_hybrid_questions(
        _filter_deliverable(list(db.execute(query).scalars().unique())),
        MODULE_RULES[(section, module)]["count"],
        "medium",
        [],
    )
    return _avoid_adjacent_repetition(_sort_module_progression(questions, "medium", []))[: MODULE_RULES[(section, module)]["count"]]


def save_answer(db: Session, attempt: TestAttempt, answer) -> QuestionResult:
    enforce_deadline(db, attempt)
    question = db.get(Question, answer.question_id)
    if not question or question.test_id != attempt.test_id:
        raise HTTPException(status_code=404, detail="Question not found")
    if question.section != attempt.current_section or question.module != attempt.current_module:
        raise HTTPException(status_code=409, detail="Previous modules are locked")

    selected = (answer.selected_answer or "").strip()
    correct = selected.lower() == question.correct_answer.strip().lower()
    result = db.execute(
        select(QuestionResult).where(
            QuestionResult.attempt_id == attempt.id,
            QuestionResult.question_id == question.id,
        )
    ).scalar_one_or_none()
    if not result:
        result = QuestionResult(attempt_id=attempt.id, question_id=question.id, module_snapshot=attempt.current_module)
        db.add(result)
    result.selected_answer = selected or None
    result.is_correct = correct
    result.marked_for_review = answer.marked_for_review
    result.time_spent_seconds = answer.time_spent_seconds
    result.answered_at = datetime.utcnow()
    log_question_telemetry(db, attempt, question, answer)
    if attempt.current_module == 2:
        route = dict(attempt.route or {})
        route.setdefault(attempt.current_section.value, {})["dynamic_next"] = dynamic_next_question_strategy(db, attempt, result)
        attempt.route = route
    db.commit()
    db.refresh(result)
    return result


def dynamic_next_question_strategy(db: Session, attempt: TestAttempt, latest_result: QuestionResult | None = None) -> dict:
    results = _current_module_results(db, attempt)
    if latest_result and latest_result not in results:
        results.append(latest_result)
    if not results:
        return {"target_difficulty": 6, "trap_focus": None, "difficulty_spike": False}
    last = results[-1]
    trap_focus = None
    target, difficulty_spike = _smoothed_adaptive_target(results, last.question.difficulty)
    if not last.is_correct:
        trap_focus = last.question.trap_type
    mistake_patterns = Counter(result.question.trap_type for result in results if not result.is_correct and result.question.trap_type)
    if mistake_patterns:
        trap_focus = mistake_patterns.most_common(1)[0][0]
    return {
        "target_difficulty": target,
        "trap_focus": trap_focus,
        "difficulty_spike": difficulty_spike,
        "recent_mistakes": sum(1 for result in results[-5:] if not result.is_correct),
    }


def advance_module(db: Session, attempt: TestAttempt) -> TestAttempt:
    if attempt.status != AttemptStatus.in_progress:
        return attempt
    if attempt.current_module == 1:
        decision = adaptive_decision(db, attempt, attempt.current_section)
        adaptive_level = decision["path"]
        route = dict(attempt.route or {})
        route.setdefault(attempt.current_section.value, {})["module_2"] = decision
        attempt.route = route
        attempt.current_module = 2
    elif attempt.current_section == SATSection.reading_writing:
        attempt.current_section = SATSection.math
        attempt.current_module = 1
    else:
        finalize_attempt(db, attempt)
        return attempt
    started = datetime.utcnow()
    attempt.module_started_at = started
    attempt.module_deadline_at = started + timedelta(seconds=module_duration(attempt.current_section, attempt.current_module))
    db.commit()
    db.refresh(attempt)
    return attempt


def finalize_attempt(db: Session, attempt: TestAttempt) -> TestAttempt:
    rw_correct, rw_total = _section_score(db, attempt.id, SATSection.reading_writing)
    math_correct, math_total = _section_score(db, attempt.id, SATSection.math)
    attempt.score_reading_writing = _scaled_score(rw_correct, rw_total)
    attempt.score_math = _scaled_score(math_correct, math_total)
    attempt.score_total = attempt.score_reading_writing + attempt.score_math
    attempt.status = AttemptStatus.completed
    attempt.completed_at = datetime.utcnow()
    analytics = build_analytics(db, attempt)
    db.add(analytics)
    db.add(build_test_telemetry_summary(db, attempt))
    update_question_calibration(db, attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def enforce_deadline(db: Session, attempt: TestAttempt) -> None:
    if attempt.status != AttemptStatus.in_progress or not attempt.module_deadline_at:
        return
    if datetime.utcnow() <= attempt.module_deadline_at:
        return
    advance_module(db, attempt)


def build_analytics(db: Session, attempt: TestAttempt) -> Analytics:
    rows = (
        db.execute(
            select(QuestionResult)
            .where(QuestionResult.attempt_id == attempt.id)
            .options(selectinload(QuestionResult.question))
        )
        .scalars()
        .all()
    )
    by_topic = defaultdict(lambda: {"correct": 0, "total": 0, "time": 0})
    by_trap = defaultdict(int)
    graph = {"correct": 0, "total": 0}
    careless = []
    detailed = []
    for row in rows:
        question = row.question
        stats = by_topic[question.topic]
        stats["total"] += 1
        stats["correct"] += int(row.is_correct)
        stats["time"] += row.time_spent_seconds
        if question.graph_path:
            graph["total"] += 1
            graph["correct"] += int(row.is_correct)
        if not row.is_correct and row.time_spent_seconds < 30:
            careless.append(str(question.id))
        if not row.is_correct and question.trap_type:
            by_trap[question.trap_type] += 1
        detailed.append({"topic": question.topic, "correct": row.is_correct, "time": row.time_spent_seconds})

    topic_accuracy = {
        topic: round(values["correct"] / values["total"], 2) for topic, values in by_topic.items() if values["total"]
    }
    avg_time = {topic: round(values["time"] / values["total"]) for topic, values in by_topic.items() if values["total"]}
    strengths = [topic for topic, score in topic_accuracy.items() if score >= 0.75]
    weaknesses = [topic for topic, score in topic_accuracy.items() if score < 0.6]
    trap_note = f" Most common trap: {max(by_trap, key=by_trap.get)}." if by_trap else ""
    report = ("Focus next on " + ", ".join(weaknesses[:3]) if weaknesses else "Strong balanced performance. Move into harder timed practice.") + trap_note
    return Analytics(
        user_id=attempt.user_id,
        attempt_id=attempt.id,
        score_progression=[],
        topic_accuracy=topic_accuracy,
        average_time_by_topic=avg_time,
        graph_performance={"accuracy": round(graph["correct"] / graph["total"], 2) if graph["total"] else None},
        careless_mistakes=careless,
        adaptive_route_history=attempt.route or {},
        strengths=strengths,
        weaknesses=weaknesses,
        report=report,
    )


def results_payload(db: Session, attempt: TestAttempt) -> dict:
    analytics = db.execute(select(Analytics).where(Analytics.attempt_id == attempt.id)).scalar_one_or_none()
    rows = (
        db.execute(
            select(QuestionResult)
            .where(QuestionResult.attempt_id == attempt.id)
            .options(selectinload(QuestionResult.question).selectinload(Question.choices))
        )
        .scalars()
        .all()
    )
    return {
        "attempt_id": attempt.id,
        "score_total": attempt.score_total or 0,
        "score_reading_writing": attempt.score_reading_writing or 0,
        "score_math": attempt.score_math or 0,
        "topic_accuracy": analytics.topic_accuracy if analytics else {},
        "weaknesses": analytics.weaknesses if analytics else [],
        "strengths": analytics.strengths if analytics else [],
        "report": analytics.report if analytics else "",
        "questions": [
            {
                "id": str(row.question.id),
                "topic": row.question.topic,
                "prompt": row.question.prompt,
                "selected_answer": row.selected_answer,
                "correct_answer": row.question.correct_answer,
                "is_correct": row.is_correct,
                "explanation": row.question.explanation,
                "trap_type": row.question.trap_type,
                "difficulty": row.question.difficulty,
                "estimated_time": row.question.estimated_time,
                "discrimination_score": row.question.discrimination_score,
                "time_spent_seconds": row.time_spent_seconds,
            }
            for row in rows
        ],
    }


def _section_score(db: Session, attempt_id: UUID, section: SATSection) -> tuple[int, int]:
    rows = (
        db.execute(select(QuestionResult).join(Question).where(QuestionResult.attempt_id == attempt_id, Question.section == section))
        .scalars()
        .all()
    )
    return sum(1 for row in rows if row.is_correct), len(rows)


def _scaled_score(correct: int, total: int) -> int:
    if total == 0:
        return 200
    return int(round((200 + 600 * (correct / total)) / 10) * 10)


def _avoid_adjacent_repetition(questions: list[Question]) -> list[Question]:
    arranged: list[Question] = []
    remaining = questions[:]
    while remaining:
        next_index = 0
        if arranged:
            for index, question in enumerate(remaining):
                previous = arranged[-1]
                if (
                    question.question_type != previous.question_type
                    and question.topic != previous.topic
                    and question.structure_key != previous.structure_key
                ):
                    next_index = index
                    break
        arranged.append(remaining.pop(next_index))
    return arranged


def _select_hybrid_questions(
    questions: list[Question],
    count: int,
    adaptive_level: str,
    current_module_results: list[QuestionResult],
) -> list[Question]:
    database_target = round(count * 0.7)
    generated_target = count - database_target
    sorted_questions = _sort_module_progression(questions, adaptive_level, current_module_results)
    database_questions = [question for question in sorted_questions if question.source == QuestionSource.database]
    generated_questions = [question for question in sorted_questions if question.source == QuestionSource.generated_variant]
    selected = database_questions[:database_target] + generated_questions[:generated_target]
    if len(selected) < count:
        seen = {question.id for question in selected}
        selected.extend(question for question in questions if question.id not in seen)
    return _sort_module_progression(selected[:count], adaptive_level, current_module_results)


def _sort_module_progression(
    questions: list[Question],
    adaptive_level: str,
    current_module_results: list[QuestionResult],
) -> list[Question]:
    targets = {
        "easy": 3,
        "medium": 6,
        "hard": 8,
    }
    missed_traps = defaultdict(int)
    mistakes = 0
    for result in current_module_results:
        if not result.is_correct:
            mistakes += 1
            if result.question.trap_type:
                missed_traps[result.question.trap_type] += 1

    target = targets.get(adaptive_level, 6)
    difficulty_spike = False
    if current_module_results:
        target, difficulty_spike = _smoothed_adaptive_target(current_module_results, target)

    pool = sorted(
        questions,
        key=lambda question: (
            trap_sequence_priority(question, missed_traps),
            abs(question.difficulty - target),
            -question.discrimination_score,
            question.order_index,
        ),
    )

    if (difficulty_spike or adaptive_level == "hard") and len(pool) >= 6:
        spike_index = min(len(pool) - 1, max(4, len(pool) - 4))
        spike = max(pool[spike_index:], key=lambda question: question.difficulty)
        pool.remove(spike)
        pool.insert(spike_index, spike)
    if mistakes >= 2:
        pool = sorted(pool, key=lambda question: (trap_sequence_priority(question, missed_traps), question.order_index))
    return pool


def _smoothed_adaptive_target(results: list[QuestionResult], base_target: int) -> tuple[int, bool]:
    window = results[-5:]
    if not window:
        return base_target, False
    recent_accuracy = sum(1 for result in window if result.is_correct) / len(window)
    recent_time_ratio = sum(
        min(1.8, result.time_spent_seconds / max(1, result.question.estimated_time)) for result in window
    ) / len(window)
    average_seen_difficulty = sum(result.question.difficulty for result in window) / len(window)
    current_target = round((base_target * 0.55) + (average_seen_difficulty * 0.45))
    adjustment = 0
    if len(window) >= 3 and recent_accuracy >= 0.78 and recent_time_ratio <= 1.05:
        adjustment = 1
    elif len(window) >= 3 and recent_accuracy <= 0.38:
        adjustment = -1
    if len(window) >= 5 and recent_accuracy >= 0.86 and recent_time_ratio <= 0.95:
        adjustment = 2
    if len(window) >= 5 and recent_accuracy <= 0.25:
        adjustment = -2
    target = max(1, min(10, current_target + adjustment))
    previous_difficulty = results[-2].question.difficulty if len(results) >= 2 else base_target
    if abs(target - previous_difficulty) > 2:
        target = previous_difficulty + (2 if target > previous_difficulty else -2)
    spike = len(window) >= 4 and recent_accuracy >= 0.8 and recent_time_ratio <= 1.0
    return target, spike


def _filter_deliverable(questions: list[Question]) -> list[Question]:
    return [question for question in questions if is_deliverable_question(question)]


def _current_module_results(db: Session, attempt: TestAttempt) -> list[QuestionResult]:
    return (
        db.execute(
            select(QuestionResult)
            .join(Question)
            .where(
                QuestionResult.attempt_id == attempt.id,
                Question.section == attempt.current_section,
                QuestionResult.module_snapshot == attempt.current_module,
            )
            .options(selectinload(QuestionResult.question))
            .order_by(QuestionResult.answered_at)
        )
        .scalars()
        .all()
    )
