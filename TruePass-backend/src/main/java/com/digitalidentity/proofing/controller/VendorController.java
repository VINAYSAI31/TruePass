package com.digitalidentity.proofing.controller;

import com.digitalidentity.proofing.config.DemoSessionInterceptor;
import com.digitalidentity.proofing.dto.DemoSession;
import com.digitalidentity.proofing.dto.VendorApplicationView;
import com.digitalidentity.proofing.dto.VendorDashboardSummary;
import com.digitalidentity.proofing.dto.VendorResponseRequest;
import com.digitalidentity.proofing.dto.VendorResponseView;
import com.digitalidentity.proofing.service.VendorService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Vendor portal. The vendor is always taken from the demo session stored by the interceptor,
 * never from the request body.
 */
@RestController
@RequestMapping("/api/vendor")
public class VendorController {

    private final VendorService vendorService;

    public VendorController(VendorService vendorService) {
        this.vendorService = vendorService;
    }

    @GetMapping("/applications")
    public List<VendorApplicationView> listApplications(HttpServletRequest request) {
        return vendorService.listApplications(currentSession(request).vendorName());
    }

    @GetMapping("/applications/{id}")
    public VendorApplicationView getApplication(@PathVariable Long id, HttpServletRequest request) {
        return vendorService.getApplication(id, currentSession(request).vendorName());
    }

    @PostMapping("/responses")
    @ResponseStatus(HttpStatus.CREATED)
    public VendorResponseView submitResponse(@Valid @RequestBody VendorResponseRequest body,
                                             HttpServletRequest request) {
        DemoSession session = currentSession(request);
        return vendorService.submitResponse(session.vendorName(), session.username(), body);
    }

    /** Correction of an already submitted response (see VendorService for the rule). */
    @PutMapping("/responses/{id}")
    public VendorResponseView correctResponse(@PathVariable Long id,
                                              @Valid @RequestBody VendorResponseRequest body,
                                              HttpServletRequest request) {
        DemoSession session = currentSession(request);
        return vendorService.correctResponse(session.vendorName(), session.username(), id, body);
    }

    @GetMapping("/responses")
    public List<VendorResponseView> listResponses(HttpServletRequest request) {
        return vendorService.listResponses(currentSession(request).vendorName());
    }

    @GetMapping("/dashboard/summary")
    public VendorDashboardSummary getDashboardSummary(HttpServletRequest request) {
        return vendorService.getDashboardSummary(currentSession(request).vendorName());
    }

    private DemoSession currentSession(HttpServletRequest request) {
        return DemoSessionInterceptor.getSession(request);
    }
}
