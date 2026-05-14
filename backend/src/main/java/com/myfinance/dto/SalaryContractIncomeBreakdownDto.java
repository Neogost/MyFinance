package com.myfinance.dto;

import java.time.LocalDate;

/**
 * Contribution d'un contrat salarial au revenu imposable, calculée à partir des bulletins de paie.
 * Inclus dans TaxSimulationDto uniquement en mode BULLETINS_REELS avec plusieurs contrats.
 */
public record SalaryContractIncomeBreakdownDto(
        Long contractId,
        String companyName,
        LocalDate startDate,
        LocalDate endDate,
        int paySlipCount,
        float taxableIncome
) {}
