import random
from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import SessionLocal
from app.models import Question, SATSection, Test
from app.services.sat_engine import MODULE_RULES, _avoid_adjacent_repetition, _select_hybrid_questions
from app.services.trap_intelligence import is_deliverable_question

SESSIONS = 1000
SHORT_DISTANCE = 4


def main() -> None:
    db = SessionLocal()
    try:
        test = db.execute(select(Test).where(Test.is_active.is_(True)).order_by(Test.created_at.desc())).scalar_one_or_none()
        if not test:
            raise SystemExit("FAIL: no active test inventory found")

        failures: list[str] = []
        repetition = Counter()
        topic_windows = Counter()
        difficulty_samples: list[int] = []

        for session_index in range(SESSIONS):
            session_questions = []
            for section in (SATSection.reading_writing, SATSection.math):
                for module in (1, 2):
                    path = "medium" if module == 1 else random.choice(["easy", "medium", "hard"])
                    pool = (
                        db.execute(
                            select(Question)
                            .where(
                                Question.test_id == test.id,
                                Question.section == section,
                                Question.module == module,
                                Question.adaptive_level.in_([path, "standard"]),
                            )
                            .options(selectinload(Question.choices))
                        )
                        .scalars()
                        .unique()
                        .all()
                    )
                    invalid = [question.id for question in pool if not is_deliverable_question(question)]
                    if invalid:
                        failures.append(f"session {session_index}: {len(invalid)} invalid questions rejected by trap/graph validation")
                    pool = [question for question in pool if is_deliverable_question(question)]
                    selected = _avoid_adjacent_repetition(
                        _select_hybrid_questions(pool, MODULE_RULES[(section, module)]["count"], path, [])
                    )
                    session_questions.extend(selected)

            failures.extend(_sequence_failures(session_index, session_questions))
            for question in session_questions:
                repetition[question.structure_key] += 1
                difficulty_samples.append(question.difficulty)
            for index in range(max(0, len(session_questions) - 4)):
                window = session_questions[index : index + 5]
                for topic, count in Counter(question.topic for question in window).items():
                    if count > 2:
                        topic_windows[topic] += 1

        if topic_windows:
            failures.append(f"topic clustering detected: {dict(topic_windows.most_common(5))}")
        if difficulty_samples:
            average_difficulty = sum(difficulty_samples) / len(difficulty_samples)
            if not 3.0 <= average_difficulty <= 8.5:
                failures.append(f"difficulty imbalance: average difficulty {average_difficulty:.2f}")

        most_repeated = repetition.most_common(10)
        if failures:
            print("FAIL: inventory stress test detected issues")
            print(f"sessions={SESSIONS}")
            print(f"top repeated structures={most_repeated}")
            for failure in failures[:25]:
                print(f"- {failure}")
            raise SystemExit(1)

        print("PASS: inventory stress test")
        print(f"sessions={SESSIONS}")
        print(f"top repeated structures={most_repeated}")
        print(f"average difficulty={sum(difficulty_samples) / len(difficulty_samples):.2f}")
    finally:
        db.close()


def _sequence_failures(session_index: int, questions: list[Question]) -> list[str]:
    failures: list[str] = []
    for index, question in enumerate(questions):
        recent = questions[max(0, index - SHORT_DISTANCE) : index]
        if any(previous.structure_key == question.structure_key for previous in recent):
            failures.append(
                f"session {session_index}: structure_key {question.structure_key} repeated within {SHORT_DISTANCE} questions"
            )
        window = questions[index : index + 5]
        if len(window) == 5:
            for topic, count in Counter(item.topic for item in window).items():
                if count > 2:
                    failures.append(f"session {session_index}: topic {topic} appears {count}x in 5-question window")
    return failures


if __name__ == "__main__":
    main()
