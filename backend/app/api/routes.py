from datetime import datetime, timedelta
from email.message import EmailMessage
import json
import random
import smtplib
from urllib import error, request
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
from app.models import PaymentOrder, Question, QuestionExposure, QuestionResult, QuestionTelemetryLog, Subscription, Test, TestAttempt, TestTelemetrySummary, User
from app.schemas import AdminQuestionUpdate, AnswerIn, AuthLogin, AuthRegister, ModuleOut, ResultsOut, TokenResponse, VerificationCodeRequest
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
from app.services.bot_service import WELCOME_BOT_USERNAME
from app.services.telegram_payments import (
    handle_telegram_update,
    notify_admin_diagnostic_result,
    notify_admin_full_mock_result,
    notify_diagnostic_user_result,
    process_subscription_maintenance,
    telegram_get_me,
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


PAYMENT_PLANS = {
    "monthly": {"amount": MONTHLY_PRICE, "days": MONTHLY_PLAN_DAYS, "label": "1 month"},
    "three_month": {"amount": THREE_MONTH_PRICE, "days": THREE_MONTH_PLAN_DAYS, "label": "3 months"},
}


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
    email = payload.email.lower()
    stored_code = verification_codes.get(email)
    if (
        not stored_code
        or stored_code["code"] != payload.verification_code.strip()
        or datetime.utcnow() > stored_code["expires_at"]
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=email, full_name=payload.full_name, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    verification_codes.pop(email, None)
    return TokenResponse(access_token=create_access_token(user.id, user.role), role=user.role, full_name=user.full_name)


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
    return {"full_name": user.full_name, "role": user.role}


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


@router.get("/payment/config")
def payment_config() -> dict:
    settings = get_settings()
    return {
        "payme_qr_url": settings.payme_qr_url,
        "click_qr_url": settings.click_qr_url,
        "telegram_bot_url": f"https://t.me/{WELCOME_BOT_USERNAME}",
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
    return {
        "bot_token_configured": bool(settings.telegram_bot_token),
        "bot_token_valid": bool(bot.get("ok")),
        "bot_username": ((bot.get("result") or {}).get("username") if bot.get("ok") else None),
        "bot_expected_username": WELCOME_BOT_USERNAME,
        "bot_username_matches_expected": ((bot.get("result") or {}).get("username") == WELCOME_BOT_USERNAME if bot.get("ok") else False),
        "webhook_secret_configured": bool(settings.telegram_webhook_secret),
        "admin_chat_id_configured": bool(settings.telegram_admin_chat_id),
        "channel_id_configured": bool(settings.telegram_channel_id),
        "database_configured": bool(settings.database_url),
    }


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


def _send_verification_email(email: str, code: str) -> bool:
    settings = get_settings()
    if settings.resend_api_key:
        return _send_verification_email_with_resend(email, code)

    if not settings.smtp_host:
        if settings.environment.lower() == "production":
            raise HTTPException(status_code=500, detail="Email verification is not configured")
        print(f"SATTEST.UZ verification code for {email}: {code}")
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
    email_request = request.Request(
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
        with request.urlopen(email_request, timeout=10) as response:
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
    return {"status": attempt.status, "score_total": attempt.score_total, "final_score": attempt.final_score}


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
    telegram_url = f"https://t.me/{WELCOME_BOT_USERNAME}?start={order.reference}"
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
