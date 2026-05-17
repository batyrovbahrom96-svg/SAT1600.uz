from functools import lru_cache
import json
import os

from dotenv import load_dotenv
from pydantic import Field, field_validator, model_validator
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
    cors_origins: list[str] = Field(default_factory=list)
    cors_origin_regex: str | None = None
    graph_output_dir: str = "static/graphs"
    rate_limit_per_minute: int = 120
    log_level: str = "INFO"
    trust_proxy_headers: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                parsed = json.loads(stripped)
                if not isinstance(parsed, list):
                    raise ValueError("CORS_ORIGINS JSON value must be an array")
                return [str(origin).strip() for origin in parsed if str(origin).strip()]
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

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

    @model_validator(mode="after")
    def validate_production_secrets(self):
        if not self.database_url:
            raise ValueError("DATABASE_URL missing at runtime")
        if not self.jwt_secret:
            raise ValueError("JWT_SECRET missing at runtime")
        if self.environment.lower() == "production":
            if "localhost" in self.database_url or "127.0.0.1" in self.database_url:
                raise ValueError("DATABASE_URL must point to production PostgreSQL in production")
        return self

    @property
    def allowed_origins(self) -> list[str]:
        origins = self.cors_origins or [self.frontend_url]
        if self.environment.lower() != "production":
            origins.extend(["http://localhost:3000", "http://127.0.0.1:3000"])
        return sorted(set(origin.rstrip("/") for origin in origins))


@lru_cache
def get_settings() -> Settings:
    print("=== SETTINGS DEBUG ===")
    print("DATABASE_URL from os:", "EXISTS" if os.getenv("DATABASE_URL") else "EMPTY")
    print("JWT_SECRET from os:", "EXISTS" if os.getenv("JWT_SECRET") else "EMPTY")
    return Settings()
