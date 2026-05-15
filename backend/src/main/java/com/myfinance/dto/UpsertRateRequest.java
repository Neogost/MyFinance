package com.myfinance.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpsertRateRequest(
        @NotNull
        @DecimalMin(value = "0.0", inclusive = false)
        @DecimalMax("1000000000")
        BigDecimal rate
) {}
