package com.digitalidentity.proofing.config;

import com.digitalidentity.proofing.dto.DemoSession;
import com.digitalidentity.proofing.exception.ApiException;
import com.digitalidentity.proofing.service.DemoAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Looks up the demo session from the X-Demo-Session header and enforces the portal split:
 *   /api/vendor/**  -> VENDOR_A or VENDOR_B only
 *   every other /api/** endpoint (except /api/auth/**) -> INTERNAL only
 *
 * DEMO ONLY. The header holds a random id issued by the demo login. This is not secure authentication.
 */
@Component
public class DemoSessionInterceptor implements HandlerInterceptor {

    public static final String SESSION_HEADER = "X-Demo-Session";
    private static final String SESSION_ATTRIBUTE = "demoSession";

    private final DemoAuthService demoAuthService;

    public DemoSessionInterceptor(DemoAuthService demoAuthService) {
        this.demoAuthService = demoAuthService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // Let CORS preflight requests through; they never carry custom headers.
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String sessionId = request.getHeader(SESSION_HEADER);
        if (sessionId == null || sessionId.isBlank()) {
            throw ApiException.unauthorized(
                    "Missing " + SESSION_HEADER + " header. Call POST /api/auth/demo-login first.");
        }

        DemoSession session = demoAuthService.findSession(sessionId.trim());
        if (session == null) {
            throw ApiException.unauthorized(
                    "Unknown demo session. Sessions are kept in memory and are lost when the server restarts; "
                            + "log in again.");
        }

        boolean vendorEndpoint = request.getRequestURI().startsWith("/api/vendor/");
        if (vendorEndpoint && session.isInternal()) {
            throw ApiException.forbidden("Vendor portal endpoints are only available to vendor identities.");
        }
        if (!vendorEndpoint && !session.isInternal()) {
            throw ApiException.forbidden("This endpoint is only available to the INTERNAL role.");
        }

        request.setAttribute(SESSION_ATTRIBUTE, session);
        return true;
    }

    /** Used by controllers to read the session that the interceptor stored on the request. */
    public static DemoSession getSession(HttpServletRequest request) {
        return (DemoSession) request.getAttribute(SESSION_ATTRIBUTE);
    }
}
