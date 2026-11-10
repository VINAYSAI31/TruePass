"""Extraction layer: read-only SELECT queries against the TruePass database.

Design notes
------------
1. Every query selects ONLY the columns needed for analytics. Personally
   identifiable fields (applicant_name, email, phone_number,
   document_reference, reviewer_name, reviewer_comments, performed_by,
   audit_logs.description, vendor_reference, remarks) are never selected, so
   they never enter this process at all.
2. Column aliasing to the analytics names (id -> application_id,
   vendorastatus -> vendor_a_status) happens here in SQL.
3. Queries are static SELECT statements with no user input. Where a runtime
   value is needed (the row limit) it is bound as a SQL parameter rather than
   formatted into the string.
"""

from __future__ import annotations

from typing import Dict

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from src.database import read_only_connection
from src.logger import get_logger

logger = get_logger(__name__)

# dataset key -> (source table, SQL)
QUERIES: Dict[str, str] = {
    "applications": """
        SELECT
            id                  AS application_id,
            application_reference,
            application_status,
            document_type,
            created_at,
            updated_at
        FROM applications
        ORDER BY id
    """,
    "vendor_responses": """
        SELECT
            id                  AS response_id,
            application_id,
            vendor_name,
            verification_status,
            confidence_score,
            submitted_at,
            response_status
        FROM vendor_responses
        ORDER BY id
    """,
    "final_decisions": """
        SELECT
            id                  AS decision_id,
            application_id,
            final_decision,
            decision_reason,
            evaluated_at,
            vendorastatus       AS vendor_a_status,
            vendorbstatus       AS vendor_b_status
        FROM verification_decisions
        ORDER BY id
    """,
    "manual_reviews": """
        SELECT
            id                  AS exception_id,
            application_id,
            priority,
            queue_status,
            reason,
            created_at,
            resolved_at
        FROM exception_queue
        ORDER BY id
    """,
    "audit_logs": """
        SELECT
            id                  AS audit_id,
            application_id,
            action,
            created_at
        FROM audit_logs
        ORDER BY id
    """,
}

SOURCE_TABLES: Dict[str, str] = {
    "applications": "applications",
    "vendor_responses": "vendor_responses",
    "final_decisions": "verification_decisions",
    "manual_reviews": "exception_queue",
    "audit_logs": "audit_logs",
}


def extract_dataset(engine: Engine, dataset: str) -> pd.DataFrame:
    """Extract a single dataset into a DataFrame."""
    if dataset not in QUERIES:
        raise KeyError(f"Unknown dataset {dataset!r}")

    sql = QUERIES[dataset]
    source = SOURCE_TABLES[dataset]
    logger.info("Extracting %-17s from table %s", dataset, source)

    with read_only_connection(engine) as conn:
        frame = pd.read_sql_query(text(sql), conn)

    logger.info("Extracted  %-17s %6d rows", dataset, len(frame))
    return frame


def extract_all(engine: Engine) -> Dict[str, pd.DataFrame]:
    """Extract all five datasets. Returns dataset name -> raw DataFrame."""
    frames: Dict[str, pd.DataFrame] = {}
    for dataset in QUERIES:
        frames[dataset] = extract_dataset(engine, dataset)
    total = sum(len(df) for df in frames.values())
    logger.info("Extraction complete: %d rows across %d datasets", total, len(frames))
    return frames
