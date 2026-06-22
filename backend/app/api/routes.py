from datetime import datetime, timedelta
from email.message import EmailMessage
import json
import random
import smtplib
from urllib import error, request as urllib_request
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from collections import Counter, defaultdict
from pydantic import BaseModel, Field

from sqlalchemy import or_, select, text
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_admin
from app.core.config import get_settings
from app.core.pricing import MONTHLY_PLAN_DAYS, MONTHLY_PRICE, THREE_MONTH_PLAN_DAYS, THREE_MONTH_PRICE
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db, get_engine
from app.models import CurriculumUnit, PaymentOrder, Question, QuestionExposure, QuestionResult, QuestionTelemetryLog, QuestionType, RoadmapNode, Subscription, Test, TestAttempt, TestTelemetrySummary, User, UserTypeProgress
from app.schemas import AdminQuestionUpdate, AnswerIn, AuthLogin, AuthRegister, ModuleOut, OnboardingProfile, OnboardingRegister, ResultsOut, TokenResponse, VerificationCodeRequest
from app.services.graph_engine import generate_linear_graph, generate_sat_graph_set
from app.services.sat_engine import (
    advance_module,
    dynamic_next_question_strategy,
    finalize_attempt,
    finish_module_one,
    get_module_questions,
    module_seconds_remaining,
    results_payload,
    save_answer,
    start_attempt,
)
from app.services.reading_analyzer import attach_reading_analyzer_limit_signup, mark_analyzer_limit_followup_sent, user_has_active_pro
from app.services.reading_mastery import PASS_MISTAKE_LIMIT, content_has_multilingual_fields, generate_mastery_content, grade_mastery_answers
from app.services.roadmap import generate_roadmap_for_attempt
from app.services.telegram_payments import (
    handle_telegram_update,
    notify_admin_diagnostic_result,
    notify_admin_full_mock_result,
    notify_diagnostic_user_result,
    process_subscription_maintenance,
    telegram_get_me,
    telegram_get_webhook_info,
    telegram_set_webhook,
)

router = APIRouter(prefix="/api")
verification_codes: dict[str, dict[str, datetime | str]] = {}


class DiagnosticResultNotification(BaseModel):
    timestamp: str
    estimated_score: int = Field(ge=400, le=1600)
    weak_areas: list[str] = Field(default_factory=list, max_length=5)
    language: str = Field(pattern="^(EN|RU|UZ|en|ru|uz)$")
    user_telegram_id: str | None = None


class FullMockResultNotification(BaseModel):
    timestamp: str
    total_score: int = Field(ge=400, le=1600)
    rw_score: int = Field(ge=200, le=800)
    math_score: int = Field(ge=200, le=800)
    weak_areas: list[str] = Field(default_factory=list, max_length=5)
    language: str = Field(pattern="^(EN|RU|UZ|en|ru|uz)$")


class PaymentOrderCreate(BaseModel):
    subscription_type: str = Field(pattern="^(monthly|three_month)$")
    estimated_score: int | None = Field(default=None, ge=400, le=1600)
    weak_areas: list[str] = Field(default_factory=list, max_length=8)
    conversion_source: str | None = Field(default=None, pattern="^(diagnostic_lock|analyzer_limit|path_type_lock|mock_test_lock)$")


class PlatformProgressPayload(BaseModel):
    event: str = Field(pattern="^(diagnostic_completed|lesson_completed|mock_completed|pro_lock_viewed)$")
    current_streak: int | None = Field(default=None, ge=0)
    longest_streak: int | None = Field(default=None, ge=0)
    daily_goal: int | None = Field(default=None, ge=1, le=8)
    pro_conversion_source: str | None = Field(default=None, max_length=80)


class PreferredLanguagePayload(BaseModel):
    preferred_language: str = Field(pattern="^(uz|ru|en)$")


class ReadingMasteryStartPayload(BaseModel):
    type_id: UUID
    force_new: bool = False


class ReadingMasterySubmitPayload(BaseModel):
    type_id: UUID
    answers: dict[str, str] = Field(default_factory=dict)


PAYMENT_PLANS = {
    "monthly": {"amount": MONTHLY_PRICE, "days": MONTHLY_PLAN_DAYS, "label": "1 month"},
    "three_month": {"amount": THREE_MONTH_PRICE, "days": THREE_MONTH_PLAN_DAYS, "label": "3 months"},
}


def ensure_user_language_schema() -> None:
    with get_engine().begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(16) DEFAULT 'uz'"))


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/ready")
def ready() -> dict:
    try:
        with get_engine().connect() as connection:
            connection.execute(text("SELECT 1"))
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(16) DEFAULT 'uz'"))
            missing_tables = [
                table
                for table in ("users", "tests", "questions", "test_attempts", "question_results")
                if connection.execute(text("SELECT to_regclass(:table_name)"), {"table_name": table}).scalar_one() is None
            ]
            if missing_tables:
                raise RuntimeError(f"Missing tables: {', '.join(missing_tables)}")
            required_user_columns = (
                "email",
                "full_name",
                "password_hash",
                "role",
                "detected_language",
                "chosen_language",
                "preferred_language",
                "language_confirmed",
                "language_set_date",
                "daily_analyses",
                "last_analysis_date",
                "total_analyses",
                "signup_source",
                "anonymous_visitor_id",
                "reading_analyzer_limit_signup_at",
                "reading_analyzer_followup_sent_at",
                "onboarding_completed",
                "target_score",
                "self_assessed_level",
                "track_type",
                "selected_track_at",
                "exam_date",
                "sat_experience",
                "current_streak",
                "longest_streak",
                "last_lesson_date",
                "daily_goal",
                "diagnostic_completed",
                "diagnostic_completed_at",
                "first_lesson_completed",
                "first_lesson_completed_at",
                "reached_7_day_streak",
                "reached_7_day_streak_at",
                "first_mock_completed",
                "first_mock_completed_at",
                "upgraded_to_pro",
                "upgraded_to_pro_at",
                "pro_conversion_source",
                "created_at",
            )
            existing_columns = {
                row[0]
                for row in connection.execute(
                    text(
                        """
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'users'
                        """
                    )
                )
            }
            missing_columns = [column for column in required_user_columns if column not in existing_columns]
            if missing_columns:
                raise RuntimeError(f"Missing users columns: {', '.join(missing_columns)}")
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database not ready") from exc
    return {"status": "ready"}


@router.post("/auth/register", response_model=TokenResponse)
def register(payload: AuthRegister, db: Session = Depends(get_db)) -> TokenResponse:
    email = payload.email.lower()
    _verify_email_code(email, payload.verification_code)

    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=email, full_name=payload.full_name, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    if payload.signup_source == "reading_analyzer_limit":
        attach_reading_analyzer_limit_signup(db, user, payload.anonymous_id)
        _send_analyzer_limit_followup(email, user.full_name)
        mark_analyzer_limit_followup_sent(db, user)
    verification_codes.pop(email, None)
    _send_registration_confirmation_email(email, user.full_name)
    return TokenResponse(access_token=create_access_token(user.id, user.role), role=user.role, full_name=user.full_name)


@router.post("/auth/onboarding-register", response_model=TokenResponse)
def onboarding_register(payload: OnboardingRegister, db: Session = Depends(get_db)) -> TokenResponse:
    email = payload.email.lower()
    _verify_email_code(email, payload.verification_code)
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        onboarding_completed=True,
        target_score=payload.target_score,
        self_assessed_level=payload.self_assessed_level,
        signup_source="welcome_reading_path",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    verification_codes.pop(email, None)
    _send_registration_confirmation_email(email, user.full_name)
    return TokenResponse(access_token=create_access_token(user.id, user.role), role=user.role, full_name=user.full_name)


@router.post("/auth/onboarding-profile")
def update_onboarding_profile(payload: OnboardingProfile, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    now = datetime.utcnow()
    track_type = "beginner" if payload.sat_experience == "first_time" else "diagnostic"
    user.target_score = payload.target_score
    user.exam_date = payload.exam_date
    user.sat_experience = payload.sat_experience
    user.self_assessed_level = payload.sat_experience
    user.track_type = track_type
    user.selected_track_at = user.selected_track_at or now
    user.daily_goal = payload.daily_goal
    user.onboarding_completed = True
    db.commit()
    return {
        "ok": True,
        "track_type": track_type,
        "next": "/path" if track_type == "beginner" else "/mock-test/diagnostic?mode=weak-area" if payload.sat_experience == "sat_before" else "/mock-test/diagnostic",
    }


@router.post("/platform/progress")
def update_platform_progress(payload: PlatformProgressPayload, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    now = datetime.utcnow()
    if payload.daily_goal is not None:
        user.daily_goal = payload.daily_goal
    if payload.current_streak is not None:
        user.current_streak = payload.current_streak
    if payload.longest_streak is not None:
        user.longest_streak = max(user.longest_streak or 0, payload.longest_streak)

    if payload.event == "diagnostic_completed":
        user.diagnostic_completed = True
        user.diagnostic_completed_at = user.diagnostic_completed_at or now
    elif payload.event == "lesson_completed":
        user.last_lesson_date = now.date()
        user.first_lesson_completed = True
        user.first_lesson_completed_at = user.first_lesson_completed_at or now
        if (user.longest_streak or 0) >= 7:
            user.reached_7_day_streak = True
            user.reached_7_day_streak_at = user.reached_7_day_streak_at or now
    elif payload.event == "mock_completed":
        user.first_mock_completed = True
        user.first_mock_completed_at = user.first_mock_completed_at or now
    elif payload.event == "pro_lock_viewed" and payload.pro_conversion_source:
        user.pro_conversion_source = payload.pro_conversion_source

    db.commit()
    return {"ok": True}


@router.post("/auth/request-verification-code")
def request_verification_code(payload: VerificationCodeRequest, db: Session = Depends(get_db)) -> dict:
    email = payload.email.lower()
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    now = datetime.utcnow()
    current = verification_codes.get(email)
    if current and now < current["expires_at"] and now < current["created_at"] + timedelta(seconds=45):
        raise HTTPException(status_code=429, detail="Please wait before requesting another code")

    code = f"{random.SystemRandom().randint(100000, 999999)}"
    verification_codes[email] = {
        "code": code,
        "created_at": now,
        "expires_at": now + timedelta(minutes=10),
    }
    try:
        dev_code = _send_verification_email(email, code)
    except HTTPException:
        verification_codes.pop(email, None)
        raise
    except Exception as exc:
        verification_codes.pop(email, None)
        print(f"Verification email failed unexpectedly for {email}: {exc}")
        raise HTTPException(status_code=502, detail="Unable to send verification email") from exc
    response = {"sent": True, "expires_in_minutes": 10}
    if dev_code:
        response["dev_code"] = code
    return response


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: AuthLogin, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return TokenResponse(access_token=create_access_token(user.id, user.role), role=user.role, full_name=user.full_name)


@router.get("/auth/me")
def current_user_profile(user: User = Depends(get_current_user)) -> dict:
    return {
        "full_name": user.full_name,
        "role": user.role,
        "track_type": user.track_type,
        "preferred_language": user.preferred_language or user.chosen_language or "uz",
    }


@router.post("/auth/preferred-language")
def update_preferred_language(payload: PreferredLanguagePayload, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    user.preferred_language = payload.preferred_language
    user.chosen_language = payload.preferred_language
    user.language_confirmed = True
    user.language_set_date = datetime.utcnow()
    db.commit()
    return {"ok": True, "preferred_language": user.preferred_language}


@router.get("/curriculum/units")
def curriculum_units(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    units = db.execute(select(CurriculumUnit).order_by(CurriculumUnit.order_index)).scalars().all()
    return {
        "units": [
            {
                "id": str(unit.id),
                "unit_name": unit.unit_name,
                "domain": unit.domain,
                "order_index": unit.order_index,
                "overview_text": unit.overview_text,
                "topics": unit.topics,
            }
            for unit in units
        ]
    }


@router.get("/subscriptions/me")
def my_subscription(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    now = datetime.utcnow()
    active_subscription = (
        db.execute(
            select(Subscription)
            .where(
                Subscription.user_id == user.id,
                Subscription.status == "active",
                or_(Subscription.current_period_end.is_(None), Subscription.current_period_end > now),
            )
            .order_by(Subscription.created_at.desc())
        )
        .scalars()
        .first()
    )
    if active_subscription:
        return {
            "has_active_subscription": True,
            "subscription": {
                "plan": active_subscription.plan,
                "status": active_subscription.status,
                "provider": active_subscription.provider,
                "current_period_end": active_subscription.current_period_end.isoformat() if active_subscription.current_period_end else None,
            },
        }

    subscription = (
        db.execute(
            select(Subscription)
            .where(Subscription.user_id == user.id)
            .order_by(Subscription.created_at.desc())
        )
        .scalars()
        .first()
    )
    if not subscription:
        return {"has_active_subscription": False, "subscription": None}

    return {
        "has_active_subscription": False,
        "subscription": {
            "plan": subscription.plan,
            "status": subscription.status,
            "provider": subscription.provider,
            "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        },
    }


@router.get("/reading-mastery/types")
def reading_mastery_types(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    question_types, progress_by_type, is_pro = _ensure_reading_mastery_progress(db, user)
    items = [_mastery_type_payload(question_type, progress_by_type.get(question_type.id), is_pro, progress_by_type) for question_type in question_types]
    passed_count = sum(1 for item in items if item["status"] == "passed")
    return {
        "is_pro": is_pro,
        "pass_mistake_limit": PASS_MISTAKE_LIMIT,
        "passed_count": passed_count,
        "total": len(items),
        "paywall_required": not is_pro and passed_count >= 1,
        "types": items,
    }


@router.post("/reading-mastery/start")
def start_reading_mastery_type(payload: ReadingMasteryStartPayload, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    question_types, progress_by_type, is_pro = _ensure_reading_mastery_progress(db, user)
    question_type = _get_question_type_or_404(db, payload.type_id)
    progress = progress_by_type.get(question_type.id)
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")
    _assert_mastery_type_available(question_type, question_types, progress_by_type, is_pro)

    stored = progress.last_attempt_questions if isinstance(progress.last_attempt_questions, dict) else {}
    content = stored.get("content")
    if payload.force_new or not isinstance(content, dict) or len(content.get("questions") or []) != 10 or not content_has_multilingual_fields(content):
        content = generate_mastery_content(question_type.type_name, progress.attempts + 1)
        progress.last_attempt_questions = {"content": content, "answers": {}, "graded": [], "attempt_number": progress.attempts + 1}
        progress.status = "in_progress"
        progress.updated_at = datetime.utcnow()
        db.commit()

    return {
        "type": _mastery_type_payload(question_type, progress, is_pro, progress_by_type),
        "content": content,
        "pass_mistake_limit": PASS_MISTAKE_LIMIT,
    }


@router.post("/reading-mastery/submit")
def submit_reading_mastery_type(payload: ReadingMasterySubmitPayload, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    question_types, progress_by_type, is_pro = _ensure_reading_mastery_progress(db, user)
    question_type = _get_question_type_or_404(db, payload.type_id)
    progress = progress_by_type.get(question_type.id)
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")
    _assert_mastery_type_available(question_type, question_types, progress_by_type, is_pro)

    stored = progress.last_attempt_questions if isinstance(progress.last_attempt_questions, dict) else {}
    content = stored.get("content") if isinstance(stored, dict) else None
    questions = content.get("questions") if isinstance(content, dict) else None
    if not isinstance(questions, list) or len(questions) != 10:
        raise HTTPException(status_code=400, detail="Start this question type before submitting answers")

    graded = grade_mastery_answers(questions, payload.answers)
    now = datetime.utcnow()
    progress.attempts += 1
    progress.best_score = max(progress.best_score or 0, graded["correct"])
    progress.updated_at = now

    response: dict = {
        "passed": graded["passed"],
        "correct": graded["correct"],
        "mistakes": graded["mistakes"],
        "pass_mistake_limit": PASS_MISTAKE_LIMIT,
        "graded": graded["graded"],
    }

    if graded["passed"]:
        progress.status = "passed"
        progress.completed_at = progress.completed_at or now
        progress.last_attempt_questions = {
            "content": content,
            "answers": payload.answers,
            "graded": graded["graded"],
            "correct": graded["correct"],
            "mistakes": graded["mistakes"],
            "passed": True,
            "attempt_number": progress.attempts,
        }
        _unlock_next_mastery_type(question_type, question_types, progress_by_type, is_pro)
        if question_type.order_index == 1 and not is_pro:
            response["paywall_required"] = True
        else:
            response["paywall_required"] = False
        user.first_lesson_completed = True
        user.first_lesson_completed_at = user.first_lesson_completed_at or now
    else:
        retry_content = generate_mastery_content(question_type.type_name, progress.attempts + 1)
        progress.status = "in_progress"
        progress.last_attempt_questions = {
            "content": retry_content,
            "previous_content": content,
            "previous_answers": payload.answers,
            "previous_graded": graded["graded"],
            "correct": graded["correct"],
            "mistakes": graded["mistakes"],
            "passed": False,
            "attempt_number": progress.attempts + 1,
        }
        response["retry_content"] = retry_content
        response["message_uz"] = (
            f"Bu safar {graded['mistakes']} xato qildingiz. "
            f"{question_type.type_name} ni yaxshiroq o'zlashtirish uchun savollar yangilandi — qaytadan urinib ko'ramiz."
        )

    db.commit()
    _, refreshed_progress, refreshed_is_pro = _ensure_reading_mastery_progress(db, user)
    response["types"] = [
        _mastery_type_payload(item, refreshed_progress.get(item.id), refreshed_is_pro, refreshed_progress)
        for item in question_types
    ]
    return response


def _ensure_reading_mastery_progress(db: Session, user: User) -> tuple[list[QuestionType], dict[UUID, UserTypeProgress], bool]:
    question_types = db.execute(select(QuestionType).order_by(QuestionType.order_index)).scalars().all()
    if not question_types:
        raise HTTPException(status_code=503, detail="Reading mastery question types are not seeded yet")

    existing = (
        db.execute(select(UserTypeProgress).where(UserTypeProgress.user_id == user.id))
        .scalars()
        .all()
    )
    progress_by_type = {item.type_id: item for item in existing}
    changed = False
    for question_type in question_types:
        if question_type.id in progress_by_type:
            continue
        status = "in_progress" if question_type.order_index == 1 else "locked"
        progress = UserTypeProgress(user_id=user.id, type_id=question_type.id, status=status)
        db.add(progress)
        progress_by_type[question_type.id] = progress
        changed = True
    if changed:
        db.commit()
        existing = (
            db.execute(select(UserTypeProgress).where(UserTypeProgress.user_id == user.id))
            .scalars()
            .all()
        )
        progress_by_type = {item.type_id: item for item in existing}

    is_pro = user_has_active_pro(db, user)
    _sync_mastery_locks(question_types, progress_by_type, is_pro)
    db.commit()
    return question_types, progress_by_type, is_pro


def _sync_mastery_locks(question_types: list[QuestionType], progress_by_type: dict[UUID, UserTypeProgress], is_pro: bool) -> None:
    previous_passed = True
    for question_type in question_types:
        progress = progress_by_type.get(question_type.id)
        if not progress or progress.status == "passed":
            previous_passed = bool(progress and progress.status == "passed")
            continue
        if question_type.order_index == 1:
            progress.status = "in_progress"
        elif not is_pro:
            progress.status = "locked"
        elif previous_passed:
            progress.status = "in_progress"
        else:
            progress.status = "locked"
        previous_passed = progress.status == "passed"


def _get_question_type_or_404(db: Session, type_id: UUID) -> QuestionType:
    question_type = db.get(QuestionType, type_id)
    if not question_type:
        raise HTTPException(status_code=404, detail="Question type not found")
    return question_type


def _assert_mastery_type_available(
    question_type: QuestionType,
    question_types: list[QuestionType],
    progress_by_type: dict[UUID, UserTypeProgress],
    is_pro: bool,
) -> None:
    progress = progress_by_type.get(question_type.id)
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")
    if question_type.order_index > 1 and not is_pro:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "pro_required",
                "message_uz": "Birinchi mavzudan keyingi 11 ta mavzu SATTEST Pro bilan ochiladi.",
            },
        )
    previous = next((item for item in question_types if item.order_index == question_type.order_index - 1), None)
    if previous:
        previous_progress = progress_by_type.get(previous.id)
        if not previous_progress or previous_progress.status != "passed":
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "previous_required",
                    "message_uz": "Avval oldingi savol turini o'zlashtiring.",
                },
            )
    if progress.status == "locked":
        raise HTTPException(status_code=403, detail={"error": "locked", "message_uz": "Bu mavzu hozircha yopiq."})


def _unlock_next_mastery_type(
    question_type: QuestionType,
    question_types: list[QuestionType],
    progress_by_type: dict[UUID, UserTypeProgress],
    is_pro: bool,
) -> None:
    next_type = next((item for item in question_types if item.order_index == question_type.order_index + 1), None)
    if not next_type or not is_pro:
        return
    next_progress = progress_by_type.get(next_type.id)
    if next_progress and next_progress.status == "locked":
        next_progress.status = "in_progress"
        next_progress.updated_at = datetime.utcnow()


def _mastery_type_payload(
    question_type: QuestionType,
    progress: UserTypeProgress | None,
    is_pro: bool,
    progress_by_type: dict[UUID, UserTypeProgress],
) -> dict:
    status = progress.status if progress else "locked"
    locked_reason = None
    if question_type.order_index > 1 and not is_pro:
        locked_reason = "pro_required"
    elif status == "locked":
        locked_reason = "previous_required"
    return {
        "id": str(question_type.id),
        "type_name": question_type.type_name,
        "type_name_uz": question_type.type_name_uz,
        "order_index": question_type.order_index,
        "is_free": question_type.is_free,
        "status": status,
        "best_score": progress.best_score if progress else 0,
        "attempts": progress.attempts if progress else 0,
        "completed_at": progress.completed_at.isoformat() if progress and progress.completed_at else None,
        "locked_reason": locked_reason,
        "requires_pro": question_type.order_index > 1,
    }


@router.get("/payment/config")
def payment_config() -> dict:
    settings = get_settings()
    return {
        "payme_qr_url": settings.payme_qr_url,
        "click_qr_url": settings.click_qr_url,
        "telegram_bot_url": f"https://t.me/{settings.payment_bot_username}",
        "plans": {
            key: {"amount": value["amount"], "days": value["days"], "label": value["label"]}
            for key, value in PAYMENT_PLANS.items()
        },
    }


@router.post("/payment/orders")
def create_payment_order(
    payload: PaymentOrderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    plan = PAYMENT_PLANS[payload.subscription_type]
    reference = _new_payment_reference(db)
    order = PaymentOrder(
        reference=reference,
        user_id=user.id,
        subscription_type=payload.subscription_type,
        amount=plan["amount"],
        estimated_score=payload.estimated_score,
        weak_areas=payload.weak_areas,
    )
    if payload.conversion_source:
        user.pro_conversion_source = payload.conversion_source
    db.add(order)
    db.commit()
    db.refresh(order)
    return _payment_order_payload(order, user)


@router.get("/payment/orders/{reference}")
def get_payment_order(reference: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    order = _owned_payment_order(db, reference, user)
    return _payment_order_payload(order, user)


@router.post("/telegram/webhook")
async def telegram_webhook(request: Request) -> dict:
    settings = get_settings()
    if settings.telegram_webhook_secret:
        secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
        if secret != settings.telegram_webhook_secret:
            raise HTTPException(status_code=403, detail="Invalid Telegram webhook secret")
    update = await request.json()
    db_generator = get_db()
    db: Session | None = None
    try:
        db = next(db_generator)
    except RuntimeError as exc:
        print(f"Telegram webhook running without database: {exc}")
        return handle_telegram_update(update, None)

    try:
        return handle_telegram_update(update, db)
    finally:
        db_generator.close()


@router.get("/telegram/status")
def telegram_status() -> dict:
    settings = get_settings()
    bot = telegram_get_me() if settings.telegram_bot_token else {"ok": False, "skipped": "telegram_bot_token_missing"}
    webhook = telegram_get_webhook_info() if settings.telegram_bot_token else {"ok": False, "skipped": "telegram_bot_token_missing"}
    webhook_result = webhook.get("result") or {}
    return {
        "bot_token_configured": bool(settings.telegram_bot_token),
        "bot_token_valid": bool(bot.get("ok")),
        "bot_username": ((bot.get("result") or {}).get("username") if bot.get("ok") else None),
        "bot_expected_username": settings.payment_bot_username,
        "bot_username_matches_expected": ((bot.get("result") or {}).get("username") == settings.payment_bot_username if bot.get("ok") else False),
        "webhook_secret_configured": bool(settings.telegram_webhook_secret),
        "webhook_configured": bool(webhook_result.get("url")),
        "webhook_url": webhook_result.get("url") or None,
        "webhook_pending_update_count": webhook_result.get("pending_update_count"),
        "webhook_last_error_message": webhook_result.get("last_error_message"),
        "admin_chat_id_configured": bool(settings.telegram_admin_chat_id),
        "channel_id_configured": bool(settings.telegram_channel_id),
        "database_configured": bool(settings.database_url),
    }


@router.post("/telegram/setup-webhook")
def telegram_setup_webhook(request: Request) -> dict:
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=500, detail="TELEGRAM_BOT_TOKEN is missing")
    if not settings.telegram_webhook_secret:
        raise HTTPException(status_code=500, detail="TELEGRAM_WEBHOOK_SECRET is missing")

    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if secret != settings.telegram_webhook_secret:
        raise HTTPException(status_code=403, detail="Invalid Telegram setup secret")

    if settings.api_public_url:
        webhook_url = f"{settings.api_public_url.rstrip('/')}/api/telegram/webhook"
    else:
        webhook_url = str(request.url_for("telegram_webhook")).replace("http://", "https://", 1)

    result = telegram_set_webhook(webhook_url, settings.telegram_webhook_secret)
    if not result.get("ok"):
        raise HTTPException(status_code=502, detail=result)
    return {"ok": True, "webhook_url": webhook_url, "telegram": result}


@router.post("/telegram/daily-report")
def telegram_daily_report(request: Request, db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    if settings.telegram_webhook_secret:
        secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
        if secret != settings.telegram_webhook_secret:
            raise HTTPException(status_code=403, detail="Invalid Telegram report secret")
    return process_subscription_maintenance(db, send_daily_report=True)


@router.post("/telegram/diagnostic-result")
async def telegram_diagnostic_result(
    request: Request,
    payload: DiagnosticResultNotification,
    db: Session = Depends(get_db),
) -> dict:
    settings = get_settings()
    if settings.telegram_webhook_secret:
        secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
        if secret != settings.telegram_webhook_secret:
            raise HTTPException(status_code=403, detail="Invalid Telegram diagnostic secret")

    admin_result = notify_admin_diagnostic_result(
        timestamp=payload.timestamp,
        estimated_score=payload.estimated_score,
        weak_areas=payload.weak_areas,
        language=payload.language.upper(),
    )
    user_result = {"ok": False, "skipped": "user_telegram_id_missing"}
    if payload.user_telegram_id:
        user_result = await notify_diagnostic_user_result(
            user_telegram_id=payload.user_telegram_id,
            estimated_score=payload.estimated_score,
            weak_areas=payload.weak_areas,
            language=payload.language,
            db=db,
        )

    return {"ok": bool(admin_result.get("ok") or user_result.get("ok")), "admin": admin_result, "user": user_result}


@router.post("/telegram/full-mock-result")
async def telegram_full_mock_result(request: Request, payload: FullMockResultNotification) -> dict:
    settings = get_settings()
    if settings.telegram_webhook_secret:
        secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
        if secret != settings.telegram_webhook_secret:
            raise HTTPException(status_code=403, detail="Invalid Telegram full mock secret")

    return notify_admin_full_mock_result(
        timestamp=payload.timestamp,
        total_score=payload.total_score,
        rw_score=payload.rw_score,
        math_score=payload.math_score,
        weak_areas=payload.weak_areas,
        language=payload.language.upper(),
    )


def _verify_email_code(email: str, code: str) -> None:
    stored_code = verification_codes.get(email)
    if (
        not stored_code
        or stored_code["code"] != code.strip()
        or datetime.utcnow() > stored_code["expires_at"]
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")


def _send_registration_confirmation_email(email: str, full_name: str) -> None:
    text = (
        f"Hello {full_name}!\n\n"
        "You are officially registered on SATTEST.UZ.\n\n"
        "Your account is confirmed and you can now use the platform:\n"
        "https://www.sattest.uz/reading-path\n\n"
        "Practice • Improve • Achieve\n"
        "SATTEST.UZ"
    )
    html = (
        "<div style=\"font-family:Arial,sans-serif;color:#111;line-height:1.55\">"
        f"<h2>Welcome to SATTEST.UZ, {full_name}!</h2>"
        "<p><strong>You are officially registered.</strong></p>"
        "<p>Your account is confirmed and you can now use the platform.</p>"
        "<p><a href=\"https://www.sattest.uz/reading-path\" style=\"display:inline-block;background:#FFD700;color:#000;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700\">Start learning</a></p>"
        "<p>Practice • Improve • Achieve<br>SATTEST.UZ</p>"
        "</div>"
    )
    settings = get_settings()
    if settings.resend_api_key:
        _send_simple_email_with_resend(email, "You are officially registered on SATTEST.UZ", text, html=html)
        return
    if settings.smtp_host:
        _send_simple_email_with_smtp(email, "You are officially registered on SATTEST.UZ", text)
        return
    if settings.environment.lower() != "production":
        print(f"SATTEST.UZ registration confirmation for {email}: registered")


def _send_verification_email(email: str, code: str) -> bool:
    settings = get_settings()
    if settings.resend_api_key:
        return _send_verification_email_with_resend(email, code)

    if not settings.smtp_host:
        if settings.environment.lower() == "production" and not settings.email_verification_fallback_enabled:
            raise HTTPException(status_code=500, detail="Email verification is not configured")
        print(f"SATTEST.UZ verification code fallback for {email}: {code}")
        return True

    message = EmailMessage()
    message["Subject"] = "Your SATTEST.UZ verification code"
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    message["To"] = email
    message.set_content(
        f"Your SATTEST.UZ verification code is {code}.\n\n"
        "This code expires in 10 minutes. If you did not request it, you can ignore this email."
    )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        print(f"SMTP verification email failed: {exc}")
        raise HTTPException(status_code=502, detail="Unable to send verification email") from exc
    return False


def _send_verification_email_with_resend(email: str, code: str) -> bool:
    settings = get_settings()
    from_email = settings.resend_from_email or f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    payload = {
        "from": from_email,
        "to": [email],
        "subject": "Your SATTEST.UZ verification code",
        "text": (
            f"Your SATTEST.UZ verification code is {code}.\n\n"
            "This code expires in 10 minutes. If you did not request it, you can ignore this email."
        ),
        "html": (
            "<div style=\"font-family:Arial,sans-serif;color:#111;line-height:1.5\">"
            "<h2>Your SATTEST.UZ verification code</h2>"
            f"<p style=\"font-size:28px;font-weight:700;letter-spacing:4px\">{code}</p>"
            "<p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>"
            "</div>"
        ),
    }
    email_request = urllib_request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "SATTEST.UZ/1.0",
        },
        method="POST",
    )

    try:
        with urllib_request.urlopen(email_request, timeout=10) as response:
            if response.status >= 400:
                raise HTTPException(status_code=502, detail="Unable to send verification email")
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        print(f"Resend verification email failed: status={exc.code} body={body}")
        raise HTTPException(status_code=502, detail="Unable to send verification email") from exc
    except OSError as exc:
        print(f"Resend verification email failed: {exc}")
        raise HTTPException(status_code=502, detail="Unable to send verification email") from exc

    return False


def _send_analyzer_limit_followup(email: str, full_name: str) -> None:
    text = (
        "Salom! 👋\n\n"
        "Bugun Reading Analyzer'dan 3 marta foydalandingiz — zo'r!\n\n"
        "Bilasizmi, Pro bilan bu CHEKSIZ bo'ladi, plus:\n\n"
        "✅ To'liq tarjima (qisman emas)\n"
        "✅ BARCHA savollar yechiladi (faqat 1-chi emas)\n"
        "✅ Mock testlar + shaxsiy reja\n\n"
        "300,000 UZS/oy\n\n"
        "Savol bo'lsa: @FounderSATTESTUZ"
    )
    settings = get_settings()
    if settings.resend_api_key:
        _send_simple_email_with_resend(
            email,
            "SATTEST.UZ Reading Analyzer Pro",
            text,
            html=(
                "<div style=\"font-family:Arial,sans-serif;color:#111;line-height:1.55\">"
                f"<p>Salom {full_name}! 👋</p>"
                "<p>Bugun Reading Analyzer'dan 3 marta foydalandingiz — zo'r!</p>"
                "<p><strong>Pro bilan bu CHEKSIZ bo'ladi:</strong></p>"
                "<ul>"
                "<li>To'liq tarjima (qisman emas)</li>"
                "<li>BARCHA savollar yechiladi (faqat 1-chi emas)</li>"
                "<li>Mock testlar + shaxsiy reja</li>"
                "</ul>"
                "<p><strong>300,000 UZS/oy</strong></p>"
                "<p>Savol bo'lsa: @FounderSATTESTUZ</p>"
                "</div>"
            ),
        )
        return
    if settings.smtp_host:
        _send_simple_email_with_smtp(email, "SATTEST.UZ Reading Analyzer Pro", text)


def _send_simple_email_with_resend(email: str, subject: str, text_body: str, *, html: str | None = None) -> None:
    settings = get_settings()
    from_email = settings.resend_from_email or f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    payload = {
        "from": from_email,
        "to": [email],
        "subject": subject,
        "text": text_body,
        "html": html or text_body.replace("\n", "<br>"),
    }
    email_request = urllib_request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "SATTEST.UZ/1.0",
        },
        method="POST",
    )
    try:
        with urllib_request.urlopen(email_request, timeout=10) as response:
            if response.status >= 400:
                print(f"Analyzer follow-up email failed for {email}: status={response.status}")
    except (OSError, error.HTTPError) as exc:
        print(f"Analyzer follow-up email failed for {email}: {exc}")


def _send_simple_email_with_smtp(email: str, subject: str, text_body: str) -> None:
    settings = get_settings()
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    message["To"] = email
    message.set_content(text_body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        print(f"Analyzer follow-up SMTP failed for {email}: {exc}")


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
    return _module_payload(db, attempt)


def _module_payload(db: Session, attempt: TestAttempt) -> dict:
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
            "route": {},
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


@router.post("/attempts/{attempt_id}/finish-module-1")
def finish_module_1(attempt_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    attempt = _owned_attempt(db, attempt_id, user)
    if attempt.current_module != 1:
        raise HTTPException(status_code=409, detail="Module 1 is already finished")
    finish_module_one(db, attempt)
    db.commit()
    db.refresh(attempt)
    return {
        "module1_correct": attempt.module1_correct,
        "module1_total": attempt.module1_total,
        "module2_started": attempt.module2_started,
    }


@router.post("/attempts/{attempt_id}/start-module-2", response_model=ModuleOut)
def start_module_2(attempt_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    attempt = _owned_attempt(db, attempt_id, user)
    if attempt.current_module != 1:
        raise HTTPException(status_code=409, detail="Module 2 has already been started")
    if attempt.module1_total == 0:
        finish_module_one(db, attempt)
    attempt = advance_module(db, attempt)
    return _module_payload(db, attempt)


@router.post("/attempts/{attempt_id}/submit")
def submit_attempt(attempt_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    attempt = _owned_attempt(db, attempt_id, user)
    finalize_attempt(db, attempt)
    generate_roadmap_for_attempt(db, user.id, attempt)
    return {"status": attempt.status, "score_total": attempt.score_total, "final_score": attempt.final_score}


@router.get("/attempts/{attempt_id}/results", response_model=ResultsOut)
def get_results(attempt_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    attempt = _owned_attempt(db, attempt_id, user)
    return results_payload(db, attempt)


@router.get("/roadmap/me")
def my_roadmap(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    nodes = (
        db.execute(select(RoadmapNode).where(RoadmapNode.user_id == user.id).order_by(RoadmapNode.order_index))
        .scalars()
        .all()
    )
    return {
        "nodes": [
            {
                "id": str(node.id),
                "node_type": node.node_type,
                "topic_key": node.topic_key,
                "order_index": node.order_index,
                "status": node.status,
                "icon_key": node.icon_key,
                "created_at": node.created_at.isoformat(),
                "completed_at": node.completed_at.isoformat() if node.completed_at else None,
            }
            for node in nodes
        ]
    }


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


@router.get("/admin/subscriptions")
def admin_subscriptions(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[dict]:
    rows = (
        db.execute(
            select(Subscription, User)
            .join(User, Subscription.user_id == User.id)
            .order_by(Subscription.created_at.desc())
            .limit(100)
        )
        .all()
    )
    return [
        {
            "id": subscription.id,
            "student_name": user.full_name,
            "email": user.email,
            "plan": subscription.plan,
            "status": subscription.status,
            "provider": subscription.provider,
            "provider_customer_id": subscription.provider_customer_id,
            "payer_full_name": subscription.payer_full_name,
            "payer_phone": subscription.payer_phone,
            "price_amount": float(subscription.price_amount or 0),
            "currency": subscription.currency,
            "current_period_start": subscription.current_period_start.isoformat() if subscription.current_period_start else None,
            "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
            "renewal_reminders_sent": subscription.renewal_reminders_sent,
            "last_renewal_reminder_at": subscription.last_renewal_reminder_at.isoformat() if subscription.last_renewal_reminder_at else None,
            "canceled_at": subscription.canceled_at.isoformat() if subscription.canceled_at else None,
            "created_at": subscription.created_at.isoformat(),
        }
        for subscription, user in rows
    ]


@router.get("/admin/payment-orders")
def admin_payment_orders(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict:
    rows = (
        db.execute(
            select(PaymentOrder, User)
            .join(User, PaymentOrder.user_id == User.id)
            .order_by(PaymentOrder.created_at.desc())
            .limit(200)
        )
        .all()
    )
    orders = [_admin_payment_order_payload(order, user) for order, user in rows]
    activated = [order for order, _ in rows if order.status == "approved"]
    total_revenue = sum(float(order.amount or 0) for order in activated)
    return {
        "pending": [order for order in orders if order["status"] in {"pending", "telegram_opened", "screenshot_received"}],
        "activated": [order for order in orders if order["status"] == "approved"],
        "rejected": [order for order in orders if order["status"] == "rejected"],
        "total_revenue": total_revenue,
        "currency": "UZS",
        "all": orders,
    }


@router.post("/admin/subscriptions/{subscription_id}/revoke")
def revoke_subscription(subscription_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict:
    subscription = db.get(Subscription, subscription_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    now = datetime.utcnow()
    subscription.status = "revoked"
    subscription.current_period_end = now
    subscription.canceled_at = now
    db.commit()
    db.refresh(subscription)
    return {
        "id": subscription.id,
        "status": subscription.status,
        "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
    }


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


def _new_payment_reference(db: Session) -> str:
    for _ in range(20):
        reference = f"SAT-{random.SystemRandom().randint(0, 999999):06d}"
        exists = db.execute(select(PaymentOrder.id).where(PaymentOrder.reference == reference)).first()
        if not exists:
            return reference
    raise HTTPException(status_code=503, detail="Unable to create payment reference")


def _owned_payment_order(db: Session, reference: str, user: User) -> PaymentOrder:
    order = db.execute(select(PaymentOrder).where(PaymentOrder.reference == reference.upper())).scalar_one_or_none()
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="Payment order not found")
    return order


def _payment_order_payload(order: PaymentOrder, user: User) -> dict:
    settings = get_settings()
    telegram_url = f"https://t.me/{settings.payment_bot_username}?start={order.reference}"
    return {
        "id": order.id,
        "reference": order.reference,
        "status": order.status,
        "student_name": user.full_name,
        "email": user.email,
        "subscription_type": order.subscription_type,
        "amount": float(order.amount or 0),
        "currency": order.currency,
        "estimated_score": order.estimated_score,
        "weak_areas": order.weak_areas or [],
        "telegram_url": telegram_url,
        "payme_qr_url": settings.payme_qr_url,
        "click_qr_url": settings.click_qr_url,
        "created_at": order.created_at.isoformat(),
        "activation_date": order.activation_date.isoformat() if order.activation_date else None,
        "expiry_date": order.expiry_date.isoformat() if order.expiry_date else None,
    }


def _admin_payment_order_payload(order: PaymentOrder, user: User) -> dict:
    return {
        "id": order.id,
        "reference": order.reference,
        "student_name": user.full_name,
        "email": user.email,
        "subscription_type": order.subscription_type,
        "amount": float(order.amount or 0),
        "currency": order.currency,
        "status": order.status,
        "estimated_score": order.estimated_score,
        "weak_areas": order.weak_areas or [],
        "telegram_username": order.telegram_username,
        "telegram_phone": order.telegram_phone,
        "screenshot_file_id": order.screenshot_file_id,
        "activation_date": order.activation_date.isoformat() if order.activation_date else None,
        "expiry_date": order.expiry_date.isoformat() if order.expiry_date else None,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
    }


def _record_exposures(db: Session, attempt: TestAttempt, questions: list[Question]) -> None:
    existing = {
        question_id
        for (question_id,) in db.execute(
            select(QuestionExposure.question_id).where(QuestionExposure.attempt_id == attempt.id)
        ).all()
    }
    for question in questions:
        if getattr(question, "is_generated", False):
            continue
        if question.id not in existing:
            db.add(
                QuestionExposure(
                    attempt_id=attempt.id,
                    question_id=question.id,
                    module_snapshot=attempt.current_module,
                )
            )
    db.commit()
