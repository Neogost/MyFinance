package com.myfinance.dto;

import com.myfinance.domain.ExpenseCategoryEnum;
import com.myfinance.domain.FrequencyEnum;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record UpdateRecurringExpenseRequest(
        @NotNull ExpenseCategoryEnum category,
        @NotBlank @Size(max = 200) String label,
        @NotNull @Positive Float amount,
        @NotNull FrequencyEnum frequency,
        @NotNull @DecimalMin("0.01") @DecimalMax("100.0") Float sharePercentage,
        LocalDate startDate,
        LocalDate endDate,
        @Size(max = 2000) String notes,
        @Min(1) @Max(28) Integer paymentDay
) {}
