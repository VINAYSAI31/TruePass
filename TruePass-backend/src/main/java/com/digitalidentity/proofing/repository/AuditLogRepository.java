package com.digitalidentity.proofing.repository;

import com.digitalidentity.proofing.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findAllByOrderByCreatedAtDesc();

    List<AuditLog> findByApplicationIdOrderByCreatedAtDesc(Long applicationId);
}
