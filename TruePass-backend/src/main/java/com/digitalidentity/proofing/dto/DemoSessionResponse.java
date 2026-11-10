package com.digitalidentity.proofing.dto;

import com.digitalidentity.proofing.enums.Role;

/** Returned by the demo login. Send sessionId in the X-Demo-Session header on later calls. */
public record DemoSessionResponse(
        String sessionId,
        String username,
        Role role,
        String vendorId,
        String note) {
}
