package com.digitalidentity.proofing.service;

import com.digitalidentity.proofing.dto.VendorApplicationView;
import com.digitalidentity.proofing.dto.VendorDashboardSummary;
import com.digitalidentity.proofing.dto.VendorResponseRequest;
import com.digitalidentity.proofing.dto.VendorResponseView;
import com.digitalidentity.proofing.entity.Application;
import com.digitalidentity.proofing.entity.VendorResponse;
import com.digitalidentity.proofing.enums.ApplicationStatus;
import com.digitalidentity.proofing.enums.ResponseStatus;
import com.digitalidentity.proofing.enums.VendorName;
import com.digitalidentity.proofing.exception.ApiException;
import com.digitalidentity.proofing.repository.ApplicationRepository;
import com.digitalidentity.proofing.repository.VendorResponseRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Vendor portal. Every method receives the vendor taken from the backend's demo session,
 * never from the request body.
 *
 * Duplicate / correction rule:
 *  - POST creates the first response of a vendor for an application.
 *  - A second POST for the same application and vendor is rejected with 409 (accidental duplicate).
 *  - To correct a response the vendor uses PUT /api/vendor/responses/{id}. The row is updated in place,
 *    marked UPDATED, and is only allowed while the application is not already PASSED or REJECTED.
 *  - The database also enforces one row per (application, vendor).
 */
@Service
public class VendorService {

    private final ApplicationRepository applicationRepository;
    private final VendorResponseRepository vendorResponseRepository;
    private final VendorResponseNormalizer normalizer;
    private final AuditLogService auditLogService;

    public VendorService(ApplicationRepository applicationRepository,
                         VendorResponseRepository vendorResponseRepository,
                         VendorResponseNormalizer normalizer,
                         AuditLogService auditLogService) {
        this.applicationRepository = applicationRepository;
        this.vendorResponseRepository = vendorResponseRepository;
        this.normalizer = normalizer;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<VendorApplicationView> listApplications(VendorName vendor) {
        Set<Long> submittedApplicationIds = vendorResponseRepository
                .findByVendorNameOrderBySubmittedAtDesc(vendor).stream()
                .map(response -> response.getApplication().getId())
                .collect(Collectors.toSet());

        return applicationRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(application -> VendorApplicationView.from(
                        application, submittedApplicationIds.contains(application.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public VendorApplicationView getApplication(Long applicationId, VendorName vendor) {
        Application application = findApplication(applicationId);
        boolean submitted = vendorResponseRepository
                .findByApplicationIdAndVendorName(applicationId, vendor).isPresent();
        return VendorApplicationView.from(application, submitted);
    }

    @Transactional
    public VendorResponseView submitResponse(VendorName vendor, String username, VendorResponseRequest request) {
        Application application = findApplication(request.applicationId());

        VendorResponse existing = vendorResponseRepository
                .findByApplicationIdAndVendorName(application.getId(), vendor).orElse(null);
        if (existing != null) {
            throw ApiException.conflict(vendor + " has already submitted a response for application "
                    + application.getId() + " (response id " + existing.getId() + "). "
                    + "To correct it, call PUT /api/vendor/responses/" + existing.getId() + ".");
        }

        VendorResponseNormalizer.NormalizedResult result = normalizer.normalize(vendor, request);

        VendorResponse response = new VendorResponse();
        response.setApplication(application);
        response.setVendorName(vendor);
        response.setVendorReference(request.vendorReference().trim());
        response.setVerificationStatus(result.status());
        response.setConfidenceScore(result.score());
        response.setRemarks(request.remarks());
        response.setResponseStatus(ResponseStatus.SUBMITTED);
        response.setSubmittedAt(LocalDateTime.now());

        VendorResponse saved = vendorResponseRepository.save(response);
        auditLogService.record(application.getId(), "VENDOR_RESPONSE_SUBMITTED", username,
                vendor + " submitted " + saved.getVerificationStatus() + " (score " + saved.getConfidenceScore()
                        + ", reference " + saved.getVendorReference() + ")");
        return VendorResponseView.from(saved);
    }

    @Transactional
    public VendorResponseView correctResponse(VendorName vendor, String username,
                                              Long responseId, VendorResponseRequest request) {
        // A response that belongs to the other vendor is reported as "not found" so it is never exposed.
        VendorResponse response = vendorResponseRepository.findById(responseId)
                .filter(r -> r.getVendorName() == vendor)
                .orElseThrow(() -> ApiException.notFound("Response with id " + responseId + " was not found."));

        Application application = response.getApplication();
        if (!application.getId().equals(request.applicationId())) {
            throw ApiException.badRequest("applicationId " + request.applicationId()
                    + " does not match the application of response " + responseId + ".");
        }
        if (application.getApplicationStatus() == ApplicationStatus.PASSED
                || application.getApplicationStatus() == ApplicationStatus.REJECTED) {
            throw ApiException.conflict("Application " + application.getId() + " is already "
                    + application.getApplicationStatus() + ", so responses can no longer be corrected.");
        }

        VendorResponseNormalizer.NormalizedResult result = normalizer.normalize(vendor, request);

        response.setVendorReference(request.vendorReference().trim());
        response.setVerificationStatus(result.status());
        response.setConfidenceScore(result.score());
        response.setRemarks(request.remarks());
        response.setResponseStatus(ResponseStatus.UPDATED);
        response.setSubmittedAt(LocalDateTime.now());

        VendorResponse saved = vendorResponseRepository.save(response);
        auditLogService.record(application.getId(), "VENDOR_RESPONSE_UPDATED", username,
                vendor + " corrected response " + saved.getId() + " to " + saved.getVerificationStatus()
                        + " (score " + saved.getConfidenceScore() + ")");
        return VendorResponseView.from(saved);
    }

    @Transactional(readOnly = true)
    public List<VendorResponseView> listResponses(VendorName vendor) {
        return vendorResponseRepository.findByVendorNameOrderBySubmittedAtDesc(vendor).stream()
                .map(VendorResponseView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public VendorDashboardSummary getDashboardSummary(VendorName vendor) {
        long assigned = applicationRepository.count();
        long completed = vendorResponseRepository.countByVendorName(vendor);
        return new VendorDashboardSummary(assigned, assigned - completed, completed);
    }

    private Application findApplication(Long id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Application with id " + id + " was not found."));
    }
}
