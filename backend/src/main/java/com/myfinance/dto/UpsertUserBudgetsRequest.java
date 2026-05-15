package com.myfinance.dto;

import com.myfinance.domain.ExpenseCategoryEnum;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record UpsertUserBudgetsRequest(
        @NotNull
        @Size(max = 50)
        Map<ExpenseCategoryEnum, @PositiveOrZero @DecimalMax("10000000") Float> budgets
) {}
