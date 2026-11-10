package com.digitalidentity.proofing.repository;

import com.digitalidentity.proofing.entity.ExceptionQueue;
import com.digitalidentity.proofing.enums.QueueStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExceptionQueueRepository extends JpaRepository<ExceptionQueue, Long> {

    List<ExceptionQueue> findAllByOrderByCreatedAtDesc();

    List<ExceptionQueue> findByQueueStatusOrderByCreatedAtDesc(QueueStatus queueStatus);

    List<ExceptionQueue> findByApplicationIdAndQueueStatus(Long applicationId, QueueStatus queueStatus);
}
