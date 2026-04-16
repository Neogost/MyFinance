package com.myfinance.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ManualPositionSnapshotRequest(
        @NotNull Long positionId,
        @NotNull BigDecimal investedAmountEur,
        @NotNull BigDecimal currentValueEur,
        BigDecimal units,
        BigDecimal unitPriceEur
) {}
