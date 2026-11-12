"""Export layer: validated DataFrames -> CSV files on local disk."""

from __future__ import annotations

import os
from typing import Dict

import pandas as pd

from src.logger import get_logger
from src.transform import SCHEMAS, validate_columns

logger = get_logger(__name__)

# dataset -> output file name
CSV_FILENAMES: Dict[str, str] = {
    "applications": "applications.csv",
    "vendor_responses": "vendor_responses.csv",
    "final_decisions": "final_decisions.csv",
    "manual_reviews": "manual_reviews.csv",
    "audit_logs": "audit_logs.csv",
}


def ensure_output_dir(output_dir: str) -> str:
    """Create the output directory if needed and return its path."""
    os.makedirs(output_dir, exist_ok=True)
    return output_dir


def export_dataset(frame: pd.DataFrame, dataset: str, output_dir: str) -> str:
    """Validate and write one dataset to CSV. Returns the file path.

    An empty dataset still produces a header-only CSV so downstream consumers
    (Snowflake external tables) always find a file with a stable schema.
    """
    if dataset not in CSV_FILENAMES:
        raise KeyError(f"Unknown dataset {dataset!r}")

    # Validate immediately before writing - the last gate before data leaves
    # the process.
    validate_columns(frame, dataset)

    ensure_output_dir(output_dir)
    path = os.path.join(output_dir, CSV_FILENAMES[dataset])

    frame.to_csv(
        path,
        index=False,
        columns=SCHEMAS[dataset],
        encoding="utf-8",
        lineterminator="\n",
        na_rep="",
    )

    logger.info("Exported   %-17s %6d rows -> %s", dataset, len(frame), path)
    return path


def export_all(frames: Dict[str, pd.DataFrame], output_dir: str) -> Dict[str, str]:
    """Export every dataset. Returns dataset -> written file path."""
    paths: Dict[str, str] = {}
    for dataset in SCHEMAS:
        frame = frames[dataset]
        paths[dataset] = export_dataset(frame, dataset, output_dir)
    logger.info("Export complete: %d CSV file(s) in %s", len(paths), output_dir)
    return paths
