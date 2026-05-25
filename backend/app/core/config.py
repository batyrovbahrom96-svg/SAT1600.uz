from functools import lru_cache
import json

from dotenv import load_dotenv
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    app_name: str = "SATTEST.UZ API"
    environment: str = "development"
    database_url: str | None = None
    jwt_secret: str | None = None
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 24
    frontend_url: str = "http://localhost:3000"
    cors_origins: str | list[str] = Field(default="")
    cors_origin_regex: str | None = None
    graph_output_dir: str = "static/graphs"
    rate_limit_per_minute: int = 120
    log_level: str = "INFO"
    trust_proxy_headers: bool = True
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str = "no-reply@sattest.uz"
    smtp_from_name: str = "SATTEST.UZ"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, list):
            return value
        if not isinstance(value, str) or not value.strip():
            return []
        stripped = value.strip()
        if stripped.startswith("["):
            parsed = json.loads(stripped)
            if not isinstance(parsed, list):
                raise ValueError("CORS_ORIGINS JSON value must be an array")
            return [str(origin).strip() for origin in parsed if str(origin).strip()]
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value):
        if value is None or value == "":
            return None
        if isinstance(value, str) and value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if isinstance(value, str) and value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @property
    def allowed_origins(self) -> list[str]:
        origins = self.cors_origins or [self.frontend_url]
        if self.environment.lower() != "production":
            origins.extend(["http://localhost:3000", "http://127.0.0.1:3000"])
        return sorted(set(origin.rstrip("/") for origin in origins))


@lru_cache
def get_settings() -> Settings:
    return Settings()


def require_database_url(settings: Settings | None = None) -> str:
    resolved = settings or get_settings()
    if not resolved.database_url:
        raise RuntimeError("DATABASE_URL missing at runtime")
    if resolved.environment.lower() == "production" and (
        "localhost" in resolved.database_url or "127.0.0.1" in resolved.database_url
    ):
        raise RuntimeError("DATABASE_URL must point to production PostgreSQL in production")
    return resolved.database_url


def require_jwt_secret(settings: Settings | None = None) -> str:
    resolved = settings or get_settings()
    if not resolved.jwt_secret:
        raise RuntimeError("JWT_SECRET missing at runtime")
    return resolved.jwt_secret
