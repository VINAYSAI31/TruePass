"""S3 upload layer.

Credentials are never passed in code. boto3 resolves them from the standard
chain, which means:
  * on EC2  -> the instance's IAM role
  * locally -> ~/.aws/credentials, AWS_PROFILE, or AWS_* environment variables
"""

from __future__ import annotations

import os
from typing import Dict

import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError

from src.logger import get_logger

logger = get_logger(__name__)

# dataset -> S3 sub-folder under the base prefix
S3_FOLDERS: Dict[str, str] = {
    "applications": "applications",
    "vendor_responses": "vendor_responses",
    "final_decisions": "decisions",
    "manual_reviews": "manual_reviews",
    "audit_logs": "audit_logs",
}


class S3UploadError(RuntimeError):
    """Raised when one or more uploads fail."""


def build_s3_key(dataset: str, filename: str, base_prefix: str = "truepass-analytics") -> str:
    """Build the destination key, e.g. truepass-analytics/decisions/final_decisions.csv."""
    if dataset not in S3_FOLDERS:
        raise KeyError(f"Unknown dataset {dataset!r}")
    prefix = base_prefix.strip("/")
    folder = S3_FOLDERS[dataset]
    return f"{prefix}/{folder}/{filename}"


def create_s3_client(region_name: str):
    """Create a boto3 S3 client using the ambient credential chain."""
    return boto3.client("s3", region_name=region_name)


def upload_files(
    paths: Dict[str, str],
    bucket_name: str,
    region_name: str,
    base_prefix: str = "truepass-analytics",
    client=None,
) -> Dict[str, str]:
    """Upload each local CSV to S3. Returns dataset -> s3://... URI.

    All uploads are attempted; failures are collected and raised together so a
    single bad object does not hide the state of the rest.
    """
    if not bucket_name:
        raise S3UploadError("S3_BUCKET_NAME is not configured")

    s3 = client or create_s3_client(region_name)
    uploaded: Dict[str, str] = {}
    failures: Dict[str, str] = {}

    for dataset, local_path in paths.items():
        filename = os.path.basename(local_path)
        key = build_s3_key(dataset, filename, base_prefix)
        try:
            s3.upload_file(
                Filename=local_path,
                Bucket=bucket_name,
                Key=key,
                ExtraArgs={"ContentType": "text/csv"},
            )
        except (ClientError, BotoCoreError, NoCredentialsError, OSError) as exc:
            # Log the error type and message, never the credentials.
            logger.error("Upload failed %-17s -> s3://%s/%s : %s", dataset, bucket_name, key, exc)
            failures[dataset] = str(exc)
        else:
            uri = f"s3://{bucket_name}/{key}"
            uploaded[dataset] = uri
            logger.info("Uploaded   %-17s -> %s", dataset, uri)

    if failures:
        raise S3UploadError(
            f"{len(failures)} of {len(paths)} upload(s) failed: {sorted(failures)}"
        )

    logger.info("S3 upload complete: %d object(s) to bucket %s", len(uploaded), bucket_name)
    return uploaded
