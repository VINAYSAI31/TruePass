package com.digitalidentity.proofing.repository;

import com.digitalidentity.proofing.entity.VerificationDecision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VerificationDecisionRepository extends JpaRepository<VerificationDecision, Long> {

    Optional<VerificationDecision> findByApplicationId(Long applicationId);
}
