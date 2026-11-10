package com.digitalidentity.proofing.entity;

import com.digitalidentity.proofing.enums.FinalDecision;
import com.digitalidentity.proofing.enums.VerificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** The current decision for an application. Re-evaluating updates the same row. */
@Entity
@Table(name = "verification_decisions")
public class VerificationDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private Application application;

    /** Null when Vendor A has not responded yet. */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private VerificationStatus vendorAStatus;

    /** Null when Vendor B has not responded yet. */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private VerificationStatus vendorBStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FinalDecision finalDecision;

    @Column(length = 1000)
    private String decisionReason;

    @Column(nullable = false)
    private LocalDateTime evaluatedAt;

    public Long getId() { return id; }
    public Application getApplication() { return application; }
    public void setApplication(Application application) { this.application = application; }
    public VerificationStatus getVendorAStatus() { return vendorAStatus; }
    public void setVendorAStatus(VerificationStatus vendorAStatus) { this.vendorAStatus = vendorAStatus; }
    public VerificationStatus getVendorBStatus() { return vendorBStatus; }
    public void setVendorBStatus(VerificationStatus vendorBStatus) { this.vendorBStatus = vendorBStatus; }
    public FinalDecision getFinalDecision() { return finalDecision; }
    public void setFinalDecision(FinalDecision finalDecision) { this.finalDecision = finalDecision; }
    public String getDecisionReason() { return decisionReason; }
    public void setDecisionReason(String decisionReason) { this.decisionReason = decisionReason; }
    public LocalDateTime getEvaluatedAt() { return evaluatedAt; }
    public void setEvaluatedAt(LocalDateTime evaluatedAt) { this.evaluatedAt = evaluatedAt; }
}
