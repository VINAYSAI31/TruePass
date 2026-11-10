package com.digitalidentity.proofing.dto;

import com.digitalidentity.proofing.entity.ExceptionQueue;
import com.digitalidentity.proofing.enums.ExceptionPriority;
import com.digitalidentity.proofing.enums.QueueStatus;

import java.time.LocalDateTime;

public record ExceptionResponse(
        Long id,
        Long applicationId,
        String applicationReference,
        String reason,
        ExceptionPriority priority,
        QueueStatus queueStatus,
        String reviewerName,
        String reviewerComments,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt) {

    public static ExceptionResponse from(ExceptionQueue e) {
        return new ExceptionResponse(e.getId(), e.getApplication().getId(),
                e.getApplication().getApplicationReference(), e.getReason(), e.getPriority(),
                e.getQueueStatus(), e.getReviewerName(), e.getReviewerComments(),
                e.getCreatedAt(), e.getResolvedAt());
    }
}
