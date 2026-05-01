package com.myfinance.dto;

public record DataSummaryDto(
        long salaryContracts,
        long otherIncomes,
        long recurringExpenses,
        long positions,
        long debts,
        long possessions,
        long portfolioSnapshots,
        long loanSimulations,
        long patrimoineTargets,
        long analyticsEvents
) {}
