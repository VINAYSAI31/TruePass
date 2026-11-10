package com.digitalidentity.proofing.dto;

import com.digitalidentity.proofing.entity.AuditLog;

import java.time.LocalDateTime;

public record AuditLogResponse(
        Long id,
        Long applicationId,
        String action,
        String performedBy,
        String description,
        LocalDateTime createdAt) {

    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(log.getId(), log.getApplicationId(), log.getAction(),
                log.getPerformedBy(), log.getDescription(), log.getCreatedAt());
    }
}
