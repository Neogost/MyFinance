package com.myfinance.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateDebtBalanceEntryRequest(
        @NotNull LocalDate entryDate,
        @NotNull @PositiveOrZero BigDecimal balance,
        String note
) {}
