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

    // Nom de l'entreprise — nullable pour compatibilité avec les contrats existants
    private String companyName;

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

    // null = non renseigné (traité comme false dans les calculs)
    private Boolean isCadre;

    // Taux de prévoyance/mutuelle salarié en % décimal (ex : 0.015 = 1,5%) — nullable
    private Float employeePrevoyanceRate;

    @OneToMany(mappedBy = "contract", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MonthlyPaySlip> paySlips = new ArrayList<>();

    @OneToMany(mappedBy = "contract", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ContractBonus> bonuses = new ArrayList<>();

    @OneToMany(mappedBy = "contract", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ContractBenefit> benefits = new ArrayList<>();
}
