package com.digitalidentity.proofing.dto;

/** Application + both vendor responses + current decision. Any part can be null if it does not exist yet. */
public record ComparisonResponse(
        ApplicationResponse application,
        VendorResponseView vendorA,
        VendorResponseView vendorB,
        DecisionResponse decision) {
}
