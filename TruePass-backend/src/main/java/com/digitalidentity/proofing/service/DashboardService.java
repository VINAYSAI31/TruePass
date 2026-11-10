package com.digitalidentity.proofing.service;

import com.digitalidentity.proofing.dto.DashboardSummary;
import com.digitalidentity.proofing.enums.ApplicationStatus;
import com.digitalidentity.proofing.repository.ApplicationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

    private final ApplicationRepository applicationRepository;

    public DashboardService(ApplicationRepository applicationRepository) {
        this.applicationRepository = applicationRepository;
    }

    @Transactional(readOnly = true)
    public DashboardSummary getSummary() {
        return new DashboardSummary(
                applicationRepository.count(),
                applicationRepository.countByApplicationStatus(ApplicationStatus.PASSED),
                applicationRepository.countByApplicationStatus(ApplicationStatus.REJECTED),
                applicationRepository.countByApplicationStatus(ApplicationStatus.MANUAL_REVIEW),
                applicationRepository.countByApplicationStatus(ApplicationStatus.WAITING_FOR_RESPONSES),
                applicationRepository.countByApplicationStatus(ApplicationStatus.RETRY));
    }
}
