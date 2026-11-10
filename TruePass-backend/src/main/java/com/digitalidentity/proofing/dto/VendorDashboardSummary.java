package com.digitalidentity.proofing.dto;

public record VendorDashboardSummary(
        long assignedApplications,
        long pendingApplications,
        long completedApplications) {
}
