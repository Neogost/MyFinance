package com.myfinance.dto;

import com.myfinance.domain.ExpenseCategoryEnum;
import com.myfinance.domain.FrequencyEnum;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record CreateRecurringExpenseRequest(
        @NotNull ExpenseCategoryEnum category,
        @NotBlank String label,
        @NotNull @Positive Float amount,
        @NotNull FrequencyEnum frequency,
        @NotNull @DecimalMin("0.01") @DecimalMax("100.0") Float sharePercentage,
        LocalDate startDate,
        LocalDate endDate,
        String notes
) {}
