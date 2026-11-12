"""Unit tests for the export layer and the S3 key layout.

CSVs are written to pytest's tmp_path. The S3 client is mocked, so no AWS
account or credentials are needed.
"""

from __future__ import annotations

import csv
import os

import pandas as pd
import pytest

from src.export import CSV_FILENAMES, export_all, export_dataset
from src.s3_upload import S3UploadError, build_s3_key, upload_files
from src.transform import SCHEMAS, TransformError, empty_dataset, transform_dataset


def sample_audit_logs() -> pd.DataFrame:
    frame = pd.DataFrame(
        {
            "audit_id": [2, 1],
            "application_id": [1, 1],
            "action": ["DECISION_RECORDED", "APPLICATION_CREATED"],
            "created_at": ["2026-01-02 08:00:00", "2026-01-01 09:00:00"],
        }
    )
    return transform_dataset(frame, "audit_logs")


# --------------------------------------------------------------------------
# CSV generation
# --------------------------------------------------------------------------
def test_export_dataset_writes_file(tmp_path):
    path = export_dataset(sample_audit_logs(), "audit_logs", str(tmp_path))
    assert os.path.isfile(path)
    assert os.path.basename(path) == "audit_logs.csv"


def test_exported_header_matches_schema(tmp_path):
    path = export_dataset(sample_audit_logs(), "audit_logs", str(tmp_path))
    with open(path, newline="", encoding="utf-8") as handle:
        header = next(csv.reader(handle))
    assert header == SCHEMAS["audit_logs"]


def test_exported_rows_round_trip(tmp_path):
    path = export_dataset(sample_audit_logs(), "audit_logs", str(tmp_path))
    reloaded = pd.read_csv(path)
    assert len(reloaded) == 2
    assert reloaded["audit_id"].tolist() == [1, 2]
    assert reloaded["created_at"].iloc[0] == "2026-01-01T09:00:00Z"


def test_integer_ids_have_no_decimal_point(tmp_path):
    path = export_dataset(sample_audit_logs(), "audit_logs", str(tmp_path))
    text = open(path, encoding="utf-8").read()
    assert "1.0" not in text
    assert "2.0" not in text


def test_missing_values_are_blank_cells(tmp_path):
    frame = transform_dataset(
        pd.DataFrame(
            {
                "exception_id": [1],
                "application_id": [None],
                "priority": [None],
                "queue_status": ["OPEN"],
                "reason": [None],
                "created_at": ["2026-01-03 12:00:00"],
                "resolved_at": [None],
            }
        ),
        "manual_reviews",
    )
    path = export_dataset(frame, "manual_reviews", str(tmp_path))
    rows = list(csv.reader(open(path, newline="", encoding="utf-8")))
    assert rows[1] == ["1", "", "", "OPEN", "", "2026-01-03T12:00:00Z", ""]


def test_output_directory_is_created(tmp_path):
    nested = tmp_path / "does" / "not" / "exist"
    path = export_dataset(sample_audit_logs(), "audit_logs", str(nested))
    assert os.path.isfile(path)


# --------------------------------------------------------------------------
# Empty datasets
# --------------------------------------------------------------------------
@pytest.mark.parametrize("dataset", list(SCHEMAS))
def test_empty_dataset_writes_header_only_csv(tmp_path, dataset):
    path = export_dataset(empty_dataset(dataset), dataset, str(tmp_path))
    rows = list(csv.reader(open(path, newline="", encoding="utf-8")))
    assert rows == [SCHEMAS[dataset]]


# --------------------------------------------------------------------------
# Validation gate
# --------------------------------------------------------------------------
def test_export_rejects_bad_schema(tmp_path):
    frame = empty_dataset("audit_logs").drop(columns=["action"])
    with pytest.raises(TransformError):
        export_dataset(frame, "audit_logs", str(tmp_path))


def test_export_rejects_pii_column(tmp_path):
    frame = empty_dataset("audit_logs")
    frame["description"] = pd.Series(dtype="object")
    with pytest.raises(TransformError, match="restricted columns"):
        export_dataset(frame, "audit_logs", str(tmp_path))


def test_export_unknown_dataset_raises(tmp_path):
    with pytest.raises(KeyError):
        export_dataset(pd.DataFrame(), "nope", str(tmp_path))


# --------------------------------------------------------------------------
# export_all
# --------------------------------------------------------------------------
def test_export_all_writes_five_files(tmp_path):
    frames = {dataset: empty_dataset(dataset) for dataset in SCHEMAS}
    frames["audit_logs"] = sample_audit_logs()

    paths = export_all(frames, str(tmp_path))

    assert set(paths) == set(SCHEMAS)
    written = sorted(os.listdir(tmp_path))
    assert written == sorted(CSV_FILENAMES.values())


# --------------------------------------------------------------------------
# S3 key layout
# --------------------------------------------------------------------------
def test_s3_key_layout():
    assert (
        build_s3_key("final_decisions", "final_decisions.csv")
        == "truepass-analytics/decisions/final_decisions.csv"
    )
    assert (
        build_s3_key("applications", "applications.csv")
        == "truepass-analytics/applications/applications.csv"
    )
    assert (
        build_s3_key("manual_reviews", "manual_reviews.csv", base_prefix="/custom/")
        == "custom/manual_reviews/manual_reviews.csv"
    )


def test_s3_key_unknown_dataset():
    with pytest.raises(KeyError):
        build_s3_key("nope", "nope.csv")


# --------------------------------------------------------------------------
# Upload, with a fake client
# --------------------------------------------------------------------------
class FakeS3Client:
    def __init__(self, fail_for: set[str] | None = None):
        self.calls: list[dict] = []
        self.fail_for = fail_for or set()

    def upload_file(self, Filename, Bucket, Key, ExtraArgs=None):  # noqa: N803
        if os.path.basename(Filename) in self.fail_for:
            raise OSError("simulated failure")
        self.calls.append({"Filename": Filename, "Bucket": Bucket, "Key": Key})


def test_upload_files_uses_expected_keys(tmp_path):
    frames = {dataset: empty_dataset(dataset) for dataset in SCHEMAS}
    paths = export_all(frames, str(tmp_path))
    client = FakeS3Client()

    uris = upload_files(paths, "my-bucket", "ap-south-1", client=client)

    assert len(client.calls) == 5
    assert uris["final_decisions"] == "s3://my-bucket/truepass-analytics/decisions/final_decisions.csv"
    assert all(call["Bucket"] == "my-bucket" for call in client.calls)


def test_upload_files_raises_on_failure(tmp_path):
    frames = {dataset: empty_dataset(dataset) for dataset in SCHEMAS}
    paths = export_all(frames, str(tmp_path))
    client = FakeS3Client(fail_for={"audit_logs.csv"})

    with pytest.raises(S3UploadError, match="1 of 5"):
        upload_files(paths, "my-bucket", "ap-south-1", client=client)

    # The other four were still attempted.
    assert len(client.calls) == 4


def test_upload_requires_bucket_name(tmp_path):
    with pytest.raises(S3UploadError, match="S3_BUCKET_NAME"):
        upload_files({}, "", "ap-south-1", client=FakeS3Client())
