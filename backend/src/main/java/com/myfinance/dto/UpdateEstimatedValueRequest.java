package com.myfinance.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdateEstimatedValueRequest(
        @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal estimatedCurrentValue
) {}
