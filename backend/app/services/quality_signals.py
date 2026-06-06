import math
from collections import Counter
from statistics import mean, pvariance
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Question, QuestionChoice, QuestionResult, QuestionTelemetryLog

MIN_QUALITY_SAMPLE = 20
HIGH_CONFIDENCE_THRESHOLD = 0.72


def refresh_question_quality_signals(db: Session, question_id: UUID) -> dict:
    question = (
        db.execute(select(Question).where(Question.id == question_id).options(selectinload(Question.choices)))
        .scalars()
        .unique()
        .one()
    )
    results = db.execute(select(QuestionResult).where(QuestionResult.question_id == question.id)).scalars().all()
    logs = db.execute(select(QuestionTelemetryLog).where(QuestionTelemetryLog.question_id == question.id)).scalars().all()
    metrics = compute_question_quality(question, results, logs)

    question.percent_correct = metrics["percent_correct"]
    question.average_time_seconds = metrics["average_time"]
    question.effective_difficulty = metrics["effective_difficulty"]
    question.confusion_index = metrics["confusion_index"]
    question.trap_efficiency = metrics["trap_efficiency"]
    question.time_pressure_score = metrics["time_pressure_score"]
    question.calibration_confidence = metrics["calibration_confidence"]
    question.quality_score = metrics["quality_score"]
    question.auto_quality_flag = metrics["auto_quality_flag"]
    if metrics["auto_quality_flag"] == "bad" and question.validation_status not in {"approved", "disabled"}:
        question.validation_status = "auto_flagged"
    return metrics


def compute_question_quality(question: Question, results: list[QuestionResult], logs: list[QuestionTelemetryLog]) -> dict:
    attempts = len(results)
    correct_values = [1 if result.is_correct else 0 for result in results]
    percent_correct = mean(correct_values) if correct_values else question.percent_correct
    times = [log.time_spent_seconds for log in logs if log.time_spent_seconds > 0]
    hesitations = [log.hesitation_seconds for log in logs if log.hesitation_seconds >= 0]
    answer_changes = [1 if log.answer_changed else 0 for log in logs]
    avg_time = mean(times) if times else question.average_time_seconds
    avg_hesitation = mean(hesitations) if hesitations else 0
    change_rate = mean(answer_changes) if answer_changes else 0

    time_ratio = _clamp(avg_time / max(1, question.estimated_time), 0, 2)
    effective_difficulty = _clamp(((1 - percent_correct) * 7.5) + (time_ratio * 1.8) + 1, 1, 10)
    confusion_index = _clamp((change_rate * 0.55) + (_normalize(avg_hesitation, 0, max(20, question.estimated_time * 0.6)) * 0.45), 0, 1)
    trap_efficiency = _trap_efficiency(question, results)
    time_pressure_score = _time_pressure_score(question, results)
    confidence = calibration_confidence(correct_values, times, attempts)
    auto_flag = classify_question_quality(
        percent_correct=percent_correct,
        discrimination=question.discrimination_score,
        trap_efficiency=trap_efficiency,
        confusion_index=confusion_index,
        answer_change_rate=change_rate,
        attempts=attempts,
    )
    quality_score = _quality_score(percent_correct, question.discrimination_score, trap_efficiency, confusion_index, time_pressure_score, confidence)

    return {
        "attempts": attempts,
        "percent_correct": round(percent_correct, 4),
        "average_time": round(avg_time, 2),
        "answer_change_rate": round(change_rate, 4),
        "average_hesitation": round(avg_hesitation, 2),
        "effective_difficulty": round(effective_difficulty, 3),
        "confusion_index": round(confusion_index, 3),
        "trap_efficiency": round(trap_efficiency, 3),
        "time_pressure_score": round(time_pressure_score, 3),
        "calibration_confidence": round(confidence, 3),
        "quality_score": round(quality_score, 3),
        "auto_quality_flag": auto_flag,
    }


def calibration_confidence(correct_values: list[int], times: list[int], attempts: int) -> float:
    sample_score = _clamp(math.log1p(attempts) / math.log1p(500), 0, 1)
    if attempts < 2:
        return round(sample_score * 0.25, 3)
    performance_variance = pvariance(correct_values) if len(correct_values) > 1 else 0.25
    standard_error = math.sqrt(performance_variance / attempts)
    time_cv = _coefficient_of_variation(times)
    variance_score = 1 - _clamp(standard_error / 0.08, 0, 1)
    consistency_score = 1 - _clamp(time_cv / 1.25, 0, 1)
    return round((sample_score * 0.5) + (variance_score * 0.25) + (consistency_score * 0.25), 3)


def classify_question_quality(
    *,
    percent_correct: float,
    discrimination: float,
    trap_efficiency: float,
    confusion_index: float,
    answer_change_rate: float,
    attempts: int,
) -> str:
    if attempts < MIN_QUALITY_SAMPLE:
        return "insufficient_data"
    if percent_correct > 0.9 or percent_correct < 0.1:
        return "bad"
    if trap_efficiency < 0.35:
        return "bad"
    if confusion_index > 0.82 or answer_change_rate > 0.45:
        return "bad"
    if 0.3 <= percent_correct <= 0.8 and discrimination >= 0.45 and trap_efficiency >= 0.55 and 0.12 <= confusion_index <= 0.68:
        return "good"
    return "review"


def _trap_efficiency(question: Question, results: list[QuestionResult]) -> float:
    distractor_labels = {choice.label for choice in question.choices if choice.label != question.correct_answer}
    wrong = [result.selected_answer for result in results if result.selected_answer in distractor_labels]
    if not distractor_labels or not wrong:
        return 0
    counts = Counter(wrong)
    observed = [counts[label] for label in distractor_labels]
    total = sum(observed)
    if total == 0:
        return 0
    entropy = -sum((count / total) * math.log(count / total) for count in observed if count)
    max_entropy = math.log(len(distractor_labels))
    balance = entropy / max_entropy if max_entropy else 0
    coverage = len([count for count in observed if count > 0]) / len(distractor_labels)
    dominance_penalty = max(observed) / total
    return _clamp((balance * 0.55) + (coverage * 0.35) + ((1 - dominance_penalty) * 0.1), 0, 1)


def _time_pressure_score(question: Question, results: list[QuestionResult]) -> float:
    fast = [result for result in results if result.time_spent_seconds <= question.estimated_time]
    slow = [result for result in results if result.time_spent_seconds > question.estimated_time]
    if not fast or not slow:
        return 0
    fast_accuracy = mean([1 if result.is_correct else 0 for result in fast])
    slow_accuracy = mean([1 if result.is_correct else 0 for result in slow])
    return _clamp(fast_accuracy - slow_accuracy, 0, 1)


def _quality_score(
    percent_correct: float,
    discrimination: float,
    trap_efficiency: float,
    confusion_index: float,
    time_pressure_score: float,
    confidence: float,
) -> float:
    correct_band_score = 1 - min(abs(percent_correct - 0.55) / 0.45, 1)
    hesitation_score = 1 - min(abs(confusion_index - 0.35) / 0.65, 1)
    time_score = 1 - min(time_pressure_score, 0.7)
    return _clamp(
        (correct_band_score * 0.25)
        + (discrimination * 0.25)
        + (trap_efficiency * 0.2)
        + (hesitation_score * 0.15)
        + (time_score * 0.05)
        + (confidence * 0.1),
        0,
        1,
    )


def _coefficient_of_variation(values: list[int]) -> float:
    if len(values) < 2:
        return 1
    avg = mean(values)
    if avg == 0:
        return 1
    return math.sqrt(pvariance(values)) / avg


def _normalize(value: float, low: float, high: float) -> float:
    if high <= low:
        return 0
    return _clamp((value - low) / (high - low), 0, 1)


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))
