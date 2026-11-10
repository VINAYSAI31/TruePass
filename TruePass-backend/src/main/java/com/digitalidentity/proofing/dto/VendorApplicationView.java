package com.digitalidentity.proofing.dto;

import com.digitalidentity.proofing.entity.Application;
import com.digitalidentity.proofing.enums.DocumentType;

import java.time.LocalDateTime;

/**
 * What a vendor may see about an application. It deliberately contains no decision,
 * no application status and nothing about the other vendor's response.
 */
public record VendorApplicationView(
        Long id,
        String applicationReference,
        String applicantName,
        String email,
        String phoneNumber,
        DocumentType documentType,
        String documentReference,
        LocalDateTime createdAt,
        boolean alreadySubmitted) {

    public static VendorApplicationView from(Application a, boolean alreadySubmitted) {
        return new VendorApplicationView(a.getId(), a.getApplicationReference(), a.getApplicantName(),
                a.getEmail(), a.getPhoneNumber(), a.getDocumentType(), a.getDocumentReference(),
                a.getCreatedAt(), alreadySubmitted);
    }
}
