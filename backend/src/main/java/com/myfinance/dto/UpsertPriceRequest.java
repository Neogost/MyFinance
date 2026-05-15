package com.myfinance.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** Corps de la requête PUT /api/admin/instruments/{id}/price-history/{date}. */
public record UpsertPriceRequest(
        @NotNull
        @DecimalMin(value = "0.0", inclusive = false)
        @DecimalMax("1000000000")
        BigDecimal price
) {}
