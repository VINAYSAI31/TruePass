package com.digitalidentity.proofing.dto;

import com.digitalidentity.proofing.entity.Application;
import com.digitalidentity.proofing.enums.ApplicationStatus;
import com.digitalidentity.proofing.enums.DocumentType;

import java.time.LocalDateTime;

public record ApplicationResponse(
        Long id,
        String applicationReference,
        String applicantName,
        String email,
        String phoneNumber,
        DocumentType documentType,
        String documentReference,
        ApplicationStatus applicationStatus,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static ApplicationResponse from(Application a) {
        return new ApplicationResponse(a.getId(), a.getApplicationReference(), a.getApplicantName(),
                a.getEmail(), a.getPhoneNumber(), a.getDocumentType(), a.getDocumentReference(),
                a.getApplicationStatus(), a.getCreatedAt(), a.getUpdatedAt());
    }
}
