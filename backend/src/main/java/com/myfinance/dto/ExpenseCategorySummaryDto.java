package com.myfinance.dto;

import com.myfinance.domain.ExpenseCategoryEnum;

public record ExpenseCategorySummaryDto(
        ExpenseCategoryEnum category,
        Float monthlyAmount,
        Float annualAmount
) {}
