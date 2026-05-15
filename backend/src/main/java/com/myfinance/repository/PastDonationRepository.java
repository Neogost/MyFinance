package com.myfinance.repository;

import com.myfinance.domain.FamilyMember;
import com.myfinance.domain.PastDonation;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface PastDonationRepository extends JpaRepository<PastDonation, Long> {

    List<PastDonation> findByDonorAndRecipientOrderByDonationDateDesc(User donor, FamilyMember recipient);

    List<PastDonation> findByDonorOrderByDonationDateDesc(User donor);

    /** Somme des donations au même bénéficiaire dans la fenêtre de 15 ans glissants. */
    @Query("SELECT COALESCE(SUM(d.amountEur), 0) FROM PastDonation d " +
           "WHERE d.donor = :donor AND d.recipient = :recipient AND d.donationDate >= :since")
    BigDecimal sumByDonorAndRecipientSince(
            @Param("donor") User donor,
            @Param("recipient") FamilyMember recipient,
            @Param("since") LocalDate since);

    void deleteByDonor(User donor);
}
