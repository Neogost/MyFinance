package com.myfinance.dto;

import java.math.BigDecimal;

/**
 * Performance TWR + MWR + risque pour une catégorie d'actifs (BOURSE, CRYPTO, LIVRET…).
 * Inclus dans {@link PerformanceDto#byCategory()}.
 */
public record CategoryPerformanceDto(
        String category,             // AssetCategory.name() : "BOURSE", "CRYPTO", "LIVRET"
        Double twrAnnualized,        // null si calcul impossible
        Double mwrAnnualized,        // null si XIRR non convergent
        Double volatilityAnnualized, // null si < 2 mois inclus
        Double sharpeRatio,          // null si non calculable
        Double maxDrawdown,          // perte max peak-to-trough (≤ 0) — null si série vide
        BigDecimal currentValueEur,
        BigDecimal totalInvestedEur,
        BigDecimal absoluteGainEur,
        BigDecimal totalDividendsEur
) {}
