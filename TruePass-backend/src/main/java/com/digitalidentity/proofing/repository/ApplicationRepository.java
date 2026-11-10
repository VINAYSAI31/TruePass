package com.digitalidentity.proofing.repository;

import com.digitalidentity.proofing.entity.Application;
import com.digitalidentity.proofing.enums.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ApplicationRepository
        extends JpaRepository<Application, Long>, JpaSpecificationExecutor<Application> {

    boolean existsByApplicationReference(String applicationReference);

    long countByApplicationStatus(ApplicationStatus applicationStatus);
}
