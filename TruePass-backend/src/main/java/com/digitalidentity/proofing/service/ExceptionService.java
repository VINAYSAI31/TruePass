package com.digitalidentity.proofing.service;

import com.digitalidentity.proofing.dto.ExceptionResponse;
import com.digitalidentity.proofing.dto.ReviewRequest;
import com.digitalidentity.proofing.entity.Application;
import com.digitalidentity.proofing.entity.ExceptionQueue;
import com.digitalidentity.proofing.enums.ApplicationStatus;
import com.digitalidentity.proofing.enums.FinalDecision;
import com.digitalidentity.proofing.enums.QueueStatus;
import com.digitalidentity.proofing.exception.ApiException;
import com.digitalidentity.proofing.repository.ApplicationRepository;
import com.digitalidentity.proofing.repository.ExceptionQueueRepository;
import com.digitalidentity.proofing.repository.VerificationDecisionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/** Manual review of exceptions created by the decision engine. */
@Service
public class ExceptionService {

    private final ExceptionQueueRepository exceptionQueueRepository;
    private final ApplicationRepository applicationRepository;
    private final VerificationDecisionRepository decisionRepository;
    private final AuditLogService auditLogService;

    public ExceptionService(ExceptionQueueRepository exceptionQueueRepository,
                            ApplicationRepository applicationRepository,
                            VerificationDecisionRepository decisionRepository,
                            AuditLogService auditLogService) {
        this.exceptionQueueRepository = exceptionQueueRepository;
        this.applicationRepository = applicationRepository;
        this.decisionRepository = decisionRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<ExceptionResponse> listExceptions(QueueStatus status) {
        List<ExceptionQueue> exceptions = status == null
                ? exceptionQueueRepository.findAllByOrderByCreatedAtDesc()
                : exceptionQueueRepository.findByQueueStatusOrderByCreatedAtDesc(status);
        return exceptions.stream().map(ExceptionResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ExceptionResponse getException(Long id) {
        return ExceptionResponse.from(findException(id));
    }

    @Transactional
    public ExceptionResponse reviewException(Long id, ReviewRequest request, String performedBy) {
        ExceptionQueue exception = findException(id);
        if (exception.getQueueStatus() != QueueStatus.OPEN) {
            throw ApiException.conflict("Exception " + id + " has already been resolved.");
        }

        FinalDecision finalDecision = switch (request.decision()) {
            case APPROVE -> FinalDecision.PASS;
            case REJECT -> FinalDecision.REJECT;
            case RETRY -> FinalDecision.RETRY;
        };
        ApplicationStatus newStatus = DecisionService.statusFor(finalDecision);
        String comments = request.comments() == null ? "" : request.comments().trim();
        String reviewerName = request.reviewerName().trim();

        // 1. Close the exception.
        exception.setQueueStatus(QueueStatus.RESOLVED);
        exception.setReviewerName(reviewerName);
        exception.setReviewerComments("[" + request.reasonCode().trim() + "] " + comments);
        exception.setResolvedAt(LocalDateTime.now());

        // 2. Update the application status.
        Application application = exception.getApplication();
        application.setApplicationStatus(newStatus);
        applicationRepository.save(application);

        // 3. Keep the stored decision in line with the reviewer's outcome.
        decisionRepository.findByApplicationId(application.getId()).ifPresent(decision -> {
            decision.setFinalDecision(finalDecision);
            decision.setDecisionReason("Manual review by " + reviewerName + " ("
                    + request.reasonCode().trim() + "): " + comments);
            decision.setEvaluatedAt(LocalDateTime.now());
            decisionRepository.save(decision);
        });

        ExceptionQueue saved = exceptionQueueRepository.save(exception);
        auditLogService.record(application.getId(), "MANUAL_REVIEW_COMPLETED", performedBy,
                "Exception " + saved.getId() + " reviewed by " + reviewerName + ": " + request.decision()
                        + " (" + request.reasonCode().trim() + "). Application is now " + newStatus + ".");
        return ExceptionResponse.from(saved);
    }

    private ExceptionQueue findException(Long id) {
        return exceptionQueueRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Exception with id " + id + " was not found."));
    }
}
