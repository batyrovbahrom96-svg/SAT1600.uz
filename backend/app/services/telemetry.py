from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Question, QuestionResult, QuestionTelemetryLog, TestAttempt, TestTelemetrySummary


def log_question_telemetry(db: Session, attempt: TestAttempt, question: Question, answer) -> None:
    event = QuestionTelemetryLog(
        attempt_id=attempt.id,
        question_id=question.id,
        module_snapshot=attempt.current_module,
        selected_answer=answer.selected_answer,
        previous_answer=answer.previous_answer,
        answer_changed=answer.answer_changed,
        hesitation_seconds=max(0, answer.hesitation_seconds),
        time_spent_seconds=max(0, answer.time_spent_seconds),
        interaction_count=max(1, answer.interaction_count),
        raw_event={
            "section": question.section.value,
            "module": attempt.current_module,
            "topic": question.topic,
            "question_type": question.question_type,
            "structure_key": question.structure_key,
            "difficulty": question.difficulty,
            "selected_answer": answer.selected_answer,
            "previous_answer": answer.previous_answer,
            "answer_changed": answer.answer_changed,
            "hesitation_seconds": answer.hesitation_seconds,
            "time_spent_seconds": answer.time_spent_seconds,
            "interaction_count": answer.interaction_count,
        },
    )
    db.add(event)


def build_test_telemetry_summary(db: Session, attempt: TestAttempt) -> TestTelemetrySummary:
    rows = (
        db.execute(
            select(QuestionResult)
            .where(QuestionResult.attempt_id == attempt.id)
            .options(selectinload(QuestionResult.question))
            .order_by(QuestionResult.answered_at)
        )
        .scalars()
        .all()
    )
    logs = (
        db.execute(select(QuestionTelemetryLog).where(QuestionTelemetryLog.attempt_id == attempt.id).order_by(QuestionTelemetryLog.created_at))
        .scalars()
        .all()
    )
    summary = db.execute(select(TestTelemetrySummary).where(TestTelemetrySummary.attempt_id == attempt.id)).scalar_one_or_none()
    if not summary:
        summary = TestTelemetrySummary(attempt_id=attempt.id)
        db.add(summary)

    summary.accuracy_by_block = _accuracy_by_block(rows)
    summary.time_decay = _time_decay(rows)
    summary.streak_patterns = _streak_patterns(rows)
    summary.raw_logs = [
        {
            "question_id": str(log.question_id),
            "selected_answer": log.selected_answer,
            "previous_answer": log.previous_answer,
            "answer_changed": log.answer_changed,
            "hesitation_seconds": log.hesitation_seconds,
            "time_spent_seconds": log.time_spent_seconds,
            "interaction_count": log.interaction_count,
            "created_at": log.created_at.isoformat(),
            "raw_event": log.raw_event,
        }
        for log in logs
    ]
    return summary


def _accuracy_by_block(rows: list[QuestionResult], block_size: int = 10) -> dict:
    blocks = {}
    for index in range(0, len(rows), block_size):
        block = rows[index : index + block_size]
        if block:
            blocks[f"{index + 1}-{index + len(block)}"] = round(sum(row.is_correct for row in block) / len(block), 3)
    return blocks


def _time_decay(rows: list[QuestionResult]) -> dict:
    if len(rows) < 2:
        return {"early_accuracy": None, "late_accuracy": None, "drop": None}
    midpoint = len(rows) // 2
    early = rows[:midpoint]
    late = rows[midpoint:]
    early_accuracy = sum(row.is_correct for row in early) / len(early)
    late_accuracy = sum(row.is_correct for row in late) / len(late)
    return {
        "early_accuracy": round(early_accuracy, 3),
        "late_accuracy": round(late_accuracy, 3),
        "drop": round(early_accuracy - late_accuracy, 3),
    }


def _streak_patterns(rows: list[QuestionResult]) -> dict:
    longest_correct = 0
    longest_wrong = 0
    current_correct = 0
    current_wrong = 0
    transitions = Counter()
    previous = None
    for row in rows:
        if row.is_correct:
            current_correct += 1
            current_wrong = 0
        else:
            current_wrong += 1
            current_correct = 0
        longest_correct = max(longest_correct, current_correct)
        longest_wrong = max(longest_wrong, current_wrong)
        if previous is not None:
            transitions[f"{'correct' if previous else 'wrong'}_to_{'correct' if row.is_correct else 'wrong'}"] += 1
        previous = row.is_correct
    return {
        "longest_correct": longest_correct,
        "longest_wrong": longest_wrong,
        "transitions": dict(transitions),
    }
