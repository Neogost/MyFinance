package com.myfinance.dto;

import java.util.List;

public record ExpenseSummaryDto(
        Float monthlyNetIncome,
        String incomeSource,        // "NET_AFTER_TAX" | "NET_IMPOSABLE" | "NONE"
        Float totalMonthlyExpenses,
        Float totalAnnualExpenses,
        Float savingsCapacity,
        Float savingsRate,
        List<ExpenseCategorySummaryDto> byCategory
) {}
