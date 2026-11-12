"""Logging setup for the ETL.

One call to `setup_logging()` at the start of main.py configures everything.
Every module then uses `get_logger(__name__)`.
"""

from __future__ import annotations

import logging
import os
import sys
from datetime import datetime, timezone

_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)-18s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_configured = False


def setup_logging(log_dir: str = "logs", level: str = "INFO") -> str:
    """Configure console + file logging. Returns the log file path."""
    global _configured

    os.makedirs(log_dir, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_path = os.path.join(log_dir, f"etl_{stamp}.log")

    root = logging.getLogger()
    root.setLevel(getattr(logging, level, logging.INFO))

    # Avoid duplicate handlers if setup_logging is called twice (e.g. in tests).
    for handler in list(root.handlers):
        root.removeHandler(handler)

    formatter = logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT)

    console = logging.StreamHandler(stream=sys.stdout)
    console.setFormatter(formatter)
    root.addHandler(console)

    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    # These libraries are chatty at INFO and can echo connection details.
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("boto3").setLevel(logging.WARNING)
    logging.getLogger("s3transfer").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    _configured = True
    return log_path


def get_logger(name: str) -> logging.Logger:
    """Return a module-level logger."""
    return logging.getLogger(name)
