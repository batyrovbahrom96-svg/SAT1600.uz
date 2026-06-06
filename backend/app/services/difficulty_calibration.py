from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Question, QuestionExposure, QuestionResult, TestAttempt
from app.services.quality_signals import HIGH_CONFIDENCE_THRESHOLD, refresh_question_quality_signals

ROLLING_ALPHA = 0.18
MIN_CALIBRATION_ATTEMPTS = 200


def update_question_calibration(db: Session, attempt: TestAttempt) -> None:
    exposures = (
        db.execute(
            select(QuestionExposure)
            .where(QuestionExposure.attempt_id == attempt.id)
            .options(selectinload(QuestionExposure.question))
        )
        .scalars()
        .all()
    )
    if not exposures:
        return
    results = {
        result.question_id: result
        for result in db.execute(select(QuestionResult).where(QuestionResult.attempt_id == attempt.id)).scalars().all()
    }

    attempt_accuracy = sum(1 for result in results.values() if result.is_correct) / len(exposures)
    high_performer = attempt_accuracy >= 0.7
    low_performer = attempt_accuracy <= 0.45
    by_topic = defaultdict(lambda: {"misses": 0, "total": 0})

    for exposure in exposures:
        question = exposure.question
        result = results.get(exposure.question_id)
        answered = bool(result and result.selected_answer)
        is_correct = bool(result and result.is_correct)
        correct_value = 1.0 if is_correct else 0.0
        drop_off_value = 0.0 if answered else 1.0
        time_value = float((result.time_spent_seconds if result else 0) or question.estimated_time)

        question.calibration_attempts += 1
        metrics = refresh_question_quality_signals(db, question.id)
        if (
            question.calibration_attempts >= MIN_CALIBRATION_ATTEMPTS
            and metrics["calibration_confidence"] >= HIGH_CONFIDENCE_THRESHOLD
        ):
            question.percent_correct = _rolling(question.percent_correct, correct_value)
            question.average_time_seconds = _rolling(question.average_time_seconds, time_value)
            question.drop_off_rate = _rolling(question.drop_off_rate, drop_off_value)
            question.difficulty = _calibrated_difficulty(question)
            question.discrimination_score = _calibrated_discrimination(question, is_correct, high_performer, low_performer)

        by_topic[question.topic]["total"] += 1
        by_topic[question.topic]["misses"] += int(not is_correct)

    route = dict(attempt.route or {})
    route["calibration"] = {
        "attempt_accuracy": round(attempt_accuracy, 3),
        "status": "confidence_gated",
        "minimum_attempts_per_question": MIN_CALIBRATION_ATTEMPTS,
        "minimum_confidence": HIGH_CONFIDENCE_THRESHOLD,
        "topic_miss_rates": {
            topic: round(values["misses"] / values["total"], 3)
            for topic, values in by_topic.items()
            if values["total"]
        },
    }
    attempt.route = route


def _rolling(previous: float, current: float) -> float:
    return round((previous * (1 - ROLLING_ALPHA)) + (current * ROLLING_ALPHA), 4)


def _calibrated_difficulty(question: Question) -> int:
    time_pressure = min(1.0, question.average_time_seconds / max(1, question.estimated_time)) * 0.18
    performance_hardness = (1 - question.percent_correct) * 0.7
    drop_off_hardness = question.drop_off_rate * 0.12
    raw = 1 + 9 * min(1.0, performance_hardness + time_pressure + drop_off_hardness)
    return max(1, min(10, round(raw)))


def _calibrated_discrimination(question: Question, is_correct: bool, high_performer: bool, low_performer: bool) -> float:
    signal = 0.5
    if high_performer and is_correct:
        signal = 0.9
    elif high_performer and not is_correct:
        signal = 0.25
    elif low_performer and not is_correct:
        signal = 0.75
    elif low_performer and is_correct:
        signal = 0.35
    return max(0.05, min(0.95, _rolling(question.discrimination_score, signal)))
