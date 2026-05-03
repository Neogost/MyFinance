package com.myfinance.dto;

import java.util.List;

/**
 * Rapport retourné par POST /api/admin/orders/migrate-amount-eur.
 * En dry-run (dryRun=true) : ordersUpdated = 0, aucune modification en base.
 */
public record MigrateAmountEurReport(
        boolean dryRun,
        int ordersExamined,
        int ordersToUpdate,
        int ordersUpdated,
        int fallbacksCurrentRate,
        List<String> samples
) {}
