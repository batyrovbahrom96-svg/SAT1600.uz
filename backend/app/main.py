from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.api.routes import router
from app.api.reading_analyzer import router as reading_analyzer_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.middleware import RateLimitMiddleware, RequestLoggingMiddleware, SecureHeadersMiddleware
from app.db.session import get_session_local
from app.services.reading_analyzer import reset_all_daily_analysis_limits

settings = get_settings()
configure_logging(settings.log_level)
app = FastAPI(
    title=settings.app_name,
    docs_url="/docs" if settings.environment.lower() != "production" else None,
    redoc_url="/redoc" if settings.environment.lower() != "production" else None,
)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecureHeadersMiddleware)

origins = [
    "https://sattest.uz",
    "https://www.sattest.uz",
    "https://sat-1600-uz.vercel.app",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-SATTEST-RA-ID"],
)

app.include_router(router)
app.include_router(reading_analyzer_router)
app.mount("/static", StaticFiles(directory="static"), name="static")

reading_scheduler = AsyncIOScheduler(timezone="Asia/Tashkent")


@app.on_event("startup")
async def start_reading_analyzer_scheduler() -> None:
    if not reading_scheduler.running:
        reading_scheduler.add_job(
            reset_reading_analyzer_limits_job,
            CronTrigger(hour=0, minute=0, timezone="Asia/Tashkent"),
            id="reading_analyzer_daily_reset",
            replace_existing=True,
        )
        reading_scheduler.start()


@app.on_event("shutdown")
async def stop_reading_analyzer_scheduler() -> None:
    if reading_scheduler.running:
        reading_scheduler.shutdown(wait=False)


def reset_reading_analyzer_limits_job() -> None:
    db = get_session_local()()
    try:
        reset_all_daily_analysis_limits(db)
    finally:
        db.close()
