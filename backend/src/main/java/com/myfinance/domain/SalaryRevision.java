package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "salary_revisions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"contract_id", "effective_date"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalaryRevision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private SalaryContract contract;

    // Date d'entrée en vigueur du nouveau salaire
    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Column(nullable = false)
    private Float annualGrossSalary;

    // Libellé libre (ex : "Augmentation annuelle 2025") — nullable
    private String label;
}
