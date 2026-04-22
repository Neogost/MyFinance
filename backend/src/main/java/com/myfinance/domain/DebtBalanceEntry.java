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
@Table(name = "debt_balance_entries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DebtBalanceEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debt_id", nullable = false)
    private Debt debt;

    @Column(nullable = false)
    private LocalDate entryDate;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal balance;

    @Column(length = 500)
    private String note;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onPrePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
