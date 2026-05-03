package com.myfinance.dto;

import java.time.LocalDate;

/**
 * Résumé d'historique de prix pour un instrument — pour affichage UI admin.
 */
public record PriceHistorySummaryDto(
        long dayCount,
        LocalDate fromDate,
        LocalDate toDate
) {}
