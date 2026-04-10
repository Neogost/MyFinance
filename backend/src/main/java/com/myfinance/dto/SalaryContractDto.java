package com.myfinance.dto;

import com.myfinance.config.TaxParameters;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.service.NetImposableCalculator;
import com.myfinance.service.TaxSimulatorService;

import java.time.LocalDate;

/**
 * DTO retourné par l'API — inclut les projections calculées à la volée (non persistées).
 *
 * Trois niveaux de rémunération sont exposés :
 *   Brut  →  Net imposable (base fiscale)  →  Net d'impôt (après impôt estimé + avantages en nature)
 */
public record SalaryContractDto(
        Long id,
        LocalDate startDate,
        LocalDate endDate,
        Float annualGrossSalary,
        Integer paidMonthsPerYear,
        Float weeklyHours,
        Float mealVoucherAmount,
        Float mealVoucherEmployeeRate,
        Boolean isCadre,
        Float employeePrevoyanceRate,
        // ── Net imposable (base fiscale) ───────────────────────
        Float annualNetImposable,
        Float monthlyGrossSalary,
        Float monthlyNetImposable,
        Float annualWorkingHours,
        Float hourlyGrossSalary,
        Float hourlyNetImposable,
        Float dailyGrossSalary,
        Float dailyNetImposable,
        Float employeeMonthlyMealVoucherCost,
        Float employerMonthlyMealVoucherCost,
        // ── Net d'impôt (après impôt estimé + avantages en nature exonérés) ──
        Float annualNetAfterTax,
        Float monthlyNetAfterTax,
        Float dailyNetAfterTax,
        Float hourlyNetAfterTax
) {
    /**
     * @param c               Entité contrat
     * @param taxParams       Paramètres fiscaux (cotisations, barème, abattement)
     * @param user            Propriétaire du contrat (profil fiscal pour l'estimation d'impôt)
     * @param taxSimulator    Service simulateur (calcul de l'impôt estimé)
     * @param annualBenefits  Somme annuelle des avantages en nature exonérés (Σ monthlyAmount × 12)
     */
    public static SalaryContractDto from(SalaryContract c, TaxParameters taxParams,
                                         User user, TaxSimulatorService taxSimulator,
                                         float annualBenefits) {
        boolean isCadre        = Boolean.TRUE.equals(c.getIsCadre());
        float annualNetImp     = NetImposableCalculator.calculer(
                c.getAnnualGrossSalary(), isCadre, c.getEmployeePrevoyanceRate(), taxParams);
        float workingHours     = c.getWeeklyHours() * (228f / 5f);
        float employeeRate     = c.getMealVoucherEmployeeRate() / 100f;

        // Net d'impôt — null si profil fiscal incomplet ou barème absent
        Float estimatedTax     = taxSimulator.estimerImpotSurSalaire(annualNetImp, user);
        Float annualNetAfterTax = estimatedTax != null
                ? annualNetImp - estimatedTax + annualBenefits
                : null;

        return new SalaryContractDto(
                c.getId(),
                c.getStartDate(),
                c.getEndDate(),
                c.getAnnualGrossSalary(),
                c.getPaidMonthsPerYear(),
                c.getWeeklyHours(),
                c.getMealVoucherAmount(),
                c.getMealVoucherEmployeeRate(),
                c.getIsCadre(),
                c.getEmployeePrevoyanceRate(),
                // net imposable
                annualNetImp,
                c.getAnnualGrossSalary() / c.getPaidMonthsPerYear(),
                annualNetImp / c.getPaidMonthsPerYear(),
                workingHours,
                c.getAnnualGrossSalary() / workingHours,
                annualNetImp / workingHours,
                c.getAnnualGrossSalary() / 228f,
                annualNetImp / 228f,
                c.getMealVoucherAmount() * employeeRate * 19f,
                c.getMealVoucherAmount() * (1f - employeeRate) * 19f,
                // net d'impôt
                annualNetAfterTax,
                annualNetAfterTax != null ? annualNetAfterTax / c.getPaidMonthsPerYear() : null,
                annualNetAfterTax != null ? annualNetAfterTax / 228f : null,
                annualNetAfterTax != null ? annualNetAfterTax / workingHours : null
        );
    }
}
