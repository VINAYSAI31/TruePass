package com.digitalidentity.proofing.service;

import com.digitalidentity.proofing.dto.DecisionResponse;
import com.digitalidentity.proofing.entity.Application;
import com.digitalidentity.proofing.entity.ExceptionQueue;
import com.digitalidentity.proofing.entity.VendorResponse;
import com.digitalidentity.proofing.entity.VerificationDecision;
import com.digitalidentity.proofing.enums.ApplicationStatus;
import com.digitalidentity.proofing.enums.ExceptionPriority;
import com.digitalidentity.proofing.enums.FinalDecision;
import com.digitalidentity.proofing.enums.QueueStatus;
import com.digitalidentity.proofing.enums.VendorName;
import com.digitalidentity.proofing.enums.VerificationStatus;
import com.digitalidentity.proofing.exception.ApiException;
import com.digitalidentity.proofing.repository.ApplicationRepository;
import com.digitalidentity.proofing.repository.ExceptionQueueRepository;
import com.digitalidentity.proofing.repository.VendorResponseRepository;
import com.digitalidentity.proofing.repository.VerificationDecisionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * The decision engine. All demo rules live in applyRules() so they are easy to read and change.
 *
 * Rule order (first match wins):
 *  1. Neither vendor responded                    -> WAITING_FOR_RESPONSES
 *  2. Only one vendor responded                   -> WAITING_FOR_RESPONSES
 *  3. Either vendor reported a technical error    -> RETRY
 *  4. Vendors disagree (one verified, one not)    -> MANUAL_REVIEW
 *  5. Both vendors negative                       -> REJECT
 *  6. Both verified but any confidence below 85   -> MANUAL_REVIEW
 *  7. Both verified and both confidence >= 85     -> PASS
 */
@Service
public class DecisionService {

    public static final double CONFIDENCE_THRESHOLD = 85.0;

    /** Result of the rules: the decision, a readable reason and the priority if a review is needed. */
    public record RuleOutcome(FinalDecision decision, String reason, ExceptionPriority priority) {
    }

    private final ApplicationRepository applicationRepository;
    private final VendorResponseRepository vendorResponseRepository;
    private final VerificationDecisionRepository decisionRepository;
    private final ExceptionQueueRepository exceptionQueueRepository;
    private final AuditLogService auditLogService;

    public DecisionService(ApplicationRepository applicationRepository,
                           VendorResponseRepository vendorResponseRepository,
                           VerificationDecisionRepository decisionRepository,
                           ExceptionQueueRepository exceptionQueueRepository,
                           AuditLogService auditLogService) {
        this.applicationRepository = applicationRepository;
        this.vendorResponseRepository = vendorResponseRepository;
        this.decisionRepository = decisionRepository;
        this.exceptionQueueRepository = exceptionQueueRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public DecisionResponse evaluate(Long applicationId, String performedBy) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> ApiException.notFound("Application with id " + applicationId + " was not found."));

        VendorResponse vendorA = vendorResponseRepository
                .findByApplicationIdAndVendorName(applicationId, VendorName.VENDOR_A).orElse(null);
        VendorResponse vendorB = vendorResponseRepository
                .findByApplicationIdAndVendorName(applicationId, VendorName.VENDOR_B).orElse(null);

        RuleOutcome outcome = applyRules(vendorA, vendorB);

        // One decision row per application: create it the first time, update it on re-evaluation.
        VerificationDecision decision = decisionRepository.findByApplicationId(applicationId)
                .orElseGet(VerificationDecision::new);
        decision.setApplication(application);
        decision.setVendorAStatus(vendorA == null ? null : vendorA.getVerificationStatus());
        decision.setVendorBStatus(vendorB == null ? null : vendorB.getVerificationStatus());
        decision.setFinalDecision(outcome.decision());
        decision.setDecisionReason(outcome.reason());
        decision.setEvaluatedAt(LocalDateTime.now());
        VerificationDecision saved = decisionRepository.save(decision);

        application.setApplicationStatus(statusFor(outcome.decision()));
        applicationRepository.save(application);

        updateExceptionQueue(application, outcome, performedBy);

        auditLogService.record(applicationId, "DECISION_EVALUATED", performedBy,
                "Decision " + outcome.decision() + ": " + outcome.reason());

        return DecisionResponse.from(saved);
    }

    /** The centralized demo rules. Pure logic - no database access - so it is easy to unit test. */
    public RuleOutcome applyRules(VendorResponse vendorA, VendorResponse vendorB) {
        if (vendorA == null && vendorB == null) {
            return new RuleOutcome(FinalDecision.WAITING_FOR_RESPONSES,
                    "Neither vendor has responded yet.", null);
        }
        if (vendorA == null) {
            return new RuleOutcome(FinalDecision.WAITING_FOR_RESPONSES,
                    "Only Vendor B has responded. Waiting for Vendor A.", null);
        }
        if (vendorB == null) {
            return new RuleOutcome(FinalDecision.WAITING_FOR_RESPONSES,
                    "Only Vendor A has responded. Waiting for Vendor B.", null);
        }

        VerificationStatus statusA = vendorA.getVerificationStatus();
        VerificationStatus statusB = vendorB.getVerificationStatus();

        if (statusA == VerificationStatus.ERROR || statusB == VerificationStatus.ERROR) {
            return new RuleOutcome(FinalDecision.RETRY,
                    "A vendor reported a technical error (Vendor A: " + statusA
                            + ", Vendor B: " + statusB + "). Ask the vendors to retry.", null);
        }

        if (statusA != statusB) {
            return new RuleOutcome(FinalDecision.MANUAL_REVIEW,
                    "Vendors disagree (Vendor A: " + statusA + ", Vendor B: " + statusB + ").",
                    ExceptionPriority.HIGH);
        }

        if (statusA == VerificationStatus.NOT_VERIFIED) {
            return new RuleOutcome(FinalDecision.REJECT,
                    "Both vendors returned a negative result.", null);
        }

        // From here on both vendors reported VERIFIED.
        if (isBelowThreshold(vendorA) || isBelowThreshold(vendorB)) {
            return new RuleOutcome(FinalDecision.MANUAL_REVIEW,
                    "Both vendors verified the applicant but at least one confidence is below "
                            + (int) CONFIDENCE_THRESHOLD + " (Vendor A: " + vendorA.getConfidenceScore()
                            + ", Vendor B: " + vendorB.getConfidenceScore() + ").",
                    ExceptionPriority.MEDIUM);
        }

        return new RuleOutcome(FinalDecision.PASS,
                "Both vendors verified the applicant with confidence of at least "
                        + (int) CONFIDENCE_THRESHOLD + ".", null);
    }

    /** Maps a final decision to the status stored on the application. */
    public static ApplicationStatus statusFor(FinalDecision decision) {
        return switch (decision) {
            case PASS -> ApplicationStatus.PASSED;
            case REJECT -> ApplicationStatus.REJECTED;
            case MANUAL_REVIEW -> ApplicationStatus.MANUAL_REVIEW;
            case RETRY -> ApplicationStatus.RETRY;
            case WAITING_FOR_RESPONSES -> ApplicationStatus.WAITING_FOR_RESPONSES;
        };
    }

    private boolean isBelowThreshold(VendorResponse response) {
        return response.getConfidenceScore() == null || response.getConfidenceScore() < CONFIDENCE_THRESHOLD;
    }

    /**
     * MANUAL_REVIEW creates an exception (only one open exception per application).
     * Any other result closes an open exception that is no longer needed.
     */
    private void updateExceptionQueue(Application application, RuleOutcome outcome, String performedBy) {
        List<ExceptionQueue> openExceptions = exceptionQueueRepository
                .findByApplicationIdAndQueueStatus(application.getId(), QueueStatus.OPEN);

        if (outcome.decision() == FinalDecision.MANUAL_REVIEW) {
            if (openExceptions.isEmpty()) {
                ExceptionQueue exception = new ExceptionQueue();
                exception.setApplication(application);
                exception.setReason(outcome.reason());
                exception.setPriority(outcome.priority());
                exception.setQueueStatus(QueueStatus.OPEN);
                ExceptionQueue saved = exceptionQueueRepository.save(exception);
                auditLogService.record(application.getId(), "EXCEPTION_CREATED", performedBy,
                        "Manual review exception " + saved.getId() + " created: " + outcome.reason());
            } else {
                ExceptionQueue open = openExceptions.get(0);
                open.setReason(outcome.reason());
                open.setPriority(outcome.priority());
            }
            return;
        }

        for (ExceptionQueue open : openExceptions) {
            open.setQueueStatus(QueueStatus.RESOLVED);
            open.setReviewerName("SYSTEM");
            open.setReviewerComments("Closed automatically: re-evaluation returned " + outcome.decision() + ".");
            open.setResolvedAt(LocalDateTime.now());
            auditLogService.record(application.getId(), "EXCEPTION_AUTO_RESOLVED", performedBy,
                    "Exception " + open.getId() + " closed because re-evaluation returned " + outcome.decision());
        }
    }
}
