package com.myfinance.dto;

import com.myfinance.config.PublicSectorParameters;
import com.myfinance.config.TaxParameters;
import com.myfinance.domain.ContractTypeEnum;
import com.myfinance.domain.PublicSubTypeEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.service.NetImposableCalculator;
import com.myfinance.service.PublicNetImposableCalculator;
import com.myfinance.service.TaxSimulatorService;

import java.time.LocalDate;

/**
 * DTO retourné par l'API — inclut les projections calculées à la volée (non persistées).
 *
 * Trois niveaux de rémunération sont exposés :
 *   Brut  →  Net imposable (base fiscale)  →  Net d'impôt (après impôt estimé + avantages en nature)
 *
 * Pour les contrats PUBLIC, le brut est dérivé de l'indiceMajore × valeur du point.
 * Le super brut n'est pas calculé pour les contrats PUBLIC (null).
 */
public record SalaryContractDto(
        Long id,
        ContractTypeEnum contractType,
        PublicSubTypeEnum publicSubType,
        Integer indiceMajore,
        Float pointValueUsed,         // valeur du point utilisée pour le calcul (PUBLIC uniquement, à titre informatif)
        String companyName,
        LocalDate startDate,
        LocalDate endDate,
        Float annualGrossSalary,      // brut effectif (révision active ou contrat de base)
        Float baseGrossSalary,        // brut du contrat de base
        Long activeRevisionId,
        Integer paidMonthsPerYear,
        Float weeklyHours,
        Float mealVoucherAmount,
        Float mealVoucherEmployeeRate,
        Boolean isCadre,
        Float employeePrevoyanceRate,
        // ── Net imposable (base fiscale) ────────────────────────────────
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
        Float monthlyEstimatedTax,
        Float monthlyBenefits,
        // ── Super brut (null pour PUBLIC — concept non applicable) ──────
        Float annualSuperGross,
        Float monthlySuperGross,
        Float dailySuperGross,
        Float hourlySuperGross
) {
    public static SalaryContractDto from(SalaryContract c,
                                         TaxParameters taxParams,
                                         PublicSectorParameters publicParams,
                                         User user,
                                         TaxSimulatorService taxSimulator,
                                         float annualBenefits,
                                         Long activeRevisionId,
                                         float effectiveSalary,
                                         Float pointValueUsed) {
        ContractTypeEnum type = c.getContractType() != null ? c.getContractType() : ContractTypeEnum.PRIVATE;

        float annualNetImp = computeNetImposable(c, type, effectiveSalary, taxParams, publicParams);
        float workingHours = c.getWeeklyHours() * (228f / 5f);
        float employeeRate = c.getMealVoucherEmployeeRate() / 100f;
        int   paidMonths   = c.getPaidMonthsPerYear();

        Float estimatedTax      = taxSimulator.estimerImpotSurSalaire(annualNetImp, user);
        Float annualNetAfterTax = estimatedTax != null
                ? annualNetImp - estimatedTax + annualBenefits
                : null;

        // Super brut : non calculé pour les contrats PUBLIC (concept non applicable)
        Float annualSuperGross = type == ContractTypeEnum.PUBLIC ? null
                : effectiveSalary * (1f + taxParams.getEmployerFlatRate());

        return new SalaryContractDto(
                c.getId(),
                type,
                c.getPublicSubType(),
                c.getIndiceMajore(),
                pointValueUsed,
                c.getCompanyName(),
                c.getStartDate(),
                c.getEndDate(),
                effectiveSalary,
                c.getAnnualGrossSalary(),
                activeRevisionId,
                paidMonths,
                c.getWeeklyHours(),
                c.getMealVoucherAmount(),
                c.getMealVoucherEmployeeRate(),
                c.getIsCadre(),
                c.getEmployeePrevoyanceRate(),
                // net imposable
                annualNetImp,
                effectiveSalary / paidMonths,
                annualNetImp / paidMonths,
                workingHours,
                effectiveSalary / workingHours,
                annualNetImp / workingHours,
                effectiveSalary / 228f,
                annualNetImp / 228f,
                c.getMealVoucherAmount() * employeeRate * 19f,
                c.getMealVoucherAmount() * (1f - employeeRate) * 19f,
                // net d'impôt
                annualNetAfterTax,
                annualNetAfterTax != null ? annualNetAfterTax / paidMonths : null,
                annualNetAfterTax != null ? annualNetAfterTax / 228f : null,
                annualNetAfterTax != null ? annualNetAfterTax / workingHours : null,
                estimatedTax != null ? estimatedTax / paidMonths : null,
                annualBenefits / paidMonths,
                // super brut
                annualSuperGross,
                annualSuperGross != null ? annualSuperGross / paidMonths : null,
                annualSuperGross != null ? annualSuperGross / 228f : null,
                annualSuperGross != null ? annualSuperGross / workingHours : null
        );
    }

    private static float computeNetImposable(SalaryContract c,
                                              ContractTypeEnum type,
                                              float brut,
                                              TaxParameters taxParams,
                                              PublicSectorParameters publicParams) {
        if (type == ContractTypeEnum.PUBLIC
                && c.getPublicSubType() == PublicSubTypeEnum.TITULAIRE) {
            return PublicNetImposableCalculator.calculerTitulaire(
                    brut, c.getEmployeePrevoyanceRate(),
                    publicParams.getCotisations().getTitulaire());
        }
        // PRIVATE ou PUBLIC CONTRACTUEL → régime général
        boolean isCadre = Boolean.TRUE.equals(c.getIsCadre());
        return NetImposableCalculator.calculer(brut, isCadre, c.getEmployeePrevoyanceRate(), taxParams);
    }
}
