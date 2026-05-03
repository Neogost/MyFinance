package com.myfinance.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Rapport unifié retourné par tous les endpoints de backfill (CoinGecko, Frankfurter, CSV).
 * Format documenté dans docs/architecture/patrimoine-performance.md section 2.4.
 */
public record BackfillReport(
        Scope scope,
        String targetId,
        String targetLabel,
        LocalDate fromDate,
        LocalDate toDate,
        int linesInserted,
        int linesUpdated,
        int linesSkipped,
        List<String> errors,
        long durationMs
) {
    public enum Scope { INSTRUMENT_PRICES, EXCHANGE_RATES }
}
