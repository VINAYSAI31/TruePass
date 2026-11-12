"""Unit tests for the transformation layer.

These run entirely on mock DataFrames - no PostgreSQL, no AWS.
"""

from __future__ import annotations

import pandas as pd
import pytest

from src.transform import (
    SCHEMAS,
    TransformError,
    empty_dataset,
    normalize_column_names,
    to_iso_utc,
    transform_all,
    transform_dataset,
    validate_columns,
)


# --------------------------------------------------------------------------
# Mock data
# --------------------------------------------------------------------------
def mock_applications() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "application_id": [2, 1, 3],
            "application_reference": ["  APP-002 ", "APP-001", None],
            "application_status": ["APPROVED", "PENDING", "REJECTED"],
            "document_type": ["PASSPORT", None, "PAN"],
            "created_at": [
                "2026-01-02 10:30:00",
                "2026-01-01 09:00:00",
                "2026-01-03 11:15:00",
            ],
            "updated_at": ["2026-01-05 10:30:00", None, "not-a-date"],
        }
    )


def mock_vendor_responses() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "response_id": [10, 11, 10],  # 10 is duplicated
            "application_id": [1, 2, 1],
            "vendor_name": ["VendorA", "VendorB", "VendorA"],
            "verification_status": ["VERIFIED", "FAILED", "VERIFIED"],
            "confidence_score": [0.987654, None, 0.987654],
            "submitted_at": ["2026-01-01 09:05:00", "2026-01-02 10:35:00", "2026-01-01 09:05:00"],
            "response_status": ["COMPLETED", "COMPLETED", "COMPLETED"],
        }
    )


# --------------------------------------------------------------------------
# Column normalisation and validation
# --------------------------------------------------------------------------
def test_normalize_column_names():
    frame = pd.DataFrame({"  Application ID ": [1], "Created-At": ["x"], "STATUS": ["y"]})
    result = normalize_column_names(frame)
    assert list(result.columns) == ["application_id", "created_at", "status"]


def test_validate_columns_accepts_exact_schema():
    frame = empty_dataset("audit_logs")
    validate_columns(frame, "audit_logs")  # must not raise


def test_validate_columns_rejects_missing_column():
    frame = empty_dataset("audit_logs").drop(columns=["action"])
    with pytest.raises(TransformError, match="missing expected columns"):
        validate_columns(frame, "audit_logs")


def test_validate_columns_rejects_extra_column():
    frame = empty_dataset("audit_logs")
    frame["note"] = pd.Series(dtype="object")
    with pytest.raises(TransformError, match="unexpected columns"):
        validate_columns(frame, "audit_logs")


def test_validate_columns_rejects_wrong_order():
    frame = empty_dataset("audit_logs")
    frame = frame[["action", "audit_id", "application_id", "created_at"]]
    with pytest.raises(TransformError, match="column order mismatch"):
        validate_columns(frame, "audit_logs")


def test_validate_columns_blocks_pii():
    frame = empty_dataset("audit_logs")
    frame["performed_by"] = pd.Series(dtype="object")
    with pytest.raises(TransformError, match="restricted columns"):
        validate_columns(frame, "audit_logs")


# --------------------------------------------------------------------------
# PII protection
# --------------------------------------------------------------------------
def test_pii_columns_are_dropped_by_transform():
    frame = mock_applications()
    frame["applicant_name"] = ["Alice", "Bob", "Carol"]
    frame["email"] = ["a@x.com", "b@x.com", "c@x.com"]
    frame["phone_number"] = ["111", "222", "333"]

    result = transform_dataset(frame, "applications")

    assert list(result.columns) == SCHEMAS["applications"]
    for column in ("applicant_name", "email", "phone_number"):
        assert column not in result.columns


# --------------------------------------------------------------------------
# NULL handling
# --------------------------------------------------------------------------
def test_null_text_becomes_empty_string():
    result = transform_dataset(mock_applications(), "applications")
    row = result.loc[result["application_id"] == 3].iloc[0]
    assert row["application_reference"] == ""


def test_null_timestamp_becomes_empty_string():
    result = transform_dataset(mock_applications(), "applications")
    row = result.loc[result["application_id"] == 1].iloc[0]
    assert row["updated_at"] == ""


def test_unparseable_timestamp_becomes_empty_string():
    result = transform_dataset(mock_applications(), "applications")
    row = result.loc[result["application_id"] == 3].iloc[0]
    assert row["updated_at"] == ""


def test_null_numeric_is_preserved_as_missing():
    result = transform_dataset(mock_vendor_responses(), "vendor_responses")
    row = result.loc[result["response_id"] == 11].iloc[0]
    assert pd.isna(row["confidence_score"])


def test_row_with_null_primary_key_is_dropped():
    frame = mock_applications()
    frame.loc[len(frame)] = [None, "APP-999", "PENDING", "PAN", "2026-01-04 10:00:00", None]
    result = transform_dataset(frame, "applications")
    assert len(result) == 3
    assert result["application_id"].notna().all()


# --------------------------------------------------------------------------
# Timestamps
# --------------------------------------------------------------------------
def test_timestamps_render_as_iso_utc():
    result = transform_dataset(mock_applications(), "applications")
    row = result.loc[result["application_id"] == 1].iloc[0]
    assert row["created_at"] == "2026-01-01T09:00:00Z"


def test_to_iso_utc_handles_mixed_input():
    series = pd.Series(["2026-03-01 00:00:00", None, "garbage", pd.Timestamp("2026-03-02 12:00:00")])
    result = to_iso_utc(series)
    assert result.tolist() == ["2026-03-01T00:00:00Z", "", "", "2026-03-02T12:00:00Z"]


# --------------------------------------------------------------------------
# De-duplication, ordering, text cleaning
# --------------------------------------------------------------------------
def test_duplicate_primary_keys_are_removed():
    result = transform_dataset(mock_vendor_responses(), "vendor_responses")
    assert len(result) == 2
    assert result["response_id"].is_unique


def test_rows_are_sorted_by_primary_key():
    result = transform_dataset(mock_applications(), "applications")
    assert result["application_id"].tolist() == [1, 2, 3]


def test_text_is_stripped():
    result = transform_dataset(mock_applications(), "applications")
    row = result.loc[result["application_id"] == 2].iloc[0]
    assert row["application_reference"] == "APP-002"


def test_valid_business_records_are_preserved():
    frame = mock_applications()
    result = transform_dataset(frame, "applications")
    assert len(result) == len(frame)


def test_confidence_score_is_rounded():
    result = transform_dataset(mock_vendor_responses(), "vendor_responses")
    row = result.loc[result["response_id"] == 10].iloc[0]
    assert row["confidence_score"] == 0.9877


# --------------------------------------------------------------------------
# Empty datasets
# --------------------------------------------------------------------------
@pytest.mark.parametrize("dataset", list(SCHEMAS))
def test_empty_input_returns_schema_only_frame(dataset):
    result = transform_dataset(pd.DataFrame(), dataset)
    assert result.empty
    assert list(result.columns) == SCHEMAS[dataset]


@pytest.mark.parametrize("dataset", list(SCHEMAS))
def test_empty_dataset_helper_matches_schema(dataset):
    assert list(empty_dataset(dataset).columns) == SCHEMAS[dataset]


def test_transform_all_handles_missing_dataset():
    result = transform_all({"applications": mock_applications()})
    assert set(result) == set(SCHEMAS)
    assert len(result["applications"]) == 3
    assert result["audit_logs"].empty


# --------------------------------------------------------------------------
# Missing source columns
# --------------------------------------------------------------------------
def test_missing_required_source_column_raises():
    frame = mock_applications().drop(columns=["application_status"])
    with pytest.raises(TransformError, match="missing required columns"):
        transform_dataset(frame, "applications")


def test_unknown_dataset_raises():
    with pytest.raises(KeyError):
        transform_dataset(pd.DataFrame(), "not_a_dataset")


# --------------------------------------------------------------------------
# Remaining datasets, end to end
# --------------------------------------------------------------------------
def test_final_decisions_schema():
    frame = pd.DataFrame(
        {
            "decision_id": [1],
            "application_id": [1],
            "final_decision": ["APPROVED"],
            "decision_reason": ["Both vendors verified"],
            "evaluated_at": ["2026-01-02 08:00:00"],
            "vendor_a_status": ["VERIFIED"],
            "vendor_b_status": ["VERIFIED"],
        }
    )
    result = transform_dataset(frame, "final_decisions")
    assert list(result.columns) == SCHEMAS["final_decisions"]
    assert result.iloc[0]["evaluated_at"] == "2026-01-02T08:00:00Z"


def test_manual_reviews_schema():
    frame = pd.DataFrame(
        {
            "exception_id": [1],
            "application_id": [3],
            "priority": ["HIGH"],
            "queue_status": ["OPEN"],
            "reason": ["Vendor mismatch"],
            "created_at": ["2026-01-03 12:00:00"],
            "resolved_at": [None],
        }
    )
    result = transform_dataset(frame, "manual_reviews")
    assert list(result.columns) == SCHEMAS["manual_reviews"]
    assert result.iloc[0]["resolved_at"] == ""
