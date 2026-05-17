from collections.abc import Generator
import logging

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger("sattest.db")
settings = get_settings()
DATABASE_URL = settings.database_url
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required before creating the database engine")

safe_url = make_url(DATABASE_URL)
logger.info(
    "database_configured exists=%s driver=%s host=%s database=%s sslmode=%s",
    bool(DATABASE_URL),
    safe_url.drivername,
    safe_url.host,
    safe_url.database,
    safe_url.query.get("sslmode", "not_set"),
)


class Base(DeclarativeBase):
    pass


engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
