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
@Table(name = "debts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Debt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DebtTypeEnum type;

    @Column(nullable = false)
    private String label;

    private String lender;

    private LocalDate startDate;

    private LocalDate endDate;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal initialCapital;

    @Column(nullable = false, precision = 7, scale = 5)
    private BigDecimal annualRate;

    // Taux annuel assurance emprunteur (sur capital initial)
    @Column(precision = 7, scale = 5)
    private BigDecimal insuranceRate;

    @Column(precision = 15, scale = 2)
    private BigDecimal monthlyPayment;

    // Override manuel du capital restant — null = mode projection automatique
    @Column(precision = 15, scale = 2)
    private BigDecimal remainingCapitalOverride;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "EUR";

    // Lien optionnel vers une position IMMO_PHYSIQUE
    private Long positionId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onPrePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
