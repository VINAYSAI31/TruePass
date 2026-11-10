package com.digitalidentity.proofing.dto;

import com.digitalidentity.proofing.enums.Role;
import com.digitalidentity.proofing.enums.VendorName;
import com.digitalidentity.proofing.exception.ApiException;

/**
 * The demo identity the backend remembers for one login.
 * DEMO ONLY - this is not real authentication.
 */
public record DemoSession(String sessionId, String username, Role role) {

    public boolean isInternal() {
        return role == Role.INTERNAL;
    }

    /** The vendor this session belongs to. Fails for the internal identity. */
    public VendorName vendorName() {
        return switch (role) {
            case VENDOR_A -> VendorName.VENDOR_A;
            case VENDOR_B -> VendorName.VENDOR_B;
            default -> throw ApiException.forbidden("This operation is only available to vendor identities.");
        };
    }
}
