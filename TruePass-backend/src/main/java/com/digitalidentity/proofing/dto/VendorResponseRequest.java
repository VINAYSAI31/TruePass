package com.digitalidentity.proofing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * One request class for both vendor formats.
 *
 * Vendor A sends:  result (VERIFIED / REJECTED / ERROR) and score (0-100).
 * Vendor B sends:  verificationStatus (PASS / FAIL / ERROR) and confidence (0.0-1.0).
 *
 * Which format is expected is decided by the logged-in demo vendor, not by this body.
 * The detailed per-vendor checks live in VendorResponseNormalizer.
 */
public record VendorResponseRequest(
        @NotNull(message = "applicationId is required")
        Long applicationId,

        @NotBlank(message = "vendorReference is required")
        @Size(max = 50, message = "vendorReference must be at most 50 characters")
        String vendorReference,

        // Vendor A fields
        String result,
        Double score,

        // Vendor B fields
        String verificationStatus,
        Double confidence,

        @Size(max = 500, message = "remarks must be at most 500 characters")
        String remarks) {
}
