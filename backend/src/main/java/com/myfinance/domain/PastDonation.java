package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "past_donations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PastDonation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "donor_id", nullable = false)
    private User donor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private FamilyMember recipient;

    @Column(nullable = false)
    private LocalDate donationDate;

    @Column(nullable = false)
    private BigDecimal amountEur;

    private String label;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
