"""PostgreSQL connectivity via SQLAlchemy.

The engine is created once and passed to the extract layer. Connections are
always used through context managers so they are returned to the pool.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine

from src.config import Config
from src.logger import get_logger

logger = get_logger(__name__)


def create_db_engine(config: Config) -> Engine:
    """Create a SQLAlchemy engine for the TruePass database.

    `pool_pre_ping` makes the job resilient to stale connections, which matters
    when the container starts before PostgreSQL is fully ready.
    """
    logger.info("Creating database engine for %s", config.safe_database_target)
    engine = create_engine(
        config.database_url,
        pool_pre_ping=True,
        pool_size=2,
        max_overflow=0,
        connect_args={"application_name": "truepass-analytics-etl"},
        future=True,
    )
    return engine


def verify_connection(engine: Engine) -> str:
    """Run a trivial query to confirm the database is reachable.

    Returns the PostgreSQL server version string.
    """
    with engine.connect() as conn:
        version = conn.execute(text("SELECT version()")).scalar_one()
    logger.info("Database connection OK")
    logger.debug("Server version: %s", version)
    return str(version)


@contextmanager
def read_only_connection(engine: Engine) -> Iterator[Connection]:
    """Yield a connection pinned to a read-only transaction.

    This is a hard guarantee that the ETL cannot write to the source database:
    PostgreSQL rejects any INSERT/UPDATE/DELETE/DDL inside a read-only
    transaction, so a mistake fails loudly instead of mutating production data.
    """
    with engine.connect() as conn:
        conn.execute(text("SET TRANSACTION READ ONLY"))
        try:
            yield conn
        finally:
            # Nothing to commit - the transaction is read-only by construction.
            conn.rollback()


def dispose_engine(engine: Engine) -> None:
    """Close all pooled connections."""
    engine.dispose()
    logger.info("Database engine disposed")
