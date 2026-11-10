package com.digitalidentity.proofing.controller;

import com.digitalidentity.proofing.dto.AuditLogResponse;
import com.digitalidentity.proofing.service.AuditLogService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    /** Optional filter: ?applicationId=1 */
    @GetMapping
    public List<AuditLogResponse> listAuditLogs(@RequestParam(required = false) Long applicationId) {
        return auditLogService.list(applicationId);
    }
}
