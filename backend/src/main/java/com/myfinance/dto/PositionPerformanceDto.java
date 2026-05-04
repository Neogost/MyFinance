package com.myfinance.dto;

import java.math.BigDecimal;

/**
 * Performance TWR + MWR pour une position individuelle.
 * Inclus dans {@link PerformanceDto#byPosition()}, trié par partenaire puis par label.
 */
public record PositionPerformanceDto(
        Long   positionId,
        String label,
        String category,       // AssetCategory.name()
        String partner,        // nullable — champ libre saisi par l'utilisateur
        String currency,
        Double twrAnnualized,  // null si calcul impossible
        Double mwrAnnualized,  // null si XIRR non convergent
        BigDecimal currentValueEur,
        BigDecimal totalInvestedEur,
        BigDecimal absoluteGainEur,
        BigDecimal totalDividendsEur
) {}
