package com.digitalidentity.proofing.dto;

import com.digitalidentity.proofing.enums.DocumentType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ApplicationCreateRequest(
        @NotBlank(message = "applicantName is required")
        @Size(max = 150, message = "applicantName must be at most 150 characters")
        String applicantName,

        @NotBlank(message = "email is required")
        @Email(message = "email must be a valid email address")
        @Size(max = 150, message = "email must be at most 150 characters")
        String email,

        @NotBlank(message = "phoneNumber is required")
        @Pattern(regexp = "^\\+?[0-9 \\-]{7,15}$",
                message = "phoneNumber must be 7-15 digits (spaces and dashes allowed, optional leading +)")
        String phoneNumber,

        @NotNull(message = "documentType is required (PASSPORT, NATIONAL_ID, DRIVING_LICENSE, OTHER)")
        DocumentType documentType,

        @NotBlank(message = "documentReference is required")
        @Size(max = 100, message = "documentReference must be at most 100 characters")
        String documentReference) {
}
