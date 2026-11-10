package com.digitalidentity.proofing.dto;

public record DashboardSummary(
        long totalApplications,
        long passedApplications,
        long rejectedApplications,
        long manualReviewApplications,
        long waitingApplications,
        long retryApplications) {
}
