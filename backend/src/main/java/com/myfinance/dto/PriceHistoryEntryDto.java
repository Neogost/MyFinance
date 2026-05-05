package com.myfinance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Entrée d'historique de cours pour un instrument (GET/PUT /api/admin/instruments/{id}/price-history).
 */
public record PriceHistoryEntryDto(
        LocalDate priceDate,
        BigDecimal price,
        String source   // BOURSORAMA | COINGECKO | MANUAL_CSV | MANUAL
) {}
