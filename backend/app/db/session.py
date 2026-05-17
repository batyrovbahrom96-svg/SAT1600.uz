from collections.abc import Generator
from functools import lru_cache
import logging

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import require_database_url

logger = logging.getLogger("sattest.db")


class Base(DeclarativeBase):
    pass


@lru_cache
def get_engine():
    database_url = require_database_url()
    safe_url = make_url(database_url)
    logger.info(
        "database_configured exists=%s driver=%s host=%s database=%s sslmode=%s",
        bool(database_url),
        safe_url.drivername,
        safe_url.host,
        safe_url.database,
        safe_url.query.get("sslmode", "not_set"),
    )
    return create_engine(
        database_url,
        pool_pre_ping=True,
    )


def get_session_local():
    return sessionmaker(bind=get_engine(), autocommit=False, autoflush=False)


engine = get_engine


def get_db() -> Generator[Session, None, None]:
    db = get_session_local()()
    try:
        yield db
    finally:
        db.close()
