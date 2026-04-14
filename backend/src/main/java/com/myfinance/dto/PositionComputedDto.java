package com.myfinance.dto;

import java.math.BigDecimal;

/**
 * Totaux calculés à la volée à partir des ordres — non persistés.
 */
public record PositionComputedDto(
        BigDecimal investedAmountEur,            // Σ(BUY+DEPOSIT) - Σ(SELL+WITHDRAWAL) en EUR
        BigDecimal currentValueEur,              // valorisation au prix marché (ou solde / valeur estimée)
        BigDecimal capitalGainEur,               // currentValue - invested
        BigDecimal units,                        // nombre de parts/titres — null sauf BOURSE et CRYPTO
        BigDecimal monthlyIncomeProjectionEur    // projection mensuelle si includeInIncomeProjection
) {}
