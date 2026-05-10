package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "recurring_expenses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecurringExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExpenseCategoryEnum category;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private Float amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FrequencyEnum frequency;

    // Part de l'utilisateur en % (1.0 à 100.0) — 100 par défaut (pas de partage)
    @Column(nullable = false)
    private Float sharePercentage;

    private LocalDate startDate;

    private LocalDate endDate;

    @Column(length = 500)
    private String notes;

    // Jour du mois du prélèvement (1-28) — MONTHLY uniquement.
    // Pour ANNUAL, la date de prélèvement est déduite de startDate (jour + mois).
    @Column(name = "payment_day")
    private Integer paymentDay;
}
