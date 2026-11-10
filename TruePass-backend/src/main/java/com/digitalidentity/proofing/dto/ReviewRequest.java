package com.digitalidentity.proofing.dto;

import com.digitalidentity.proofing.enums.ReviewDecision;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewRequest(
        @NotBlank(message = "reviewerName is required")
        @Size(max = 100, message = "reviewerName must be at most 100 characters")
        String reviewerName,

        @NotNull(message = "decision is required (APPROVE, REJECT or RETRY)")
        ReviewDecision decision,

        @NotBlank(message = "reasonCode is required")
        @Size(max = 50, message = "reasonCode must be at most 50 characters")
        String reasonCode,

        @Size(max = 800, message = "comments must be at most 800 characters")
        String comments) {
}
