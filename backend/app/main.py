from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.middleware import RateLimitMiddleware, RequestLoggingMiddleware, SecureHeadersMiddleware

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
    allow_methods=[""],
    allow_headers=[""],
)

app.include_router(router)
app.mount("/static", StaticFiles(directory="static"), name="static")
