package com.myfinance.dto;

import java.time.LocalDate;

/**
 * Résumé d'historique de prix pour un instrument — pour affichage UI admin.
 * firstOrderDate = date du premier ordre sur cet instrument (borne min utile pour l'import CSV).
 */
public record PriceHistorySummaryDto(
        long dayCount,
        LocalDate fromDate,
        LocalDate toDate,
        LocalDate firstOrderDate
) {}
