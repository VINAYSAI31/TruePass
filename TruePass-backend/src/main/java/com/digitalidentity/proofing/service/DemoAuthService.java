package com.digitalidentity.proofing.service;

import com.digitalidentity.proofing.dto.DemoLoginRequest;
import com.digitalidentity.proofing.dto.DemoSession;
import com.digitalidentity.proofing.dto.DemoSessionResponse;
import com.digitalidentity.proofing.enums.Role;
import com.digitalidentity.proofing.exception.ApiException;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * SIMULATED LOGIN FOR THE MVP - NOT REAL AUTHENTICATION.
 *
 * Passwords are hard-coded and compared in plain text, sessions are random ids kept in memory
 * (lost on restart), and there is no expiry, hashing, lockout or HTTPS enforcement.
 * Replace this with Spring Security before any real use.
 */
@Service
public class DemoAuthService {

    private static final String DEMO_NOTE =
            "Simulated demo session. Send sessionId in the X-Demo-Session header. Not real authentication.";

    private final Map<String, DemoSession> sessions = new ConcurrentHashMap<>();

    public DemoSessionResponse login(DemoLoginRequest request) {
        Role role = findRole(request.username(), request.password());
        if (role == null) {
            throw ApiException.unauthorized("Invalid demo username or password.");
        }

        String sessionId = UUID.randomUUID().toString();
        DemoSession session = new DemoSession(sessionId, request.username(), role);
        sessions.put(sessionId, session);

        String vendorId = role == Role.INTERNAL ? null : role.name();
        return new DemoSessionResponse(sessionId, session.username(), role, vendorId, DEMO_NOTE);
    }

    /** Returns the session for this id, or null if unknown. */
    public DemoSession findSession(String sessionId) {
        if (sessionId == null) {
            return null;
        }
        return sessions.get(sessionId);
    }

    private Role findRole(String username, String password) {
        if ("admin".equals(username) && "admin123".equals(password)) {
            return Role.INTERNAL;
        }
        if ("vendor_a".equals(username) && "vendor123".equals(password)) {
            return Role.VENDOR_A;
        }
        if ("vendor_b".equals(username) && "vendor123".equals(password)) {
            return Role.VENDOR_B;
        }
        return null;
    }
}
