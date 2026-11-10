package com.digitalidentity.proofing.entity;

import com.digitalidentity.proofing.enums.ExceptionPriority;
import com.digitalidentity.proofing.enums.QueueStatus;
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
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** A manual-review item created when the decision engine returns MANUAL_REVIEW. */
@Entity
@Table(name = "exception_queue")
public class ExceptionQueue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(nullable = false, length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ExceptionPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private QueueStatus queueStatus;

    @Column(length = 100)
    private String reviewerName;

    @Column(length = 1000)
    private String reviewerComments;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime resolvedAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Application getApplication() { return application; }
    public void setApplication(Application application) { this.application = application; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public ExceptionPriority getPriority() { return priority; }
    public void setPriority(ExceptionPriority priority) { this.priority = priority; }
    public QueueStatus getQueueStatus() { return queueStatus; }
    public void setQueueStatus(QueueStatus queueStatus) { this.queueStatus = queueStatus; }
    public String getReviewerName() { return reviewerName; }
    public void setReviewerName(String reviewerName) { this.reviewerName = reviewerName; }
    public String getReviewerComments() { return reviewerComments; }
    public void setReviewerComments(String reviewerComments) { this.reviewerComments = reviewerComments; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
}
