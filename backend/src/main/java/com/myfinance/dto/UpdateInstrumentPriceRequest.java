package com.myfinance.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdateInstrumentPriceRequest(
        @NotNull Long instrumentId,
        @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal lastPrice
) {}
