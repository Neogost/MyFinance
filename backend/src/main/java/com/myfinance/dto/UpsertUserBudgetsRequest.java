package com.myfinance.dto;

import com.myfinance.domain.ExpenseCategoryEnum;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record UpsertUserBudgetsRequest(
        @NotNull Map<ExpenseCategoryEnum, Float> budgets
) {}
