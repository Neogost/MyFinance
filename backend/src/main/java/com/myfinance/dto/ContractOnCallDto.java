package com.myfinance.dto;

import com.myfinance.domain.ContractOnCall;

public record ContractOnCallDto(
        Long id,
        Float weeklyFlatRate,
        Integer estimatedWeeksPerYear,
        Float annualOnCallIncome   // calculé à la volée : weeklyFlatRate × estimatedWeeksPerYear
) {
    public static ContractOnCallDto from(ContractOnCall onCall) {
        return new ContractOnCallDto(
                onCall.getId(),
                onCall.getWeeklyFlatRate(),
                onCall.getEstimatedWeeksPerYear(),
                onCall.getWeeklyFlatRate() * onCall.getEstimatedWeeksPerYear()
        );
    }
}
