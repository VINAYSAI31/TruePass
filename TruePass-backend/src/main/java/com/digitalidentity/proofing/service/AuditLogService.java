package com.digitalidentity.proofing.service;

import com.digitalidentity.proofing.dto.AuditLogResponse;
import com.digitalidentity.proofing.entity.AuditLog;
import com.digitalidentity.proofing.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /** Joins the caller's transaction, so the audit row is saved together with the business change. */
    @Transactional
    public void record(Long applicationId, String action, String performedBy, String description) {
        AuditLog log = new AuditLog();
        log.setApplicationId(applicationId);
        log.setAction(action);
        log.setPerformedBy(performedBy);
        log.setDescription(description);
        auditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> list(Long applicationId) {
        List<AuditLog> logs = applicationId == null
                ? auditLogRepository.findAllByOrderByCreatedAtDesc()
                : auditLogRepository.findByApplicationIdOrderByCreatedAtDesc(applicationId);
        return logs.stream().map(AuditLogResponse::from).toList();
    }
}
