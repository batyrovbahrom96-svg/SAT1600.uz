from __future__ import annotations

import asyncio
import logging
import os
import sys

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from telegram import BotCommand, Update
from telegram.error import RetryAfter, TelegramError
from telegram.ext import Application, ContextTypes, TypeHandler

BACKEND_DIR = os.path.dirname(__file__)
REPO_DIR = os.path.dirname(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)
sys.path.insert(0, REPO_DIR)

from app.core.config import get_settings
from app.db.session import get_session_local
from app.services.bot_service import WELCOME_BOT_USERNAME, ensure_welcome_bot_schema
from app.services.telegram_payments import handle_telegram_update, process_subscription_maintenance, send_streak_reminders, send_webinar_reminders


logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("sattest.welcome_bot")
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("telegram").setLevel(logging.WARNING)
logging.getLogger("telegram.ext").setLevel(logging.INFO)


def get_first_name(update: Update) -> str:
    """
    Safely get user first name.
    Never adds honorific titles.
    Never returns empty string.
    """
    user = update.effective_user
    if user and user.first_name:
        return _clean_first_name(user.first_name)
    if user and user.username:
        return _clean_first_name(user.username)
    return "O'quvchi"


def _clean_first_name(value: str | None) -> str:
    if not value:
        return "O'quvchi"
    cleaned = value.strip()
    for prefix in ("mr. ", "mr.", "mrs. ", "mrs.", "sir ", "sir"):
        if cleaned.lower().startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
    return cleaned or "O'quvchi"


async def handle_update(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    db = None
    try:
        payload = update.to_dict()
        from_user = payload.get("message", {}).get("from") or payload.get("callback_query", {}).get("from")
        if from_user is not None:
            from_user["first_name"] = get_first_name(update)
        db = get_session_local()()
        await asyncio.to_thread(handle_telegram_update, payload, db)
    except Exception:
        logger.exception("Failed to process Telegram update")
    finally:
        if db is not None:
            db.close()


async def run_maintenance() -> None:
    db = None
    try:
        db = get_session_local()()
        result = await asyncio.to_thread(process_subscription_maintenance, db)
        logger.info("Maintenance completed: %s", result)
    except Exception:
        logger.exception("Maintenance failed")
    finally:
        if db is not None:
            db.close()


async def run_webinar_reminders() -> None:
    db = None
    try:
        db = get_session_local()()
        sent = await asyncio.to_thread(send_webinar_reminders, db)
        logger.info("Webinar reminders sent: %s", sent)
    except Exception:
        logger.exception("Webinar reminder job failed")
    finally:
        if db is not None:
            db.close()


async def run_streak_reminders() -> None:
    db = None
    try:
        db = get_session_local()()
        sent = await asyncio.to_thread(send_streak_reminders, db)
        logger.info("Streak reminders sent: %s", sent)
    except Exception:
        logger.exception("Streak reminder job failed")
    finally:
        if db is not None:
            db.close()


async def post_init(application: Application) -> None:
    try:
        await application.bot.set_my_commands(
            [
                BotCommand("start", "Boshlash / Start"),
                BotCommand("test", "Bepul diagnostic test"),
                BotCommand("pro", "Pro obuna ma'lumoti"),
                BotCommand("webinar", "Vebinar haqida"),
                BotCommand("tips", "Kunlik SAT maslahatlar"),
                BotCommand("score", "Balimni yangilash"),
                BotCommand("help", "Barcha buyruqlar"),
                BotCommand("contact", "Murojaat"),
                BotCommand("analyzer_stats", "Reading Analyzer funnel"),
                BotCommand("funnel_stats", "Platform funnel"),
                BotCommand("conversion_stats", "Pro conversion sources"),
            ]
        )
        await application.bot.set_my_name("SATTEST Welcome Bot")
        await application.bot.set_my_description(
            "SATTEST.UZ rasmiy boti 🎯\n"
            "SAT da 1400+ ga yo'lingiz!\n\n"
            "Bepul diagnostic test:\n"
            "👉 sattest.uz/diagnostic\n\n"
            "Savol uchun: \n"
            "@FounderSATTESTUZ"
        )
        await application.bot.set_my_short_description(
            "SATTEST.UZ —\n"
            "Practice • Improve • Achieve\n\n"
            "Founder: @FounderSATTESTUZ\n"
            "Platform: sattest.uz"
        )
    except RetryAfter as exc:
        logger.warning(
            "Telegram flood control blocked bot profile setup; startup will continue. retry_after=%s",
            exc.retry_after,
        )
    except TelegramError:
        logger.exception("Telegram rejected bot profile setup; startup will continue.")
    logger.info("SATTEST.UZ Welcome Bot is live as @%s", WELCOME_BOT_USERNAME)


def main() -> None:
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is missing. Add the payment bot token from @BotFather to Railway.")
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is missing. Add the Railway Postgres DATABASE_URL before starting the bot.")

    ensure_welcome_bot_schema()

    application = (
        Application.builder()
        .token(settings.telegram_bot_token)
        .post_init(post_init)
        .build()
    )
    application.add_handler(TypeHandler(Update, handle_update))

    scheduler = AsyncIOScheduler(timezone="Asia/Tashkent")
    scheduler.add_job(run_maintenance, "interval", hours=1, id="welcome_bot_maintenance", replace_existing=True)
    scheduler.add_job(
        run_webinar_reminders,
        CronTrigger(day_of_week="sun", hour=18, minute=0, timezone="Asia/Tashkent"),
        id="welcome_bot_webinar_reminder",
        replace_existing=True,
    )
    scheduler.add_job(
        run_streak_reminders,
        CronTrigger(hour=20, minute=0, timezone="Asia/Tashkent"),
        id="welcome_bot_streak_reminder",
        replace_existing=True,
    )
    scheduler.start()

    application.run_polling(allowed_updates=Update.ALL_TYPES, drop_pending_updates=False)


if __name__ == "__main__":
    main()
