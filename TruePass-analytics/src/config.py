"""Configuration loading for the TruePass analytics ETL.

All configuration comes from environment variables. For local development a
`.env` file is loaded automatically (see `.env.example`). Nothing is hardcoded
and no secret is ever logged.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

# Load .env if present. On EC2/Docker the real environment wins because
# load_dotenv() does not override variables that are already set.
load_dotenv(override=False)


class ConfigError(RuntimeError):
    """Raised when required configuration is missing or invalid."""


def _require(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ConfigError(
            f"Required environment variable {name} is not set. "
            f"Copy .env.example to .env and fill it in."
        )
    return value


def _optional(name: str, default: str) -> str:
    value = os.getenv(name, "").strip()
    return value or default


def _as_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    if raw in {"1", "true", "yes", "y", "on"}:
        return True
    if raw in {"0", "false", "no", "n", "off"}:
        return False
    raise ConfigError(f"{name} must be a boolean-like value, got {raw!r}")


def _as_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ConfigError(f"{name} must be an integer, got {raw!r}") from exc


@dataclass(frozen=True)
class Config:
    """Immutable runtime configuration."""

    db_host: str
    db_port: int
    db_name: str
    db_username: str
    db_password: str = field(repr=False)  # keep the password out of repr()

    aws_region: str
    s3_bucket_name: str
    s3_base_prefix: str

    output_dir: str
    log_dir: str
    log_level: str
    upload_to_s3: bool

    @property
    def database_url(self) -> str:
        """SQLAlchemy URL. Never log this - it contains the password."""
        from urllib.parse import quote_plus

        user = quote_plus(self.db_username)
        password = quote_plus(self.db_password)
        return (
            f"postgresql+psycopg2://{user}:{password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def safe_database_target(self) -> str:
        """A log-safe description of the database target (no credentials)."""
        return f"{self.db_host}:{self.db_port}/{self.db_name}"


def load_config() -> Config:
    """Build a Config from the environment, validating as we go."""
    upload_to_s3 = _as_bool("UPLOAD_TO_S3", True)

    config = Config(
        db_host=_require("DB_HOST"),
        db_port=_as_int("DB_PORT", 5432),
        db_name=_require("DB_NAME"),
        db_username=_require("DB_USERNAME"),
        db_password=_require("DB_PASSWORD"),
        aws_region=_optional("AWS_REGION", "ap-south-1"),
        # Only required when we actually intend to upload.
        s3_bucket_name=(
            _require("S3_BUCKET_NAME") if upload_to_s3 else _optional("S3_BUCKET_NAME", "")
        ),
        s3_base_prefix=_optional("S3_BASE_PREFIX", "truepass-analytics"),
        output_dir=_optional("OUTPUT_DIR", "output"),
        log_dir=_optional("LOG_DIR", "logs"),
        log_level=_optional("LOG_LEVEL", "INFO").upper(),
        upload_to_s3=upload_to_s3,
    )
    return config
