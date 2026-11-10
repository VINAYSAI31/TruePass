package com.digitalidentity.proofing.controller;

import com.digitalidentity.proofing.dto.DemoLoginRequest;
import com.digitalidentity.proofing.dto.DemoSessionResponse;
import com.digitalidentity.proofing.service.DemoAuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final DemoAuthService demoAuthService;

    public AuthController(DemoAuthService demoAuthService) {
        this.demoAuthService = demoAuthService;
    }

    /** Simulated login for the MVP. Not real authentication. */
    @PostMapping("/demo-login")
    public DemoSessionResponse demoLogin(@Valid @RequestBody DemoLoginRequest request) {
        return demoAuthService.login(request);
    }
}
