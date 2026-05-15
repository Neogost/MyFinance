package com.myfinance.dto;

import java.util.List;

public record ExpenseSummaryDto(
        Float monthlyNetIncome,
        String incomeSource,            // "NET_AFTER_TAX" | "NET_IMPOSABLE" | "OTHER_INCOME_ONLY" | "NONE"
        Float totalMonthlyExpenses,
        Float totalAnnualExpenses,
        Float savingsCapacity,
        Float savingsRate,
        List<ExpenseCategorySummaryDto> byCategory,
        // Détail du calcul du revenu net mensuel
        Float breakdownNetImposable,
        Float breakdownEstimatedTax,    // PAS mensuel (null si profil fiscal incomplet)
        Float breakdownBenefits,        // avantages en nature (null si 0)
        Float breakdownMealVoucherEmployer,  // TR part employeur (null si 0)
        Float breakdownMonthlyBonuses,   // primes MENSUELLE actives nettes (null si 0)
        Float breakdownOtherIncome       // somme des OtherIncome récurrents LOCATIF+AIDE_SOCIALE (null si 0)
) {}
