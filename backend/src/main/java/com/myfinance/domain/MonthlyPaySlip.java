package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "monthly_pay_slips",
       uniqueConstraints = @UniqueConstraint(columnNames = {"contract_id", "period"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyPaySlip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private SalaryContract contract;

    // Premier jour du mois concerné (ex : 2025-03-01 pour mars 2025)
    @Column(nullable = false)
    private LocalDate period;

    @Column(nullable = false)
    private Float grossSalary;

    @Column(nullable = false)
    private Float taxableNetSalary;

    @Column(nullable = false)
    private Float netSalary;

    @Column(nullable = false)
    private Float incomeTaxWithholding;
}
