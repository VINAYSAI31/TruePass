package com.digitalidentity.proofing.service;

import com.digitalidentity.proofing.dto.ApplicationCreateRequest;
import com.digitalidentity.proofing.dto.ApplicationResponse;
import com.digitalidentity.proofing.dto.ComparisonResponse;
import com.digitalidentity.proofing.dto.DecisionResponse;
import com.digitalidentity.proofing.dto.VendorResponseView;
import com.digitalidentity.proofing.entity.Application;
import com.digitalidentity.proofing.entity.VendorResponse;
import com.digitalidentity.proofing.enums.ApplicationStatus;
import com.digitalidentity.proofing.enums.VendorName;
import com.digitalidentity.proofing.exception.ApiException;
import com.digitalidentity.proofing.repository.ApplicationRepository;
import com.digitalidentity.proofing.repository.VendorResponseRepository;
import com.digitalidentity.proofing.repository.VerificationDecisionRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Internal portal: create, search and view applications. */
@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final VendorResponseRepository vendorResponseRepository;
    private final VerificationDecisionRepository decisionRepository;
    private final AuditLogService auditLogService;

    public ApplicationService(ApplicationRepository applicationRepository,
                              VendorResponseRepository vendorResponseRepository,
                              VerificationDecisionRepository decisionRepository,
                              AuditLogService auditLogService) {
        this.applicationRepository = applicationRepository;
        this.vendorResponseRepository = vendorResponseRepository;
        this.decisionRepository = decisionRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public ApplicationResponse createApplication(ApplicationCreateRequest request, String performedBy) {
        Application application = new Application();
        application.setApplicationReference(generateUniqueReference());
        application.setApplicantName(request.applicantName().trim());
        application.setEmail(request.email().trim());
        application.setPhoneNumber(request.phoneNumber().trim());
        application.setDocumentType(request.documentType());
        application.setDocumentReference(request.documentReference().trim());
        application.setApplicationStatus(ApplicationStatus.WAITING_FOR_RESPONSES);

        Application saved = applicationRepository.save(application);
        auditLogService.record(saved.getId(), "APPLICATION_CREATED", performedBy,
                "Created application " + saved.getApplicationReference() + " for " + saved.getApplicantName());
        return ApplicationResponse.from(saved);
    }

    /**
     * Lists applications, newest first.
     * status filters on the application status; search matches name, email, application reference
     * or document reference (case-insensitive, partial match).
     */
    @Transactional(readOnly = true)
    public List<ApplicationResponse> searchApplications(ApplicationStatus status, String search) {
        Specification<Application> spec = (root, query, cb) -> cb.conjunction();

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("applicationStatus"), status));
        }
        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("applicantName")), pattern),
                    cb.like(cb.lower(root.get("email")), pattern),
                    cb.like(cb.lower(root.get("applicationReference")), pattern),
                    cb.like(cb.lower(root.get("documentReference")), pattern)));
        }

        return applicationRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(ApplicationResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ApplicationResponse getApplication(Long id) {
        return ApplicationResponse.from(findApplication(id));
    }

    @Transactional(readOnly = true)
    public ComparisonResponse getComparison(Long id) {
        Application application = findApplication(id);

        VendorResponse vendorA = vendorResponseRepository
                .findByApplicationIdAndVendorName(id, VendorName.VENDOR_A).orElse(null);
        VendorResponse vendorB = vendorResponseRepository
                .findByApplicationIdAndVendorName(id, VendorName.VENDOR_B).orElse(null);
        DecisionResponse decision = decisionRepository.findByApplicationId(id)
                .map(DecisionResponse::from).orElse(null);

        return new ComparisonResponse(
                ApplicationResponse.from(application),
                vendorA == null ? null : VendorResponseView.from(vendorA),
                vendorB == null ? null : VendorResponseView.from(vendorB),
                decision);
    }

    private Application findApplication(Long id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Application with id " + id + " was not found."));
    }

    private String generateUniqueReference() {
        String reference;
        do {
            reference = "APP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        } while (applicationRepository.existsByApplicationReference(reference));
        return reference;
    }
}
