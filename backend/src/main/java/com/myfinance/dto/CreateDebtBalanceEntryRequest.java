package com.myfinance.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateDebtBalanceEntryRequest(
        @NotNull LocalDate entryDate,
        @NotNull @PositiveOrZero BigDecimal balance,
        @Size(max = 2000) String note
) {}
