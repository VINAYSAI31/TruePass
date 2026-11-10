package com.digitalidentity.proofing.entity;

import com.digitalidentity.proofing.enums.ResponseStatus;
import com.digitalidentity.proofing.enums.VendorName;
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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;

/**
 * A vendor's verification result, stored in one common format.
 * The unique constraint guarantees one response row per application and vendor.
 */
@Entity
@Table(name = "vendor_responses",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_vendor_response_application_vendor",
                columnNames = {"application_id", "vendor_name"}))
public class VendorResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Enumerated(EnumType.STRING)
    @Column(name = "vendor_name", nullable = false, length = 20)
    private VendorName vendorName;

    @Column(nullable = false, length = 50)
    private String vendorReference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerificationStatus verificationStatus;

    /** Normalized to a 0-100 scale. May be null when the vendor reports a technical error. */
    private Double confidenceScore;

    @Column(length = 500)
    private String remarks;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ResponseStatus responseStatus;

    @Column(nullable = false)
    private LocalDateTime submittedAt;

    public Long getId() { return id; }
    public Application getApplication() { return application; }
    public void setApplication(Application application) { this.application = application; }
    public VendorName getVendorName() { return vendorName; }
    public void setVendorName(VendorName vendorName) { this.vendorName = vendorName; }
    public String getVendorReference() { return vendorReference; }
    public void setVendorReference(String vendorReference) { this.vendorReference = vendorReference; }
    public VerificationStatus getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(VerificationStatus verificationStatus) { this.verificationStatus = verificationStatus; }
    public Double getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(Double confidenceScore) { this.confidenceScore = confidenceScore; }
    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
    public ResponseStatus getResponseStatus() { return responseStatus; }
    public void setResponseStatus(ResponseStatus responseStatus) { this.responseStatus = responseStatus; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }
}
