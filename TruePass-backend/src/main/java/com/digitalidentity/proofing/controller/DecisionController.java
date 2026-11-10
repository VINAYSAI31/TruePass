package com.digitalidentity.proofing.controller;

import com.digitalidentity.proofing.config.DemoSessionInterceptor;
import com.digitalidentity.proofing.dto.DecisionResponse;
import com.digitalidentity.proofing.service.DecisionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/decisions")
public class DecisionController {

    private final DecisionService decisionService;

    public DecisionController(DecisionService decisionService) {
        this.decisionService = decisionService;
    }

    @PostMapping("/evaluate/{applicationId}")
    public DecisionResponse evaluate(@PathVariable Long applicationId, HttpServletRequest request) {
        String username = DemoSessionInterceptor.getSession(request).username();
        return decisionService.evaluate(applicationId, username);
    }
}
