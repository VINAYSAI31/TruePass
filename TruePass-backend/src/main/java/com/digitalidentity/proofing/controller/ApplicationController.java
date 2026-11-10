package com.digitalidentity.proofing.controller;

import com.digitalidentity.proofing.config.DemoSessionInterceptor;
import com.digitalidentity.proofing.dto.ApplicationCreateRequest;
import com.digitalidentity.proofing.dto.ApplicationResponse;
import com.digitalidentity.proofing.dto.ComparisonResponse;
import com.digitalidentity.proofing.enums.ApplicationStatus;
import com.digitalidentity.proofing.service.ApplicationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Internal portal. The interceptor already ensures only the INTERNAL role gets here. */
@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApplicationResponse createApplication(@Valid @RequestBody ApplicationCreateRequest request,
                                                 HttpServletRequest httpRequest) {
        String username = DemoSessionInterceptor.getSession(httpRequest).username();
        return applicationService.createApplication(request, username);
    }

    @GetMapping
    public List<ApplicationResponse> listApplications(
            @RequestParam(required = false) ApplicationStatus status,
            @RequestParam(required = false) String search) {
        return applicationService.searchApplications(status, search);
    }

    @GetMapping("/{id}")
    public ApplicationResponse getApplication(@PathVariable Long id) {
        return applicationService.getApplication(id);
    }

    @GetMapping("/{id}/comparison")
    public ComparisonResponse getComparison(@PathVariable Long id) {
        return applicationService.getComparison(id);
    }
}
