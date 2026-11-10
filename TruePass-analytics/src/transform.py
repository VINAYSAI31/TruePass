"""Transformation layer.

Every function here is pure: DataFrame in, DataFrame out. No database, no
filesystem, no AWS. That is what makes this module unit-testable without any
infrastructure.

Rules applied to each dataset
-----------------------------
* Column names normalised (lowercase, stripped, spaces/dashes -> underscore).
* Any column that is not part of the published schema is dropped - a defence in
  depth against a PII column ever reaching a CSV.
* Timestamps parsed and rendered as ISO 8601 UTC ("2026-11-10T13:05:00Z").
  Naive timestamps are assumed to already be UTC.
* Text columns stripped; NULL/NaN becomes an empty string.
* Numeric columns coerced; unparseable values become NULL (empty in CSV).
* Duplicate primary keys removed, keeping the first occurrence.
* Rows with a missing primary key are dropped (they are not valid business
  records and cannot be joined downstream).
* Empty input returns an empty DataFrame with the correct columns - never a
  crash.
"""

from __future__ import annotations

import re
from typing import Dict, List

import numpy as np
import pandas as pd

from src.logger import get_logger

logger = get_logger(__name__)

ISO_FORMAT = "%Y-%m-%dT%H:%M:%SZ"

# Published schema per dataset, in CSV column order.
SCHEMAS: Dict[str, List[str]] = {
    "applications": [
        "application_id",
        "application_reference",
        "application_status",
        "document_type",
        "created_at",
        "updated_at",
    ],
    "vendor_responses": [
        "response_id",
        "application_id",
        "vendor_name",
        "verification_status",
        "confidence_score",
        "submitted_at",
        "response_status",
    ],
    "final_decisions": [
        "decision_id",
        "application_id",
        "final_decision",
        "decision_reason",
        "evaluated_at",
        "vendor_a_status",
        "vendor_b_status",
    ],
    "manual_reviews": [
        "exception_id",
        "application_id",
        "priority",
        "queue_status",
        "reason",
        "created_at",
        "resolved_at",
    ],
    "audit_logs": [
        "audit_id",
        "application_id",
        "action",
        "created_at",
    ],
}

# Primary key used for de-duplication and validity checks.
PRIMARY_KEYS: Dict[str, str] = {
    "applications": "application_id",
    "vendor_responses": "response_id",
    "final_decisions": "decision_id",
    "manual_reviews": "exception_id",
    "audit_logs": "audit_id",
}

TIMESTAMP_COLUMNS: Dict[str, List[str]] = {
    "applications": ["created_at", "updated_at"],
    "vendor_responses": ["submitted_at"],
    "final_decisions": ["evaluated_at"],
    "manual_reviews": ["created_at", "resolved_at"],
    "audit_logs": ["created_at"],
}

# Integer-like identifier columns per dataset.
INTEGER_COLUMNS: Dict[str, List[str]] = {
    "applications": ["application_id"],
    "vendor_responses": ["response_id", "application_id"],
    "final_decisions": ["decision_id", "application_id"],
    "manual_reviews": ["exception_id", "application_id"],
    "audit_logs": ["audit_id", "application_id"],
}

FLOAT_COLUMNS: Dict[str, List[str]] = {
    "vendor_responses": ["confidence_score"],
}

# Columns that must never be exported, whatever the source query returns.
FORBIDDEN_COLUMNS = {
    "applicant_name",
    "email",
    "phone_number",
    "document_reference",
    "reviewer_name",
    "reviewer_comments",
    "description",
    "performed_by",
    "vendor_reference",
    "remarks",
}


class TransformError(ValueError):
    """Raised when a dataset cannot be transformed into its published schema."""


def normalize_column_names(frame: pd.DataFrame) -> pd.DataFrame:
    """Lowercase, strip and underscore-ify column names."""
    renamed = {}
    for column in frame.columns:
        clean = str(column).strip().lower()
        clean = re.sub(r"[\s\-]+", "_", clean)
        clean = re.sub(r"__+", "_", clean)
        renamed[column] = clean
    return frame.rename(columns=renamed)


def to_iso_utc(series: pd.Series) -> pd.Series:
    """Parse a timestamp column and render it as ISO 8601 UTC strings.

    Unparseable or NULL values become an empty string so the CSV cell is blank
    rather than the literal text "NaT".
    """
    parsed = pd.to_datetime(series, errors="coerce", utc=True)
    rendered = parsed.dt.strftime(ISO_FORMAT)
    return rendered.where(parsed.notna(), "")


def clean_text(series: pd.Series) -> pd.Series:
    """Strip whitespace and turn NULL/NaN into an empty string."""
    cleaned = series.astype("object").where(series.notna(), "")
    cleaned = cleaned.map(lambda value: str(value).strip() if value != "" else "")
    # Collapse the literal strings pandas sometimes produces for missing data.
    return cleaned.replace({"nan": "", "None": "", "NaT": "", "<NA>": ""})


def to_nullable_int(series: pd.Series) -> pd.Series:
    """Coerce to a nullable integer so IDs never render as 12.0 in the CSV."""
    numeric = pd.to_numeric(series, errors="coerce")
    return numeric.round().astype("Int64")


def to_float(series: pd.Series, decimals: int = 4) -> pd.Series:
    """Coerce to float, rounding for stable output."""
    numeric = pd.to_numeric(series, errors="coerce")
    return numeric.astype("float64").round(decimals)


def empty_dataset(dataset: str) -> pd.DataFrame:
    """An empty DataFrame carrying the published schema for `dataset`."""
    return pd.DataFrame({column: pd.Series(dtype="object") for column in SCHEMAS[dataset]})


def validate_columns(frame: pd.DataFrame, dataset: str) -> None:
    """Assert the frame matches the published schema exactly, in order."""
    expected = SCHEMAS[dataset]
    actual = list(frame.columns)

    leaked = FORBIDDEN_COLUMNS.intersection(actual)
    if leaked:
        raise TransformError(
            f"{dataset}: refusing to export restricted columns {sorted(leaked)}"
        )

    missing = [column for column in expected if column not in actual]
    if missing:
        raise TransformError(f"{dataset}: missing expected columns {missing}")

    unexpected = [column for column in actual if column not in expected]
    if unexpected:
        raise TransformError(f"{dataset}: unexpected columns {unexpected}")

    if actual != expected:
        raise TransformError(
            f"{dataset}: column order mismatch. Expected {expected}, got {actual}"
        )


def transform_dataset(frame: pd.DataFrame, dataset: str) -> pd.DataFrame:
    """Clean and shape one raw dataset into its published form."""
    if dataset not in SCHEMAS:
        raise KeyError(f"Unknown dataset {dataset!r}")

    rows_in = len(frame)

    if frame is None or frame.empty:
        logger.warning("Transform %-17s source is empty - emitting header-only dataset", dataset)
        result = empty_dataset(dataset)
        validate_columns(result, dataset)
        return result

    work = normalize_column_names(frame.copy())

    # Drop anything outside the published schema (incl. any PII that somehow
    # arrived) before doing further work.
    schema = SCHEMAS[dataset]
    extra = [column for column in work.columns if column not in schema]
    if extra:
        logger.info("Transform %-17s dropping non-published columns %s", dataset, extra)
        work = work.drop(columns=extra)

    missing = [column for column in schema if column not in work.columns]
    if missing:
        raise TransformError(
            f"{dataset}: source data is missing required columns {missing}"
        )

    # Typed cleaning, column group by column group.
    for column in INTEGER_COLUMNS.get(dataset, []):
        work[column] = to_nullable_int(work[column])

    for column in FLOAT_COLUMNS.get(dataset, []):
        work[column] = to_float(work[column])

    for column in TIMESTAMP_COLUMNS.get(dataset, []):
        work[column] = to_iso_utc(work[column])

    typed = set(INTEGER_COLUMNS.get(dataset, []))
    typed |= set(FLOAT_COLUMNS.get(dataset, []))
    typed |= set(TIMESTAMP_COLUMNS.get(dataset, []))
    for column in schema:
        if column not in typed:
            work[column] = clean_text(work[column])

    # Drop records that cannot be identified downstream.
    primary_key = PRIMARY_KEYS[dataset]
    invalid = work[primary_key].isna()
    if invalid.any():
        logger.warning(
            "Transform %-17s dropping %d row(s) with a NULL %s",
            dataset,
            int(invalid.sum()),
            primary_key,
        )
        work = work.loc[~invalid]

    # De-duplicate on the primary key, keeping the first occurrence.
    duplicates = work.duplicated(subset=[primary_key], keep="first")
    if duplicates.any():
        logger.warning(
            "Transform %-17s removing %d duplicate %s value(s)",
            dataset,
            int(duplicates.sum()),
            primary_key,
        )
        work = work.loc[~duplicates]

    work = work[schema].sort_values(by=primary_key).reset_index(drop=True)
    work = work.replace({np.nan: pd.NA})

    validate_columns(work, dataset)
    logger.info(
        "Transformed %-17s %6d rows in -> %6d rows out", dataset, rows_in, len(work)
    )
    return work


def transform_all(frames: Dict[str, pd.DataFrame]) -> Dict[str, pd.DataFrame]:
    """Transform every extracted dataset."""
    transformed: Dict[str, pd.DataFrame] = {}
    for dataset in SCHEMAS:
        raw = frames.get(dataset)
        if raw is None:
            logger.warning("Transform %-17s was not extracted - treating as empty", dataset)
            raw = pd.DataFrame()
        transformed[dataset] = transform_dataset(raw, dataset)
    logger.info("Transformation complete for %d datasets", len(transformed))
    return transformed
