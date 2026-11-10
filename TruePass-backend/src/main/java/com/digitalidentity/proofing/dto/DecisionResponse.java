package com.digitalidentity.proofing.dto;

import com.digitalidentity.proofing.entity.VerificationDecision;
import com.digitalidentity.proofing.enums.ApplicationStatus;
import com.digitalidentity.proofing.enums.FinalDecision;
import com.digitalidentity.proofing.enums.VerificationStatus;

import java.time.LocalDateTime;

public record DecisionResponse(
        Long id,
        Long applicationId,
        String applicationReference,
        VerificationStatus vendorAStatus,
        VerificationStatus vendorBStatus,
        FinalDecision finalDecision,
        String decisionReason,
        ApplicationStatus applicationStatus,
        LocalDateTime evaluatedAt) {

    public static DecisionResponse from(VerificationDecision d) {
        return new DecisionResponse(d.getId(), d.getApplication().getId(),
                d.getApplication().getApplicationReference(), d.getVendorAStatus(), d.getVendorBStatus(),
                d.getFinalDecision(), d.getDecisionReason(), d.getApplication().getApplicationStatus(),
                d.getEvaluatedAt());
    }
}
