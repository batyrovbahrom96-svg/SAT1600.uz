from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from collections import Counter, defaultdict

from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_admin
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db, get_engine
from app.models import Question, QuestionExposure, QuestionResult, QuestionTelemetryLog, Test, TestAttempt, TestTelemetrySummary, User
from app.schemas import AdminQuestionUpdate, AnswerIn, AuthLogin, AuthRegister, ModuleOut, ResultsOut, TokenResponse
from app.services.graph_engine import generate_linear_graph, generate_sat_graph_set
from app.services.sat_engine import (
    advance_module,
    dynamic_next_question_strategy,
    finalize_attempt,
    get_module_questions,
    module_seconds_remaining,
    results_payload,
    save_answer,
    start_attempt,
)

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/ready")
def ready() -> dict:
    try:
        with get_engine().connect() as connection:
            connection.execute(text("SELECT 1"))
            missing_tables = [
                table
                for table in ("users", "tests", "questions", "test_attempts", "question_results")
                if connection.execute(text("SELECT to_regclass(:table_name)"), {"table_name": table}).scalar_one() is None
            ]
            if missing_tables:
                raise RuntimeError(f"Missing tables: {', '.join(missing_tables)}")
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database not ready") from exc
    return {"status": "ready"}


@router.post("/auth/register", response_model=TokenResponse)
def register(payload: AuthRegister, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=payload.email.lower(), full_name=payload.full_name, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id, user.role), role=user.role)


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: AuthLogin, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return TokenResponse(access_token=create_access_token(user.id, user.role), role=user.role)


@router.get("/tests")
def list_tests(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    tests = db.execute(select(Test).where(Test.is_active.is_(True)).order_by(Test.created_at.desc())).scalars().all()
    return [{"id": test.id, "title": test.title, "description": test.description, "is_premium": test.is_premium} for test in tests]


@router.post("/tests/{test_id}/attempts")
def create_attempt(test_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    attempt = start_attempt(db, user, test_id)
    return {"attempt_id": attempt.id}


@router.get("/attempts/{attempt_id}/module", response_model=ModuleOut)
def current_module(attempt_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    attempt = _owned_attempt(db, attempt_id, user)
    questions = get_module_questions(db, attempt)
    _record_exposures(db, attempt, questions)
    existing_results = db.execute(
        select(QuestionResult).join(Question).where(
            QuestionResult.attempt_id == attempt.id,
            QuestionResult.module_snapshot == attempt.current_module,
            Question.section == attempt.current_section,
        )
    ).scalars().all()
    answers = {
        str(result.question_id): {
            "selected_answer": result.selected_answer,
            "marked_for_review": result.marked_for_review,
            "time_spent_seconds": result.time_spent_seconds,
        }
        for result in existing_results
    }
    return {
        "attempt": {
            "id": attempt.id,
            "test_id": attempt.test_id,
            "current_section": attempt.current_section,
            "current_module": attempt.current_module,
            "status": attempt.status,
            "route": attempt.route or {},
        },
        "duration_seconds": module_seconds_remaining(attempt),
        "can_go_back": False,
        "questions": questions,
        "answers": answers,
    }


@router.post("/attempts/{attempt_id}/answers")
def answer_question(
    attempt_id: UUID,
    payload: AnswerIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    attempt = _owned_attempt(db, attempt_id, user)
    result = save_answer(db, attempt, payload)
    return {
        "saved": True,
        "is_correct": result.is_correct,
        "next_question_strategy": dynamic_next_question_strategy(db, attempt, result) if attempt.current_module == 2 else None,
    }


@router.post("/attempts/{attempt_id}/advance")
def advance_attempt(attempt_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    attempt = _owned_attempt(db, attempt_id, user)
    attempt = advance_module(db, attempt)
    return {"current_section": attempt.current_section, "current_module": attempt.current_module, "status": attempt.status}


@router.post("/attempts/{attempt_id}/submit")
def submit_attempt(attempt_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    attempt = _owned_attempt(db, attempt_id, user)
    finalize_attempt(db, attempt)
    return {"status": attempt.status, "score_total": attempt.score_total}


@router.get("/attempts/{attempt_id}/results", response_model=ResultsOut)
def get_results(attempt_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    attempt = _owned_attempt(db, attempt_id, user)
    return results_payload(db, attempt)


@router.get("/analytics/me")
def my_analytics(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    attempts = db.execute(select(TestAttempt).where(TestAttempt.user_id == user.id).order_by(TestAttempt.started_at)).scalars().all()
    return {
        "score_history": [
            {"attempt_id": attempt.id, "score": attempt.score_total, "date": attempt.started_at.isoformat()}
            for attempt in attempts
            if attempt.score_total
        ],
        "attempts": len(attempts),
    }


@router.post("/admin/graphs/linear")
def create_graph(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict:
    asset = generate_linear_graph(db)
    return {"id": asset.id, "path": asset.path, "metadata": asset.metadata_json}


@router.post("/admin/graphs/sat-set")
def create_sat_graph_set(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict:
    assets = generate_sat_graph_set(db)
    return {"graphs": [{"id": asset.id, "type": asset.graph_type, "path": asset.path, "metadata": asset.metadata_json} for asset in assets]}


@router.get("/admin/questions")
def admin_questions(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[dict]:
    questions = db.execute(select(Question).order_by(Question.created_at.desc()).limit(100)).scalars().all()
    return [
        {
            "id": q.id,
            "section": q.section,
            "module": q.module,
            "topic": q.topic,
            "prompt": q.prompt,
            "difficulty": q.difficulty,
            "is_active": q.is_active,
            "validation_status": q.validation_status,
        }
        for q in questions
    ]


@router.get("/admin/question-quality")
def admin_question_quality(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[dict]:
    questions = (
        db.execute(
            select(Question)
            .options(selectinload(Question.choices))
            .order_by(Question.validation_status.desc(), Question.created_at.desc())
            .limit(200)
        )
        .scalars()
        .unique()
        .all()
    )
    results = db.execute(select(QuestionResult)).scalars().all()
    logs = db.execute(select(QuestionTelemetryLog)).scalars().all()
    by_question_results = defaultdict(list)
    by_question_logs = defaultdict(list)
    for result in results:
        by_question_results[result.question_id].append(result)
    for log in logs:
        by_question_logs[log.question_id].append(log)

    payload = []
    for question in questions:
        q_results = by_question_results[question.id]
        q_logs = by_question_logs[question.id]
        total = len(q_results)
        selected_counts = Counter(result.selected_answer or "blank" for result in q_results)
        correct = sum(result.is_correct for result in q_results)
        avg_time = round(sum(log.time_spent_seconds for log in q_logs) / len(q_logs), 1) if q_logs else None
        avg_hesitation = round(sum(log.hesitation_seconds for log in q_logs) / len(q_logs), 1) if q_logs else None
        change_rate = round(sum(log.answer_changed for log in q_logs) / len(q_logs), 3) if q_logs else 0
        payload.append(
            {
                "id": question.id,
                "section": question.section,
                "module": question.module,
                "topic": question.topic,
                "subtopic": question.subtopic,
                "prompt": question.prompt,
                "difficulty": question.difficulty,
                "effective_difficulty": question.effective_difficulty,
                "discrimination_score": question.discrimination_score,
                "calibration_confidence": question.calibration_confidence,
                "confusion_index": question.confusion_index,
                "trap_efficiency": question.trap_efficiency,
                "time_pressure_score": question.time_pressure_score,
                "quality_score": question.quality_score,
                "auto_quality_flag": question.auto_quality_flag,
                "calibration_attempts": question.calibration_attempts,
                "percent_correct": round(correct / total, 3) if total else None,
                "average_time": avg_time,
                "average_hesitation": avg_hesitation,
                "answer_change_rate": change_rate,
                "drop_off_rate": question.drop_off_rate,
                "is_active": question.is_active,
                "validation_status": question.validation_status,
                "validation_notes": question.validation_notes,
                "distractor_effectiveness": [
                    {
                        "label": choice.label,
                        "text": choice.text,
                        "trap_role": choice.trap_role,
                        "selected_count": selected_counts[choice.label],
                        "selection_rate": round(selected_counts[choice.label] / total, 3) if total else 0,
                        "error_basis": choice.error_basis,
                    }
                    for choice in question.choices
                ],
            }
        )
    return payload


@router.patch("/admin/questions/{question_id}/validation")
def update_question_validation(
    question_id: UUID,
    payload: AdminQuestionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if payload.difficulty is not None:
        if payload.difficulty < 1 or payload.difficulty > 10:
            raise HTTPException(status_code=422, detail="Difficulty must be between 1 and 10")
        question.difficulty = payload.difficulty
    if payload.is_active is not None:
        question.is_active = payload.is_active
    if payload.validation_status is not None:
        question.validation_status = payload.validation_status
    if payload.validation_notes is not None:
        question.validation_notes = payload.validation_notes
    db.commit()
    db.refresh(question)
    return {
        "id": question.id,
        "difficulty": question.difficulty,
        "is_active": question.is_active,
        "validation_status": question.validation_status,
        "validation_notes": question.validation_notes,
    }


@router.get("/admin/test-telemetry")
def admin_test_telemetry(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[dict]:
    summaries = db.execute(select(TestTelemetrySummary).order_by(TestTelemetrySummary.created_at.desc()).limit(100)).scalars().all()
    return [
        {
            "attempt_id": summary.attempt_id,
            "time_decay": summary.time_decay,
            "accuracy_by_block": summary.accuracy_by_block,
            "streak_patterns": summary.streak_patterns,
            "created_at": summary.created_at.isoformat(),
        }
        for summary in summaries
    ]


def _owned_attempt(db: Session, attempt_id: UUID, user: User) -> TestAttempt:
    attempt = db.get(TestAttempt, attempt_id)
    if not attempt or attempt.user_id != user.id:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return attempt


def _record_exposures(db: Session, attempt: TestAttempt, questions: list[Question]) -> None:
    existing = {
        question_id
        for (question_id,) in db.execute(
            select(QuestionExposure.question_id).where(QuestionExposure.attempt_id == attempt.id)
        ).all()
    }
    for question in questions:
        if question.id not in existing:
            db.add(
                QuestionExposure(
                    attempt_id=attempt.id,
                    question_id=question.id,
                    module_snapshot=attempt.current_module,
                )
            )
    db.commit()
