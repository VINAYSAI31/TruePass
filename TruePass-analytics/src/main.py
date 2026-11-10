"""Entry point for the TruePass analytics ETL.

Runs exactly once:

    load config -> connect -> extract -> transform -> export -> upload -> exit

Exit codes
----------
0  every stage succeeded
1  a critical stage failed (see the log for the traceback)
"""

from __future__ import annotations

import sys
import time
from datetime import datetime, timezone
from typing import Dict

from src.config import Config, ConfigError, load_config
from src.database import create_db_engine, dispose_engine, verify_connection
from src.export import export_all
from src.extract import extract_all
from src.logger import get_logger, setup_logging
from src.s3_upload import S3UploadError, upload_files
from src.transform import SCHEMAS, transform_all

logger = get_logger(__name__)

EXIT_SUCCESS = 0
EXIT_FAILURE = 1


def _print_summary(
    extracted: Dict[str, int],
    exported: Dict[str, int],
    paths: Dict[str, str],
    uploads: Dict[str, str],
    duration: float,
    upload_enabled: bool,
) -> None:
    """Print a human-readable execution summary to the log."""
    logger.info("=" * 78)
    logger.info("EXECUTION SUMMARY")
    logger.info("=" * 78)
    logger.info("%-18s %10s %10s  %s", "DATASET", "EXTRACTED", "EXPORTED", "DESTINATION")
    for dataset in SCHEMAS:
        destination = uploads.get(dataset) or paths.get(dataset, "-")
        logger.info(
            "%-18s %10d %10d  %s",
            dataset,
            extracted.get(dataset, 0),
            exported.get(dataset, 0),
            destination,
        )
    logger.info("-" * 78)
    logger.info(
        "Totals: %d row(s) extracted, %d row(s) exported, %d file(s) written",
        sum(extracted.values()),
        sum(exported.values()),
        len(paths),
    )
    if upload_enabled:
        logger.info("S3 objects uploaded: %d", len(uploads))
    else:
        logger.info("S3 upload: SKIPPED (UPLOAD_TO_S3=false)")
    logger.info("Total execution duration: %.2f seconds", duration)
    logger.info("=" * 78)


def run(config: Config) -> int:
    """Execute the ETL. Returns the process exit code."""
    started_at = datetime.now(timezone.utc)
    started_monotonic = time.monotonic()

    logger.info("TruePass analytics ETL starting at %s", started_at.isoformat())
    logger.info("Database target: %s", config.safe_database_target)
    logger.info("Output directory: %s", config.output_dir)
    logger.info(
        "S3 destination: %s",
        f"s3://{config.s3_bucket_name}/{config.s3_base_prefix}/ in {config.aws_region}"
        if config.upload_to_s3
        else "disabled",
    )

    engine = None
    try:
        # 1. Connect
        engine = create_db_engine(config)
        verify_connection(engine)

        # 2. Extract
        raw_frames = extract_all(engine)
        extracted_counts = {name: len(frame) for name, frame in raw_frames.items()}

        # 3. Transform and validate
        clean_frames = transform_all(raw_frames)
        exported_counts = {name: len(frame) for name, frame in clean_frames.items()}

        # 4. Export CSVs
        paths = export_all(clean_frames, config.output_dir)

        # 5. Upload to S3
        uploads: Dict[str, str] = {}
        if config.upload_to_s3:
            uploads = upload_files(
                paths=paths,
                bucket_name=config.s3_bucket_name,
                region_name=config.aws_region,
                base_prefix=config.s3_base_prefix,
            )
        else:
            logger.warning("UPLOAD_TO_S3 is false - skipping the S3 upload stage")

        # 6. Summary
        duration = time.monotonic() - started_monotonic
        _print_summary(
            extracted_counts, exported_counts, paths, uploads, duration, config.upload_to_s3
        )
        logger.info("ETL finished successfully at %s", datetime.now(timezone.utc).isoformat())
        return EXIT_SUCCESS

    except S3UploadError as exc:
        logger.error("S3 upload stage failed: %s", exc, exc_info=True)
        return EXIT_FAILURE
    except Exception as exc:  # noqa: BLE001 - top-level guard, logged with traceback
        logger.error("ETL failed: %s", exc, exc_info=True)
        return EXIT_FAILURE
    finally:
        if engine is not None:
            dispose_engine(engine)
        logger.info(
            "Total elapsed: %.2f seconds", time.monotonic() - started_monotonic
        )


def main() -> int:
    """Load configuration, set up logging, and run the ETL once."""
    try:
        config = load_config()
    except ConfigError as exc:
        # Logging is not configured yet, so write to stderr directly.
        print(f"CONFIGURATION ERROR: {exc}", file=sys.stderr)
        return EXIT_FAILURE

    log_path = setup_logging(log_dir=config.log_dir, level=config.log_level)
    logger.info("Logging to %s", log_path)
    return run(config)


if __name__ == "__main__":
    sys.exit(main())
