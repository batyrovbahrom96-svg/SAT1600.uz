from __future__ import annotations

from datetime import datetime
import json
from urllib import error, request

from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import Base, get_engine
from app.models import TelegramAudience
from app.services.messages import ACTIVATION_MESSAGE, TEST_COMPLETE_MESSAGE


WELCOME_BOT_USERNAME = "SATTEST_Welcome_Bot"


def ensure_welcome_bot_schema() -> None:
    """Create missing bot tables/columns for Railway worker deployments."""
    engine = get_engine()
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    if "telegram_audience" not in inspector.get_table_names():
        Base.metadata.create_all(bind=engine)
        return

    existing = {column["name"] for column in inspector.get_columns("telegram_audience")}
    wanted = {
        "test_completed": "BOOLEAN DEFAULT FALSE",
        "test_score": "INTEGER",
        "test_weak_areas": "TEXT",
        "pro_activated": "BOOLEAN DEFAULT FALSE",
        "activation_date": "TIMESTAMP",
        "bot_blocked": "BOOLEAN DEFAULT FALSE",
        "webinar_reminder": "BOOLEAN DEFAULT FALSE",
        "daily_tips": "BOOLEAN DEFAULT FALSE",
        "current_score": "INTEGER",
        "score_updated_date": "TIMESTAMP",
        "faq_count": "INTEGER DEFAULT 0",
        "last_message_date": "TIMESTAMP",
    }
    missing = [(name, ddl) for name, ddl in wanted.items() if name not in existing]
    if not missing:
        return

    dialect = engine.dialect.name
    with engine.begin() as connection:
        for name, ddl in missing:
            if dialect == "sqlite":
                connection.execute(text(f"ALTER TABLE telegram_audience ADD COLUMN {name} {ddl}"))
            else:
                connection.execute(text(f"ALTER TABLE telegram_audience ADD COLUMN IF NOT EXISTS {name} {ddl}"))


def normalize_language(language: str | None) -> str:
    if not language:
        return "en"
    lowered = language.lower()
    if lowered.startswith("uz"):
        return "uz"
    if lowered.startswith("ru"):
        return "ru"
    if lowered.startswith("en"):
        return "en"
    return "en"


def clean_first_name(value: str | None) -> str:
    if not value:
        return "O'quvchi"
    cleaned = value.strip()
    for prefix in ("mr. ", "mr.", "mrs. ", "mrs.", "sir ", "sir"):
        if cleaned.lower().startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
    return cleaned or "O'quvchi"


def get_test_complete_message(*, score: int, weak_areas: list[str], language: str, first_name: str | None = None) -> str:
    normalized_language = normalize_language(language)
    cleaned_weak_areas = [area.strip() for area in weak_areas if area.strip()]
    weak_area_line = ", ".join(cleaned_weak_areas) if cleaned_weak_areas else {
        "uz": "Aniqlanmadi",
        "ru": "Не обнаружены",
        "en": "None detected",
    }[normalized_language]
    return TEST_COMPLETE_MESSAGE[normalized_language].format(
        first_name=clean_first_name(first_name),
        score=score,
        weak_areas=weak_area_line,
    )


async def notify_bot_after_test(
    *,
    user_telegram_id: str,
    score: int,
    weak_areas: list[str],
    language: str,
    db: Session | None = None,
) -> dict:
    if not user_telegram_id:
        return {"ok": False, "skipped": "user_telegram_id_missing"}

    settings = get_settings()
    if not settings.telegram_bot_token:
        return {"ok": False, "skipped": "telegram_bot_token_missing"}

    normalized_language = normalize_language(language)
    lead = None
    if db is not None:
        lead = db.execute(
            select(TelegramAudience).where(TelegramAudience.telegram_user_id == str(user_telegram_id))
        ).scalar_one_or_none()
    first_name = clean_first_name(lead.first_name if lead else None)
    message = get_test_complete_message(score=score, weak_areas=weak_areas, language=normalized_language, first_name=first_name)
    response = send_telegram_message(
        bot_token=settings.telegram_bot_token,
        chat_id=user_telegram_id,
        message=message,
        reply_markup={
            "inline_keyboard": [
                [{"text": _pro_button_text(normalized_language), "url": "https://www.sattest.uz/pro"}],
                [{"text": _support_button_text(normalized_language), "url": "https://t.me/FounderSATTESTUZ"}],
            ]
        },
    )

    if db is not None and lead:
        lead.test_completed = True
        lead.test_score = score
        lead.test_weak_areas = json.dumps(weak_areas, ensure_ascii=False)
        lead.updated_at = datetime.utcnow()
        db.commit()

    return response


def activate_telegram_user(db: Session, user_id: str) -> tuple[bool, str]:
    lead = db.execute(
        select(TelegramAudience).where(
            (TelegramAudience.telegram_user_id == str(user_id)) | (TelegramAudience.chat_id == str(user_id))
        )
    ).scalar_one_or_none()
    if not lead:
        return False, "Telegram user was not found in bot audience."

    now = datetime.utcnow()
    language = lead.chosen_language or lead.detected_language or "en"
    language = normalize_language(language)
    lead.pro_activated = True
    lead.activation_date = now
    lead.updated_at = now
    db.commit()

    first_name = clean_first_name(lead.first_name or lead.username)
    send_telegram_message(
        bot_token=get_settings().telegram_bot_token or "",
        chat_id=lead.chat_id,
        message=ACTIVATION_MESSAGE[language].format(first_name=first_name),
        reply_markup={
            "inline_keyboard": [
                [{"text": "Open SATTEST.UZ", "url": "https://www.sattest.uz/dashboard"}],
                [{"text": "Full Mock Test", "url": "https://www.sattest.uz/sat-mock"}],
            ]
        },
    )
    return True, f"Pro activated for {lead.telegram_user_id}."


def send_telegram_message(
    *,
    bot_token: str,
    chat_id: str,
    message: str,
    reply_markup: dict | None = None,
) -> dict:
    if not bot_token:
        return {"ok": False, "error": "telegram_bot_token_missing"}

    payload: dict = {"chat_id": chat_id, "text": message}
    if reply_markup:
        payload["reply_markup"] = reply_markup

    api_request = request.Request(
        f"https://api.telegram.org/bot{bot_token}/sendMessage",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "SATTEST.UZ-WelcomeBot/1.0"},
        method="POST",
    )
    try:
        with request.urlopen(api_request, timeout=12) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return {"ok": False, "status": exc.code, "error": body}
    except OSError as exc:
        return {"ok": False, "error": str(exc)}


def _pro_button_text(language: str) -> str:
    return {
        "uz": "💎 Pro Olish →",
        "ru": "💎 Получить Pro →",
        "en": "💎 Get Pro →",
    }.get(language, "💎 Get Pro →")


def _support_button_text(language: str) -> str:
    return {
        "uz": "❓ Savolim bor",
        "ru": "❓ Есть вопрос",
        "en": "❓ I have a question",
    }.get(language, "❓ I have a question")
