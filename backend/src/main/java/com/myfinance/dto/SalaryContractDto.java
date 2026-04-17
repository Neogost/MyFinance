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
        String companyName,
        LocalDate startDate,
        LocalDate endDate,
        Float annualGrossSalary,
        Long activeRevisionId,
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
        Float hourlyNetAfterTax,
        Float monthlyEstimatedTax,   // PAS mensuel (null si profil fiscal incomplet)
        Float monthlyBenefits,       // avantages en nature mensuels (Σ ContractBenefit / paidMonths)
        // ── Super brut (coût employeur estimé — taux forfaitaire) ─────────
        Float annualSuperGross,
        Float monthlySuperGross,
        Float dailySuperGross,
        Float hourlySuperGross
) {
    /**
     * @param c               Entité contrat
     * @param taxParams       Paramètres fiscaux (cotisations, barème, abattement)
     * @param user            Propriétaire du contrat (profil fiscal pour l'estimation d'impôt)
     * @param taxSimulator    Service simulateur (calcul de l'impôt estimé)
     * @param annualBenefits  Somme annuelle des avantages en nature exonérés (Σ monthlyAmount × 12)
     */
    /**
     * @param activeRevisionId  ID de la révision active (null si aucune — salaire du contrat utilisé)
     * @param effectiveSalary   Salaire brut annuel effectif (révision active ou contrat.annualGrossSalary)
     */
    public static SalaryContractDto from(SalaryContract c, TaxParameters taxParams,
                                         User user, TaxSimulatorService taxSimulator,
                                         float annualBenefits,
                                         Long activeRevisionId, float effectiveSalary) {
        boolean isCadre        = Boolean.TRUE.equals(c.getIsCadre());
        float annualNetImp     = NetImposableCalculator.calculer(
                effectiveSalary, isCadre, c.getEmployeePrevoyanceRate(), taxParams);
        float workingHours     = c.getWeeklyHours() * (228f / 5f);
        float employeeRate     = c.getMealVoucherEmployeeRate() / 100f;

        // Net d'impôt — null si profil fiscal incomplet ou barème absent
        Float estimatedTax     = taxSimulator.estimerImpotSurSalaire(annualNetImp, user);
        Float annualNetAfterTax = estimatedTax != null
                ? annualNetImp - estimatedTax + annualBenefits
                : null;

        // Super brut — coût employeur estimé (taux forfaitaire)
        float annualSuperGross = effectiveSalary * (1f + taxParams.getEmployerFlatRate());

        return new SalaryContractDto(
                c.getId(),
                c.getCompanyName(),
                c.getStartDate(),
                c.getEndDate(),
                effectiveSalary,
                activeRevisionId,
                c.getPaidMonthsPerYear(),
                c.getWeeklyHours(),
                c.getMealVoucherAmount(),
                c.getMealVoucherEmployeeRate(),
                c.getIsCadre(),
                c.getEmployeePrevoyanceRate(),
                // net imposable
                annualNetImp,
                effectiveSalary / c.getPaidMonthsPerYear(),
                annualNetImp / c.getPaidMonthsPerYear(),
                workingHours,
                effectiveSalary / workingHours,
                annualNetImp / workingHours,
                effectiveSalary / 228f,
                annualNetImp / 228f,
                c.getMealVoucherAmount() * employeeRate * 19f,
                c.getMealVoucherAmount() * (1f - employeeRate) * 19f,
                // net d'impôt
                annualNetAfterTax,
                annualNetAfterTax != null ? annualNetAfterTax / c.getPaidMonthsPerYear() : null,
                annualNetAfterTax != null ? annualNetAfterTax / 228f : null,
                annualNetAfterTax != null ? annualNetAfterTax / workingHours : null,
                estimatedTax != null ? estimatedTax / c.getPaidMonthsPerYear() : null,
                annualBenefits / c.getPaidMonthsPerYear(),
                // super brut
                annualSuperGross,
                annualSuperGross / c.getPaidMonthsPerYear(),
                annualSuperGross / 228f,
                annualSuperGross / workingHours
        );
    }
}
