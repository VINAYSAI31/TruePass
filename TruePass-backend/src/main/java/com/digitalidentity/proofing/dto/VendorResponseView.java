package com.digitalidentity.proofing.dto;

import com.digitalidentity.proofing.entity.VendorResponse;
import com.digitalidentity.proofing.enums.ResponseStatus;
import com.digitalidentity.proofing.enums.VendorName;
import com.digitalidentity.proofing.enums.VerificationStatus;

import java.time.LocalDateTime;

public record VendorResponseView(
        Long id,
        Long applicationId,
        String applicationReference,
        VendorName vendorName,
        String vendorReference,
        VerificationStatus verificationStatus,
        Double confidenceScore,
        String remarks,
        ResponseStatus responseStatus,
        LocalDateTime submittedAt) {

    public static VendorResponseView from(VendorResponse r) {
        return new VendorResponseView(r.getId(), r.getApplication().getId(),
                r.getApplication().getApplicationReference(), r.getVendorName(), r.getVendorReference(),
                r.getVerificationStatus(), r.getConfidenceScore(), r.getRemarks(),
                r.getResponseStatus(), r.getSubmittedAt());
    }
}
