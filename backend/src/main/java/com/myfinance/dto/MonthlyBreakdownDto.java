package com.myfinance.dto;

import java.math.BigDecimal;

/**
 * Décomposition mensuelle du chaînage TWR — inclus dans PerformanceDto.monthlyBreakdown.
 * Permet à l'admin de valider chaque sous-période face à un calcul Excel.
 */
public record MonthlyBreakdownDto(
        String month,                    // "YYYY-MM"
        boolean included,                // false → mois exclu du chaînage (facteur 1)
        BigDecimal valueStart,           // V_début — null si !included
        BigDecimal valueEnd,             // V_fin   — null si !included
        BigDecimal cashflowsNetEur,      // Σ flux externes nets — null si !included
        BigDecimal weightedCashflowsEur, // Σ w_i × F_i — null si !included
        Double monthlyReturn,            // R_m — null si !included ou dénominateur ≤ 0
        boolean partial,                 // true si mois en cours (pas encore terminé)
        String reason                    // motif d'exclusion — null si included
) {

    /** Constructeur pour un mois inclus dans le chaînage. */
    public static MonthlyBreakdownDto included(
            String month,
            BigDecimal valueStart,
            BigDecimal valueEnd,
            BigDecimal cashflowsNetEur,
            BigDecimal weightedCashflowsEur,
            Double monthlyReturn,
            boolean partial
    ) {
        return new MonthlyBreakdownDto(month, true,
                valueStart, valueEnd, cashflowsNetEur, weightedCashflowsEur,
                monthlyReturn, partial, null);
    }

    /** Constructeur pour un mois exclu du chaînage. */
    public static MonthlyBreakdownDto excluded(String month, String reason) {
        return new MonthlyBreakdownDto(month, false,
                null, null, null, null, null, false, reason);
    }
}
