package com.myfinance.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Résultat du calcul de performance patrimoniale (TWR + MWR).
 * Endpoint : GET /api/patrimoine/performance
 */
public record PerformanceDto(
        Instant computedAt,                    // horodatage UTC du calcul
        LocalDate from,                        // date de début effective du chaînage TWR
        LocalDate to,                          // date de fin du calcul
        double durationYears,                  // (to - from) / 365.25
        Double twrAnnualized,                  // null si calcul impossible
        Double mwrAnnualized,                  // null si XIRR non convergent
        Double volatilityAnnualized,           // écart-type des R_m × √12 — null si < 2 mois
        Double sharpeRatio,                    // (twrAnnualized − riskFreeRate) / volatility — null si non calculable
        BigDecimal totalInvestedEur,           // Σ cashflows externes nets (versements - retraits)
        BigDecimal currentValueEur,            // valorisation globale actuelle
        BigDecimal absoluteGainEur,            // currentValueEur - totalInvestedEur
        BigDecimal totalDividendsEur,          // Σ INTEREST + DIVIDEND + AIRDROP sur la période
        List<String> warnings,                 // messages diagnostics
        List<MonthlyBreakdownDto> monthlyBreakdown,       // détail mois par mois pour validation
        List<CategoryPerformanceDto> byCategory,          // performance par catégorie d'actifs
        List<PositionPerformanceDto> byPosition           // performance par position, triée par partenaire
) {}
