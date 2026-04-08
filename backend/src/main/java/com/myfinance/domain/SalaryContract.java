package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "salary_contracts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalaryContract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDate startDate;

    // null = contrat en cours
    private LocalDate endDate;

    @Column(nullable = false)
    private Float annualGrossSalary;

    @Column(nullable = false)
    private Integer paidMonthsPerYear;

    @Column(nullable = false)
    private Float weeklyHours;

    @Column(nullable = false)
    private Float mealVoucherAmount;

    @Column(nullable = false)
    private Float mealVoucherEmployeeRate;

    @OneToMany(mappedBy = "contract", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MonthlyPaySlip> paySlips = new ArrayList<>();
}
