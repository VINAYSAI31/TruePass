package com.digitalidentity.proofing.service;

import com.digitalidentity.proofing.dto.VendorResponseRequest;
import com.digitalidentity.proofing.enums.VendorName;
import com.digitalidentity.proofing.enums.VerificationStatus;
import com.digitalidentity.proofing.exception.ApiException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;

/**
 * Validates a vendor-specific request and converts it to the common format
 * (VerificationStatus + score on a 0-100 scale).
 *
 * The format that is expected depends on which vendor is logged in:
 *   Vendor A -> result + score (0-100)
 *   Vendor B -> verificationStatus + confidence (0-1)
 * Sending the other vendor's fields is rejected as a malformed response.
 */
@Component
public class VendorResponseNormalizer {

    /** The normalized outcome. score is null only when the vendor reported ERROR without a score. */
    public record NormalizedResult(VerificationStatus status, Double score) {
    }

    public NormalizedResult normalize(VendorName vendor, VendorResponseRequest request) {
        if (vendor == VendorName.VENDOR_A) {
            return normalizeVendorA(request);
        }
        return normalizeVendorB(request);
    }

    private NormalizedResult normalizeVendorA(VendorResponseRequest request) {
        if (request.verificationStatus() != null || request.confidence() != null) {
            throw ApiException.badRequest("Vendor A uses the fields 'result' and 'score'. "
                    + "Do not send 'verificationStatus' or 'confidence'.");
        }

        String result = clean(request.result());
        if (result == null) {
            throw ApiException.badRequest("Vendor A responses require 'result' (VERIFIED, REJECTED or ERROR).");
        }

        VerificationStatus status = switch (result) {
            case "VERIFIED" -> VerificationStatus.VERIFIED;
            case "REJECTED" -> VerificationStatus.NOT_VERIFIED;
            case "ERROR" -> VerificationStatus.ERROR;
            default -> throw ApiException.badRequest(
                    "Invalid Vendor A result '" + result + "'. Allowed values: VERIFIED, REJECTED, ERROR.");
        };

        Double score = request.score();
        if (score == null && status != VerificationStatus.ERROR) {
            throw ApiException.badRequest("Vendor A responses require 'score' (0-100) unless the result is ERROR.");
        }
        if (score != null && (score < 0 || score > 100)) {
            throw ApiException.badRequest("Vendor A 'score' must be between 0 and 100.");
        }
        return new NormalizedResult(status, score);
    }

    private NormalizedResult normalizeVendorB(VendorResponseRequest request) {
        if (request.result() != null || request.score() != null) {
            throw ApiException.badRequest("Vendor B uses the fields 'verificationStatus' and 'confidence'. "
                    + "Do not send 'result' or 'score'.");
        }

        String statusText = clean(request.verificationStatus());
        if (statusText == null) {
            throw ApiException.badRequest(
                    "Vendor B responses require 'verificationStatus' (PASS, FAIL or ERROR).");
        }

        VerificationStatus status = switch (statusText) {
            case "PASS" -> VerificationStatus.VERIFIED;
            case "FAIL" -> VerificationStatus.NOT_VERIFIED;
            case "ERROR" -> VerificationStatus.ERROR;
            default -> throw ApiException.badRequest(
                    "Invalid Vendor B verificationStatus '" + statusText + "'. Allowed values: PASS, FAIL, ERROR.");
        };

        Double confidence = request.confidence();
        if (confidence == null && status != VerificationStatus.ERROR) {
            throw ApiException.badRequest(
                    "Vendor B responses require 'confidence' (0.0-1.0) unless the status is ERROR.");
        }
        if (confidence == null) {
            return new NormalizedResult(status, null);
        }
        if (confidence < 0 || confidence > 1) {
            throw ApiException.badRequest("Vendor B 'confidence' must be between 0.0 and 1.0.");
        }
        return new NormalizedResult(status, toPercentage(confidence));
    }

    /** 0.91 -> 91.0 (BigDecimal avoids floating point surprises such as 0.57 * 100 = 56.99999). */
    private Double toPercentage(double confidence) {
        return BigDecimal.valueOf(confidence)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private String clean(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }
}
