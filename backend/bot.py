from __future__ import annotations

import asyncio
import logging
import os
import sys

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from telegram import BotCommand, Update
from telegram.ext import Application, ContextTypes, TypeHandler

BACKEND_DIR = os.path.dirname(__file__)
REPO_DIR = os.path.dirname(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)
sys.path.insert(0, REPO_DIR)

from app.core.config import get_settings
from app.db.session import get_session_local
from app.services.bot_service import WELCOME_BOT_USERNAME, ensure_welcome_bot_schema
from app.services.telegram_payments import handle_telegram_update, process_subscription_maintenance


logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("sattest.welcome_bot")
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("telegram").setLevel(logging.WARNING)
logging.getLogger("telegram.ext").setLevel(logging.INFO)


async def handle_update(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    db = None
    try:
        db = get_session_local()()
        await asyncio.to_thread(handle_telegram_update, update.to_dict(), db)
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


async def post_init(application: Application) -> None:
    await application.bot.set_my_commands(
        [
            BotCommand("start", "Start SATTEST.UZ Welcome Bot"),
            BotCommand("stats", "Founder stats"),
            BotCommand("remind", "Founder manual reminders"),
        ]
    )
    logger.info("SATTEST.UZ Welcome Bot is live as @%s", WELCOME_BOT_USERNAME)


def main() -> None:
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is missing. Create @SATTEST_Welcome_Bot in @BotFather and add the token to Railway.")
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
    scheduler.start()

    application.run_polling(allowed_updates=Update.ALL_TYPES, drop_pending_updates=False)


if __name__ == "__main__":
    main()
