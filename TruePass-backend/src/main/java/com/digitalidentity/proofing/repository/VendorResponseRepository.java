package com.digitalidentity.proofing.repository;

import com.digitalidentity.proofing.entity.VendorResponse;
import com.digitalidentity.proofing.enums.VendorName;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VendorResponseRepository extends JpaRepository<VendorResponse, Long> {

    Optional<VendorResponse> findByApplicationIdAndVendorName(Long applicationId, VendorName vendorName);

    List<VendorResponse> findByVendorNameOrderBySubmittedAtDesc(VendorName vendorName);

    long countByVendorName(VendorName vendorName);
}
