package com.digitalidentity.proofing.enums;

/**
 * Common (normalized) verification result.
 * Vendor A: VERIFIED / REJECTED / ERROR  -> VERIFIED / NOT_VERIFIED / ERROR
 * Vendor B: PASS / FAIL / ERROR          -> VERIFIED / NOT_VERIFIED / ERROR
 */
public enum VerificationStatus {
    VERIFIED,
    NOT_VERIFIED,
    ERROR
}
