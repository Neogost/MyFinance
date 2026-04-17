package com.myfinance.dto;

import com.myfinance.domain.PossessionCategoryEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdatePossessionRequest(
        @NotNull PossessionCategoryEnum category,
        @NotBlank String label,
        @NotNull @Positive BigDecimal purchasePrice,
        @NotNull @PastOrPresent LocalDate purchaseDate,
        BigDecimal estimatedCurrentValue,
        String notes
) {}
