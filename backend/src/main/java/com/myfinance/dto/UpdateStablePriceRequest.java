package com.myfinance.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateStablePriceRequest(
        @NotNull Boolean stablePrice
) {}
